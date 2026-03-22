using FChicken.API.Models;
using System.Security.Cryptography;
using System.Text;

namespace FChicken.API.Data;

/// <summary>
/// In-memory data store — thay bang DbContext / EF Core khi deploy that su
/// </summary>
public class MockDb
{
    // ── Singleton collections ──────────────────────────────────────────
    public List<User>      Users      { get; } = new();
    public List<Category>  Categories { get; } = new();
    public List<Product>   Products   { get; } = new();
    public List<Order>     Orders     { get; } = new();
    public List<Voucher>   Vouchers   { get; } = new();
    public List<Favorite>  Favorites  { get; } = new();

    // Cart: userId -> list items (guests use session/localStorage)
    public Dictionary<int, List<CartItem>> Carts { get; } = new();

    // Sequences
    private int _userSeq = 10;
    private int _orderSeq = 200; // Start above seeded IDs (101-104)
    public int NextUserId()  => Interlocked.Increment(ref _userSeq);
    public int NextOrderId() => Interlocked.Increment(ref _orderSeq);

    // ── Constructor: seed ──────────────────────────────────────────────
    public MockDb() => Seed();

    private void Seed()
    {
        SeedCategories();
        SeedProducts();
        SeedUsers();
        SeedVouchers();
        SeedOrders();
    }

    // ── Categories ─────────────────────────────────────────────────────
    private void SeedCategories()
    {
        Categories.AddRange(new[]
        {
            new Category { Id=1, Name="Ga Ran",   Icon="drumstick", Slug="ga-ran",   SortOrder=1 },
            new Category { Id=2, Name="Combo",    Icon="package",   Slug="combo",    SortOrder=2 },
            new Category { Id=3, Name="Mon Phu",  Icon="utensils",  Slug="mon-phu",  SortOrder=3 },
            new Category { Id=4, Name="Nuoc Uong",Icon="coffee",    Slug="nuoc-uong",SortOrder=4 },
        });
    }

    // ── Products ───────────────────────────────────────────────────────
    private void SeedProducts()
    {
        Products.AddRange(new[]
        {
            new Product { Id=1, Name="Ga Ran Original",    CategoryId=1, CategoryName="Ga Ran",
                Description="Gion rum, dam da, cong thuc bi truyen 11 gia vi",
                Price=55000, IsHot=true, IsFeatured=true, SoldCount=1240,
                ImageUrl="https://images.pexels.com/photos/60616/fried-chicken-chicken-fried-crunchy-60616.jpeg?auto=compress&cs=tinysrgb&w=400" },

            new Product { Id=2, Name="Ga Ran Spicy",       CategoryId=1, CategoryName="Ga Ran",
                Description="Cay xe luoi, khong danh cho nguoi nhat gan",
                Price=59000, IsHot=true, IsFeatured=true, SoldCount=980,
                ImageUrl="https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=400" },

            new Product { Id=3, Name="Burger Ga Crispy",   CategoryId=1, CategoryName="Ga Ran",
                Description="Ga gion, rau tuoi, sot dac biet trong banh mem",
                Price=65000, OriginalPrice=75000, IsHot=false, IsFeatured=true, SoldCount=754,
                ImageUrl="https://images.pexels.com/photos/1639565/pexels-photo-1639565.jpeg?auto=compress&cs=tinysrgb&w=400" },

            new Product { Id=4, Name="Burger Ga BBQ",      CategoryId=1, CategoryName="Ga Ran",
                Description="Sot BBQ thom lung, pho mai tan chay",
                Price=72000, IsHot=true, IsFeatured=false, SoldCount=632,
                ImageUrl="https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=400" },

            new Product { Id=5, Name="Khoai Tay Chien",    CategoryId=3, CategoryName="Mon Phu",
                Description="Vang gion, muoi tieu, kem sot ca chua",
                Price=29000, IsHot=false, IsFeatured=true, SoldCount=2100,
                ImageUrl="https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?auto=compress&cs=tinysrgb&w=400" },

            new Product { Id=6, Name="Bap Rang Bo",        CategoryId=3, CategoryName="Mon Phu",
                Description="Bo thom, muoi nhe, an kem hoan hao",
                Price=25000, IsHot=false, IsFeatured=false, SoldCount=890,
                ImageUrl="https://images.pexels.com/photos/1374510/pexels-photo-1374510.jpeg?auto=compress&cs=tinysrgb&w=400" },

            new Product { Id=7, Name="Pepsi Lon",          CategoryId=4, CategoryName="Nuoc Uong",
                Description="Sang khoai, mat lanh",
                Price=15000, IsHot=false, IsFeatured=false, SoldCount=3400,
                ImageUrl="https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg?auto=compress&cs=tinysrgb&w=400" },

            new Product { Id=8, Name="Combo Doi",          CategoryId=2, CategoryName="Combo",
                Description="2 Ga ran + 2 Khoai tay + 2 Pepsi, tiet kiem 30%",
                Price=169000, OriginalPrice=220000, IsHot=true, IsFeatured=true, SoldCount=445,
                ImageUrl="https://images.pexels.com/photos/60616/fried-chicken-chicken-fried-crunchy-60616.jpeg?auto=compress&cs=tinysrgb&w=400" },

            new Product { Id=9, Name="Combo Gia Dinh",     CategoryId=2, CategoryName="Combo",
                Description="4 Ga ran + 4 Khoai tay + 4 Pepsi + 1 Bap rang",
                Price=299000, OriginalPrice=380000, IsHot=true, IsFeatured=true, SoldCount=312,
                ImageUrl="https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=400" },

            new Product { Id=10, Name="Tra Da Chanh",      CategoryId=4, CategoryName="Nuoc Uong",
                Description="Tuoi mat, chua nhe, giai nhiet hoan hao",
                Price=18000, IsHot=false, IsFeatured=false, SoldCount=1560,
                ImageUrl="https://images.pexels.com/photos/1374510/pexels-photo-1374510.jpeg?auto=compress&cs=tinysrgb&w=400" },

            new Product { Id=11, Name="Ga Ran Pho Mai",    CategoryId=1, CategoryName="Ga Ran",
                Description="Lop pho mai chay xuon tang vi, dac biet F-Chicken",
                Price=69000, IsHot=true, IsFeatured=true, SoldCount=520,
                ImageUrl="https://images.pexels.com/photos/60616/fried-chicken-chicken-fried-crunchy-60616.jpeg?auto=compress&cs=tinysrgb&w=400" },

            new Product { Id=12, Name="Salad Ga",          CategoryId=3, CategoryName="Mon Phu",
                Description="Rau xanh tuoi, ga nuong, sot thom nhe",
                Price=45000, IsHot=false, IsFeatured=false, SoldCount=234,
                ImageUrl="https://images.pexels.com/photos/1639565/pexels-photo-1639565.jpeg?auto=compress&cs=tinysrgb&w=400" },
        });
    }

