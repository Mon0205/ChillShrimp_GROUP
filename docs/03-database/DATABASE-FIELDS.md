# Ý nghĩa từng bảng và field — ChillShrimp

Nguồn: [schema.prisma](../../BE/prisma/schema.prisma). Thiết kế chốt ngày 25/10/2026: **19 bảng ứng dụng, 218 cột vật lý**. Đây là schema trong repo; chưa áp dụng migration xóa dữ liệu lên DB đang chạy.

PK = khóa chính; FK = khóa ngoại; UNIQUE = không trùng. NULL nghĩa là cho phép để trống. Thuộc tính quan hệ ORM không phải cột vật lý. Đơn vị các chỉ tiêu nước phải thống nhất giữa nhập liệu và cấu hình ngưỡng.

Đã bỏ kiểm tra chất lượng thủ công, biến động số lượng, lấy mẫu tăng trưởng và định mức cho ăn. Giữ nguyên kiểm tra AI và mức tồn kho tối thiểu. Số lượng hiện tại của lô được chủ trại/quản lý khu vực cập nhật trực tiếp; nhập 0 kết thúc lô với trạng thái thất bại và giải phóng ao/bể.

<a id="users"></a>

## 1. users — Người dùng

| Field PostgreSQL | Tên Prisma | Kiểu | NULL? | Công dụng và ràng buộc |
|---|---|---|---|---|
| `id` | `id` | `text` | Không | PK. ID người dùng do Neon Auth cấp, kiểu text; là khóa để các bảng nghiệp vụ tham chiếu. Không có FK khai báo sang schema neon_auth. |
| `email` | `email` | `text` | Không | UNIQUE. Email tài khoản; dùng trong luồng đăng nhập và liên hệ. Không được trùng với người dùng khác. |
| `username` | `username` | `text` | Có | UNIQUE. Tên tài khoản riêng, khác email và tên hiển thị. Hiện API có trả về, nhưng chưa thấy luồng nhập/sửa hoặc đăng nhập bằng field này trong phạm vi code đã rà. |
| `displayName` | `displayName` | `text` | Có |  Tên hiển thị của người dùng trên giao diện và lịch sử thao tác. |
| `phone` | `phone` | `text` | Có |  Số điện thoại liên hệ của người dùng. |
| `created_at` | `createdAt` | `timestamptz(6)` | Không |  Thời điểm bản ghi được tạo trong hệ thống; có thể khác thời điểm công việc thực tế xảy ra. |
| `updated_at` | `updatedAt` | `timestamptz(6)` | Không |  Thời điểm cập nhật bản ghi gần nhất theo cơ chế cập nhật của ứng dụng/database. |

<a id="farms"></a>

## 2. farms — Trang trại

| Field PostgreSQL | Tên Prisma | Kiểu | NULL? | Công dụng và ràng buộc |
|---|---|---|---|---|
| `id` | `id` | `uuid` | Không | PK. Mã định danh duy nhất của bản ghi, dùng để tra cứu và được các bảng liên quan tham chiếu. |
| `code` | `code` | `text` | Không | UNIQUE. Mã trang trại, duy nhất toàn hệ thống; thuận tiện nhận biết và tra cứu. |
| `name` | `name` | `text` | Không |  Tên trang trại. |
| `address` | `address` | `text` | Có |  Địa chỉ trang trại. |
| `status` | `status` | `varchar(20)` | Không |  Trạng thái trang trại: active = hoạt động; inactive = ngừng hoạt động; archived = lưu trữ. |
| `created_by` | `createdBy` | `text` | Không | FK → users.id. Người tạo trang trại. Vai trò truy cập được xác định qua farm_members, không chỉ qua field này. |
| `created_at` | `createdAt` | `timestamptz(6)` | Không |  Thời điểm bản ghi được tạo trong hệ thống; có thể khác thời điểm công việc thực tế xảy ra. |
| `updated_at` | `updatedAt` | `timestamptz(6)` | Không |  Thời điểm cập nhật bản ghi gần nhất theo cơ chế cập nhật của ứng dụng/database. |

<a id="areas"></a>

## 3. areas — Khu vực

| Field PostgreSQL | Tên Prisma | Kiểu | NULL? | Công dụng và ràng buộc |
|---|---|---|---|---|
| `id` | `id` | `uuid` | Không | PK. Mã định danh duy nhất của bản ghi, dùng để tra cứu và được các bảng liên quan tham chiếu. |
| `farm_id` | `farmId` | `uuid` | Không | FK → farms.id. Trang trại sở hữu bản ghi; dùng phân tách dữ liệu theo trại. |
| `code` | `code` | `text` | Không |  Mã khu vực; duy nhất trong cùng trang trại, không cần duy nhất toàn hệ thống. |
| `name` | `name` | `text` | Không |  Tên khu vực. |
| `status` | `status` | `varchar(20)` | Không |  Trạng thái khu vực: active = hoạt động; inactive = ngừng hoạt động. |
| `created_at` | `createdAt` | `timestamptz(6)` | Không |  Thời điểm bản ghi được tạo trong hệ thống; có thể khác thời điểm công việc thực tế xảy ra. |
| `updated_at` | `updatedAt` | `timestamptz(6)` | Không |  Thời điểm cập nhật bản ghi gần nhất theo cơ chế cập nhật của ứng dụng/database. |

UNIQUE ghép (farm_id, code): mã chỉ cần duy nhất trong cùng trại.

<a id="ponds_tanks"></a>

## 4. ponds_tanks — Ao/bể

