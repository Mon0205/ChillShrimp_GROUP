# USE CASE

## 1. Phạm vi tài liệu

Tài liệu này liệt kê use case của hệ thống quản lý trại tôm giống theo **mô hình 2 cấp**:

- **Cấp 1 — Nhóm chức năng** (vd "Quản lý vật tư", "Quản lý trang trại"): use case gộp, đại diện cho một mảng nghiệp vụ. Actor kết nối trực tiếp vào use case cấp 1. Mọi use case cấp 1 đều `<<Include>>` **UC01 — Đăng nhập**, vì phải đăng nhập mới thực hiện được bất kỳ chức năng nào.
- **Cấp 2 — Nghiệp vụ cụ thể** (vd "CRUD nhân viên", "Mời thành viên"): use case con, `<<Extend>>` ra từ đúng một use case cấp 1. Đây là nơi mô tả thao tác thật trên dữ liệu.

Ngoài ra có 2 use case **đứng độc lập**, không thuộc nhóm cấp 1 nào vì dùng chung cho mọi role:

- **UC01 — Đăng nhập**: hub trung tâm, mọi use case cấp 1 đều include vào đây.
- **UC02 — Quản lý hồ sơ cá nhân**: chỉ include UC01, không có use case con.

Việc sinh cảnh báo tự động (môi trường vượt ngưỡng, AI bất thường, tồn kho thấp) là **tiến trình nền (cron/job), không phải use case** — vì không do actor người dùng chủ động kích hoạt — nên chỉ được ghi chú như một chi tiết triển khai bên trong UC09 (Quản lý thống kê và cảnh báo), không có mã use case riêng và **không xuất hiện trên sơ đồ Use Case**.

Hệ thống có bốn vai trò chính:

| Vai trò | Phạm vi | Mô tả |
|---|---|---|
| `OWNER` | Toàn trại | Quản trị và giám sát toàn bộ hệ thống |
| `AREA_MANAGER` | Khu vực phụ trách | Quản lý hoạt động và nhân viên trong khu vực |
| `TECHNICIAN` | Khu vực phụ trách | Thực hiện nghiệp vụ kỹ thuật và chăm sóc |
| `WAREHOUSE_STAFF` | Kho | Quản lý vật tư và hoạt động nhập, xuất kho |

`AREA_MANAGER`, `TECHNICIAN` và `WAREHOUSE_STAFF` chỉ được truy cập dữ liệu thuộc phạm vi được phân công. `OWNER` có quyền truy cập toàn trại.

Tác nhân phụ trợ duy nhất còn giữ trên sơ đồ: **AI Service** (dịch vụ ngoài, gắn với UC06 — Kiểm tra và phân tích AI).

### Quy tắc phạm vi áp dụng cho mọi use case

- `users` chỉ biểu diễn danh tính dùng chung; không có role toàn cục.
- Người dùng chọn một `farm` đang làm việc; Backend xác thực membership tương ứng trong `farm_members`.
- Một tài khoản có thể tham gia nhiều trang trại và có role khác nhau ở từng trang trại.
- `OWNER` chỉ có quyền toàn trại trong phạm vi farm mà membership của người đó có `role = owner` và `status = active`.
- `AREA_MANAGER`, `TECHNICIAN` và `WAREHOUSE_STAFF` bị giới hạn theo membership tương ứng; dữ liệu nghiệp vụ phải truy ra được `farm_id`.

## 2. Danh sách use case theo 2 cấp

### 2.0. Độc lập (không thuộc nhóm nào)

| Mã | Use case | Actor thực hiện |
|---|---|---|
| UC01 | Đăng nhập | Tất cả vai trò |
| UC02 | Quản lý hồ sơ cá nhân | Tất cả vai trò |

### 2.1. UC03 — Quản lý nhân viên

Actor cấp 1 (hợp của các use case con): `OWNER`, `AREA_MANAGER`.

| Mã | Use case con | Actor thực hiện |
|---|---|---|
| UC03.1 | Mời thành viên | `OWNER` |
| UC03.2 | Quản lý tài khoản nhân viên | `OWNER` |
| UC03.3 | Xem danh sách nhân viên theo khu vực | `OWNER`, `AREA_MANAGER` |

