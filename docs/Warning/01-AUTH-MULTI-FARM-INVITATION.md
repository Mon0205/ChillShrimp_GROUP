# Cảnh báo: Tài khoản, lời mời và nhiều trang trại

## AUTH-01 — Mâu thuẫn trong mô hình nhiều trang trại

**Mức độ:** Critical  
**Trạng thái:** Chờ chốt với partner

### Logic hiện tại

- Role và trạng thái thành viên được lưu theo từng farm trong `farm_members`.
- Tài liệu định hướng một người dùng có thể tham gia nhiều farm.
- Migration `20260902_004_enforce_single_farm_non_owner` lại giới hạn role không phải Owner chỉ thuộc một farm.
- API tạo lời mời từ chối email đã tồn tại trong bảng `users`.

### Rủi ro

- Area Manager, Technician và Warehouse Staff không thể làm việc tại nhiều farm.
- Kiến trúc, tài liệu, database và hành vi API không đồng nhất.
- Khó mở rộng mô hình nhân viên kỹ thuật phụ trách nhiều cơ sở.

### Cần partner chốt

1. Mọi role có được tham gia nhiều farm không?
2. Một user có được giữ role khác nhau tại từng farm không?
3. Nếu giới hạn một farm cho nhân viên, đây là quy tắc dài hạn hay chỉ của MVP?

### Đề xuất

Cho phép mọi user tham gia nhiều farm; role, status và area scope tiếp tục nằm trong `farm_members`. Nếu thống nhất hướng này, cần tạo migration mới để bỏ trigger giới hạn non-owner.

## AUTH-02 — Không thể mời user đã tồn tại vào farm khác

**Mức độ:** Critical

### Logic hiện tại

`createInvitation()` trả `409` khi email đã tồn tại trong `users`, dù user chưa phải thành viên của farm đang mời.

### Rủi ro

- Không thể mở rộng membership cho tài khoản đã đăng ký.
- User phải dùng email khác cho từng farm.

### Đề xuất

- Nếu user đã tồn tại nhưng chưa thuộc farm: tạo lời mời membership cho user đó.
- Nếu user đã thuộc farm: trả thông báo thành viên đã tồn tại.
- Khi nhận lời mời, user đã tồn tại chỉ cần xác thực và chấp nhận, không tạo lại Neon Auth account.

## AUTH-03 — Neon Auth và Prisma có thể lệch trạng thái

**Mức độ:** Critical

### Logic hiện tại

Luồng nhận lời mời tạo Neon Auth user trước, sau đó mới chạy transaction Prisma để tạo `users`, `farm_members` và cập nhật invitation.

### Rủi ro

Nếu Prisma transaction thất bại, Neon Auth user vẫn tồn tại nhưng dữ liệu ứng dụng chưa được tạo. Lần thử sau có thể thất bại vì tài khoản Auth đã tồn tại.

### Cần partner chốt

- Có hỗ trợ user đã tồn tại đăng nhập rồi chấp nhận lời mời không?
- Khi provisioning thất bại, hệ thống tự khôi phục hay cần admin xử lý?

### Đề xuất

Thiết kế luồng nhận lời mời có tính idempotent: kiểm tra user ở cả Neon Auth và database, có thể tiếp tục hoàn thành membership nếu lần trước bị gián đoạn, đồng thời ghi audit/log cho trường hợp provisioning lỗi.