| Field PostgreSQL | Tên Prisma | Kiểu | NULL? | Công dụng và ràng buộc |
|---|---|---|---|---|
| `id` | `id` | `uuid` | Không | PK. Mã định danh duy nhất của bản ghi, dùng để tra cứu và được các bảng liên quan tham chiếu. |
| `farm_id` | `farmId` | `uuid` | Không | FK → farms.id. Trang trại sở hữu bản ghi; dùng phân tách dữ liệu theo trại. |
| `area_id` | `areaId` | `uuid` | Có | FK → areas.id. Khu vực chứa ao/bể; có thể chưa gán khu vực. |
| `responsible_user_id` | `responsibleUserId` | `text` | Có | FK → users.id. Nhân viên kỹ thuật phụ trách chăm sóc. Không bắt buộc phân công; để trống lưu NULL và có thể gỡ phân công khi sửa. Nếu chọn, nhân viên phải đang hoạt động trong cùng trại/khu; tối đa 5 ao/bể chưa xóa trên toàn hệ thống, tính cả ao/bể trống, vệ sinh và ngừng sử dụng. Kiểm tra trong transaction có khóa hàng người dùng để tránh phân công vượt mức khi có request đồng thời. Ao/bể cũ được giữ NULL đến khi phân công; có thể đổi người trong màn hình chỉnh sửa. |
| `code` | `code` | `varchar(50)` | Không |  Mã ao/bể; duy nhất trong cùng trang trại. |
| `name` | `name` | `varchar(100)` | Không |  Tên ao/bể. |
| `tank_type` | `tankType` | `varchar(30)` | Không |  Loại công trình: nursery_tank = bể ương; pond = ao; other = loại khác. |
| `volume_m3` | `volumeM3` | `numeric(12,3)` | Không |  Thể tích thiết kế của ao/bể, đơn vị m³; phải lớn hơn 0. |
| `status` | `status` | `varchar(20)` | Không |  Trạng thái: empty = trống; active = đang hoạt động/nuôi; cleaning = vệ sinh; inactive = ngừng hoạt động. |
| `description` | `description` | `text` | Có |  Mô tả bổ sung về ao/bể. |
| `deleted_by` | `deletedBy` | `text` | Có | FK → users.id. Người thực hiện xóa mềm ao/bể. |
| `deleted_at` | `deletedAt` | `timestamptz(6)` | Có |  Thời điểm xóa mềm. Có giá trị nghĩa là bản ghi được đánh dấu xóa nhưng vẫn giữ trong database. |
| `created_at` | `createdAt` | `timestamptz(6)` | Không |  Thời điểm bản ghi được tạo trong hệ thống; có thể khác thời điểm công việc thực tế xảy ra. |
| `updated_at` | `updatedAt` | `timestamptz(6)` | Không |  Thời điểm cập nhật bản ghi gần nhất theo cơ chế cập nhật của ứng dụng/database. |

UNIQUE ghép (farm_id, code): mã chỉ cần duy nhất trong cùng trại.

<a id="feeding_logs"></a>

## 5. feeding_logs — Nhật ký cho ăn

| Field PostgreSQL | Tên Prisma | Kiểu | NULL? | Công dụng và ràng buộc |
|---|---|---|---|---|
| `id` | `id` | `uuid` | Không | PK. Mã định danh duy nhất của bản ghi, dùng để tra cứu và được các bảng liên quan tham chiếu. |
| `tank_id` | `tankId` | `uuid` | Không | FK → ponds_tanks.id. Ao/bể được ghi nhận trong bản ghi. |
| `performed_by` | `performedBy` | `text` | Không | FK → users.id. Người thực hiện/ghi nhận công việc. |
| `supply_id` | `supplyId` | `uuid` | Có | FK → inventory_supplies.id. Vật tư thức ăn được sử dụng. Có thể không chọn vật tư kho và nhập thông tin thức ăn thủ công. |
| `feed_name` | `feedName` | `varchar(150)` | Không |  Tên thức ăn tại thời điểm ghi nhật ký; giữ được lịch sử ngay cả khi tên vật tư thay đổi. |
| `amount` | `amount` | `numeric(12,3)` | Không |  Lượng thức ăn thực tế đã cho ăn, theo field unit; phải lớn hơn 0. |
| `unit` | `unit` | `varchar(20)` | Không |  Đơn vị của lượng thức ăn, ví dụ g hoặc kg. Khi chọn vật tư, đơn vị phải khớp vật tư kho. |
| `feed_check_status` | `feedCheckStatus` | `varchar(20)` | Có |  Kết quả kiểm tra thức ăn: consumed = ăn hết; leftover = còn dư; not_checked = chưa kiểm tra. |
| `feeding_time` | `feedingTime` | `timestamptz(6)` | Không |  Thời điểm cho ăn thực tế, có thể khác thời điểm nhập bản ghi created_at. |
| `notes` | `notes` | `text` | Có |  Ghi chú bổ sung cho bản ghi nghiệp vụ. |
| `created_at` | `createdAt` | `timestamptz(6)` | Không |  Thời điểm bản ghi được tạo trong hệ thống; có thể khác thời điểm công việc thực tế xảy ra. |

<a id="water_change_logs"></a>

## 6. water_change_logs — Nhật ký thay nước

