# Luồng làm việc

## Mời và đăng nhập

Owner chọn farm, nhập email, role và khu vực nếu cần → Express kiểm tra membership/lời mời `pending` trong đúng farm → tạo `farm_invitations` → SMTP gửi link → người nhận chấp nhận → hệ thống tạo `farm_members` cho farm đó.

Neon Auth xác thực email/mật khẩu bằng cookie `HttpOnly`; Backend duy trì thêm phiên ứng dụng trong `access_sessions`. Sau đăng nhập, người dùng chọn một farm từ danh sách membership `active`; role được đọc lại từ `farm_members`, không lấy từ `users` hoặc dữ liệu do frontend tự gửi.

Theo kiến trúc đích, tài khoản đã tồn tại có thể nhận thêm membership ở farm khác mà không tạo user mới. Luồng này hiện còn là khoảng cách triển khai được ghi trong `ARCHITECTURE.md`.

## Thay đổi database

Tạo migration Prisma trên nhánh phát triển, review file SQL tại `BE/prisma/migrations`, commit cùng code, sau đó deploy bằng `npm run migrate:deploy`. Không sửa database Neon thủ công nếu thay đổi đó cần được quản lý phiên bản.

## AI

FE gọi Express. Express kiểm tra phiên, membership, role và phạm vi farm/khu vực rồi mới gọi `AI_SERVICE` hoặc nhà cung cấp AI. API key AI chỉ nằm ở backend.
