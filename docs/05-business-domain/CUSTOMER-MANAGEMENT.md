# UC08.4 — Quản lý khách hàng

Đã có frontend `/customers` và API `/api/farms/:farmId/customers`. Mọi endpoint yêu cầu phiên hợp lệ, membership Owner active và trại chưa archived.

| Method | Path sau `/customers` | Chức năng |
| --- | --- | --- |
| GET | `/` | Danh sách, `q` theo tên/điện thoại, `customerType`, `page`, `limit` (1–100) |
| POST | `/` | Tạo khách |
| GET | `/:customerId` | Chi tiết |
| PATCH | `/:customerId` | Sửa các trường được hỗ trợ; không nhận body rỗng |
| DELETE | `/:customerId` | Xóa mềm; ẩn khỏi danh sách, giữ hồ sơ |

Dữ liệu API dùng camelCase: `name` (bắt buộc, tối đa 150), `customerType` (bắt buộc: farm/household/cooperative/other), `phone` (tùy chọn, tối đa 20, chữ số và ký tự định dạng điện thoại), `address`, `notes` (tùy chọn, tối đa 4000). Trường khác bị từ chối. Không áp đặt số điện thoại unique vì đặc tả chưa chốt quy tắc trùng khách.

Migration mới: `20261011_028_add_customers`. `deleted_at` là phần bổ sung để bảo toàn hồ sơ khi xóa; FK tới farm dùng Restrict. Không có chức năng khôi phục trong phạm vi lần triển khai này. Lịch sử mua chưa được tích hợp vì `seed_sales`/UC08.5 chưa triển khai; giao diện thông báo giới hạn này thay vì giả lập dữ liệu bán.

## Chuẩn bị database

Migration đã được tạo trong source; chưa áp dụng tự động lên Neon trong lần triển khai. Trên môi trường đích, kiểm tra các migration đang chờ trước khi chạy:

```powershell
cd BE
npm.cmd run migrate:status
npm.cmd run migrate:deploy
npm.cmd run prisma:generate
```

`migrate:deploy` chạy mọi migration còn chờ. Docker entrypoint hiện cũng chạy migrate deploy khi khởi động backend. Sau đó khởi động lại backend và frontend/build image như bình thường.

Test API dùng mock Prisma để kiểm tra CRUD, role không phải Owner, truy cập chéo trại, input sai, tìm kiếm/lọc và ẩn khách xóa mềm. Cần kiểm thử bổ sung trên staging với migration thật và phiên Neon trước khi nghiệm thu E2E.