| Field PostgreSQL | Tên Prisma | Kiểu | NULL? | Công dụng và ràng buộc |
|---|---|---|---|---|
| `id` | `id` | `uuid` | Không | PK. Mã định danh duy nhất của bản ghi, dùng để tra cứu và được các bảng liên quan tham chiếu. |
| `tank_id` | `tankId` | `uuid` | Không | FK → ponds_tanks.id. Ao/bể được ghi nhận trong bản ghi. |
| `performed_by` | `performedBy` | `text` | Không | FK → users.id. Người thực hiện/ghi nhận công việc. |
| `water_change_percentage` | `waterChangePercentage` | `numeric(5,2)` | Không |  Phần trăm lượng nước được thay trong lần thực hiện; giá trị từ 0 đến 100. |
| `performed_at` | `performedAt` | `timestamptz(6)` | Không |  Thời điểm thực tế thay nước. |
| `notes` | `notes` | `text` | Có |  Ghi chú bổ sung cho bản ghi nghiệp vụ. |
| `created_at` | `createdAt` | `timestamptz(6)` | Không |  Thời điểm bản ghi được tạo trong hệ thống; có thể khác thời điểm công việc thực tế xảy ra. |

<a id="water_parameter_logs"></a>

## 7. water_parameter_logs — Nhật ký đo môi trường nước

| Field PostgreSQL | Tên Prisma | Kiểu | NULL? | Công dụng và ràng buộc |
|---|---|---|---|---|
| `id` | `id` | `uuid` | Không | PK. Mã định danh duy nhất của bản ghi, dùng để tra cứu và được các bảng liên quan tham chiếu. |
| `tank_id` | `tankId` | `uuid` | Không | FK → ponds_tanks.id. Ao/bể được ghi nhận trong bản ghi. |
| `recorded_by` | `recordedBy` | `text` | Không | FK → users.id. Người đo/ghi nhận dữ liệu. |
| `temperature` | `temperature` | `numeric(12,3)` | Có |  Nhiệt độ nước. Đơn vị sử dụng phải khớp quy chuẩn và giao diện của hệ thống; schema chỉ lưu số. |
| `ph` | `ph` | `numeric(12,3)` | Có |  Độ pH của nước, từ 0 đến 14; không có đơn vị. |
| `salinity` | `salinity` | `numeric(12,3)` | Có |  Độ mặn của nước; khi so sánh cần thống nhất đơn vị với quy chuẩn. |
| `dissolved_oxygen` | `dissolvedOxygen` | `numeric(12,3)` | Có |  Nồng độ oxy hòa tan (DO) trong nước. |
| `nh3` | `nh3` | `numeric(12,3)` | Có |  Nồng độ amoniac dạng NH₃ trong nước. |
| `tan` | `tan` | `numeric(12,3)` | Có |  Tổng nitơ amoni (TAN), gồm phần amoniac và amoni theo phương pháp đo. |
| `no2` | `no2` | `numeric(12,3)` | Có |  Chỉ tiêu nitrit (NO₂). |
| `nitrate` | `nitrate` | `numeric(12,3)` | Có |  Chỉ tiêu nitrat (NO₃). |
| `alkalinity` | `alkalinity` | `numeric(12,3)` | Có |  Độ kiềm của nước. |
| `h2s` | `h2s` | `numeric(12,3)` | Có |  Chỉ tiêu hydro sulfua (H₂S) trong nước. |
| `turbidity` | `turbidity` | `numeric(12,3)` | Có |  Độ đục của nước. |
| `water_level_m` | `waterLevelM` | `numeric(12,3)` | Có |  Mực nước/độ sâu nước được ghi nhận, đơn vị m. |
| `measurement_method` | `measurementMethod` | `varchar(20)` | Không |  Phương pháp ghi nhận: manual = thủ công; iot = thiết bị/cảm biến; lab = phòng xét nghiệm. Việc có giá trị iot không tự chứng minh đã có tích hợp cảm biến. |
| `measurement_device` | `measurementDevice` | `varchar(100)` | Có |  Tên hoặc thông tin thiết bị đo. |
| `recorded_at` | `recordedAt` | `timestamptz(6)` | Không |  Thời điểm đo/ghi nhận chỉ tiêu thực tế. |
| `notes` | `notes` | `text` | Có |  Ghi chú bổ sung cho bản ghi nghiệp vụ. |
| `created_at` | `createdAt` | `timestamptz(6)` | Không |  Thời điểm bản ghi được tạo trong hệ thống; có thể khác thời điểm công việc thực tế xảy ra. |

<a id="environment_thresholds"></a>

## 8. environment_thresholds — Ngưỡng môi trường

