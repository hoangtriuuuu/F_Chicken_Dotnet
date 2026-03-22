using FChicken.API.Services;

namespace FChicken.API.Middleware;

public class JwtMiddleware
{
    private readonly RequestDelegate _next;

    public JwtMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, JwtService jwt)
    {
        var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
        var token = authHeader?.StartsWith("Bearer ") == true
            ? authHeader[7..] : null;

        if (token != null)
        {
            var claims = jwt.ValidateToken(token);
            if (claims != null)
            {
                context.Items["UserId"] = claims.UserId;
                context.Items["Email"]  = claims.Email;
                context.Items["Name"]   = claims.Name;
                context.Items["Role"]   = claims.Role;
            }
        }

        await _next(context);
    }
}

// ── Extension helpers for controllers ──────────────────────────────────
public static class HttpContextExtensions
{
    public static int?   GetUserId(this HttpContext ctx) => ctx.Items["UserId"] as int?;
    public static string? GetRole(this HttpContext ctx)  => ctx.Items["Role"] as string;
    public static bool   IsAdmin(this HttpContext ctx)   => ctx.GetRole() == "Admin";
    public static bool   IsAuthenticated(this HttpContext ctx) => ctx.GetUserId() != null;
}
