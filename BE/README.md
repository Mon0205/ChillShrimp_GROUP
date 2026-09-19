# Backend – Express + Prisma + Neon

## Quy ước đặt tên migration

Migration mới sử dụng định dạng `ddmmyyyy_STT_ten_migration`.

- `ddmmyyyy`: ngày tạo migration; ngày 02/09/2026 được viết là `02092026`.
- `STT`: số thứ tự tạo trong ngày, gồm ba chữ số, bắt đầu từ `001`.
- `ten_migration`: mô tả ngắn bằng tiếng Anh, viết thường và ngăn cách bằng dấu gạch dưới.

Ví dụ:

```text
02092026_001_add_farm_code
02092026_002_area_scoped_roles
02092026_003_enforce_single_area_scope
```

Không dùng dấu `/` trong tên thư mục vì hệ điều hành hiểu đó là ký tự phân tách thư mục. Không đổi tên migration đã deploy lên Neon vì tên đã được lưu trong bảng `_prisma_migrations`; quy ước này áp dụng cho các migration mới.

## Lệnh dùng hằng ngày

```powershell
Copy-Item .env.example .env
npm install
npm run prisma:generate
npm run migrate:deploy
npm run dev
```

## API chính

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/accept-invitation`
- `GET|POST|PATCH|DELETE /api/farms`
- `GET /api/invitations/check-email`
- `POST /api/invitations`

Mọi API trừ đăng nhập/nhận lời mời đều yêu cầu `Authorization: Bearer <JWT>`.

## Cấu trúc Express

```text
src/
  config/       Prisma client
  controllers/  nhận request, trả response
  middlewares/  JWT, kiểm tra quyền trại, lỗi
  routes/       khai báo API endpoint
  services/     email và tích hợp bên ngoài
  utils/        HTTP helper
  app.js        ghép middleware và routes
  server.js     khởi động HTTP server
```