| Field PostgreSQL | Tên Prisma | Kiểu | NULL? | Công dụng và ràng buộc |
|---|---|---|---|---|
| `id` | `id` | `uuid` | Không | PK. Mã định danh duy nhất của bản ghi, dùng để tra cứu và được các bảng liên quan tham chiếu. |
| `farm_id` | `farmId` | `uuid` | Không | FK → farms.id. Trang trại sở hữu bản ghi; dùng phân tách dữ liệu theo trại. |
| `species` | `species` | `varchar(50)` | Không |  Loài tôm mà ngưỡng áp dụng. |
| `development_stage` | `developmentStage` | `varchar(50)` | Không |  Giai đoạn phát triển mà ngưỡng áp dụng. |
| `tank_type` | `tankType` | `varchar(30)` | Không |  Loại ao/bể áp dụng; all là áp dụng chung các loại được hỗ trợ. |
| `parameter_code` | `parameterCode` | `varchar(30)` | Không |  Mã chỉ tiêu: temperature, ph, salinity, do, nh3, tan, no2, nitrate, alkalinity, h2s, turbidity hoặc water_level. Mã do tương ứng cột dissolved_oxygen của log. |
| `unit` | `unit` | `varchar(20)` | Không |  Đơn vị của ngưỡng; giá trị đo đem so sánh phải cùng đơn vị. |
| `optimal_min` | `optimalMin` | `numeric(12,3)` | Có |  Cận dưới của vùng tối ưu. |
| `optimal_max` | `optimalMax` | `numeric(12,3)` | Có |  Cận trên của vùng tối ưu. |
| `warning_min` | `warningMin` | `numeric(12,3)` | Có |  Cận dưới dùng phân loại cảnh báo khi giá trị đo xuống thấp. |
| `warning_max` | `warningMax` | `numeric(12,3)` | Có |  Cận trên dùng phân loại cảnh báo khi giá trị đo lên cao. |
| `danger_min` | `dangerMin` | `numeric(12,3)` | Có |  Cận dưới dùng phân loại nguy cấp khi giá trị đo xuống thấp. |
| `danger_max` | `dangerMax` | `numeric(12,3)` | Có |  Cận trên dùng phân loại nguy cấp khi giá trị đo lên cao. |
| `effective_from` | `effectiveFrom` | `date` | Không |  Ngày bắt đầu hiệu lực. |
| `effective_to` | `effectiveTo` | `date` | Có |  Ngày kết thúc hiệu lực; trống nghĩa là chưa xác định ngày kết thúc. |
| `is_active` | `isActive` | `boolean` | Không |  Cờ bật/tắt ngưỡng. Việc được sử dụng còn phụ thuộc phê duyệt, thời hạn và phạm vi áp dụng. |
| `created_by` | `createdBy` | `text` | Không | FK → users.id. Người tạo cấu hình ngưỡng. |
| `approved_by` | `approvedBy` | `text` | Có | FK → users.id. Người phê duyệt ngưỡng. |
| `approved_at` | `approvedAt` | `timestamptz(6)` | Có |  Thời điểm phê duyệt ngưỡng. |
| `created_at` | `createdAt` | `timestamptz(6)` | Không |  Thời điểm bản ghi được tạo trong hệ thống; có thể khác thời điểm công việc thực tế xảy ra. |
| `updated_at` | `updatedAt` | `timestamptz(6)` | Không |  Thời điểm cập nhật bản ghi gần nhất theo cơ chế cập nhật của ứng dụng/database. |

<a id="alerts_notifications"></a>

## 9. alerts_notifications — Cảnh báo

| Field PostgreSQL | Tên Prisma | Kiểu | NULL? | Công dụng và ràng buộc |
|---|---|---|---|---|
| `id` | `id` | `uuid` | Không | PK. Mã định danh duy nhất của bản ghi, dùng để tra cứu và được các bảng liên quan tham chiếu. |
| `farm_id` | `farmId` | `uuid` | Không | FK → farms.id. Trang trại sở hữu bản ghi; dùng phân tách dữ liệu theo trại. |
| `batch_id` | `batchId` | `uuid` | Có | FK → seed_batches.id. Lô giống gắn với cảnh báo, nếu xác định được khi tạo cảnh báo. |
| `tank_id` | `tankId` | `uuid` | Có | FK → ponds_tanks.id. Ao/bể phát sinh cảnh báo, nếu có. |
| `threshold_id` | `thresholdId` | `uuid` | Có | FK → environment_thresholds.id. Cấu hình ngưỡng đã được dùng để phát hiện cảnh báo. |
| `source_log_id` | `sourceLogId` | `uuid` | Có | FK → water_parameter_logs.id. Bản ghi water_parameter_logs làm phát sinh cảnh báo; không phải ID nhật ký bất kỳ. |
| `parameter_code` | `parameterCode` | `varchar(30)` | Có |  Mã chỉ tiêu bị cảnh báo, ví dụ ph hoặc do. |
| `observed_value` | `observedValue` | `numeric(12,3)` | Có |  Giá trị đo đã làm phát sinh cảnh báo. |
| `alert_type` | `alertType` | `varchar(30)` | Không |  Loại cảnh báo; dùng phân loại nguồn/nghiệp vụ cảnh báo. |
| `severity` | `severity` | `varchar(20)` | Không |  Mức độ: info = thông tin; warning = cảnh báo; critical = nguy cấp. |
| `title` | `title` | `varchar(150)` | Không |  Tiêu đề ngắn của cảnh báo. |
| `message` | `message` | `text` | Không |  Nội dung chi tiết giải thích cảnh báo. |
| `is_read` | `isRead` | `boolean` | Không |  Cảnh báo đã được đánh dấu đọc hay chưa. Hiện là trạng thái chung, không phải trạng thái riêng của từng người dùng. |
| `created_at` | `createdAt` | `timestamptz(6)` | Không |  Thời điểm bản ghi được tạo trong hệ thống; có thể khác thời điểm công việc thực tế xảy ra. |

UNIQUE ghép (source_log_id, parameter_code) giúp tránh tạo trùng cảnh báo cùng chỉ tiêu cho cùng log đo khi các giá trị liên quan có mặt.

<a id="treatment_logs"></a>

## 10. treatment_logs — Nhật ký dùng thuốc/chế phẩm

