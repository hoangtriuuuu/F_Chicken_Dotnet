using Microsoft.AspNetCore.Mvc;
using FChicken.API.Data;
using FChicken.API.DTOs;
using FChicken.API.Models;
using FChicken.API.Middleware;

namespace FChicken.API.Controllers;

// ── FAVORITES ──────────────────────────────────────────────────────────
[ApiController]
[Route("api/favorites")]
public class FavoritesController : ControllerBase
{
    private readonly MockDb _db;
    public FavoritesController(MockDb db) => _db = db;

    // GET /api/favorites
    [HttpGet]
    public IActionResult GetFavorites()
    {
        var userId = HttpContext.GetUserId();
        if (userId == null) return Unauthorized(new { Success=false, Message="Vui long dang nhap" });

        var favProductIds = _db.Favorites
            .Where(f => f.UserId == userId)
            .Select(f => f.ProductId)
            .ToHashSet();

        var products = _db.Products
            .Where(p => favProductIds.Contains(p.Id) && p.IsAvailable)
            .Select(p => new {
                p.Id, p.Name, p.Description, p.Price, p.OriginalPrice,
                p.ImageUrl, p.CategoryName, p.IsHot, p.Rating
            })
            .ToList();

        return Ok(new ApiResponse<object>(true, null, products));
    }

    // POST /api/favorites/{productId}  — toggle
    [HttpPost("{productId:int}")]
    public IActionResult Toggle(int productId)
    {
        var userId = HttpContext.GetUserId();
        if (userId == null) return Unauthorized(new { Success=false, Message="Vui long dang nhap" });

        var existing = _db.Favorites.FirstOrDefault(f =>
            f.UserId == userId && f.ProductId == productId);

        if (existing != null)
        {
            _db.Favorites.Remove(existing);
            return Ok(new ApiResponse<object>(true, "Da bo yeu thich", new { IsFavorite = false }));
        }

        var product = _db.Products.FirstOrDefault(p => p.Id == productId);
        if (product == null) return NotFound();

        _db.Favorites.Add(new Favorite { UserId = userId.Value, ProductId = productId });
        return Ok(new ApiResponse<object>(true, "Da them vao yeu thich", new { IsFavorite = true }));
    }

    // GET /api/favorites/ids  — list of favorite product IDs for current user
    [HttpGet("ids")]
    public IActionResult GetIds()
    {
        var userId = HttpContext.GetUserId();
        if (userId == null) return Ok(new ApiResponse<List<int>>(true, null, new()));

        var ids = _db.Favorites
            .Where(f => f.UserId == userId)
            .Select(f => f.ProductId)
            .ToList();

        return Ok(new ApiResponse<List<int>>(true, null, ids));
    }
}

// ── VOUCHERS ───────────────────────────────────────────────────────────
[ApiController]
[Route("api/vouchers")]
public class VouchersController : ControllerBase
{
    private readonly MockDb _db;
    public VouchersController(MockDb db) => _db = db;

    // POST /api/vouchers/validate
    [HttpPost("validate")]
    public IActionResult Validate([FromBody] ValidateVoucherRequest req)
    {
        var v = _db.Vouchers.FirstOrDefault(x =>
            x.Code.Equals(req.Code, StringComparison.OrdinalIgnoreCase) && x.IsActive);

        if (v == null)
            return Ok(new VoucherResult(false, "Ma giam gia khong hop le", 0, null));

        if (v.ExpiresAt != null && v.ExpiresAt < DateTime.UtcNow)
            return Ok(new VoucherResult(false, "Ma giam gia da het han", 0, null));

        if (v.UsedCount >= v.UsageLimit)
            return Ok(new VoucherResult(false, "Ma giam gia da het luot su dung", 0, null));

        if (req.OrderAmount < v.MinOrder)
            return Ok(new VoucherResult(false,
                $"Don hang toi thieu {v.MinOrder:N0}d de su dung ma nay", 0, null));

        var discount = v.Type switch
        {
            VoucherType.Percentage   => Math.Min(req.OrderAmount * v.Value / 100, v.MaxDiscount ?? decimal.MaxValue),
            VoucherType.FixedAmount  => v.Value,
            VoucherType.FreeShipping => 15000,
            _ => 0
        };

        return Ok(new VoucherResult(true, null, discount, v.Description));
    }

    // GET /api/vouchers  [Admin]
    [HttpGet]
    public IActionResult GetAll()
    {
        if (!HttpContext.IsAdmin()) return StatusCode(403, new { Success=false, Message="Khong co quyen" });
        return Ok(new ApiResponse<List<Voucher>>(true, null, _db.Vouchers));
    }

