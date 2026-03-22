using FChicken.API.Models;
namespace FChicken.API.DTOs;

// ── Auth ───────────────────────────────────────────────────────────────
public record RegisterRequest(
    string FullName, string Email, string Phone, string Password);

public record LoginRequest(string Email, string Password);

public record ForgotPasswordRequest(string Email);

public record ResetPasswordRequest(string Token, string NewPassword);

public record AuthResponse(
    string Token,
    string FullName,
    string Email,
    string Role,
    int UserId);

// ── Product ────────────────────────────────────────────────────────────
public record ProductDto(
    int Id, string Name, string Description,
    decimal Price, decimal? OriginalPrice,
    string ImageUrl, int CategoryId, string CategoryName,
    bool IsHot, bool IsFeatured, bool IsAvailable,
    int SoldCount, double Rating);

public record CreateProductRequest(
    string Name, string Description,
    decimal Price, decimal? OriginalPrice,
    string ImageUrl, int CategoryId,
    bool IsHot, bool IsFeatured);

public record UpdateProductRequest(
    string Name, string Description,
    decimal Price, decimal? OriginalPrice,
    string ImageUrl, int CategoryId,
    bool IsHot, bool IsFeatured, bool IsAvailable);

// ── Category ───────────────────────────────────────────────────────────
public record CategoryDto(int Id, string Name, string? Icon, string? Slug, bool IsActive, int ProductCount);
public record SaveCategoryRequest(string Name, string? Icon, string? Slug, bool IsActive, int SortOrder);

// ── Cart ───────────────────────────────────────────────────────────────
public record AddToCartRequest(int ProductId, int Qty = 1, string? Note = null);
public record UpdateCartItemRequest(int ProductId, int Qty);

// ── Order ──────────────────────────────────────────────────────────────
public record PlaceOrderRequest(
    string Phone,
    string Address,
    string PaymentMethod,
    string? VoucherCode,
    string? Note,
    List<OrderItemRequest> Items);

public record OrderItemRequest(int ProductId, int Qty);

public record OrderSummaryDto(
    int Id, string Code, OrderStatus Status, string StatusLabel,
    decimal Total, int ItemCount, DateTime CreatedAt);

public record UpdateOrderStatusRequest(string Status);

// ── Voucher ────────────────────────────────────────────────────────────
public record ValidateVoucherRequest(string Code, decimal OrderAmount);
public record VoucherResult(bool Valid, string? Message, decimal Discount, string? Description);

public record SaveVoucherRequest(
    string Code, string Description,
    string Type, decimal Value,
    decimal MinOrder, decimal? MaxDiscount,
    int UsageLimit, DateTime? ExpiresAt, bool IsActive);

// ── User (admin) ───────────────────────────────────────────────────────
public record UserSummaryDto(
    int Id, string FullName, string Email, string Phone,
    string Role, bool IsActive, DateTime CreatedAt, int OrderCount, decimal TotalSpent);

public record UpdateProfileRequest(string FullName, string Phone, string? Address);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

// ── Generic ────────────────────────────────────────────────────────────
public record ApiResponse<T>(bool Success, string? Message, T? Data);
public record PagedResult<T>(List<T> Items, int Total, int Page, int PageSize);