| Field PostgreSQL | Tên Prisma | Kiểu | NULL? | Công dụng và ràng buộc |
|---|---|---|---|---|
| `id` | `id` | `uuid` | Không | PK. Mã định danh duy nhất của bản ghi, dùng để tra cứu và được các bảng liên quan tham chiếu. |
| `tank_id` | `tankId` | `uuid` | Không | FK → ponds_tanks.id. Ao/bể được ghi nhận trong bản ghi. |
| `performed_by` | `performedBy` | `text` | Không | FK → users.id. Người thực hiện/ghi nhận công việc. |
| `supply_id` | `supplyId` | `uuid` | Có | FK → inventory_supplies.id. Vật tư thuốc/hóa chất/chế phẩm được dùng; có thể để trống khi ghi thủ công. |
| `product_name` | `productName` | `varchar(150)` | Không |  Tên sản phẩm tại thời điểm ghi nhật ký. |
| `amount` | `amount` | `numeric(12,3)` | Không |  Lượng sản phẩm sử dụng, theo field unit; phải lớn hơn 0. |
| `unit` | `unit` | `varchar(20)` | Không |  Đơn vị của lượng sản phẩm; phải khớp vật tư khi chọn từ kho. |
| `purpose` | `purpose` | `text` | Không |  Mục đích điều trị hoặc xử lý môi trường. |
| `performed_at` | `performedAt` | `timestamptz(6)` | Không |  Thời điểm thực tế dùng sản phẩm. |
| `notes` | `notes` | `text` | Có |  Ghi chú bổ sung cho bản ghi nghiệp vụ. |
| `created_at` | `createdAt` | `timestamptz(6)` | Không |  Thời điểm bản ghi được tạo trong hệ thống; có thể khác thời điểm công việc thực tế xảy ra. |

<a id="inventory_supplies"></a>

## 11. inventory_supplies — Danh mục và tồn kho vật tư

| Field PostgreSQL | Tên Prisma | Kiểu | NULL? | Công dụng và ràng buộc |
|---|---|---|---|---|
| `id` | `id` | `uuid` | Không | PK. Mã định danh duy nhất của bản ghi, dùng để tra cứu và được các bảng liên quan tham chiếu. |
| `farm_id` | `farmId` | `uuid` | Không | FK → farms.id. Trang trại sở hữu bản ghi; dùng phân tách dữ liệu theo trại. |
| `name` | `name` | `varchar(150)` | Không |  Tên vật tư. |
| `category` | `category` | `varchar(30)` | Không |  Nhóm: feed = thức ăn; medicine = thuốc; chemical = hóa chất; probiotic = chế phẩm vi sinh; other = khác. |
| `unit` | `unit` | `varchar(20)` | Không |  Đơn vị quản lý tồn kho; các giao dịch phải thống nhất đơn vị này. |
| `quantity` | `quantity` | `numeric(12,3)` | Không |  Số lượng tồn hiện tại. Được cập nhật cùng giao dịch nhập/sử dụng/điều chỉnh; không phải tổng lịch sử nhập. |
| `unit_price` | `unitPrice` | `numeric(12,2)` | Không |  Đơn giá hiện hành của vật tư. Luồng nhập hiện cập nhật field này bằng giá nhập vừa ghi; không phải mặc định giá bình quân. |
| `min_threshold` | `minThreshold` | `numeric(12,3)` | Không |  Ngưỡng tồn tối thiểu để xác định vật tư sắp thiếu. |
| `description` | `description` | `text` | Có |  Mô tả vật tư. |
| `created_at` | `createdAt` | `timestamptz(6)` | Không |  Thời điểm bản ghi được tạo trong hệ thống; có thể khác thời điểm công việc thực tế xảy ra. |
| `updated_at` | `updatedAt` | `timestamptz(6)` | Không |  Thời điểm cập nhật bản ghi gần nhất theo cơ chế cập nhật của ứng dụng/database. |

<a id="inventory_transactions"></a>

## 12. inventory_transactions — Lịch sử giao dịch kho

| Field PostgreSQL | Tên Prisma | Kiểu | NULL? | Công dụng và ràng buộc |
|---|---|---|---|---|
| `supply_request_id` | `supplyRequestId` | `uuid` | Có | UNIQUE, FK → supply_requests. Liên kết lần duyệt cấp vật tư; mỗi yêu cầu chỉ có một giao dịch. Để trống đối với giao dịch cũ, nhập kho và điều chỉnh. |
| `id` | `id` | `uuid` | Không | PK. Mã định danh duy nhất của bản ghi, dùng để tra cứu và được các bảng liên quan tham chiếu. |
| `supply_id` | `supplyId` | `uuid` | Không | FK → inventory_supplies.id. Vật tư bị thay đổi tồn kho. |
| `batch_id` | `batchId` | `uuid` | Có | FK → seed_batches.id. Lô giống liên quan đến giao dịch, nếu có; hỗ trợ theo dõi tiêu hao theo lô. |
| `created_by` | `createdBy` | `text` | Không | FK → users.id. Người tạo bản ghi nghiệp vụ. |
| `transaction_type` | `transactionType` | `varchar(20)` | Không |  Loại: import = nhập; usage = sử dụng/xuất dùng; adjustment = điều chỉnh tồn. |
| `quantity` | `quantity` | `numeric(12,3)` | Không |  Lượng giao dịch. import/usage lưu số dương; usage được trừ khi cập nhật tồn. adjustment cho phép số âm hoặc dương nhưng khác 0. |
| `unit_price` | `unitPrice` | `numeric(12,2)` | Không |  Đơn giá được ghi tại thời điểm giao dịch để lưu lịch sử giá; không có field tiền tệ riêng trong schema. |
| `transaction_date` | `transactionDate` | `timestamptz(6)` | Không |  Thời điểm giao dịch thực tế. |
| `notes` | `notes` | `text` | Có |  Ghi chú giao dịch. Hiện luồng cho ăn/dùng thuốc còn ghi ID nhật ký nguồn dưới dạng chuỗi tại đây; chưa có FK riêng nối về nhật ký. |
| `created_at` | `createdAt` | `timestamptz(6)` | Không |  Thời điểm bản ghi được tạo trong hệ thống; có thể khác thời điểm công việc thực tế xảy ra. |

<a id="supply_requests"></a>

## 13. supply_requests — Yêu cầu cấp vật tư