    // POST /api/vouchers  [Admin]
    [HttpPost]
    public IActionResult Create([FromBody] SaveVoucherRequest req)
    {
        if (!HttpContext.IsAdmin()) return StatusCode(403, new { Success=false, Message="Khong co quyen" });

        if (_db.Vouchers.Any(v => v.Code.Equals(req.Code, StringComparison.OrdinalIgnoreCase)))
            return BadRequest(new ApiResponse<object>(false, "Ma voucher da ton tai", null));

        var type = Enum.TryParse<VoucherType>(req.Type, true, out var t) ? t : VoucherType.FixedAmount;
        var v = new Voucher {
            Id          = _db.Vouchers.Any() ? _db.Vouchers.Max(x => x.Id) + 1 : 1,
            Code        = req.Code.ToUpper(),
            Description = req.Description,
            Type        = type,
            Value       = req.Value,
            MinOrder    = req.MinOrder,
            MaxDiscount = req.MaxDiscount,
            UsageLimit  = req.UsageLimit,
            ExpiresAt   = req.ExpiresAt,
            IsActive    = req.IsActive,
        };
        _db.Vouchers.Add(v);
        return Ok(new ApiResponse<object>(true, "Tao voucher thanh cong", new { v.Id, v.Code }));
    }

    // PUT /api/vouchers/{id}  [Admin]
    [HttpPut("{id:int}")]
    public IActionResult Update(int id, [FromBody] SaveVoucherRequest req)
    {
        if (!HttpContext.IsAdmin()) return StatusCode(403, new { Success=false, Message="Khong co quyen" });
        var v = _db.Vouchers.FirstOrDefault(x => x.Id == id);
        if (v == null) return NotFound();

        v.Description = req.Description;
        v.Value       = req.Value;
        v.MinOrder    = req.MinOrder;
        v.MaxDiscount = req.MaxDiscount;
        v.UsageLimit  = req.UsageLimit;
        v.ExpiresAt   = req.ExpiresAt;
        v.IsActive    = req.IsActive;

        return Ok(new ApiResponse<object>(true, "Cap nhat thanh cong", null));
    }

    // DELETE /api/vouchers/{id}  [Admin]
    [HttpDelete("{id:int}")]
    public IActionResult Delete(int id)
    {
        if (!HttpContext.IsAdmin()) return StatusCode(403, new { Success=false, Message="Khong co quyen" });
        var v = _db.Vouchers.FirstOrDefault(x => x.Id == id);
        if (v == null) return NotFound();
        v.IsActive = false;
        return Ok(new ApiResponse<object>(true, "Da vo hieu hoa voucher", null));
    }
}

// ── ADMIN USERS ────────────────────────────────────────────────────────
[ApiController]
[Route("api/admin/users")]
public class AdminUsersController : ControllerBase
{
    private readonly MockDb _db;
    public AdminUsersController(MockDb db) => _db = db;

    // GET /api/admin/users
    [HttpGet]
    public IActionResult GetAll([FromQuery] string? role = null)
    {
        if (!HttpContext.IsAdmin()) return StatusCode(403, new { Success=false, Message="Khong co quyen" });

        var q = _db.Users.AsQueryable();
        if (!string.IsNullOrEmpty(role) && Enum.TryParse<UserRole>(role, true, out var r))
            q = q.Where(u => u.Role == r);

        var list = q.Select(u => new UserSummaryDto(
            u.Id, u.FullName, u.Email, u.Phone,
            u.Role.ToString(), u.IsActive, u.CreatedAt,
            _db.Orders.Count(o => o.UserId == u.Id),
            _db.Orders.Where(o => o.UserId == u.Id && o.Status != OrderStatus.Cancelled)
                      .Sum(o => o.Total)
        )).ToList();

        return Ok(new ApiResponse<List<UserSummaryDto>>(true, null, list));
    }

    // PATCH /api/admin/users/{id}/toggle-active
    [HttpPatch("{id:int}/toggle-active")]
    public IActionResult ToggleActive(int id)
    {
        if (!HttpContext.IsAdmin()) return StatusCode(403, new { Success=false, Message="Khong co quyen" });
        var user = _db.Users.FirstOrDefault(u => u.Id == id);
        if (user == null) return NotFound();
        if (user.Role == UserRole.Admin)
            return BadRequest(new ApiResponse<object>(false, "Khong the khoa tai khoan Admin", null));

        user.IsActive = !user.IsActive;
        return Ok(new ApiResponse<object>(true,
            user.IsActive ? "Da mo khoa tai khoan" : "Da khoa tai khoan",
            new { user.Id, user.IsActive }));
    }

    // PATCH /api/admin/users/{id}/role
    [HttpPatch("{id:int}/role")]
    public IActionResult SetRole(int id, [FromBody] SetRoleRequest req)
    {
        if (!HttpContext.IsAdmin()) return StatusCode(403, new { Success=false, Message="Khong co quyen" });
        var user = _db.Users.FirstOrDefault(u => u.Id == id);
        if (user == null) return NotFound();

        if (!Enum.TryParse<UserRole>(req.Role, true, out var role))
            return BadRequest(new ApiResponse<object>(false, "Role khong hop le", null));

        user.Role = role;
        return Ok(new ApiResponse<object>(true, "Cap nhat quyen thanh cong", null));
    }
}

public record SetRoleRequest(string Role);
