# Luồng làm việc

## Mời và đăng nhập

Quản trị chọn trại, nhập email → Express kiểm tra `users.email` và lời mời pending → tạo user chưa có mật khẩu, membership và token mời → SMTP gửi link → người dùng đặt mật khẩu → đăng nhập bằng email/mật khẩu → backend trả JWT.

## Thay đổi database

Tạo migration Prisma trên nhánh phát triển, review file SQL tại `BE/prisma/migrations`, commit cùng code, sau đó deploy bằng `npm run migrate:deploy`. Không sửa database Neon thủ công nếu thay đổi đó cần được quản lý phiên bản.

## AI

FE gọi Express. Express kiểm tra JWT và quyền trại rồi gọi `AI_SERVICE` hoặc nhà cung cấp AI. API key AI chỉ nằm ở backend.