| Field PostgreSQL | Tên Prisma | Kiểu | NULL? | Công dụng và ràng buộc |
|---|---|---|---|---|
| `tank_id` | `tankId` | `uuid` | Có | FK → ponds_tanks. Ao/bể nhận vật tư. Bắt buộc với yêu cầu mới và phải thuộc khu vực được chọn; nullable để giữ dữ liệu cũ. Yêu cầu cũ chưa có ao không được duyệt, cần tạo lại. |
| `processed_by` | `processedBy` | `text` | Có | FK → users.id. Chủ trại/nhân viên kho đã đồng ý cấp hoặc từ chối yêu cầu. |
| `processed_at` | `processedAt` | `timestamptz(6)` | Có | Thời điểm xử lý yêu cầu. |
| `rejection_reason` | `rejectionReason` | `text` | Có | Lý do từ chối; bắt buộc nhập khi xử lý từ chối. Không thay thế ghi chú ban đầu của người yêu cầu. |
| `id` | `id` | `uuid` | Không | PK. Mã định danh duy nhất của bản ghi, dùng để tra cứu và được các bảng liên quan tham chiếu. |
| `farm_id` | `farmId` | `uuid` | Không | FK → farms.id. Trang trại sở hữu bản ghi; dùng phân tách dữ liệu theo trại. |
| `supply_id` | `supplyId` | `uuid` | Không | FK → inventory_supplies.id. Vật tư được yêu cầu cấp. |
| `area_id` | `areaId` | `uuid` | Có | FK → areas.id. Khu vực cần vật tư, nếu có. |
| `requested_by` | `requestedBy` | `text` | Không | FK → users.id. Người gửi yêu cầu cấp vật tư. |
| `quantity` | `quantity` | `numeric(12,3)` | Không |  Số lượng yêu cầu; đơn vị lấy theo vật tư được chọn. |
| `status` | `status` | `varchar(20)` | Không |  Trạng thái: pending = chờ xử lý; fulfilled = đã đáp ứng; rejected = từ chối; cancelled = hủy. Schema cho phép các trạng thái này, không có nghĩa mọi bước chuyển trạng thái đã được triển khai. |
| `notes` | `notes` | `text` | Có |  Ghi chú bổ sung cho bản ghi nghiệp vụ. |
| `created_at` | `createdAt` | `timestamptz(6)` | Không |  Thời điểm bản ghi được tạo trong hệ thống; có thể khác thời điểm công việc thực tế xảy ra. |
| `updated_at` | `updatedAt` | `timestamptz(6)` | Không |  Thời điểm cập nhật bản ghi gần nhất theo cơ chế cập nhật của ứng dụng/database. |

<a id="seed_suppliers"></a>

## 14. seed_suppliers — Nhà cung cấp giống

| Field PostgreSQL | Tên Prisma | Kiểu | NULL? | Công dụng và ràng buộc |
|---|---|---|---|---|
| `id` | `id` | `uuid` | Không | PK. Mã định danh duy nhất của bản ghi, dùng để tra cứu và được các bảng liên quan tham chiếu. |
| `farm_id` | `farmId` | `uuid` | Không | FK → farms.id. Trang trại sở hữu bản ghi; dùng phân tách dữ liệu theo trại. |
| `name` | `name` | `varchar(150)` | Không |  Tên nhà cung cấp. |
| `phone` | `phone` | `varchar(20)` | Có |  Số điện thoại liên hệ. |
| `address` | `address` | `text` | Có |  Địa chỉ nhà cung cấp. |

<a id="seed_batches"></a>

## 15. seed_batches — Lô giống

| Field PostgreSQL | Tên Prisma | Kiểu | NULL? | Công dụng và ràng buộc |
|---|---|---|---|---|
| `id` | `id` | `uuid` | Không | PK. Mã định danh duy nhất của bản ghi, dùng để tra cứu và được các bảng liên quan tham chiếu. |
| `tank_id` | `tankId` | `uuid` | Không | FK → ponds_tanks.id. Ao/bể hiện tại của lô. Luồng hiện có chỉ hỗ trợ chuyển toàn bộ lô, không chia đồng thời ra nhiều bể. |
| `supplier_id` | `supplierId` | `uuid` | Có | FK → seed_suppliers.id. Nhà cung cấp của lô; có thể để trống. |
| `batch_code` | `batchCode` | `varchar(50)` | Không | UNIQUE. Mã lô trong hệ thống, duy nhất toàn hệ thống. |
| `species` | `species` | `varchar(50)` | Không |  Loài tôm: white_leg_shrimp = tôm thẻ chân trắng; black_tiger_shrimp = tôm sú. |
| `development_stage` | `developmentStage` | `varchar(50)` | Không |  Giai đoạn phát triển của lô, ví dụ giai đoạn PL theo dữ liệu nhập. |
| `initial_quantity` | `initialQuantity` | `integer` | Không |  Số lượng thực thả ban đầu vào nuôi. |
| `current_estimated_quantity` | `currentEstimatedQuantity` | `integer` | Không | Số lượng hiện tại ước tính; Owner/Farm Manager/Area Manager cập nhật trực tiếp. Nhập 0 kết thúc lô với trạng thái failed và giải phóng ao/bể. |
| `stocked_date` | `stockedDate` | `date` | Không |  Ngày thả lô giống. |
| `expected_sale_date` | `expectedSaleDate` | `date` | Không |  Ngày dự kiến bán; không phải ngày bán thực tế. |
| `status` | `status` | `varchar(30)` | Không |  Trạng thái: active = đang nuôi; ready_for_sale = sẵn sàng bán; sold = đã bán; failed = thất bại; cancelled = hủy. |
| `notes` | `notes` | `text` | Có |  Ghi chú bổ sung cho bản ghi nghiệp vụ. |
| `created_at` | `createdAt` | `timestamptz(6)` | Không |  Thời điểm bản ghi được tạo trong hệ thống; có thể khác thời điểm công việc thực tế xảy ra. |
| `updated_at` | `updatedAt` | `timestamptz(6)` | Không |  Thời điểm cập nhật bản ghi gần nhất theo cơ chế cập nhật của ứng dụng/database. |

