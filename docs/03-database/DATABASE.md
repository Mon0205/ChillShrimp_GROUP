# Database — ChillShrimp

Thiết kế ứng dụng chốt ngày 25/10/2026 gồm **19 bảng, 218 cột vật lý**. Schema chuẩn nằm ở [schema.prisma](../../BE/prisma/schema.prisma).

- [Danh sách bảng, kiểu dữ liệu và công dụng từng field](./DATABASE-FIELDS.md)
- [Sơ đồ quan hệ Mermaid](./ERD.md)
- [DBML để nhập vào công cụ ERD](./NEON-ERD.dbml)

## Phạm vi hiện tại

Đã bỏ `seed_quality_checks`, `batch_quantity_events`, `growth_sampling_logs`, `feed_guidelines`. Nhật ký cho ăn chỉ ghi nhận lượng thực tế; không lưu sinh khối, tỷ lệ cho ăn hay lượng khuyến nghị. Nhà cung cấp chỉ có `id`, `farm_id`, `name`, `address`, `phone`. Lô giống còn 14 cột. Ngưỡng môi trường không yêu cầu nguồn tài liệu. Giữ nguyên toàn bộ bảng AI và `inventory_supplies.min_threshold`.

## Quy tắc dữ liệu

- Dữ liệu nghiệp vụ thuộc trang trại; Owner/Quản lý trại thao tác toàn trại; Quản lý khu vực/Nhân viên kỹ thuật chỉ thao tác khu vực được phân công. Quản lý trại chỉ thuộc một trại, không được tạo trại hoặc cấp quyền Owner.
- Một ao/bể chỉ có một lô đang hoạt động/sẵn sàng bán, được bảo vệ bằng partial unique index.
- Khi tạo lô, số lượng hiện tại bằng số lượng ban đầu. Owner/Farm Manager/Area Manager cập nhật trực tiếp số lượng hiện tại; số lượng phải là số nguyên không âm trong phạm vi PostgreSQL integer.
- Nhập số lượng hiện tại bằng 0 kết thúc lô với trạng thái `failed` và chuyển ao/bể sang `empty` trong cùng transaction. Lô kết thúc không được sửa thông tin.
- Chủ trại/Quản lý trại/nhân viên kho duyệt yêu cầu cấp vật tư: trừ tồn, tạo một giao dịch `usage` liên kết `supply_request_id`, chuyển yêu cầu sang `fulfilled` trong cùng transaction. Yêu cầu đã xử lý không được duyệt lại.
- Nhật ký cho ăn/xử lý chỉ ghi lượng thực tế, không trừ tồn hay ghi giao dịch kho lần nữa. Trang lịch sử cấp vật tư chỉ đọc; API ghi sử dụng thủ công đã được gỡ.
- Owner/Farm Manager/Warehouse Staff xem lịch sử toàn trại. Area Manager/Technician chỉ xem các lần cấp cho khu vực được phân công và giao dịch cũ gắn với lô trong khu vực.
- Neon Auth quản lý danh tính và phiên xác thực; bảng nội bộ của Neon không thuộc 19 bảng ứng dụng.

## Migration

Migration tiến tới: [20261025_003_simplify_database](../../BE/prisma/migrations/20261025_003_simplify_database/migration.sql). Không sửa lịch sử migration đã triển khai.

Migration sẽ xóa vĩnh viễn dữ liệu của bốn bảng và các cột đã bỏ. Sao lưu trước khi triển khai. Trigger `seed_suppliers_set_updated_at` được gỡ trước khi bỏ cột `updated_at`. Việc sửa source/schema không đồng nghĩa migration đã được chạy trên Neon.

Sau khi sao lưu và chọn đúng DB, triển khai bằng `npm run migrate:deploy` trong thư mục BE, rồi tạo Prisma Client bằng `npm run prisma:generate`. Deploy đồng bộ backend và frontend vì API cũ đã được gỡ.

Migration bổ sung liên kết duyệt: [20261025_004_link_inventory_approval_history](../../BE/prisma/migrations/20261025_004_link_inventory_approval_history/migration.sql). Migration này chỉ thêm cột nullable và khóa ngoại/unique; dữ liệu lịch sử cũ được giữ lại. Chưa chạy lên DB đang dùng.

## Ao/bể nhận vật tư

Yêu cầu mới bắt buộc chọn khu vực và ao/bể trong khu vực đó. Area Manager chỉ chọn ao/bể thuộc khu vực được phân công. Backend kiểm tra trại, khu vực, trạng thái ao và kiểm tra lại trước khi duyệt. Lịch sử cấp vật tư hiển thị khu vực và ao/bể từ yêu cầu liên kết.

Migration [20261025_005_add_supply_request_tank](../../BE/prisma/migrations/20261025_005_add_supply_request_tank/migration.sql) thêm cột `supply_requests.tank_id`, khóa ngoại và index. Không suy đoán ao cho yêu cầu cũ; bản ghi cũ giữ NULL. Yêu cầu cũ đang chờ mà chưa có ao phải tạo lại để duyệt. Migration chưa chạy trên DB đang dùng.

## Xử lý yêu cầu vật tư

Chỉ Area Manager tạo yêu cầu. Owner/Farm Manager/Warehouse Staff xem danh sách và mở chi tiết để chọn Đồng ý cấp hoặc Từ chối, rồi lưu xử lý. Không có nút duyệt riêng trên từng dòng danh sách. Từ chối bắt buộc có lý do; không trừ tồn và không tạo giao dịch kho. Cả hai hướng xử lý khóa cùng hàng yêu cầu, chỉ cho phép trạng thái pending để tránh xử lý hai lần.

Ba cột `processed_by`, `processed_at`, `rejection_reason` lưu người xử lý, thời điểm và lý do từ chối. Migration [20261025_006_add_supply_request_processing](../../BE/prisma/migrations/20261025_006_add_supply_request_processing/migration.sql) chỉ thêm các cột nullable và khóa ngoại. Bản ghi cũ giữ NULL; migration chưa chạy trên DB đang dùng.

## Role Quản lý trại

Hai migration `20261025_007_add_farm_manager_role` và `20261025_008_allow_farm_manager_scope` bổ sung enum `farm_manager` và cho phép role này có `area_id` NULL ở membership/lời mời. Trigger giới hạn một trại đối với non-owner tiếp tục áp dụng. Không thêm bảng hoặc cột, không chuyển đổi quyền tài khoản cũ. Chưa áp dụng lên database đang dùng.
