# Kiến trúc hệ thống

## Thành phần

```text
              ReactJS Web
                   |
                   v
         Node.js / Express API
           /       |        \
          v        v         v
   Supabase DB   Auth     Storage
          \        |        /
           \       |       /
            AI job coordinator
                    |
                    v
        AI microservice (tương lai)
```

- **ReactJS**: client web duy nhất, chỉ gọi Express API.
- **Express**: authentication middleware, validation, nghiệp vụ, phân quyền, báo cáo và điều phối AI job.
- **Supabase**: PostgreSQL, Auth và Storage.
- **RLS**: lớp bảo vệ bổ sung cho dữ liệu; Express vẫn phải kiểm tra membership/role.
- **AI_SERVICE**: microservice độc lập, để trống đến khi chốt dữ liệu và công nghệ.

## Miền nghiệp vụ

1. Identity & access: tài khoản, vai trò, thành viên trại.
2. Farm management: trại, ao/bể, đàn giống, thả giống và vụ nuôi.
3. Care log: cho ăn, thay nước, thuốc/chế phẩm và sức khỏe.
4. Environment: chỉ số môi trường, bộ ngưỡng và cảnh báo.
5. Media & AI: ảnh/video, analysis job, kết quả và xác nhận người dùng.
6. Commerce: chi phí, xuất bán, sản lượng và doanh thu.
7. Reporting: dashboard, thống kê ngày/tuần/tháng và xuất báo cáo.

## Quy tắc phân lớp backend

```text
Route → Middleware → Controller → Service → Repository → Supabase
```

- Controller chỉ đọc request và tạo response.
- Service chứa nghiệp vụ và transaction boundary.
- Repository chứa truy vấn Supabase.
- Frontend không chứa secret/service-role key và không gọi database trực tiếp.
- Media nằm trong private bucket và được truy cập bằng signed URL.
- AI chạy bất đồng bộ; kết quả lưu confidence, model version và cho phép xác nhận.