Migration khai báo một bể chỉ có tối đa một lô ở trạng thái active hoặc ready_for_sale cùng lúc. Nhiều lô lịch sử vẫn có thể cùng tham chiếu một bể.

<a id="ai_inspections"></a>

## 16. ai_inspections — Lần kiểm tra bằng AI

| Field PostgreSQL | Tên Prisma | Kiểu | NULL? | Công dụng và ràng buộc |
|---|---|---|---|---|
| `id` | `id` | `uuid` | Không | PK. Mã định danh duy nhất của bản ghi, dùng để tra cứu và được các bảng liên quan tham chiếu. |
| `batch_id` | `batchId` | `uuid` | Không | FK → seed_batches.id. Lô giống mà bản ghi thuộc về. |
| `created_by` | `createdBy` | `text` | Không | FK → users.id. Người tạo bản ghi nghiệp vụ. |
| `media_url` | `mediaUrl` | `text` | Không |  URL ảnh gốc đưa vào phân tích AI. |
| `media_public_id` | `mediaPublicId` | `varchar(255)` | Không | UNIQUE. ID ảnh gốc trên Cloudinary; duy nhất để tránh gắn trùng tài nguyên theo ràng buộc hiện tại. |
| `annotated_image_url` | `annotatedImageUrl` | `text` | Có |  URL ảnh kết quả đã vẽ khung/đánh dấu các đối tượng được phát hiện. |
| `sampling_method` | `samplingMethod` | `varchar(20)` | Không |  Phương pháp được khai báo: manual = thủ công; ai = AI; combined = kết hợp. Nhãn này không tự bảo đảm đã có luồng nhập tay hoàn chỉnh. |
| `sample_volume_ml` | `sampleVolumeMl` | `numeric(12,3)` | Có |  Thể tích mẫu được chụp/đếm, đơn vị ml; dùng tính mật độ. |
| `manual_count` | `manualCount` | `integer` | Có |  Số đếm thủ công/hiệu chỉnh để đối chiếu với AI. Hiện có hiển thị, nhưng chưa thấy luồng cập nhật field trong code đã rà. |
| `detected_count` | `detectedCount` | `integer` | Có |  Số đối tượng tôm AI phát hiện trong ảnh. |
| `density_per_ml` | `densityPerMl` | `numeric(14,4)` | Có |  Mật độ mẫu, số con/ml; luồng AI hiện tính detected_count / sample_volume_ml khi có thể tích mẫu. |
| `correction_factor` | `correctionFactor` | `numeric(8,4)` | Có |  Hệ số hiệu chỉnh dự kiến. Hiện có đọc trả API nhưng chưa thấy luồng ghi hoặc công thức sử dụng; chưa có định nghĩa thuật toán được hiện thực. |
| `average_confidence` | `averageConfidence` | `numeric(6,5)` | Có |  Độ tin cậy trung bình của các phát hiện AI, thang 0..1; giao diện có thể nhân 100 để hiện phần trăm. Không phải độ chính xác đã được đo trên bộ kiểm thử. |
| `average_size_mm` | `averageSizeMm` | `numeric(8,3)` | Có |  Kích thước trung bình dự kiến theo mm. Chưa thấy luồng AI hiện tại tính/lưu; muốn đo mm từ ảnh cần phương pháp hiệu chuẩn. |
| `uniformity_score` | `uniformityScore` | `numeric(6,3)` | Có |  Điểm độ đồng đều dự kiến cho kết quả AI. Chưa thấy luồng hiện tại tính/lưu hoặc công thức chấm điểm. |
| `detections` | `detections` | `jsonb` | Có |  JSON chi tiết các phát hiện: lớp, độ tin cậy, tọa độ khung bao; dùng xem lại kết quả. |
| `model_version` | `modelVersion` | `varchar(100)` | Có |  Phiên bản mô hình AI đã dùng cho lần phân tích. |
| `status` | `status` | `varchar(20)` | Không |  Trạng thái xử lý: pending = chờ; processing = đang xử lý; completed = hoàn tất; failed = lỗi. |
| `inspected_at` | `inspectedAt` | `timestamptz(6)` | Có |  Thời điểm phân tích/kiểm tra được ghi nhận hoàn tất. |
| `notes` | `notes` | `text` | Có |  Ghi chú bổ sung cho bản ghi nghiệp vụ. |
| `created_at` | `createdAt` | `timestamptz(6)` | Không |  Thời điểm bản ghi được tạo trong hệ thống; có thể khác thời điểm công việc thực tế xảy ra. |

<a id="farm_members"></a>

## 17. farm_members — Thành viên và quyền trong trại