UC03.1 gồm: gửi lời mời qua email, gán vai trò, gán khu vực dự kiến, theo dõi trạng thái lời mời, hủy lời mời. UC03.2 gồm: kích hoạt/vô hiệu hóa tài khoản, gán/đổi khu vực phụ trách.

### 2.2. UC04 — Quản lý trang trại

Actor cấp 1: `OWNER`, `AREA_MANAGER`, `TECHNICIAN`, `WAREHOUSE_STAFF`.

| Mã | Use case con | Actor thực hiện |
|---|---|---|
| UC04.1 | Xem/cập nhật thông tin trang trại | `OWNER` cập nhật; các vai trò khác chỉ xem |
| UC04.2 | CRUD ao hoặc bể | `OWNER`, `AREA_MANAGER`; `TECHNICIAN` chỉ xem |
| UC04.3 | Cập nhật trạng thái ao/bể | `OWNER`, `AREA_MANAGER` |

UC04.2 gồm: thêm, xem danh sách/tìm kiếm, xem chi tiết, cập nhật thông tin ao/bể.

### 2.3. UC05 — Quản lý lô giống và chăm sóc

Actor cấp 1: `OWNER`, `AREA_MANAGER`, `TECHNICIAN`.

| Mã | Use case con | Actor thực hiện |
|---|---|---|
| UC05.1 | CRUD lô giống | `OWNER`, `AREA_MANAGER`; `TECHNICIAN` xem và cập nhật thông tin kỹ thuật |
| UC05.2 | Cập nhật trạng thái lô giống | `OWNER`, `AREA_MANAGER` |
| UC05.3 | Ghi và xem thông số môi trường nước | `OWNER`, `AREA_MANAGER`, `TECHNICIAN` |
| UC05.4 | Ghi và xem nhật ký cho ăn | `OWNER`, `AREA_MANAGER`, `TECHNICIAN` |
| UC05.5 | Ghi và xem nhật ký thay nước | `OWNER`, `AREA_MANAGER`, `TECHNICIAN` |
| UC05.6 | Ghi và xem nhật ký thuốc/chế phẩm | `OWNER`, `AREA_MANAGER`, `TECHNICIAN` |

UC05.1 gồm: tiếp nhận lô, gán vào ao/bể, xem danh sách, xem chi tiết, cập nhật thông tin nguồn giống và lưu hồ sơ kiểm dịch. Các kiểm tra chất lượng chi tiết được lưu qua nghiệp vụ bên trong `seed_quality_checks`; biến động số lượng và lấy mẫu tăng trưởng được lưu qua `batch_quantity_events` và `growth_sampling_logs`.

### 2.4. UC06 — Kiểm tra và phân tích AI

Actor cấp 1: `OWNER`, `AREA_MANAGER`, `TECHNICIAN` (+ AI Service).

| Mã | Use case con | Actor thực hiện |
|---|---|---|
| UC06.1 | Thực hiện AI Inspection | `OWNER`, `AREA_MANAGER`, `TECHNICIAN` (+ AI Service) |
| UC06.2 | Xem kết quả và lịch sử AI Inspection | `OWNER`, `AREA_MANAGER`, `TECHNICIAN` |

UC06.1 gồm: lấy mẫu theo quy trình, tải ảnh mẫu tôm, chọn lô giống, gửi ảnh đến dịch vụ AI, nhận kết quả nhận diện, đếm số lượng, tính mật độ, lưu độ tin cậy, cho phép kỹ thuật viên xác nhận/hiệu chỉnh. Ao/bể được suy ra qua lô giống, không tạo quan hệ `tank_id` thứ hai trong `ai_inspections`.

### 2.5. UC07 — Quản lý vật tư

Actor cấp 1: `OWNER`, `AREA_MANAGER`, `TECHNICIAN`, `WAREHOUSE_STAFF`.

| Mã | Use case con | Actor thực hiện |
|---|---|---|
| UC07.1 | CRUD danh mục vật tư | `OWNER`, `WAREHOUSE_STAFF`; `AREA_MANAGER` và `TECHNICIAN` chỉ xem |
| UC07.2 | Nhập kho vật tư | `OWNER`, `WAREHOUSE_STAFF` |
| UC07.3 | Yêu cầu cấp vật tư | `OWNER`, `AREA_MANAGER` |
| UC07.4 | Xuất hoặc cấp vật tư khỏi kho | `OWNER`, `WAREHOUSE_STAFF` |
| UC07.5 | Ghi nhận sử dụng vật tư | `OWNER`, `TECHNICIAN` |
| UC07.6 | Điều chỉnh tồn kho | `OWNER`, `WAREHOUSE_STAFF` |