    // ── Users ──────────────────────────────────────────────────────────
    private void SeedUsers()
    {
        Users.AddRange(new[]
        {
            new User {
                Id=1, FullName="Admin F-Chicken", Email="admin@fchicken.vn",
                Phone="0900000001", Role=UserRole.Admin,
                PasswordHash=HashPassword("Admin@123"),
                Address="1 Le Duan, Q1, TP.HCM",
            },
            new User {
                Id=2, FullName="Trieu Le Vo Hoang", Email="hoangtrieu@gmail.com",
                Phone="0901234567", Role=UserRole.User,
                PasswordHash=HashPassword("User@123"),
                Address="123 Nguyen Thi Minh Khai, Bien Hoa, Dong Nai",
            },
            new User {
                Id=3, FullName="Nguyen Thi Lan", Email="lan@gmail.com",
                Phone="0912345678", Role=UserRole.User,
                PasswordHash=HashPassword("User@123"),
            },
            new User {
                Id=4, FullName="Tran Minh Khoa", Email="khoa@gmail.com",
                Phone="0923456789", Role=UserRole.User,
                PasswordHash=HashPassword("User@123"),
            },
        });

        // Seed favorites for user 2
        Favorites.AddRange(new[]
        {
            new Favorite { UserId=2, ProductId=1 },
            new Favorite { UserId=2, ProductId=3 },
            new Favorite { UserId=2, ProductId=8 },
        });
    }

    // ── Vouchers ───────────────────────────────────────────────────────
    private void SeedVouchers()
    {
        Vouchers.AddRange(new[]
        {
            new Voucher { Id=1, Code="WEEKEND20", Description="Giam 20% cuoi tuan",
                Type=VoucherType.Percentage, Value=20, MinOrder=100000, MaxDiscount=50000,
                UsageLimit=200, UsedCount=82, ExpiresAt=DateTime.UtcNow.AddDays(30) },

            new Voucher { Id=2, Code="WELCOME30", Description="Giam 30k don dau tien",
                Type=VoucherType.FixedAmount, Value=30000, MinOrder=50000,
                UsageLimit=9999, UsedCount=201 },

            new Voucher { Id=3, Code="FREESHIP99", Description="Mien phi ship don tu 99k",
                Type=VoucherType.FreeShipping, Value=100, MinOrder=99000,
                UsageLimit=500, UsedCount=456, ExpiresAt=DateTime.UtcNow.AddDays(60) },

            new Voucher { Id=4, Code="SUMMER15", Description="Khuyen mai he - giam 15%",
                Type=VoucherType.Percentage, Value=15, MinOrder=80000, MaxDiscount=40000,
                UsageLimit=100, UsedCount=34, ExpiresAt=DateTime.UtcNow.AddDays(15) },
        });
    }

