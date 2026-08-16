# Backend – Express + Prisma + Neon

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
