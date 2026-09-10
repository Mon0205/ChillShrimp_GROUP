# Chi tiết kiến trúc

```text
Browser
  │ HTTPS + cookie HttpOnly
  ▼
Vue/Vuetify (FE) ── REST /api ──> Express (BE)
                                     ├── Neon Auth: xác thực danh tính
                                     ├── Prisma ORM ──> Neon PostgreSQL
                                     ├── SMTP: gửi lời mời
                                     └── AI_SERVICE: phân tích ảnh khi triển khai
```

- `FE`: chỉ có `VITE_API_URL`, giữ farm đang chọn trong farm context và luôn gửi request với `credentials: include`.
- `BE`: xác thực Neon Auth, kiểm tra `access_sessions`, tải membership theo `(farm_id, user_id)` và xử lý nghiệp vụ.
- `Neon`: lưu dữ liệu PostgreSQL; Prisma migration là nguồn quản lý schema.
- Trigger `set_updated_at`: tự động đổi `updated_at`; không đặt nghiệp vụ vào PostgreSQL function.

## Ranh giới dữ liệu

```text
users
  └── farm_members ──> farms
          ├── role
          ├── status
          └── area_id ──> areas
```

`users` không quyết định quyền. Mỗi request thuộc farm phải đi qua membership `active`; `area_manager` và `technician` tiếp tục bị giới hạn theo `area_id`. Dữ liệu nghiệp vụ phải chứa `farm_id` hoặc truy ngược chắc chắn về một farm để chống truy cập chéo tenant.

`ADMIN_EMAIL` là cấu hình bootstrap, không phải actor nghiệp vụ. Sau khi farm được tạo, mọi quyền trong farm phải được quyết định bởi `farm_members`.

Storage/media chưa được cấu hình. Khi cần, thêm S3/R2/Cloudinary qua Express; không cho frontend cầm khóa ghi private storage.

Chi tiết bảng và quyền được định nghĩa tại [DATABASE.md](./DATABASE.md), [ERD.md](./ERD.md), [SRS.md](./SRS.md) và [USECASE.md](./USECASE.md). Các hạn chế hiện thực multi-farm được theo dõi tại [ARCHITECTURE.md](./ARCHITECTURE.md#5-trạng-thái-hiện-thực-và-khoảng-cách-còn-lại).