UC07.1 quản lý tên vật tư, nhóm vật tư, đơn vị tính, đơn giá, ngưỡng cảnh báo và có thể tham chiếu định mức thức ăn từ `feed_guidelines`. UC07.3 có thể được xử lý tiếp bởi UC07.4; bảng `supply_requests` vẫn là phần mở rộng chưa có trong schema lõi.

### 2.6. UC08 — Quản lý tài chính và bán giống

Actor cấp 1: `OWNER`, `AREA_MANAGER`, `TECHNICIAN`.

| Mã | Use case con | Actor thực hiện |
|---|---|---|
| UC08.1 | Quản lý chi phí | `OWNER` |
| UC08.2 | Ghi nhận chi phí phát sinh | `TECHNICIAN` |
| UC08.3 | Xem chi phí theo khu vực | `AREA_MANAGER` |
| UC08.4 | CRUD khách hàng | `OWNER` |
| UC08.5 | Xuất bán con giống | `OWNER` |
| UC08.6 | Xem doanh thu | `OWNER` |

UC08.5 gồm: chọn lô giống, chọn khách hàng, áp dụng `price_lists` theo loài/giai đoạn/chất lượng/số lượng, nhập hoặc xác nhận phụ phí và chiết khấu, tính tổng doanh thu, cập nhật số lượng còn lại và trạng thái lô giống. Đơn giá và thành phần giá phải được lưu snapshot tại giao dịch bán.

Trong đó `price_per_thousand` chỉ tính giá cơ sở và các phụ phí theo đơn vị; `total_revenue = (quantity_sold / 1000 × price_per_thousand) + transport_fee - discount_amount`, với giá trị rỗng được coi là 0.

### 2.7. UC09 — Quản lý thống kê và cảnh báo

Actor cấp 1: `OWNER`, `AREA_MANAGER`, `TECHNICIAN`, `WAREHOUSE_STAFF`.

| Mã | Use case con | Actor thực hiện |
|---|---|---|
| UC09.1 | Xem Dashboard theo phạm vi quyền | `OWNER`, `AREA_MANAGER`, `TECHNICIAN`, `WAREHOUSE_STAFF` |
| UC09.2 | Xem cảnh báo toàn trại | `OWNER` |
| UC09.3 | Xem cảnh báo theo khu vực | `AREA_MANAGER`, `TECHNICIAN` |
| UC09.4 | Xem cảnh báo tồn kho | `WAREHOUSE_STAFF` |

> Ghi chú triển khai: cảnh báo hiển thị ở UC09.2–UC09.4 được một tiến trình nền tự động sinh ra khi log môi trường vượt ngưỡng, kết quả AI bất thường hoặc tồn kho dưới ngưỡng tối thiểu — không phải use case do người dùng chủ động thực hiện, nên không có mã riêng.

## 3. Use case theo từng actor

### 3.1. OWNER

`OWNER` có quyền thực hiện toàn bộ use case cấp 1 (UC01–UC09) và mọi use case con bên trong, bao gồm quản trị nhân viên, trang trại, sản xuất, AI, kho, tài chính, bán giống, dashboard và cảnh báo.

### 3.2. AREA_MANAGER

`AREA_MANAGER` được thực hiện: UC01, UC02, UC03.3, UC04.1 (xem), UC04.2, UC04.3, UC05 (toàn bộ, trong khu vực), UC06 (toàn bộ, trong khu vực), UC07.1 (xem), UC07.3, UC08.3, UC09.1, UC09.3.

### 3.3. TECHNICIAN

`TECHNICIAN` được thực hiện: UC01, UC02, UC04.1 (xem), UC04.2 (xem), UC05.1 (xem + cập nhật kỹ thuật), UC05.2–UC05.6, UC06 (toàn bộ), UC07.1 (xem), UC07.5, UC08.2, UC09.1, UC09.3.

### 3.4. WAREHOUSE_STAFF

`WAREHOUSE_STAFF` được thực hiện: UC01, UC02, UC04.1 (xem), UC07.1, UC07.2, UC07.4, UC07.6, UC09.1, UC09.4.

