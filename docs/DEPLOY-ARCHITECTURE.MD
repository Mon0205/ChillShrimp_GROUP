# Triển khai

```text
Vercel / Netlify (FE) ──> Render / Railway / VPS (BE) ──> Neon PostgreSQL
```

Frontend đặt `VITE_API_URL=https://api.ten-mien-cua-ban/api` khi build.

Backend đặt `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` và SMTP secrets tại môi trường deploy. Trước mỗi deploy backend chạy:

```powershell
npm run prisma:generate
npm run migrate:deploy
npm start
```

Chỉ backend được phép biết `DATABASE_URL` và các secret.