| Field PostgreSQL | Tên Prisma | Kiểu | NULL? | Công dụng và ràng buộc |
|---|---|---|---|---|
| `farm_id` | `farmId` | `uuid` | Không | Thành phần PK ghép. FK → farms.id. Trang trại sở hữu bản ghi; dùng phân tách dữ liệu theo trại. |
| `user_id` | `userId` | `text` | Không | Thành phần PK ghép. FK → users.id. Người dùng được liên kết với bản ghi. |
| `role` | `role` | `FarmRole` | Không |  Vai trò tại farm này: owner = chủ trại; farm_manager = quản lý toàn trại được phân công; area_manager = quản lý khu; technician = kỹ thuật viên; warehouse_staff = nhân viên kho. |
| `status` | `status` | `MembershipStatus` | Không |  Trạng thái membership: active = được hoạt động; suspended = bị ngưng quyền tại farm này. Không phải trạng thái khóa toàn bộ tài khoản. |
| `area_id` | `areaId` | `uuid` | Có | FK → areas.id. Khu vực được phân công. Theo CHECK hiện có, area_manager/technician phải có; owner/farm_manager/warehouse_staff phải để trống. |
| `created_at` | `createdAt` | `timestamptz(6)` | Không |  Thời điểm bản ghi được tạo trong hệ thống; có thể khác thời điểm công việc thực tế xảy ra. |

Migration hiện có còn giới hạn user có vai trò ngoài owner ở một farm. Đây là ràng buộc triển khai trong repo, khác với mục tiêu multi-farm rộng hơn được nêu trong một số tài liệu thiết kế.

<a id="farm_invitations"></a>

## 18. farm_invitations — Lời mời tham gia

| Field PostgreSQL | Tên Prisma | Kiểu | NULL? | Công dụng và ràng buộc |
|---|---|---|---|---|
| `id` | `id` | `uuid` | Không | PK. Mã định danh duy nhất của bản ghi, dùng để tra cứu và được các bảng liên quan tham chiếu. |
| `farm_id` | `farmId` | `uuid` | Không | FK → farms.id. Trang trại sở hữu bản ghi; dùng phân tách dữ liệu theo trại. |
| `invited_user_id` | `invitedUserId` | `text` | Có | FK → users.id. Người dùng liên quan nếu đã xác định được; có thể trống trước khi tài khoản được tạo/chấp nhận lời mời. |
| `email` | `email` | `text` | Không |  Email người nhận lời mời. |
| `role` | `role` | `FarmRole` | Không |  Vai trò dự kiến cấp khi chấp nhận: owner, farm_manager, area_manager, technician hoặc warehouse_staff. |
| `area_id` | `areaId` | `uuid` | Có | FK → areas.id. Khu vực sẽ phân công; quy tắc có/không có khu vực phụ thuộc vai trò. |
| `invited_by` | `invitedBy` | `text` | Không | FK → users.id. Người gửi lời mời. |
| `token_hash` | `tokenHash` | `text` | Không | UNIQUE. Bản băm token lời mời. Database không lưu token thô của đường dẫn mời. |
| `expires_at` | `expiresAt` | `timestamptz(6)` | Không |  Thời điểm lời mời hết hiệu lực; luồng tạo hiện đặt 24 giờ. |
| `status` | `status` | `InvitationStatus` | Không |  Trạng thái: pending = chờ; accepted = đã chấp nhận; cancelled = đã hủy. Hết hạn được kiểm tra qua expires_at, không có enum expired. |
| `created_at` | `createdAt` | `timestamptz(6)` | Không |  Thời điểm bản ghi được tạo trong hệ thống; có thể khác thời điểm công việc thực tế xảy ra. |
| `accepted_at` | `acceptedAt` | `timestamptz(6)` | Có |  Thời điểm chấp nhận lời mời. |

<a id="password_reset_otp_windows"></a>

## 19. password_reset_otp_windows — Cửa sổ thời hạn OTP

| Field PostgreSQL | Tên Prisma | Kiểu | NULL? | Công dụng và ràng buộc |
|---|---|---|---|---|
| `email` | `email` | `text` | Không | PK. Email đang có cửa sổ OTP; là khóa chính. Không có FK tới users vì luồng quên mật khẩu dùng email. |
| `expires_at` | `expiresAt` | `timestamptz(6)` | Không |  Hạn chót chấp nhận yêu cầu reset ở ứng dụng: thời điểm gửi thành công + 60 giây. Reset thành công sẽ xóa cửa sổ tương ứng. |
| `created_at` | `createdAt` | `timestamptz(6)` | Không |  Thời điểm bản ghi được tạo trong hệ thống; có thể khác thời điểm công việc thực tế xảy ra. |
| `updated_at` | `updatedAt` | `timestamptz(6)` | Không |  Thời điểm cập nhật cửa sổ, chẳng hạn khi gửi lại OTP. |

## Enum PostgreSQL

- **FarmRole**: `owner`, `farm_manager`, `area_manager`, `technician`, `warehouse_staff`.
- **InvitationStatus**: `pending`, `accepted`, `cancelled`.
- **MembershipStatus**: `active`, `suspended`.

## Những cặp dễ nhầm

- users.id là text nhận từ Neon; đa số ID nghiệp vụ là uuid.
- created_at là lúc nhập/tạo bản ghi; feeding_time, performed_at, recorded_at và inspected_at là thời điểm nghiệp vụ tương ứng.
- inventory_supplies.quantity là số dư tại kho; inventory_transactions là lịch sử nhập, cấp và điều chỉnh. Không xóa một bên chỉ vì cùng có quantity.
- seed_batches.initial_quantity là số lượng ban đầu; current_estimated_quantity là số lượng hiện tại ước tính được cập nhật trực tiếp.
- inventory_supplies.unit_price là đơn giá hiện hành; inventory_transactions.unit_price giữ đơn giá của từng giao dịch.
- URL dùng mở tệp; public_id dùng định danh tài nguyên Cloudinary; format dùng xác định cách hiển thị. Ba field này có vai trò khác nhau.
- ai_inspections.uniformity_score dành cho độ đồng đều; việc giữ field không có nghĩa mô hình AI hiện đã trả kết quả này.
- password_reset_otp_windows chỉ lưu thời hạn, không lưu mã OTP hoặc mật khẩu.
