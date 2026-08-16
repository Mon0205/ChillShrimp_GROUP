# ChillShrimp

Hệ thống quản lý trại tôm/cua giống.

- Frontend: Vue 3, Vuestic UI, Vite
- Backend: Node.js, Express, JWT
- ORM: Prisma
- Database: Neon PostgreSQL (cloud)
- Runtime thống nhất: Docker Compose

## Kiến trúc

```text
Browser
  │ http://localhost:5173
  ▼
┌─────────────────────────────────────────────────────┐
│ Frontend container                                   │
│ Nginx + Vue 3 + Vuestic (image: chillshrimp-frontend)│
└───────────────────┬─────────────────────────────────┘
                    │ /api  (Nginx reverse proxy)
                    ▼
┌─────────────────────────────────────────────────────┐
│ Backend container                                    │
│ Express + JWT + Prisma (image: chillshrimp-backend)  │
└───────────────────┬─────────────────────────────────┘
                    │ DATABASE_URL + SSL
                    ▼
          ┌──────────────────────┐
          │ Neon PostgreSQL Cloud │
          └──────────────────────┘
```

Neon là database cloud nên Docker Compose **không chạy PostgreSQL local**. Connection string Neon chỉ nằm trong `BE/.env`; frontend không được chứa database URL, JWT secret hoặc SMTP password.

## Cấu trúc project

```text
ChillShrimp_GROUP/
├── FE/                              # Vue 3 + Vuestic UI
│   ├── src/
│   │   ├── views/                    # Login, dashboard, lời mời, đặt mật khẩu
│   │   ├── services/                 # API client và farm service
│   │   ├── composables/              # Auth state phía giao diện
│   │   └── router/                   # Vue Router + route guard
│   ├── Dockerfile                    # Build Vite → Nginx image
│   └── nginx.conf                    # Proxy /api sang backend
├── BE/                              # Node.js / Express API
│   ├── src/
│   │   ├── config/                   # Prisma Client
│   │   ├── controllers/              # Xử lý auth, farm, invitation
│   │   ├── middlewares/              # JWT, phân quyền trại, error handler
│   │   ├── routes/                   # Khai báo endpoint
│   │   ├── services/                 # SMTP email
│   │   ├── utils/                    # HTTP helper
│   │   ├── app.js                    # Ghép middleware/routes
│   │   └── server.js                 # Mở HTTP server port 8000
│   ├── prisma/
│   │   ├── schema.prisma             # Prisma models
│   │   ├── migrations/               # Version schema Neon
│   │   └── seed-admin.js             # Tạo admin đầu tiên
│   ├── Dockerfile                    # Express + Prisma image
│   └── .env.example                  # Mẫu cấu hình bí mật
├── AI_SERVICE/                       # Chỗ tích hợp AI sau này
├── docker-compose.yml                # Chạy FE + BE cùng nhau
└── README.md
```

## Luồng xác thực và phân quyền

```text
Admin nhập email
  → Express kiểm tra users.email và lời mời pending
  → tạo user chưa có mật khẩu + membership + invitation token
  → gửi email link đặt mật khẩu (hoặc in link ra terminal khi chưa có SMTP)
  → người dùng đặt mật khẩu
  → đăng nhập email/mật khẩu
  → Express trả JWT
  → middleware kiểm tra JWT và role owner/manager/staff/viewer
```

Mật khẩu được hash bằng bcrypt. JWT secret, Neon URL và SMTP secrets chỉ ở backend.

## Chuẩn bị Neon

