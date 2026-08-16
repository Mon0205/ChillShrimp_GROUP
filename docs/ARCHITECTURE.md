# Kiến trúc hiện tại

Frontend `FE/` là Vue 3, Vite và Vuestic UI. Frontend chỉ gọi REST API tại `VITE_API_URL`; không chứa secret database hoặc JWT secret.

Backend `BE/` là Node.js/Express. Prisma ORM kết nối Neon PostgreSQL bằng `DATABASE_URL`. Backend giữ JWT secret, SMTP và mọi logic phân quyền.

Database schema và phiên bản nằm ở `BE/prisma/migrations`. Trigger `set_updated_at` là trigger kỹ thuật duy nhất để cập nhật thời gian sửa bản ghi; không có RPC/database function xử lý nghiệp vụ.

Luồng mời người dùng: admin kiểm tra email → backend xác nhận chưa có user → tạo user chưa đặt mật khẩu, membership và invitation → gửi link email → người dùng đặt mật khẩu → đăng nhập bằng email/mật khẩu.
