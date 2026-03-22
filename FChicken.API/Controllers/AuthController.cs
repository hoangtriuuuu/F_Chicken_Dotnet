using Microsoft.AspNetCore.Mvc;
using FChicken.API.Data;
using FChicken.API.DTOs;
using FChicken.API.Models;
using FChicken.API.Services;
using FChicken.API.Middleware;

namespace FChicken.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly MockDb    _db;
    private readonly JwtService _jwt;

    public AuthController(MockDb db, JwtService jwt)
    {
        _db  = db;
        _jwt = jwt;
    }

    // POST /api/auth/register
    [HttpPost("register")]
    public IActionResult Register([FromBody] RegisterRequest req)
    {
        if (_db.Users.Any(u => u.Email == req.Email))
            return BadRequest(new ApiResponse<object>(false, "Email da duoc su dung", null));

        var user = new User
        {
            Id           = _db.NextUserId(),
            FullName     = req.FullName,
            Email        = req.Email,
            Phone        = req.Phone,
            PasswordHash = MockDb.HashPassword(req.Password),
            Role         = UserRole.User,
        };
        _db.Users.Add(user);

        var token = _jwt.GenerateToken(user);
        return Ok(new ApiResponse<AuthResponse>(true, "Dang ky thanh cong",
            new AuthResponse(token, user.FullName, user.Email, user.Role.ToString(), user.Id)));
    }

    // POST /api/auth/login
    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest req)
    {
        var user = _db.Users.FirstOrDefault(u => u.Email == req.Email);
        if (user == null || !MockDb.VerifyPassword(req.Password, user.PasswordHash))
            return Unauthorized(new ApiResponse<object>(false, "Email hoac mat khau khong dung", null));

        if (!user.IsActive)
            return Unauthorized(new ApiResponse<object>(false, "Tai khoan da bi khoa", null));

        var token = _jwt.GenerateToken(user);
        return Ok(new ApiResponse<AuthResponse>(true, "Dang nhap thanh cong",
            new AuthResponse(token, user.FullName, user.Email, user.Role.ToString(), user.Id)));
    }

    // POST /api/auth/forgot-password
    [HttpPost("forgot-password")]
    public IActionResult ForgotPassword([FromBody] ForgotPasswordRequest req)
    {
        var user = _db.Users.FirstOrDefault(u => u.Email == req.Email);
        // Always return success to avoid email enumeration
        if (user != null)
        {
            user.ResetToken    = Guid.NewGuid().ToString("N");
            user.ResetTokenExp = DateTime.UtcNow.AddMinutes(30);
            // In production: send email. Here we return the token for demo.
        }
        return Ok(new ApiResponse<object>(true,
            "Neu email ton tai, ban se nhan duoc link dat lai mat khau",
            user != null ? new { token = user.ResetToken, note = "DEMO ONLY - in production this is emailed" } : null));
    }

    // POST /api/auth/reset-password
    [HttpPost("reset-password")]
    public IActionResult ResetPassword([FromBody] ResetPasswordRequest req)
    {
        var user = _db.Users.FirstOrDefault(u =>
            u.ResetToken == req.Token && u.ResetTokenExp > DateTime.UtcNow);
        if (user == null)
            return BadRequest(new ApiResponse<object>(false, "Token khong hop le hoac da het han", null));

        user.PasswordHash = MockDb.HashPassword(req.NewPassword);
        user.ResetToken   = null;
        user.ResetTokenExp= null;

        return Ok(new ApiResponse<object>(true, "Doi mat khau thanh cong", null));
    }

    // GET /api/auth/me
    [HttpGet("me")]
    public IActionResult Me()
    {
        var userId = HttpContext.GetUserId();
        if (userId == null)
            return Unauthorized(new ApiResponse<object>(false, "Chua dang nhap", null));

        var user = _db.Users.FirstOrDefault(u => u.Id == userId);
        if (user == null) return NotFound();

        return Ok(new ApiResponse<object>(true, null, new {
            user.Id, user.FullName, user.Email, user.Phone,
            user.Address, user.Avatar,
            Role = user.Role.ToString()
        }));
    }

    // PUT /api/auth/profile
    [HttpPut("profile")]
    public IActionResult UpdateProfile([FromBody] UpdateProfileRequest req)
    {
        var userId = HttpContext.GetUserId();
        if (userId == null) return Unauthorized(new { Success=false, Message="Vui long dang nhap" });

        var user = _db.Users.FirstOrDefault(u => u.Id == userId);
        if (user == null) return NotFound();

        user.FullName = req.FullName;
        user.Phone    = req.Phone;
        user.Address  = req.Address;

        return Ok(new ApiResponse<object>(true, "Cap nhat thanh cong", new {
            user.FullName, user.Phone, user.Address
        }));
    }

    // PUT /api/auth/change-password
    [HttpPut("change-password")]
    public IActionResult ChangePassword([FromBody] ChangePasswordRequest req)
    {
        var userId = HttpContext.GetUserId();
        if (userId == null) return Unauthorized(new { Success=false, Message="Vui long dang nhap" });

        var user = _db.Users.FirstOrDefault(u => u.Id == userId);
        if (user == null) return NotFound();

        if (!MockDb.VerifyPassword(req.CurrentPassword, user.PasswordHash))
            return BadRequest(new ApiResponse<object>(false, "Mat khau hien tai khong dung", null));

        user.PasswordHash = MockDb.HashPassword(req.NewPassword);
        return Ok(new ApiResponse<object>(true, "Doi mat khau thanh cong", null));
    }
}
