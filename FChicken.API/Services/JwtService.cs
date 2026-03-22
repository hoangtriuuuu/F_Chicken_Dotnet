using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FChicken.API.Models;

namespace FChicken.API.Services;

public class JwtService
{
    private readonly string _secret;
    private readonly int    _expireHours;

    public JwtService(IConfiguration config)
    {
        _secret      = config["Jwt:Secret"] ?? "fchicken_super_secret_key_2026_portfolio";
        _expireHours = int.TryParse(config["Jwt:ExpireHours"], out var h) ? h : 24;
    }

    // ── Generate ───────────────────────────────────────────────────────
    public string GenerateToken(User user)
    {
        var header = Base64UrlEncode(JsonSerializer.Serialize(new
        {
            alg = "HS256",
            typ = "JWT"
        }));

        var exp = DateTimeOffset.UtcNow.AddHours(_expireHours).ToUnixTimeSeconds();
        var iat = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        var payload = Base64UrlEncode(JsonSerializer.Serialize(new
        {
            sub   = user.Id.ToString(),
            email = user.Email,
            name  = user.FullName,
            role  = user.Role.ToString(),
            iat,
            exp
        }));

        var signature = Sign($"{header}.{payload}");
        return $"{header}.{payload}.{signature}";
    }

    // ── Validate & parse ───────────────────────────────────────────────
    public ClaimsResult? ValidateToken(string token)
    {
        try
        {
            var parts = token.Split('.');
            if (parts.Length != 3) return null;

            var expectedSig = Sign($"{parts[0]}.{parts[1]}");
            if (expectedSig != parts[2]) return null;

            var json    = Encoding.UTF8.GetString(Base64UrlDecode(parts[1]));
            var payload = JsonSerializer.Deserialize<JsonElement>(json);

            var exp = payload.GetProperty("exp").GetInt64();
            if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > exp) return null;

            return new ClaimsResult(
                int.Parse(payload.GetProperty("sub").GetString()!),
                payload.GetProperty("email").GetString()!,
                payload.GetProperty("name").GetString()!,
                payload.GetProperty("role").GetString()!
            );
        }
        catch { return null; }
    }

    // ── Helpers ────────────────────────────────────────────────────────
    private string Sign(string data)
    {
        var keyBytes  = Encoding.UTF8.GetBytes(_secret);
        var dataBytes = Encoding.UTF8.GetBytes(data);
        using var hmac = new HMACSHA256(keyBytes);
        return Base64UrlEncode(hmac.ComputeHash(dataBytes));
    }

    private static string Base64UrlEncode(string text)
        => Base64UrlEncode(Encoding.UTF8.GetBytes(text));

    private static string Base64UrlEncode(byte[] bytes)
        => Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');

    private static byte[] Base64UrlDecode(string input)
    {
        var s = input.Replace('-', '+').Replace('_', '/');
        s += (s.Length % 4) switch { 2 => "==", 3 => "=", _ => "" };
        return Convert.FromBase64String(s);
    }
}

public record ClaimsResult(int UserId, string Email, string Name, string Role);
