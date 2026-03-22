using Microsoft.AspNetCore.Mvc;
using FChicken.API.Data;
using FChicken.API.DTOs;
using FChicken.API.Models;
using FChicken.API.Middleware;

namespace FChicken.API.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private readonly MockDb _db;
    public ProductsController(MockDb db) => _db = db;

    // GET /api/products?category=&featured=&page=1&pageSize=12
    [HttpGet]
    public IActionResult GetAll(
        [FromQuery] int?   categoryId = null,
        [FromQuery] bool?  featured   = null,
        [FromQuery] bool?  hot        = null,
        [FromQuery] string? search    = null,
        [FromQuery] int    page       = 1,
        [FromQuery] int    pageSize   = 12)
    {
        var q = _db.Products.Where(p => p.IsAvailable).AsQueryable();

        if (categoryId != null) q = q.Where(p => p.CategoryId == categoryId);
        if (featured   != null) q = q.Where(p => p.IsFeatured  == featured);
        if (hot        != null) q = q.Where(p => p.IsHot        == hot);
        if (!string.IsNullOrEmpty(search))
            q = q.Where(p => p.Name.Contains(search, StringComparison.OrdinalIgnoreCase));

        var total = q.Count();
        var items = q.Skip((page - 1) * pageSize).Take(pageSize).Select(ToDto).ToList();

        return Ok(new ApiResponse<PagedResult<ProductDto>>(true, null,
            new PagedResult<ProductDto>(items, total, page, pageSize)));
    }

    // GET /api/products/{id}
    [HttpGet("{id:int}")]
    public IActionResult GetById(int id)
    {
        var p = _db.Products.FirstOrDefault(x => x.Id == id);
        return p == null ? NotFound() : Ok(new ApiResponse<ProductDto>(true, null, ToDto(p)));
    }

    // POST /api/products  [Admin]
    [HttpPost]
    public IActionResult Create([FromBody] CreateProductRequest req)
    {
        if (!HttpContext.IsAdmin())
            return StatusCode(403, new { Success=false, Message="Khong co quyen" });

        var cat = _db.Categories.FirstOrDefault(c => c.Id == req.CategoryId);
        if (cat == null) return BadRequest(new ApiResponse<object>(false, "Category khong ton tai", null));

        var p = new Product
        {
            Id          = _db.Products.Max(x => x.Id) + 1,
            Name        = req.Name,
            Description = req.Description,
            Price       = req.Price,
            OriginalPrice = req.OriginalPrice,
            ImageUrl    = req.ImageUrl,
            CategoryId  = req.CategoryId,
            CategoryName= cat.Name,
            IsHot       = req.IsHot,
            IsFeatured  = req.IsFeatured,
        };
        _db.Products.Add(p);
        return Ok(new ApiResponse<ProductDto>(true, "Them mon an thanh cong", ToDto(p)));
    }

    // PUT /api/products/{id}  [Admin]
    [HttpPut("{id:int}")]
    public IActionResult Update(int id, [FromBody] UpdateProductRequest req)
    {
        if (!HttpContext.IsAdmin()) return StatusCode(403, new { Success=false, Message="Khong co quyen" });

        var p = _db.Products.FirstOrDefault(x => x.Id == id);
        if (p == null) return NotFound();

        var cat = _db.Categories.FirstOrDefault(c => c.Id == req.CategoryId);
        if (cat == null) return BadRequest(new ApiResponse<object>(false, "Category khong ton tai", null));

        p.Name          = req.Name;
        p.Description   = req.Description;
        p.Price         = req.Price;
        p.OriginalPrice = req.OriginalPrice;
        p.ImageUrl      = req.ImageUrl;
        p.CategoryId    = req.CategoryId;
        p.CategoryName  = cat.Name;
        p.IsHot         = req.IsHot;
        p.IsFeatured    = req.IsFeatured;
        p.IsAvailable   = req.IsAvailable;

        return Ok(new ApiResponse<ProductDto>(true, "Cap nhat thanh cong", ToDto(p)));
    }

    // DELETE /api/products/{id}  [Admin] — soft delete
    [HttpDelete("{id:int}")]
    public IActionResult Delete(int id)
    {
        if (!HttpContext.IsAdmin()) return StatusCode(403, new { Success=false, Message="Khong co quyen" });
        var p = _db.Products.FirstOrDefault(x => x.Id == id);
        if (p == null) return NotFound();
        p.IsAvailable = false;
        return Ok(new ApiResponse<object>(true, "Da an mon an", null));
    }

    // PATCH /api/products/{id}/toggle-featured  [Admin]
    [HttpPatch("{id:int}/toggle-featured")]
    public IActionResult ToggleFeatured(int id)
    {
        if (!HttpContext.IsAdmin()) return StatusCode(403, new { Success=false, Message="Khong co quyen" });
        var p = _db.Products.FirstOrDefault(x => x.Id == id);
        if (p == null) return NotFound();
        p.IsFeatured = !p.IsFeatured;
        return Ok(new ApiResponse<object>(true,
            p.IsFeatured ? "Da bat noi bat" : "Da tat noi bat",
            new { p.Id, p.IsFeatured }));
    }

    // ── Map ─────────────────────────────────────────────────────────────
    private static ProductDto ToDto(Product p) => new(
        p.Id, p.Name, p.Description, p.Price, p.OriginalPrice,
        p.ImageUrl, p.CategoryId, p.CategoryName,
        p.IsHot, p.IsFeatured, p.IsAvailable, p.SoldCount, p.Rating);
}
