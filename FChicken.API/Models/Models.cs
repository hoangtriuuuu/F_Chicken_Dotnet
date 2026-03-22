namespace FChicken.API.Models;

// ── Enums ──────────────────────────────────────────────────────────────
public enum UserRole    { Guest, User, Admin }
public enum OrderStatus { Pending, Confirmed, Preparing, Delivering, Delivered, Cancelled }
public enum VoucherType { Percentage, FixedAmount, FreeShipping }

// ── User ───────────────────────────────────────────────────────────────
public class User
{
    public int    Id           { get; set; }
    public string FullName     { get; set; } = "";
    public string Email        { get; set; } = "";
    public string Phone        { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public UserRole Role       { get; set; } = UserRole.User;
    public string? Avatar      { get; set; }
    public string? Address     { get; set; }
    public bool   IsActive     { get; set; } = true;
    public DateTime CreatedAt  { get; set; } = DateTime.UtcNow;

    // Password reset
    public string? ResetToken       { get; set; }
    public DateTime? ResetTokenExp  { get; set; }
}

// ── Category ───────────────────────────────────────────────────────────
public class Category
{
    public int    Id          { get; set; }
    public string Name        { get; set; } = "";
    public string? Icon       { get; set; }
    public string? Slug       { get; set; }
    public bool   IsActive    { get; set; } = true;
    public int    SortOrder   { get; set; }
}

// ── Product ────────────────────────────────────────────────────────────
public class Product
{
    public int      Id            { get; set; }
    public string   Name          { get; set; } = "";
    public string   Description   { get; set; } = "";
    public decimal  Price         { get; set; }
    public decimal? OriginalPrice { get; set; }
    public string   ImageUrl      { get; set; } = "";
    public int      CategoryId    { get; set; }
    public string   CategoryName  { get; set; } = "";
    public bool     IsHot         { get; set; }
    public bool     IsFeatured    { get; set; }   // hiển thị ở trang chủ
    public bool     IsAvailable   { get; set; } = true;
    public int      StockQty      { get; set; } = 99;
    public int      SoldCount     { get; set; }
    public double   Rating        { get; set; } = 4.8;
    public DateTime CreatedAt     { get; set; } = DateTime.UtcNow;
}

// ── Cart ───────────────────────────────────────────────────────────────
public class CartItem
{
    public int    ProductId   { get; set; }
    public string ProductName { get; set; } = "";
    public string ImageUrl    { get; set; } = "";
    public decimal Price      { get; set; }
    public int    Qty         { get; set; }
    public string? Note       { get; set; }
}

// ── Favorite ───────────────────────────────────────────────────────────
public class Favorite
{
    public int UserId    { get; set; }
    public int ProductId { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
}

// ── Order ──────────────────────────────────────────────────────────────
public class Order
{
    public int         Id           { get; set; }
    public string      Code         { get; set; } = "";   // #FC-YYYYMMDD-XXX
    public int         UserId       { get; set; }
    public string      UserName     { get; set; } = "";
    public string      UserEmail    { get; set; } = "";
    public string      Phone        { get; set; } = "";
    public string      Address      { get; set; } = "";
    public OrderStatus Status       { get; set; } = OrderStatus.Pending;
    public decimal     Subtotal     { get; set; }
    public decimal     ShippingFee  { get; set; } = 15000;
    public decimal     Discount     { get; set; }
    public decimal     Total        { get; set; }
    public string?     VoucherCode  { get; set; }
    public string      PaymentMethod{ get; set; } = "Tien mat";
    public bool        IsPaid       { get; set; }
    public string?     Note         { get; set; }
    public DateTime    CreatedAt    { get; set; } = DateTime.UtcNow;
    public DateTime?   DeliveredAt  { get; set; }
    public List<OrderItem> Items    { get; set; } = new();

    // Tracking timeline
    public List<TrackingEvent> TrackingHistory { get; set; } = new();
}

public class OrderItem
{
    public int     ProductId   { get; set; }
    public string  ProductName { get; set; } = "";
    public string  ImageUrl    { get; set; } = "";
    public decimal Price       { get; set; }
    public int     Qty         { get; set; }
    public decimal LineTotal   => Price * Qty;
}

public class TrackingEvent
{
    public string      Status    { get; set; } = "";
    public string      Message   { get; set; } = "";
    public DateTime    Time      { get; set; } = DateTime.UtcNow;
    public bool        IsDone    { get; set; }
}

// ── Voucher ────────────────────────────────────────────────────────────
public class Voucher
{
    public int         Id          { get; set; }
    public string      Code        { get; set; } = "";
    public string      Description { get; set; } = "";
    public VoucherType Type        { get; set; }
    public decimal     Value       { get; set; }          // % hoặc VND
    public decimal     MinOrder    { get; set; }
    public decimal?    MaxDiscount { get; set; }
    public int         UsageLimit  { get; set; } = 100;
    public int         UsedCount   { get; set; }
    public DateTime?   ExpiresAt   { get; set; }
    public bool        IsActive    { get; set; } = true;
}
