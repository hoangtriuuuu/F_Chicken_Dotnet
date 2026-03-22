using Microsoft.AspNetCore.Mvc;
using FChicken.API.Data;
using FChicken.API.DTOs;
using FChicken.API.Models;
using FChicken.API.Middleware;

namespace FChicken.API.Controllers;

[ApiController]
[Route("api/cart")]
public class CartController : ControllerBase
{
    private readonly MockDb _db;
    public CartController(MockDb db) => _db = db;

    // GET /api/cart
    [HttpGet]
    public IActionResult GetCart()
    {
        var userId = HttpContext.GetUserId();
        if (userId == null)
            return Unauthorized(new ApiResponse<object>(false, "Vui long dang nhap de xem gio hang", null));

        var items = _db.GetOrCreateCart(userId.Value);
        var sub   = items.Sum(i => i.Price * i.Qty);

        return Ok(new ApiResponse<object>(true, null, new {
            Items    = items,
            Subtotal = sub,
            Shipping = sub >= 99000 ? 0 : 15000,
            Total    = sub + (sub >= 99000 ? 0 : 15000),
            Count    = items.Sum(i => i.Qty)
        }));
    }

    // POST /api/cart  — add item
    [HttpPost]
    public IActionResult AddItem([FromBody] AddToCartRequest req)
    {
        var userId = HttpContext.GetUserId();
        if (userId == null) return Unauthorized(new { Success=false, Message="Vui long dang nhap" });

        var product = _db.Products.FirstOrDefault(p => p.Id == req.ProductId && p.IsAvailable);
        if (product == null)
            return BadRequest(new ApiResponse<object>(false, "San pham khong ton tai", null));

        var cart = _db.GetOrCreateCart(userId.Value);
        var existing = cart.FirstOrDefault(i => i.ProductId == req.ProductId);

        if (existing != null)
            existing.Qty += req.Qty;
        else
            cart.Add(new CartItem {
                ProductId   = product.Id,
                ProductName = product.Name,
                ImageUrl    = product.ImageUrl,
                Price       = product.Price,
                Qty         = req.Qty,
                Note        = req.Note
            });

        return Ok(new ApiResponse<object>(true, $"Da them {product.Name} vao gio hang",
            new { Count = cart.Sum(i => i.Qty) }));
    }

    // PUT /api/cart/{productId}  — update qty
    [HttpPut("{productId:int}")]
    public IActionResult UpdateQty(int productId, [FromBody] UpdateCartItemRequest req)
    {
        var userId = HttpContext.GetUserId();
        if (userId == null) return Unauthorized(new { Success=false, Message="Vui long dang nhap" });

        var cart = _db.GetOrCreateCart(userId.Value);
        var item = cart.FirstOrDefault(i => i.ProductId == productId);
        if (item == null) return NotFound();

        if (req.Qty <= 0)
            cart.Remove(item);
        else
            item.Qty = req.Qty;

        return Ok(new ApiResponse<object>(true, "Cap nhat thanh cong",
            new { Count = cart.Sum(i => i.Qty) }));
    }

    // DELETE /api/cart/{productId}
    [HttpDelete("{productId:int}")]
    public IActionResult RemoveItem(int productId)
    {
        var userId = HttpContext.GetUserId();
        if (userId == null) return Unauthorized(new { Success=false, Message="Vui long dang nhap" });

        var cart = _db.GetOrCreateCart(userId.Value);
        var item = cart.FirstOrDefault(i => i.ProductId == productId);
        if (item != null) cart.Remove(item);

        return Ok(new ApiResponse<object>(true, "Da xoa khoi gio hang",
            new { Count = cart.Sum(i => i.Qty) }));
    }

    // DELETE /api/cart  — clear
    [HttpDelete]
    public IActionResult ClearCart()
    {
        var userId = HttpContext.GetUserId();
        if (userId == null) return Unauthorized(new { Success=false, Message="Vui long dang nhap" });

        _db.GetOrCreateCart(userId.Value).Clear();
        return Ok(new ApiResponse<object>(true, "Da xoa gio hang", null));
    }
}
