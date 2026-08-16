# Chi tiết kiến trúc

```text
Vue/Vuestic (FE) ── HTTPS REST + JWT ──> Express (BE) ── Prisma ORM ──> Neon PostgreSQL
                                               │
                                               ├── SMTP: gửi lời mời
                                               └── AI_SERVICE: gọi phân tích ảnh khi cần
```

- `FE`: chỉ có `VITE_API_URL`, không giữ connection string, SMTP credential hay JWT secret.
- `BE`: xác thực JWT, phân quyền theo `farm_members`, xử lý CRUD và luồng lời mời.
- `Neon`: chỉ lưu dữ liệu PostgreSQL. Prisma migration là nguồn quản lý schema.
- Trigger `set_updated_at`: tự động đổi `updated_at`; không đặt nghiệp vụ vào PostgreSQL function.

Storage/media chưa được cấu hình. Khi cần, thêm S3/R2/Cloudinary qua Express; không cho frontend cầm khóa ghi private storage.