    // ── Orders ─────────────────────────────────────────────────────────
    private void SeedOrders()
    {
        var now = DateTime.UtcNow;

        Orders.Add(new Order {
            Id=101, Code="#FC-20260320-001", UserId=2,
            UserName="Trieu Le Vo Hoang", UserEmail="hoangtrieu@gmail.com",
            Phone="0901234567", Address="123 Nguyen Thi Minh Khai, Bien Hoa",
            Status=OrderStatus.Delivering,
            Subtotal=110000, ShippingFee=15000, Discount=0, Total=125000,
            PaymentMethod="Tien mat", CreatedAt=now.AddHours(-2),
            Items=new(){
                new(){ ProductId=1, ProductName="Ga Ran Original",
                    ImageUrl=Products[0].ImageUrl, Price=55000, Qty=2 }
            },
            TrackingHistory=new(){
                new(){ Status="Pending",    Message="Da dat hang",    Time=now.AddHours(-2), IsDone=true },
                new(){ Status="Confirmed",  Message="Da xac nhan",    Time=now.AddHours(-1.8), IsDone=true },
                new(){ Status="Preparing",  Message="Dang che bien",  Time=now.AddHours(-1.2), IsDone=true },
                new(){ Status="Delivering", Message="Dang giao hang", Time=now.AddMinutes(-30), IsDone=false },
            }
        });

        Orders.Add(new Order {
            Id=102, Code="#FC-20260318-002", UserId=2,
            UserName="Trieu Le Vo Hoang", UserEmail="hoangtrieu@gmail.com",
            Phone="0901234567", Address="123 Nguyen Thi Minh Khai, Bien Hoa",
            Status=OrderStatus.Delivered,
            Subtotal=299000, ShippingFee=0, Discount=0, Total=299000,
            VoucherCode="FREESHIP99", PaymentMethod="Chuyen khoan",
            CreatedAt=now.AddDays(-2), DeliveredAt=now.AddDays(-2).AddHours(1),
            Items=new(){
                new(){ ProductId=9, ProductName="Combo Gia Dinh",
                    ImageUrl=Products[8].ImageUrl, Price=299000, Qty=1 }
            },
            TrackingHistory=new(){
                new(){ Status="Pending",   Message="Da dat hang",     Time=now.AddDays(-2), IsDone=true },
                new(){ Status="Delivered", Message="Giao thanh cong", Time=now.AddDays(-2).AddHours(1), IsDone=true },
            }
        });

        Orders.Add(new Order {
            Id=103, Code="#FC-20260315-003", UserId=3,
            UserName="Nguyen Thi Lan", UserEmail="lan@gmail.com",
            Phone="0912345678", Address="45 Le Loi, Q3, TP.HCM",
            Status=OrderStatus.Delivered,
            Subtotal=189000, ShippingFee=15000, Discount=30000, Total=174000,
            VoucherCode="WELCOME30", PaymentMethod="Tien mat",
            CreatedAt=now.AddDays(-5), DeliveredAt=now.AddDays(-5).AddHours(1),
            Items=new(){
                new(){ ProductId=3, ProductName="Burger Ga Crispy",
                    ImageUrl=Products[2].ImageUrl, Price=65000, Qty=3 }
            },
            TrackingHistory=new(){
                new(){ Status="Delivered", Message="Giao thanh cong", Time=now.AddDays(-5).AddHours(1), IsDone=true },
            }
        });

        Orders.Add(new Order {
            Id=104, Code="#FC-20260320-004", UserId=4,
            UserName="Tran Minh Khoa", UserEmail="khoa@gmail.com",
            Phone="0923456789", Address="78 Dinh Tien Hoang, Q1",
            Status=OrderStatus.Pending,
            Subtotal=65000, ShippingFee=15000, Discount=0, Total=80000,
            PaymentMethod="Tien mat", CreatedAt=now.AddMinutes(-15),
            Items=new(){
                new(){ ProductId=5, ProductName="Khoai Tay Chien",
                    ImageUrl=Products[4].ImageUrl, Price=29000, Qty=1 },
                new(){ ProductId=7, ProductName="Pepsi Lon",
                    ImageUrl=Products[6].ImageUrl, Price=15000, Qty=1 },
                new(){ ProductId=6, ProductName="Bap Rang Bo",
                    ImageUrl=Products[5].ImageUrl, Price=25000, Qty=1 },
            },
            TrackingHistory=new(){
                new(){ Status="Pending", Message="Cho xac nhan", Time=now.AddMinutes(-15), IsDone=false },
            }
        });
    }

    // ── Helpers ────────────────────────────────────────────────────────
    public static string HashPassword(string password)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password + "fchicken_salt"));
        return Convert.ToBase64String(bytes);
    }

    public static bool VerifyPassword(string password, string hash)
        => HashPassword(password) == hash;

    public string GenerateOrderCode()
    {
        var n = NextOrderId();
        return $"#FC-{DateTime.UtcNow:yyyyMMdd}-{n:D3}";
    }

    public List<CartItem> GetOrCreateCart(int userId)
    {
        if (!Carts.ContainsKey(userId))
            Carts[userId] = new List<CartItem>();
        return Carts[userId];
    }

    // ── Status label helper ────────────────────────────────────────────
    public static string StatusLabel(OrderStatus s) => s switch
    {
        OrderStatus.Pending    => "Cho xu ly",
        OrderStatus.Confirmed  => "Da xac nhan",
        OrderStatus.Preparing  => "Dang che bien",
        OrderStatus.Delivering => "Dang giao hang",
        OrderStatus.Delivered  => "Da giao",
        OrderStatus.Cancelled  => "Da huy",
        _ => s.ToString()
    };
}