1. Tạo project/database tại [Neon Console](https://console.neon.tech).
2. Vào **Connection Details** và copy connection string PostgreSQL có `sslmode=require`.
3. Tại root project, tạo file môi trường backend:

```powershell
Set-Location D:\PJ\ChillShrimp_GROUP
Copy-Item BE\.env.example BE\.env
```

4. Mở `BE/.env`, điền tối thiểu:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
JWT_SECRET="mot-chuoi-ngau-nhien-dai-kho-doan"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="mat-khau-admin-it-nhat-8-ky-tu"
```

Tùy chọn: điền `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` để gửi email mời thật. Không có SMTP thì backend in link lời mời ra log để test.

> Không commit `BE/.env`, `.neon` hay connection string lên Git.

## Chạy bằng Docker Compose (khuyến nghị)

Yêu cầu: Docker Desktop đang chạy.

```powershell
Set-Location D:\PJ\ChillShrimp_GROUP
docker compose up --build -d
```

Lần khởi động đầu tiên, backend tự chạy `prisma migrate deploy`, sau đó khởi động Express. Xem trạng thái và log:

```powershell
docker compose ps
docker compose logs -f
```

Tạo tài khoản admin đầu tiên (chạy một lần sau khi backend đã `healthy`):

```powershell
docker compose exec backend npm run seed:admin
```

Mở ứng dụng và API:

```text
Frontend: http://localhost:5173
Backend health: http://localhost:8000/api/health
Backend API: http://localhost:8000/api
```

Các lệnh Docker thường dùng:

```powershell
docker compose up -d                 # bật lại container đã build
docker compose up --build -d         # build lại image rồi bật
docker compose logs -f backend       # theo dõi backend
docker compose restart backend       # khởi động lại backend
docker compose down                  # dừng và xóa container/network
docker compose down --rmi local      # dừng và xóa image local của project
```

`docker compose down` không xóa dữ liệu Neon.

### Bảng lệnh Docker đầy đủ

| Mục đích | Lệnh PowerShell |
| --- | --- |
| Build image, chạy nền | `docker compose up --build -d` |
| Chạy lại image đã build | `docker compose up -d` |
| Xem trạng thái container | `docker compose ps` |
| Xem tất cả log liên tục | `docker compose logs -f` |
| Xem log backend | `docker compose logs -f backend` |
| Xem 100 dòng log mới nhất | `docker compose logs --tail=100 backend` |
| Restart backend sau đổi `.env` | `docker compose restart backend` |
| Vào shell Linux của backend | `docker compose exec backend sh` |
| Kiểm tra API health | `Invoke-WebRequest http://localhost:8000/api/health` |
| Kiểm tra migration trên Neon | `docker compose exec backend npm run migrate:status` |
| Chạy migration chờ (bình thường tự chạy lúc start) | `docker compose exec backend npm run migrate:deploy` |
| Tạo/cập nhật admin | `docker compose exec backend npm run seed:admin` |
| Dừng stack | `docker compose down` |
| Dừng và xóa image project | `docker compose down --rmi local` |

Sau khi đổi code backend/frontend, build lại:

```powershell
docker compose up --build -d
```

Sau khi chỉ đổi `BE/.env`, không cần build image:

```powershell
docker compose restart backend
```

## Chạy không dùng Docker

Chỉ dùng khi phát triển giao diện/API riêng lẻ.

Terminal backend:

```powershell
Set-Location D:\PJ\ChillShrimp_GROUP\BE
npm install
npm run prisma:generate
npm run migrate:deploy
npm run seed:admin
npm run dev
```

Terminal frontend khác:

```powershell
Set-Location D:\PJ\ChillShrimp_GROUP\FE
Copy-Item .env.example .env
npm install
npm run dev
```

Mặc định `FE/.env` dùng `VITE_API_URL=http://localhost:8000/api`. Khi chạy Docker, frontend build dùng `/api` và Nginx tự chuyển tiếp request tới backend.

### Lệnh local đầy đủ

| Vị trí | Mục đích | Lệnh |
| --- | --- | --- |
| `BE/` | Cài backend | `npm install` |
| `BE/` | Sinh Prisma Client | `npm run prisma:generate` |
| `BE/` | Kiểm tra schema Prisma | `npx prisma validate` |
| `BE/` | Kiểm tra trạng thái migration | `npm run migrate:status` |
| `BE/` | Áp dụng migration Neon | `npm run migrate:deploy` |
| `BE/` | Tạo/cập nhật admin | `npm run seed:admin` |
| `BE/` | Chạy Express có tự reload | `npm run dev` |
| `BE/` | Chạy Express production | `npm start` |
| `FE/` | Cài frontend | `npm install` |
| `FE/` | Chạy Vite dev server | `npm run dev` |
| `FE/` | Kiểm tra build production | `npm run build` |
| `FE/` | Xem thử bản build | `npm run preview` |

## Database migration

Schema Prisma nằm tại `BE/prisma/schema.prisma`; migration nằm tại `BE/prisma/migrations/`.

Khi thêm trường `phone` vào `User`:

1. Thêm `phone String?` vào model `User` trong `schema.prisma` nếu chưa có.
2. Tạo migration trong môi trường có `DATABASE_URL`:

```powershell
Set-Location D:\PJ\ChillShrimp_GROUP\BE
npx prisma migrate dev --name add_phone_to_users
```

3. Commit file migration mới.
4. Áp dụng lên Neon:

```powershell
npm run migrate:deploy
```

Kiểm tra trước/sau khi deploy:

```powershell
npm run migrate:status
```

Nếu migration vừa tạo có SQL trigger, view hoặc SQL PostgreSQL đặc biệt, dùng `--create-only` để Prisma tạo file nhưng chưa chạy; sau đó sửa `migration.sql`, review và mới deploy:

```powershell
npx prisma migrate dev --create-only --name add_feature_name
# sửa BE/prisma/migrations/<timestamp>_add_feature_name/migration.sql
npm run migrate:deploy
```

Không sửa file migration đã chạy trên Neon. Muốn hoàn tác production thì tạo migration mới có thay đổi ngược lại. Trigger `set_updated_at` chỉ cập nhật thời gian sửa bản ghi; logic nghiệp vụ nằm ở Express/Prisma.

> Không chạy `npx prisma migrate reset` với Neon production: lệnh này xóa dữ liệu rồi chạy lại migrations. Prisma không có lệnh `migrate down` tự động cho migration đã chạy thành công.

### Lưu ý quan trọng về nhiều migration và rollback

`npm run migrate:deploy` (hoặc `docker compose exec backend npm run migrate:deploy`) tự tìm **tất cả** thư mục migration chưa chạy trong `BE/prisma/migrations/` và chạy chúng theo timestamp. Không cần chạy từng file.

```text
20260816160000_initial_neon  → đã chạy
20260817090000_add_phone     → chưa chạy
20260817100000_create_ponds  → chưa chạy

migrate:deploy chạy add_phone, sau đó create_ponds.
```

Không làm theo quy trình `chạy down.sql → xóa migration.sql (up) → chạy lại toàn bộ`. Neon ghi nhận migration đã chạy trong bảng `_prisma_migrations`; xóa file `migration.sql` sẽ làm source code và lịch sử database bị lệch.

| Tình huống | Cách xử lý đúng |
| --- | --- |
| Migration mới chưa deploy | Có thể sửa/xóa file migration đó rồi tạo lại. |
| Migration đã chạy thành công trên Neon | Tạo **migration mới** chứa SQL ngược lại, sau đó chạy `migrate:deploy`. |
| Migration lỗi giữa chừng | Có thể dùng `down.sql` thủ công, chạy SQL rollback rồi đánh dấu migration rolled back. |
| Neon dev/test có thể mất dữ liệu | Dùng `npx prisma migrate reset` để xóa database và chạy lại mọi migration up. Không dùng production. |

Ví dụ migration `add_phone` đã chạy thành công thì rollback bằng migration mới `remove_phone`:

```sql
alter table "users" drop column "phone";
```

Với migration lỗi giữa chừng, mới tạo `down.sql` thủ công trong thư mục migration và chạy:

```powershell
docker compose exec backend npx prisma db execute --file ./prisma/migrations/<timestamp>_add_phone/down.sql
docker compose exec backend npx prisma migrate resolve --rolled-back <timestamp>_add_phone
```

`migrate resolve` chỉ cập nhật lịch sử Prisma, không chạy SQL. Nếu một ngày cần workflow `up/down` tự động cho mọi migration, phải chuyển hẳn migration tool sang `node-pg-migrate`, Knex hoặc Sequelize; không chạy song song với Prisma Migrate trên cùng database.

## API hiện có

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| POST | `/api/auth/login` | Đăng nhập, trả JWT |
| GET | `/api/auth/me` | Lấy user hiện tại |
| POST | `/api/auth/accept-invitation` | Đặt mật khẩu qua token mời |
| GET/POST | `/api/farms` | Xem/tạo trại |
| PATCH/DELETE | `/api/farms/:farmId` | Sửa/xóa trại |
| GET | `/api/invitations/check-email` | Kiểm tra email trước khi mời |
| POST | `/api/invitations` | Tạo và gửi lời mời |

Trừ `login`, `accept-invitation` và `health`, API yêu cầu header:

```text
Authorization: Bearer <JWT>
```