## 4. Quan hệ `<<Include>>` và `<<Extend>>`

- **`<<Include>>` UC01 — Đăng nhập**: mọi use case cấp 1 (UC03–UC09) và UC02 đều include UC01, vì use case nào cũng bắt buộc người dùng đã đăng nhập mới thực hiện được. Use case cấp 2 **không** include UC01 trực tiếp — quan hệ này được kế thừa qua use case cấp 1 mà nó `<<Extend>>` vào.
- **`<<Extend>>` use case cấp 1**: mỗi use case cấp 2 mở rộng đúng một use case cấp 1 (bảng ở mục 2). Đây là quan hệ chính thể hiện việc phân rã.
- **`UC07.3` → `UC07.4`**: yêu cầu cấp vật tư có thể được xử lý tiếp bởi xuất/cấp vật tư khỏi kho (quan hệ nghiệp vụ nối tiếp, không phải include/extend).

## 5. Tác nhân phụ trợ

| Tác nhân phụ trợ | Use case liên quan |
|---|---|
| AI Service | UC06.1, UC06.2 |

## 6. Lưu ý triển khai phân quyền

Để triển khai đúng phạm vi quyền theo khu vực, dữ liệu ao/bể, lô giống, nhật ký kỹ thuật, chi phí và cảnh báo cần liên kết được với khu vực phụ trách thông qua `area_id` hoặc quan hệ tương đương. Bảng `areas` và `farm_members.area_id` đã có trong schema lõi; `ponds_tanks.area_id` và các module nghiệp vụ vẫn cần được hiện thực theo DATABASE.md/ERD.md.

Danh sách này dùng đúng bốn role `OWNER`, `AREA_MANAGER`, `TECHNICIAN`, `WAREHOUSE_STAFF`. Role được lưu trong `farm_members.role`; role dự kiến trong lời mời được lưu ở `farm_invitations.role`. Không sử dụng `users.role`.

> Theo ma trận yêu cầu, Owner là role gửi lời mời. Code hiện tại còn cho phép Area Manager mời hoặc cập nhật Technician trong khu vực của mình; đây là điểm cần quyết định riêng khi hoàn thiện RBAC, không làm thay đổi mô hình role theo `farm_members`.

> Kiến trúc yêu cầu một user có thể nhận nhiều membership ở nhiều farm. Luồng lời mời hiện tại vẫn từ chối email đã có trong `users`, và migration legacy còn giới hạn non-Owner ở một farm; vì vậy đây là use case đích chưa được hiện thực đầy đủ.

## 7. Ánh xạ nội dung quy chuẩn vào use case

Các nội dung dưới đây là bước nghiệp vụ bên trong use case hiện có, không tạo thêm actor hoặc mã use case mới:

| Nội dung nghiệp vụ | Use case áp dụng | Dữ liệu chính |
|---|---|---|
| Tiếp nhận lô, mã lô nhà cung cấp, số lượng chứng từ/thực tế | UC05.1 | `seed_suppliers`, `seed_batches` |
| Kiểm tra cảm quan, dị hình, stress test, soi kính hiển vi, PCR | UC05.1 | `seed_quality_checks` |
| Theo dõi chết, bán, chuyển bể, điều chỉnh | UC05.1, UC08.5 | `batch_quantity_events` |
| Lấy mẫu kích thước, khối lượng, sinh khối | UC05.1, UC06.1 | `growth_sampling_logs` |
| Đối chiếu thông số với ngưỡng theo loài/giai đoạn/ao-bể | UC05.3, UC09 | `environment_thresholds`, `alerts_notifications` |
| Tính lượng thức ăn khuyến nghị và ghi lượng thực tế | UC05.4 | `feed_guidelines`, `feeding_logs` |
| Tính tỷ lệ sống, mật độ, sinh khối, giá vốn | UC05, UC08, UC09 | Dữ liệu lô, nhật ký, chi phí |
| Áp dụng giá cơ sở, phụ phí, chiết khấu và phí vận chuyển | UC08.5 | `price_lists`, `seed_sales` |

Các giá trị sinh học và công thức phải được xem là cấu hình/logic nghiệp vụ có nguồn tham chiếu, không phải hằng số cố định cho mọi trại.
