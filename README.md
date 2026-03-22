# F-Chicken — ASP.NET Core 8 Portfolio Demo

> Web ecommerce giao do an — showcase day du luong hoat dong, phan quyen, JWT.

## Tech Stack

| Layer    | Cong nghe                                     |
|----------|-----------------------------------------------|
| Backend  | ASP.NET Core 8 Web API, C#                    |
| Auth     | JWT (HMACSHA256 thu cong — khong can NuGet)   |
| Data     | In-memory MockDb (thay bang EF Core + SQL khi deploy) |
| Frontend | Vanilla HTML/CSS/JS, Lucide Icons             |
| Font     | Be Vietnam Pro (Google Fonts)                 |

---

## Chay du an

```bash
cd FChicken.API
dotnet run
# Mo trinh duyet: http://localhost:5000
```

> **Luu y:** Chi can .NET 8 SDK. Khong can NuGet, khong can database.

---

## Demo Accounts

| Role  | Email                  | Mat khau   |
|-------|------------------------|------------|
| Admin | admin@fchicken.vn      | Admin@123  |
| User  | hoangtrieu@gmail.com   | User@123   |
| User  | lan@gmail.com          | User@123   |

---

## API Endpoints

### Auth
| Method | Path                      | Mo ta                      |
|--------|---------------------------|----------------------------|
| POST   | /api/auth/register        | Dang ky tai khoan           |
| POST   | /api/auth/login           | Dang nhap → JWT token       |
| POST   | /api/auth/forgot-password | Yeu cau reset mat khau      |
| POST   | /api/auth/reset-password  | Doi mat khau bang token     |
| GET    | /api/auth/me              | Thong tin user hien tai     |
| PUT    | /api/auth/profile         | Cap nhat ho so              |
| PUT    | /api/auth/change-password | Doi mat khau                |

### Products
| Method | Path                              | Quyen    |
|--------|-----------------------------------|----------|
| GET    | /api/products                     | Guest    |
| GET    | /api/products/{id}                | Guest    |
| POST   | /api/products                     | Admin    |
| PUT    | /api/products/{id}                | Admin    |
| DELETE | /api/products/{id}                | Admin    |
| PATCH  | /api/products/{id}/toggle-featured| Admin    |

### Cart (JWT required)
| Method | Path               |
|--------|--------------------|
| GET    | /api/cart          |
| POST   | /api/cart          |
| PUT    | /api/cart/{id}     |
| DELETE | /api/cart/{id}     |
| DELETE | /api/cart          |

### Orders (JWT required)
| Method | Path                     | Quyen        |
|--------|--------------------------|--------------|
| GET    | /api/orders              | User/Admin   |
| GET    | /api/orders/{id}         | Owner/Admin  |
| POST   | /api/orders              | User         |
| PATCH  | /api/orders/{id}/status  | Admin        |
| DELETE | /api/orders/{id}         | Owner/Admin  |
| GET    | /api/orders/stats        | Admin        |

### Favorites (JWT required)
| Method | Path                    |
|--------|-------------------------|
| GET    | /api/favorites          |
| GET    | /api/favorites/ids      |
| POST   | /api/favorites/{id}     |

### Vouchers
| Method | Path                    | Quyen    |
|--------|-------------------------|----------|
| POST   | /api/vouchers/validate  | Guest    |
| GET    | /api/vouchers           | Admin    |
| POST   | /api/vouchers           | Admin    |
| PUT    | /api/vouchers/{id}      | Admin    |
| DELETE | /api/vouchers/{id}      | Admin    |

### Admin Users
| Method | Path                              | Quyen |
|--------|-----------------------------------|-------|
| GET    | /api/admin/users                  | Admin |
| PATCH  | /api/admin/users/{id}/toggle-active| Admin|
| PATCH  | /api/admin/users/{id}/role        | Admin |

---

## Cau truc thu muc

```
FChicken/
└── FChicken.API/
    ├── Controllers/
    │   ├── AuthController.cs        # Login, Register, Forgot/Reset PW
    │   ├── ProductsController.cs    # CRUD + toggle featured
    │   ├── CategoriesController.cs  # CRUD
    │   ├── CartController.cs        # Gio hang theo userId (JWT)
    │   ├── OrdersController.cs      # Dat hang, tracking, admin manage
    │   └── MiscControllers.cs       # Favorites, Vouchers, Admin Users
    ├── Data/
    │   └── MockDb.cs               # In-memory store + seed data
    ├── DTOs/
    │   └── DTOs.cs                 # Request/Response shapes
    ├── Middleware/
    │   └── JwtMiddleware.cs        # Bearer token → HttpContext.Items
    ├── Models/
    │   └── Models.cs               # Domain models + Enums
    ├── Services/
    │   └── JwtService.cs           # HMACSHA256 JWT (no NuGet)
    └── wwwroot/                    # SPA Frontend
        ├── index.html
        ├── css/
        │   ├── tokens.css          # Design tokens (colors, spacing...)
        │   ├── base.css            # Reset, typography, shared buttons
        │   ├── layout.css          # Header, cart drawer, footer
        │   ├── home.css            # Hero, promo strip, why section
        │   ├── menu.css            # Product grid, category tabs
        │   ├── pages.css           # Checkout, tracking, auth, profile
        │   ├── admin.css           # Admin sidebar, KPI, data table
        │   └── extra.css           # Modals, fav btn, responsive
        └── js/
            ├── api.js              # Tat ca fetch wrappers
            ├── auth.js             # Auth state (localStorage)
            ├── cart.js             # Cart state (guest: LS, user: server)
            ├── utils.js            # Router, toast, helpers
            ├── home.js             # Home, Menu, Favorites logic
            ├── cartDrawer.js       # Cart drawer render
            ├── pages.js            # Checkout, Tracking, Profile
            ├── authPages.js        # Login, Register, Forgot PW UI
            └── admin.js            # Admin CRUD dashboard
```

---

## Features Showcase

- **JWT Auth** — login/register/forgot-password/reset-password
- **Phan quyen 3 cap** — Guest / User / Admin
- **Gio hang** — Guest dung localStorage, User dong bo voi server
- **Yeu thich** — Toggle, luu theo userId, hien thi trong profile
- **Dat hang** — Validate items, apply voucher, clear cart
- **Order Tracking** — Timeline trang thai real-time
- **Admin Dashboard** — KPI, CRUD san pham/danh muc/voucher, quan ly user
- **Featured products** — Admin bat/tat hien thi o trang chu
- **Voucher engine** — Percentage / Fixed / FreeShipping
