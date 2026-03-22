using Microsoft.AspNetCore.Mvc;
using FChicken.API.Data;
using FChicken.API.DTOs;
using FChicken.API.Models;
using FChicken.API.Middleware;

namespace FChicken.API.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly MockDb _db;
    public OrdersController(MockDb db) => _db = db;

    // GET /api/orders  — user sees own orders, admin sees all
    [HttpGet]
    public IActionResult GetOrders([FromQuery] string? status = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var userId = HttpContext.GetUserId();
        if (userId == null) return Unauthorized(new { Success=false, Message="Vui long dang nhap" });

        var q = _db.Orders.AsQueryable();

        if (!HttpContext.IsAdmin())
            q = q.Where(o => o.UserId == userId);

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<OrderStatus>(status, true, out var s))
            q = q.Where(o => o.Status == s);

        var total = q.Count();
        var items = q.OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new OrderSummaryDto(
                o.Id, o.Code, o.Status, MockDb.StatusLabel(o.Status),
                o.Total, o.Items == null ? 0 : o.Items.Count, o.CreatedAt))
            .ToList();

        return Ok(new ApiResponse<PagedResult<OrderSummaryDto>>(true, null,
            new PagedResult<OrderSummaryDto>(items, total, page, pageSize)));
    }

    // GET /api/orders/{id}
    [HttpGet("{id:int}")]
    public IActionResult GetById(int id)
    {
        var userId = HttpContext.GetUserId();
        if (userId == null) return Unauthorized(new { Success=false, Message="Vui long dang nhap" });

        var order = _db.Orders.FirstOrDefault(o => o.Id == id);
        if (order == null) return NotFound();

        // User can only see own orders
        if (!HttpContext.IsAdmin() && order.UserId != userId)
            return StatusCode(403, new { Success=false, Message="Ban khong co quyen thuc hien hanh dong nay" });

        // Ensure collections are never null (safe JSON serialization)
        order.Items           ??= new();
        order.TrackingHistory ??= new();
        return Ok(new ApiResponse<Order>(true, null, order));
    }

    // POST /api/orders  — place order
    [HttpPost]
    public IActionResult PlaceOrder([FromBody] PlaceOrderRequest req)
    {
        var userId = HttpContext.GetUserId();
        if (userId == null) return Unauthorized(new { Success=false, Message="Vui long dang nhap" });

        var user = _db.Users.FirstOrDefault(u => u.Id == userId);
        if (user == null) return Unauthorized(new { Success=false, Message="Vui long dang nhap" });

        // Validate items & build OrderItems
        var orderItems = new List<OrderItem>();
        decimal subtotal = 0;

        foreach (var item in req.Items)
        {
            var p = _db.Products.FirstOrDefault(x => x.Id == item.ProductId && x.IsAvailable);
            if (p == null)
                return BadRequest(new ApiResponse<object>(false, $"San pham ID={item.ProductId} khong con ban", null));

            orderItems.Add(new OrderItem {
                ProductId   = p.Id,
                ProductName = p.Name,
                ImageUrl    = p.ImageUrl,
                Price       = p.Price,
                Qty         = item.Qty
            });
            subtotal += p.Price * item.Qty;
            p.SoldCount += item.Qty;
        }

        // Validate voucher
        decimal discount = 0;
        if (!string.IsNullOrEmpty(req.VoucherCode))
        {
            var v = _db.Vouchers.FirstOrDefault(x =>
                x.Code == req.VoucherCode && x.IsActive &&
                (x.ExpiresAt == null || x.ExpiresAt > DateTime.UtcNow) &&
                x.UsedCount < x.UsageLimit &&
                subtotal >= x.MinOrder);

            if (v != null)
            {
                discount = v.Type switch
                {
                    VoucherType.Percentage   => Math.Min(subtotal * v.Value / 100, v.MaxDiscount ?? decimal.MaxValue),
                    VoucherType.FixedAmount  => v.Value,
                    VoucherType.FreeShipping => 15000,
                    _ => 0
                };
                v.UsedCount++;
            }
        }

        decimal shipping = discount >= 15000 && req.VoucherCode != null ? 0 : 15000;
        if (subtotal >= 99000) shipping = 0;

        var now = DateTime.UtcNow;
        var order = new Order {
            Id            = _db.NextOrderId(),
            Code          = _db.GenerateOrderCode(),
            UserId        = userId.Value,
            UserName      = user.FullName,
            UserEmail     = user.Email,
            Phone         = req.Phone,
            Address       = req.Address,
            Status        = OrderStatus.Pending,
            Subtotal      = subtotal,
            ShippingFee   = shipping,
            Discount      = discount,
            Total         = subtotal + shipping - discount,
            VoucherCode   = req.VoucherCode,
            PaymentMethod = req.PaymentMethod,
            Note          = req.Note,
            CreatedAt     = now,
            Items         = orderItems,
            TrackingHistory = new() {
                new() { Status="Pending", Message="Da dat hang thanh cong", Time=now, IsDone=true }
            }
        };

        _db.Orders.Add(order);

        // Clear cart
        _db.GetOrCreateCart(userId.Value).Clear();

        return Ok(new ApiResponse<object>(true, "Dat hang thanh cong", new {
            order.Id, order.Code, order.Total, order.Status,
            StatusLabel = MockDb.StatusLabel(order.Status)
        }));
    }

    // PATCH /api/orders/{id}/status  [Admin]
    [HttpPatch("{id:int}/status")]
    public IActionResult UpdateStatus(int id, [FromBody] UpdateOrderStatusRequest req)
    {
        if (!HttpContext.IsAdmin()) return StatusCode(403, new { Success=false, Message="Ban khong co quyen thuc hien hanh dong nay" });

        var order = _db.Orders.FirstOrDefault(o => o.Id == id);
        if (order == null) return NotFound();

        if (!Enum.TryParse<OrderStatus>(req.Status, true, out var newStatus))
            return BadRequest(new ApiResponse<object>(false, "Trang thai khong hop le", null));

        order.Status = newStatus;
        if (newStatus == OrderStatus.Delivered)
            order.DeliveredAt = DateTime.UtcNow;

        var now = DateTime.UtcNow;
        order.TrackingHistory.Add(new TrackingEvent {
            Status  = newStatus.ToString(),
            Message = MockDb.StatusLabel(newStatus),
            Time    = now,
            IsDone  = true
        });

        return Ok(new ApiResponse<object>(true, "Cap nhat trang thai thanh cong", new {
            order.Id, order.Code,
            Status      = newStatus.ToString(),
            StatusLabel = MockDb.StatusLabel(newStatus)
        }));
    }

    // DELETE /api/orders/{id}  — user cancel pending order
    [HttpDelete("{id:int}")]
    public IActionResult CancelOrder(int id)
    {
        var userId = HttpContext.GetUserId();
        if (userId == null) return Unauthorized(new { Success=false, Message="Vui long dang nhap" });

        var order = _db.Orders.FirstOrDefault(o => o.Id == id);
        if (order == null) return NotFound();

        if (!HttpContext.IsAdmin() && order.UserId != userId) return StatusCode(403, new { Success=false, Message="Ban khong co quyen thuc hien hanh dong nay" });

        if (order.Status != OrderStatus.Pending && !HttpContext.IsAdmin())
            return BadRequest(new ApiResponse<object>(false,
                "Chi co the huy don hang khi chua duoc xu ly", null));

        order.Status = OrderStatus.Cancelled;
        order.TrackingHistory.Add(new TrackingEvent {
            Status  = "Cancelled",
            Message = "Don hang da bi huy",
            Time    = DateTime.UtcNow,
            IsDone  = true
        });

        return Ok(new ApiResponse<object>(true, "Da huy don hang", null));
    }

    // GET /api/orders/stats  [Admin]
    [HttpGet("stats")]
    public IActionResult GetStats()
    {
        if (!HttpContext.IsAdmin()) return StatusCode(403, new { Success=false, Message="Ban khong co quyen thuc hien hanh dong nay" });

        var today = DateTime.UtcNow.Date;
        var todayOrders = _db.Orders.Where(o => o.CreatedAt.Date == today).ToList();

        return Ok(new ApiResponse<object>(true, null, new {
            TodayRevenue   = todayOrders.Where(o => o.Status != OrderStatus.Cancelled).Sum(o => o.Total),
            TodayOrders    = todayOrders.Count,
            Delivering     = _db.Orders.Count(o => o.Status == OrderStatus.Delivering),
            TotalOrders    = _db.Orders.Count,
            PendingOrders  = _db.Orders.Count(o => o.Status == OrderStatus.Pending),
            Cancelled      = _db.Orders.Count(o => o.Status == OrderStatus.Cancelled),
        }));
    }
}
