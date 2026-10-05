# Backend – Express + Prisma + Neon

Rà soát việc ưu tiên Neon Auth/Vuetify và các ngoại lệ nghiệp vụ: [báo cáo](../docs/neon-vuetify-audit.md).

## Kiểm thử đăng nhập, suspend và OTP


Trạng thái `suspended` thuộc về thành viên của từng trại. Tài khoản bị ngưng ở tất cả trại không được đăng nhập hoặc sử dụng phiên cũ (403). Tài khoản còn active ở trại khác vẫn được truy cập trại đó. Chỉ Owner active được tạo trại; `ADMIN_EMAIL` chỉ hỗ trợ tạo trại đầu tiên khi chưa có membership. Nút Ngưng sử dụng/Kích hoạt trong trang Người dùng chỉ tác động đến trại đang chọn, không cho tự ngưng chính mình.

OTP đặt lại mật khẩu do **Neon Auth** gửi, không dùng `SMTP_*` trong `email.service.js` (các biến đó dùng cho lời mời). API yêu cầu OTP dùng `/email-otp/request-password-reset`, chỉ quay về `/forget-password/email-otp` khi nhà cung cấp trả 404. Xem [tài liệu OTP](https://better-auth.com/docs/plugins/email-otp) và [cấu hình email provider của Neon](https://api-docs.neon.tech/reference/updateneonauthemailprovider).

Để nghiệm thu TC16 trên môi trường thật, kiểm tra cấu hình email provider của đúng Neon branch, hạn mức gửi, log gửi mail và thư mục spam. HTTP 200 từ nhà cung cấp không chứng minh thư đã đến hộp thư. Không ghi OTP hoặc mật khẩu vào log. Sau khi nhận được thư, chạy TC18–25 với OTP thật; thời hạn ứng dụng là 60 giây tính từ khi yêu cầu gửi thành công. Kiểm tra TC95 với hai trại và một Owner khác thực hiện suspend, rồi thử cả phiên cũ lẫn đăng nhập mới của người bị ngưng. Các kiểm thử mock không thay thế bước E2E này.

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
