using Microsoft.AspNetCore.Mvc;
using FChicken.API.Data;
using FChicken.API.DTOs;
using FChicken.API.Models;
using FChicken.API.Middleware;

namespace FChicken.API.Controllers;

[ApiController]
[Route("api/categories")]
public class CategoriesController : ControllerBase
{
    private readonly MockDb _db;
    public CategoriesController(MockDb db) => _db = db;

    // GET /api/categories
    [HttpGet]
    public IActionResult GetAll()
    {
        var list = _db.Categories
            .Where(c => c.IsActive)
            .OrderBy(c => c.SortOrder)
            .Select(c => new CategoryDto(
                c.Id, c.Name, c.Icon, c.Slug, c.IsActive,
                _db.Products.Count(p => p.CategoryId == c.Id && p.IsAvailable)))
            .ToList();

        return Ok(new ApiResponse<List<CategoryDto>>(true, null, list));
    }

    // GET /api/categories/{id}
    [HttpGet("{id:int}")]
    public IActionResult GetById(int id)
    {
        var c = _db.Categories.FirstOrDefault(x => x.Id == id);
        if (c == null) return NotFound();
        var dto = new CategoryDto(c.Id, c.Name, c.Icon, c.Slug, c.IsActive,
            _db.Products.Count(p => p.CategoryId == c.Id && p.IsAvailable));
        return Ok(new ApiResponse<CategoryDto>(true, null, dto));
    }

    // POST /api/categories  [Admin]
    [HttpPost]
    public IActionResult Create([FromBody] SaveCategoryRequest req)
    {
        if (!HttpContext.IsAdmin()) return StatusCode(403, new { Success=false, Message="Khong co quyen" });

        var cat = new Category
        {
            Id        = _db.Categories.Any() ? _db.Categories.Max(c => c.Id) + 1 : 1,
            Name      = req.Name,
            Icon      = req.Icon,
            Slug      = req.Slug ?? req.Name.ToLower().Replace(" ", "-"),
            IsActive  = req.IsActive,
            SortOrder = req.SortOrder,
        };
        _db.Categories.Add(cat);
        return Ok(new ApiResponse<object>(true, "Them danh muc thanh cong",
            new { cat.Id, cat.Name }));
    }

    // PUT /api/categories/{id}  [Admin]
    [HttpPut("{id:int}")]
    public IActionResult Update(int id, [FromBody] SaveCategoryRequest req)
    {
        if (!HttpContext.IsAdmin()) return StatusCode(403, new { Success=false, Message="Khong co quyen" });
        var cat = _db.Categories.FirstOrDefault(c => c.Id == id);
        if (cat == null) return NotFound();

        cat.Name      = req.Name;
        cat.Icon      = req.Icon;
        cat.Slug      = req.Slug;
        cat.IsActive  = req.IsActive;
        cat.SortOrder = req.SortOrder;

        return Ok(new ApiResponse<object>(true, "Cap nhat thanh cong", null));
    }

    // DELETE /api/categories/{id}  [Admin]
    [HttpDelete("{id:int}")]
    public IActionResult Delete(int id)
    {
        if (!HttpContext.IsAdmin()) return StatusCode(403, new { Success=false, Message="Khong co quyen" });
        var cat = _db.Categories.FirstOrDefault(c => c.Id == id);
        if (cat == null) return NotFound();

        if (_db.Products.Any(p => p.CategoryId == id && p.IsAvailable))
            return BadRequest(new ApiResponse<object>(false,
                "Con san pham thuoc danh muc nay, khong the xoa", null));

        cat.IsActive = false;
        return Ok(new ApiResponse<object>(true, "Da an danh muc", null));
    }
}
