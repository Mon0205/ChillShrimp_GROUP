# Đặc tả chi tiết Use Case — ChillShrimp

> Nguồn tham chiếu: [SRS.md](./SRS.md), [USECASE.md](./USECASE.md), [DATABASE.md](./DATABASE.md), [ERD.md](./ERD.md).
> Mô hình 2 cấp (khớp [USECASE-DIAGRAM.drawio](./USECASE-DIAGRAM.drawio)): **cấp 1** là 7 use case nhóm chức năng (UC03–UC09), actor kết nối trực tiếp vào cấp 1, mỗi use case cấp 1 `<<Include>>` **UC01 — Đăng nhập**. **Cấp 2** là use case nghiệp vụ cụ thể (`UCxx.n`), `<<Extend>>` ra từ đúng một use case cấp 1 — đây là nơi mô tả luồng hoạt động thật. UC01, UC02 đứng độc lập, không thuộc nhóm nào.

---

> Phạm vi kiến trúc: một tài khoản có thể tham gia nhiều trang trại. Role và trạng thái được xác định từ `farm_members` theo cặp `(farm_id, user_id)`; mọi use case nghiệp vụ được thực hiện trong `farm_id` đang chọn và phải có membership đang `active` tại đó.

## 0. Ghi chú đối chiếu dữ liệu (đọc trước khi dùng tài liệu)

| # | Vấn đề | Ảnh hưởng | Trạng thái |
|---|---|---|---|
| G1 | Role được mô tả trong `users` thay vì membership | Toàn bộ use case có phạm vi farm | ✅ Đã chốt: role và trạng thái nằm trong `farm_members` |
| G1b | `farms.owner_id` được dùng như nguồn quyền thứ hai | UC02, UC03 và mọi use case của Owner | ✅ Đã loại bỏ: `farms.created_by` chỉ là người tạo; Owner được xác định bằng `farm_members.role` |
| G2 | Phạm vi khu vực chưa đi qua dữ liệu nghiệp vụ | UC04–UC09 theo khu vực | ⚠ `areas` và `farm_members` đã có; `ponds_tanks.area_id` vẫn cần migration |
| G3 | Tên bảng và FK invitation không khớp schema thật | UC03.1–UC03.3 | ✅ Đã chốt: dùng `farm_invitations`; `area_id` đã là FK tới `areas.id` |
| G4 | Chưa có bảng lưu "yêu cầu cấp vật tư" (`supply_requests`) | UC07.3, UC07.4 | ⚠ Còn mở |
| G5 | Multi-farm chưa hoàn tất ở migration, luồng mời user hiện hữu và farm selector | UC03.1, UC03.2 và mọi kiểm thử chéo farm | ⚠ Kiến trúc đã chốt; chưa sửa code/migration theo phạm vi hiện tại |

Use case bị ảnh hưởng bởi G2–G5 có dòng cảnh báo trỏ về đây.

Các bảng mở rộng nghiệp vụ `seed_suppliers`, `seed_quality_checks`, `batch_quantity_events`, `growth_sampling_logs`, `environment_thresholds`, `feed_guidelines` và `price_lists` đã được bổ sung vào schema đích trong DATABASE.md/ERD.md. Chúng vẫn cần migration, API và kiểm thử trước khi được xem là đã hiện thực trong codebase.

---

## 1. Quy ước chung

- **Actor**: `OWNER`, `AREA_MANAGER`, `TECHNICIAN`, `WAREHOUSE_STAFF` (4 role chính); `AI_SERVICE` (hệ thống ngoài, chỉ gắn với UC06).
- Mọi use case, trừ UC01 (đăng nhập) và luồng chấp nhận lời mời bên trong UC03.1, đều yêu cầu phiên ứng dụng hợp lệ và membership của người dùng tại farm đang chọn có `status = active`.
- **Include Đăng nhập chỉ khai báo ở cấp 1**: UC02 và mọi use case cấp 1 (UC03–UC09) `<<Include>>` UC01. Use case cấp 2 kế thừa yêu cầu đăng nhập qua quan hệ `<<Extend>>` với use case cấp 1 chứa nó, không khai báo include riêng.
- Cột **Bảng dữ liệu** trỏ theo tên bảng trong DATABASE.md/ERD.md. Cột **Quy tắc liên quan** trỏ theo mã `BRxx` trong SRS.md §7.
- Sinh cảnh báo tự động (môi trường/AI/tồn kho) là tiến trình nền, không phải use case — xem ghi chú cuối UC09.

---

## 2. Bảng phân rã tổng hợp

| Mã | Use case | Cấp | Thuộc nhóm |
|---|---|---|---|
| UC01 | Đăng nhập | Độc lập | — |
| UC02 | Quản lý hồ sơ cá nhân | Độc lập | — |
| UC03 | Quản lý nhân viên | 1 | — |
| UC03.1 | Mời thành viên | 2 | UC03 |
| UC03.2 | Quản lý tài khoản nhân viên | 2 | UC03 |
| UC03.3 | Xem danh sách nhân viên theo khu vực | 2 | UC03 |
| UC04 | Quản lý trang trại | 1 | — |
| UC04.1 | Xem/cập nhật thông tin trang trại | 2 | UC04 |
| UC04.2 | CRUD ao hoặc bể | 2 | UC04 |
| UC04.3 | Cập nhật trạng thái ao/bể | 2 | UC04 |
| UC05 | Quản lý lô giống và chăm sóc | 1 | — |
| UC05.1 | CRUD lô giống | 2 | UC05 |
| UC05.2 | Cập nhật trạng thái lô giống | 2 | UC05 |
| UC05.3 | Ghi và xem thông số môi trường nước | 2 | UC05 |
| UC05.4 | Ghi và xem nhật ký cho ăn | 2 | UC05 |
| UC05.5 | Ghi và xem nhật ký thay nước | 2 | UC05 |
| UC05.6 | Ghi và xem nhật ký thuốc/chế phẩm | 2 | UC05 |
| UC06 | Kiểm tra và phân tích AI | 1 | — |
| UC06.1 | Thực hiện AI Inspection | 2 | UC06 |
| UC06.2 | Xem kết quả và lịch sử AI Inspection | 2 | UC06 |
| UC07 | Quản lý vật tư | 1 | — |
| UC07.1 | CRUD danh mục vật tư | 2 | UC07 |
| UC07.2 | Nhập kho vật tư | 2 | UC07 |
| UC07.3 | Yêu cầu cấp vật tư | 2 | UC07 |
| UC07.4 | Xuất/cấp vật tư khỏi kho | 2 | UC07 |
| UC07.5 | Ghi nhận sử dụng vật tư | 2 | UC07 |
| UC07.6 | Điều chỉnh tồn kho | 2 | UC07 |
| UC08 | Quản lý tài chính và bán giống | 1 | — |
| UC08.1 | Quản lý chi phí | 2 | UC08 |
| UC08.2 | Ghi nhận chi phí phát sinh | 2 | UC08 |
| UC08.3 | Xem chi phí theo khu vực | 2 | UC08 |
| UC08.4 | CRUD khách hàng | 2 | UC08 |
| UC08.5 | Xuất bán con giống | 2 | UC08 |
| UC08.6 | Xem doanh thu | 2 | UC08 |
| UC09 | Quản lý thống kê và cảnh báo | 1 | — |
| UC09.1 | Xem Dashboard theo phạm vi quyền | 2 | UC09 |
| UC09.2 | Xem cảnh báo toàn trại | 2 | UC09 |
| UC09.3 | Xem cảnh báo theo khu vực | 2 | UC09 |
| UC09.4 | Xem cảnh báo tồn kho | 2 | UC09 |

**Tổng: 2 use case độc lập + 7 use case cấp 1 + 30 use case cấp 2 = 39 use case.**

---

## 3. Đặc tả chi tiết

### 3.0. Độc lập

#### UC01 — Đăng nhập

| Thuộc tính | Nội dung |
|---|---|
| Actor | Tất cả role |
| Bảng dữ liệu | `users` |
| Điều kiện trước | Tài khoản tồn tại trong Neon Auth và đã được đồng bộ vào `users` |
| Luồng chính | 1. Nhập email, mật khẩu.<br>2. Backend gọi Neon Auth để xác thực.<br>3. Kiểm tra user đã có bản ghi trong `users`.<br>4. Tạo phiên ứng dụng trong `access_sessions`.<br>5. Khi truy cập một farm, kiểm tra membership `farm_members` có `status = active` và lấy role theo farm đó. |
| Luồng thay thế/ngoại lệ | Sai email/mật khẩu → 401. User xác thực được nhưng chưa có quyền trong `users` → 403. Membership tại farm bị `suspended` → 403 |
| Kết quả | Có phiên đăng nhập hợp lệ |
| Quy tắc liên quan | BR01 |

#### UC02 — Quản lý hồ sơ cá nhân

| Thuộc tính | Nội dung |
|---|---|
| Actor | Tất cả role |
| Bảng dữ liệu | `users` |
| Điều kiện trước | Đã đăng nhập |
| Luồng chính | 1. Xem `displayName`, `email`, `phone` và danh sách membership theo farm.<br>2. Sửa `displayName`/`phone`; Backend validate và cập nhật `users`. Không được tự đổi `farm_members.role` hoặc `farm_members.status`. |
| Luồng thay thế/ngoại lệ | Dữ liệu không hợp lệ → 400 |
| Kết quả | Xem/cập nhật được hồ sơ cá nhân |
| Quy tắc liên quan | — |
| Quan hệ | `<<Include>>` UC01 |

### 3.1. UC03 — Quản lý nhân viên (cấp 1)

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Area Manager (chỉ UC03.3) |
| Mô tả | Nhóm gộp toàn bộ nghiệp vụ mời và quản trị nhân viên trong trang trại |
| Use case con | UC03.1, UC03.2, UC03.3 |
| Quan hệ | `<<Include>>` UC01 |

#### UC03.1 — Mời thành viên

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner |
| Bảng dữ liệu | `users`, `farms`, `farm_members`, `farm_invitations`, `areas` |
| Điều kiện trước | Owner đã đăng nhập |
| Luồng chính | **Gửi lời mời**: 1. Nhập email, chọn `role` ∈ {`area_manager`,`technician`,`warehouse_staff`}, chọn khu vực dự kiến nếu role yêu cầu.<br>2. Backend kiểm tra email và membership/lời mời `pending` trong đúng `farm_id`; người đã là thành viên của farm đó không được mời lại, nhưng user đang thuộc farm khác vẫn được mời.<br>3. Tạo `token_hash`, `expires_at`, tạo `farm_invitations` với `status = pending`; nếu user đã tồn tại thì lưu `invited_user_id`.<br>4. Gửi email chứa link kèm token gốc.<br>**Theo dõi/hủy**: 5. Owner xem và hủy lời mời của farm đó.<br>**Chấp nhận**: 6. User mới đặt mật khẩu và đăng ký Neon Auth; user đã tồn tại đăng nhập đúng tài khoản được mời. 7. Backend tạo `farm_members` với role từ `farm_invitations.role`, cập nhật `invited_user_id` và `status = accepted`; role ở các farm khác không bị thay đổi. |
| Luồng thay thế/ngoại lệ | Email đã là thành viên của chính farm hoặc đã có lời mời `pending` → 409. User hiện hữu chưa đăng nhập đúng tài khoản → 401. `role = owner` → từ chối (BR06). Token sai/hết hạn/đã dùng → 400/409. Hủy lời mời không ở trạng thái `pending` → 409 |
| Kết quả | Lời mời được tạo, theo dõi, hủy được; người được mời có tài khoản active sau khi chấp nhận |
| Quy tắc liên quan | BR06 · ⚠ G3, G5 |

#### UC03.2 — Quản lý tài khoản nhân viên

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner |
| Bảng dữ liệu | `users`, `farm_members`, `areas` |
| Điều kiện trước | Tài khoản nhân viên tồn tại |
| Luồng chính | **Xem danh sách**: 1. Owner chọn `farm_id`; Backend trả các dòng `farm_members` và thông tin user tương ứng.<br>**Kích hoạt/vô hiệu hóa tại farm**: 2. Owner cập nhật `farm_members.status`.<br>**Gán quyền/khu vực**: 3. Owner cập nhật `farm_members.role` và `area_id`; thay đổi chỉ tác động tới farm đang chọn. |
| Luồng thay thế/ngoại lệ | Cố vô hiệu hóa chính Owner → 403. `warehouse_staff` không áp dụng khu vực |
| Kết quả | Danh sách nhân viên, trạng thái hoạt động và khu vực được quản lý |
| Quy tắc liên quan | BR02 · ⚠ G2 |

#### UC03.3 — Xem danh sách nhân viên theo khu vực

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Area Manager |
| Bảng dữ liệu | `users`, `farm_members`, `areas` |
| Điều kiện trước | Đã đăng nhập với role phù hợp |
| Luồng chính | 1. Owner chọn farm/khu vực bất kỳ, hoặc Area Manager mặc định khu vực trong membership của mình.<br>2. Backend lọc `farm_members` theo `farm_id`, `area_id`, `status`; trả thông tin user. |
| Luồng thay thế/ngoại lệ | Area Manager cố xem khu vực khác → 403 |
| Kết quả | Danh sách nhân viên đúng phạm vi khu vực |
| Quy tắc liên quan | BR02, BR03 · ⚠ G2 |

### 3.2. UC04 — Quản lý trang trại (cấp 1)

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner (đầy đủ), Area Manager/Technician/Warehouse Staff (xem, riêng ao/bể theo phân công) |
| Mô tả | Thông tin hồ sơ trang trại và toàn bộ ao/bể |
| Use case con | UC04.1, UC04.2, UC04.3 |
| Quan hệ | `<<Include>>` UC01 |

#### UC04.1 — Xem/cập nhật thông tin trang trại

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner (cập nhật); Area Manager, Technician, Warehouse Staff (chỉ xem) |
| Bảng dữ liệu | `farms` |
| Điều kiện trước | Đã đăng nhập |
| Luồng chính | 1. Xem `code`, `name`, `address`.<br>2. Owner sửa thông tin; Backend kiểm tra membership tại `farm_id` có `role = owner`, validate và cập nhật `farms`. |
| Luồng thay thế/ngoại lệ | Không phải chủ trại mà sửa → 403. Dữ liệu không hợp lệ → 400 |
| Kết quả | Thông tin trang trại được xem/cập nhật đúng quyền |
| Quy tắc liên quan | BR02 |

#### UC04.2 — CRUD ao hoặc bể

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Area Manager (đầy đủ); Technician (chỉ xem) |
| Bảng dữ liệu | `ponds_tanks` |
| Điều kiện trước | `farms` đã tồn tại |
| Luồng chính | **Thêm**: 1. Nhập `code`, `name`, `tank_type`, `volume_m3`, mô tả; Backend kiểm tra `code` không trùng trong trại; set `status = empty`; tạo `ponds_tanks`.<br>**Xem danh sách/chi tiết**: 2. Lọc theo `status`/`tank_type`/tìm theo `code`/`name`, lọc theo phạm vi quyền; xem chi tiết kèm lô giống đang có và log gần nhất.<br>**Cập nhật**: 3. Sửa `name`/`tank_type`/`volume_m3`/`description`; validate; cập nhật. |
| Luồng thay thế/ngoại lệ | `code` trùng → 409. `volume_m3` ≤ 0 → 400. Area Manager thao tác ngoài khu vực → 403 |
| Kết quả | Ao/bể được tạo, xem, cập nhật đúng quyền |
| Quy tắc liên quan | BR07 · ⚠ G2 |

#### UC04.3 — Cập nhật trạng thái ao/bể

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Area Manager |
| Bảng dữ liệu | `ponds_tanks` |
| Điều kiện trước | Ao/bể tồn tại |
| Luồng chính | 1. Chọn trạng thái mới ∈ {`empty`,`active`,`cleaning`,`inactive`}.<br>2. Backend kiểm tra chuyển trạng thái hợp lệ theo luồng `empty → active → cleaning → empty`; cập nhật `status`. |
| Luồng thay thế/ngoại lệ | Chuyển `active → empty` khi còn lô `active`/`ready_for_sale` → 409, phải kết thúc lô trước (UC05.2) |
| Kết quả | Trạng thái ao/bể phản ánh đúng thực tế |
| Quy tắc liên quan | BR07, BR08 |

### 3.3. UC05 — Quản lý lô giống và chăm sóc (cấp 1)

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Area Manager, Technician |
| Mô tả | Vòng đời lô giống và toàn bộ nhật ký chăm sóc gắn với ao/bể đang chứa lô |
| Use case con | UC05.1–UC05.6 |
| Quan hệ | `<<Include>>` UC01 |

#### UC05.1 — CRUD lô giống

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Area Manager (đầy đủ); Technician (xem + cập nhật thông tin kỹ thuật) |
| Bảng dữ liệu | `seed_batches`, `ponds_tanks`, `seed_suppliers`, `seed_quality_checks`, `batch_quantity_events`, `growth_sampling_logs` |
| Điều kiện trước | Ao/bể đích ở trạng thái `empty` (khi tạo mới) |
| Luồng chính | **Tiếp nhận, tạo & gán ao/bể**: 1. Nhập `batch_code`, loài, giai đoạn PL, cơ sở cung cấp, mã lô nhà cung cấp, số lượng theo chứng từ và số lượng thực tế; chọn `tank_id`; set `current_estimated_quantity = initial_quantity`, `status = active`; nếu ao/bể `empty` → chuyển `active` (UC04.3).<br>**Kiểm tra đầu vào**: 2. Lưu hồ sơ kiểm dịch và kết quả kiểm tra trong `seed_quality_checks` nếu đã có.<br>**Xem danh sách/chi tiết**: 3. Lọc theo `status`/ao-bể/ngày thả, theo phạm vi quyền; xem lịch sử kiểm tra, lấy mẫu, nhật ký, AI, chi phí, xuất bán.<br>**Cập nhật**: 4. Owner/Area Manager sửa toàn phần; Technician chỉ sửa dữ liệu kỹ thuật và ghi nhận sự kiện/lấy mẫu theo quyền. |
| Luồng thay thế/ngoại lệ | `batch_code` trùng → 409. Ao/bể đang `cleaning`/`inactive`/đã có lô `active` → 409. Lô đã `sold`/`cancelled` → không cho sửa. Technician sửa ngoài phạm vi → 403 |
| Kết quả | Lô giống được tạo, xem, cập nhật đúng phạm vi role |
| Quy tắc liên quan | BR04, BR08, BR09 · ⚠ G2 |

#### UC05.2 — Cập nhật trạng thái lô giống

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Area Manager |
| Bảng dữ liệu | `seed_batches` |
| Điều kiện trước | Lô tồn tại |
| Luồng chính | 1. Chọn trạng thái mới ∈ {`active`,`ready_for_sale`,`sold`,`failed`,`cancelled`}.<br>2. Backend kiểm tra chuyển hợp lệ: `active → ready_for_sale → sold` hoặc `active → failed`/`cancelled`; cập nhật `status`. |
| Luồng thay thế/ngoại lệ | Chuyển trạng thái không hợp lệ (vd `sold → active`) → 409 |
| Kết quả | Trạng thái lô phản ánh đúng vòng đời |
| Quy tắc liên quan | BR08 |

#### UC05.3 — Ghi và xem thông số môi trường nước

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Area Manager, Technician |
| Bảng dữ liệu | `water_parameter_logs`, `environment_thresholds`, `alerts_notifications` |
| Điều kiện trước | Ao/bể tồn tại |
| Luồng chính | **Ghi**: 1. Chọn ao/bể; nhập các chỉ số có thể đo (`temperature`, `ph`, `salinity`, `dissolved_oxygen`, `nh3`, `tan`, `no2`, `nitrate`, `alkalinity`, `h2s`, `turbidity`, `water_level_m`), phương pháp/thiết bị đo và `recorded_at`; validate miền giá trị; lưu `water_parameter_logs` với `tank_id`, `recorded_by`.<br>2. Hệ thống chọn cấu hình `environment_thresholds` theo loài/giai đoạn/loại ao-bể và sinh cảnh báo (UC09.2/09.3) nếu vượt ngưỡng đã phê duyệt.<br>**Xem**: 3. Chọn ao/bể hoặc lô (suy ra ao/bể qua `seed_batches.tank_id` trong khoảng thời gian lô hoạt động) và khoảng thời gian; trả danh sách. |
| Luồng thay thế/ngoại lệ | Thiếu chỉ số bắt buộc/giá trị ngoài miền hợp lý → 400. Technician ghi ngoài khu vực → 403 |
| Kết quả | Log môi trường được ghi/xem, có thể kích hoạt cảnh báo |
| Quy tắc liên quan | BR04, BR09, BR18 |

#### UC05.4 — Ghi và xem nhật ký cho ăn

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Area Manager, Technician |
| Bảng dữ liệu | `feeding_logs`, `feed_guidelines`, `inventory_supplies`, `inventory_transactions`, `growth_sampling_logs` |
| Điều kiện trước | Ao/bể tồn tại |
| Luồng chính | **Ghi**: 1. Chọn ao/bể; hệ thống đọc định mức phù hợp từ `feed_guidelines` nếu có sinh khối/giai đoạn; nhập `feed_name`, `amount`, `unit`, `feeding_time`, lượng khuyến nghị và kết quả kiểm tra sàng ăn nếu có.<br>2. Chọn `supply_id` nếu lấy từ kho; validate `amount` > 0; lưu `feeding_logs` với `tank_id`, `performed_by`; nếu có `supply_id` → tạo `inventory_transactions` loại `usage`, giảm tồn.<br>**Xem**: 3. Chọn ao/bể hoặc lô, khoảng thời gian; trả danh sách, tổng lượng thực tế và so sánh với lượng khuyến nghị. |
| Luồng thay thế/ngoại lệ | `amount` ≤ 0 → 400. Không đủ tồn kho khi liên kết `supply_id` → 409 |
| Kết quả | Nhật ký cho ăn được ghi/xem, tồn kho cập nhật nếu liên kết |
| Quy tắc liên quan | BR09, BR12, BR13 |

#### UC05.5 — Ghi và xem nhật ký thay nước

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Area Manager, Technician |
| Bảng dữ liệu | `water_change_logs` |
| Điều kiện trước | Ao/bể tồn tại |
| Luồng chính | **Ghi**: 1. Chọn ao/bể; nhập `water_change_percentage` (0–100), `performed_at`; lưu `water_change_logs` với `tank_id`, `performed_by`.<br>**Xem**: 2. Chọn ao/bể hoặc lô, khoảng thời gian; trả danh sách. |
| Luồng thay thế/ngoại lệ | Tỷ lệ ngoài 0–100 → 400 |
| Kết quả | Nhật ký thay nước được ghi/xem |
| Quy tắc liên quan | BR09, BR18 |

#### UC05.6 — Ghi và xem nhật ký thuốc/chế phẩm

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Area Manager, Technician |
| Bảng dữ liệu | `treatment_logs`, `inventory_supplies`, `inventory_transactions` |
| Điều kiện trước | Ao/bể tồn tại (không bắt buộc có lô `active` — có thể xử lý ao/bể `empty`/`cleaning` giữa hai vụ) |
| Luồng chính | **Ghi**: 1. Chọn ao/bể; nhập `product_name`, `amount`, `unit`, `purpose`, `performed_at`; chọn `supply_id` nếu lấy từ kho; validate `amount` > 0; lưu `treatment_logs` với `tank_id`, `performed_by`; nếu có `supply_id` → tạo `inventory_transactions` loại `usage`, giảm tồn.<br>**Xem**: 2. Chọn ao/bể hoặc lô (suy ra qua `seed_batches.tank_id`), khoảng thời gian; trả danh sách. |
| Luồng thay thế/ngoại lệ | `amount` ≤ 0 → 400. Không đủ tồn kho → 409 |
| Kết quả | Nhật ký xử lý thuốc/chế phẩm được ghi/xem |
| Quy tắc liên quan | BR09, BR12, BR13, BR18 |

### 3.4. UC06 — Kiểm tra và phân tích AI (cấp 1)

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Area Manager, Technician (+ AI Service) |
| Mô tả | Toàn bộ chu trình kiểm tra mẫu tôm giống bằng AI |
| Use case con | UC06.1, UC06.2 |
| Quan hệ | `<<Include>>` UC01 |

#### UC06.1 — Thực hiện AI Inspection

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Area Manager, Technician; Hệ thống + AI Service (bước xử lý) |
| Bảng dữ liệu | `ai_inspections`, `growth_sampling_logs` |
| Điều kiện trước | Lô giống tồn tại, người dùng có quyền; có ảnh mẫu hợp lệ |
| Luồng chính | 1. Lấy mẫu từ ao/bể, ghi `growth_sampling_logs` nếu lấy mẫu tăng trưởng, đặt mẫu vào khay kiểm tra có điều kiện chụp tương đối chuẩn hóa.<br>2. Chụp/tải ảnh, chọn `sampling_method`, nhập `sample_volume_ml` nếu cần tính mật độ; validate định dạng/kích thước; lưu ảnh gốc, set `media_url`.<br>3. Tạo `ai_inspections` với `status = pending`, `created_by`, `batch_id`.<br>4. Backend cập nhật `status = processing`, gửi ảnh cho AI Service.<br>5. AI Service trả `detections`, `model_version`; Backend tính `detected_count`, `density_per_ml` (nếu có `sample_volume_ml`), `average_confidence`; lưu `annotated_image_url`, `status = completed`, `inspected_at`.<br>6. Kỹ thuật viên có thể nhập `manual_count` và `correction_factor`; kết quả AI gốc vẫn được giữ nguyên. |
| Luồng thay thế/ngoại lệ | Ảnh sai định dạng/quá dung lượng → 400. Thiếu thể tích mẫu → không tính `density_per_ml`. AI Service lỗi/timeout → `status = failed`, giữ bản ghi để thử lại |
| Kết quả | Yêu cầu kiểm tra AI hoàn tất hoặc `failed` có thể thử lại |
| Quy tắc liên quan | BR10, BR11, BR24 |

#### UC06.2 — Xem kết quả và lịch sử AI Inspection

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Area Manager, Technician |
| Bảng dữ liệu | `ai_inspections` |
| Điều kiện trước | Có bản ghi `ai_inspections` trong phạm vi quyền |
| Luồng chính | **Chi tiết**: 1. Xem `media_url`, `annotated_image_url`, `detected_count`, `density_per_ml`, `average_confidence`, `detections`, `model_version`, `status`.<br>**Lịch sử theo lô**: 2. Chọn lô; trả danh sách `ai_inspections` theo `batch_id`, sắp theo `inspected_at` giảm dần. |
| Luồng thay thế/ngoại lệ | `status = pending/processing` → hiển thị "đang xử lý". `status = failed` → hiển thị lỗi + nút thử lại |
| Kết quả | Xem được kết quả từng lần và xu hướng qua nhiều lần kiểm tra |
| Quy tắc liên quan | BR11 |

### 3.5. UC07 — Quản lý vật tư (cấp 1)

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Warehouse Staff (đầy đủ); Area Manager, Technician (một phần) |
| Mô tả | Danh mục vật tư và toàn bộ giao dịch kho |
| Use case con | UC07.1–UC07.6 |
| Quan hệ | `<<Include>>` UC01 |

#### UC07.1 — CRUD danh mục vật tư

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Warehouse Staff (đầy đủ); Area Manager, Technician (chỉ xem) |
| Bảng dữ liệu | `inventory_supplies` |
| Điều kiện trước | Đã đăng nhập |
| Luồng chính | **Thêm**: 1. Nhập `name`, `category`, `unit`, `unit_price`, `min_threshold`; set `quantity = 0`; tạo `inventory_supplies`.<br>**Xem/tìm kiếm**: 2. Lọc theo `category`, tìm theo `name`, lọc "dưới ngưỡng".<br>**Cập nhật**: 3. Sửa các field trên; validate (giá/ngưỡng không âm). |
| Luồng thay thế/ngoại lệ | Dữ liệu không hợp lệ → 400 |
| Kết quả | Danh mục vật tư được quản lý đầy đủ |
| Quy tắc liên quan | — |

#### UC07.2 — Nhập kho vật tư

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Warehouse Staff |
| Bảng dữ liệu | `inventory_supplies`, `inventory_transactions` |
| Điều kiện trước | Vật tư tồn tại trong danh mục |
| Luồng chính | 1. Chọn vật tư, nhập `quantity`, `unit_price`, `transaction_date`.<br>2. Validate `quantity` > 0.<br>3. Tạo `inventory_transactions` loại `import`; cộng `quantity` vào `inventory_supplies.quantity`. |
| Luồng thay thế/ngoại lệ | `quantity` ≤ 0 → 400 |
| Kết quả | Tồn kho tăng, có lịch sử nhập |
| Quy tắc liên quan | BR12, BR13 |

#### UC07.3 — Yêu cầu cấp vật tư

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Area Manager |
| Bảng dữ liệu | ⚠ Chưa có bảng — đề xuất `supply_requests` (mục 0, G4) |
| Điều kiện trước | Vật tư tồn tại trong danh mục |
| Luồng chính | 1. Area Manager chọn vật tư, số lượng cần cho khu vực.<br>2. Backend tạo yêu cầu `status = pending`, gắn `area_id`, `requested_by`.<br>3. Hiển thị cho Warehouse Staff xử lý ở UC07.4. |
| Luồng thay thế/ngoại lệ | Vật tư không tồn tại → 404 |
| Kết quả | Yêu cầu được tạo, chờ xử lý |
| Quy tắc liên quan | ⚠ G4 |

#### UC07.4 — Xuất hoặc cấp vật tư khỏi kho

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Warehouse Staff |
| Bảng dữ liệu | `inventory_supplies`, `inventory_transactions` |
| Điều kiện trước | Vật tư có đủ tồn kho ≥ số lượng xuất |
| Luồng chính | 1. Chọn vật tư (có thể dựa trên UC07.3), nhập `quantity`, `batch_id` nếu xuất cho một lô cụ thể.<br>2. Kiểm tra `quantity ≤ inventory_supplies.quantity`.<br>3. Tạo `inventory_transactions` loại `usage`; trừ tồn; kích hoạt cảnh báo tồn thấp nếu dưới ngưỡng. |
| Luồng thay thế/ngoại lệ | Không đủ tồn kho → 409 |
| Kết quả | Tồn kho giảm, có giao dịch truy vết |
| Quy tắc liên quan | BR12, BR13 |

#### UC07.5 — Ghi nhận sử dụng vật tư

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Technician |
| Bảng dữ liệu | `inventory_supplies`, `inventory_transactions` |
| Điều kiện trước | Vật tư đã có tại hiện trường, đủ tồn kho hệ thống |
| Luồng chính | 1. Technician ghi nhận đã dùng vật tư tại ao/bể (thường tự động từ UC05.4/UC05.6 khi chọn `supply_id`, hoặc ghi thủ công).<br>2. Tạo `inventory_transactions` loại `usage`; trừ tồn. |
| Luồng thay thế/ngoại lệ | Không đủ tồn → 409 |
| Kết quả | Ghi nhận sử dụng thực tế, đồng bộ tồn kho |
| Quy tắc liên quan | BR12, BR13 |

#### UC07.6 — Điều chỉnh tồn kho

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Warehouse Staff |
| Bảng dữ liệu | `inventory_supplies`, `inventory_transactions` |
| Điều kiện trước | Phát hiện sai lệch tồn hệ thống với thực tế |
| Luồng chính | 1. Nhập số lượng điều chỉnh (±) và lý do.<br>2. Tạo `inventory_transactions` loại `adjustment`; cập nhật `quantity`. |
| Luồng thay thế/ngoại lệ | Không nhập lý do → 400. Điều chỉnh khiến tồn âm → 409 |
| Kết quả | Tồn kho khớp thực tế, có lịch sử |
| Quy tắc liên quan | BR12, BR13 |

### 3.6. UC08 — Quản lý tài chính và bán giống (cấp 1)

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner (đầy đủ); Area Manager, Technician (một phần) |
| Mô tả | Chi phí, khách hàng, xuất bán và doanh thu |
| Use case con | UC08.1–UC08.6 |
| Quan hệ | `<<Include>>` UC01 |

#### UC08.1 — Quản lý chi phí

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner |
| Bảng dữ liệu | `expense_records` |
| Điều kiện trước | Đã đăng nhập |
| Luồng chính | **Xem/tổng hợp**: 1. Lọc theo lô/loại chi phí/khoảng ngày; tổng hợp theo `expense_type`.<br>**Sửa/xóa**: 2. Chọn bản ghi, sửa `amount`/`expense_type`/`description`/`expense_date` hoặc xóa; validate `amount` > 0. |
| Luồng thay thế/ngoại lệ | `amount` ≤ 0 → 400 |
| Kết quả | Owner xem và hiệu chỉnh được toàn bộ chi phí trại |
| Quy tắc liên quan | BR02, BR18 |

#### UC08.2 — Ghi nhận chi phí phát sinh

| Thuộc tính | Nội dung |
|---|---|
| Actor | Technician |
| Bảng dữ liệu | `expense_records` |
| Điều kiện trước | Nếu chọn gắn với một lô thì lô đó phải tồn tại |
| Luồng chính | 1. Chọn `expense_type` (`seed_purchase`/`feed`/`medicine`/`chemical`/`electricity`/`water`/`labor`/`transport`/`other`), nhập `amount`, `expense_date`, mô tả.<br>2. Nếu là chi phí riêng một lô → chọn lô (`batch_id` set); nếu là chi phí chung của trại (`electricity`/`water`/`labor`) → bỏ trống (`batch_id = NULL`) và chọn `allocation_method` khi cần tính giá vốn.<br>3. Validate `amount` > 0; tạo `expense_records`. |
| Luồng thay thế/ngoại lệ | `amount` ≤ 0 → 400. Chọn lô ngoài khu vực phụ trách → 403 |
| Kết quả | Chi phí được ghi nhận, có thể gắn hoặc không gắn một lô |
| Quy tắc liên quan | BR04 |

### Quy tắc tính giá vốn trong UC08

```text
total_batch_cost = seed_cost + feed_cost + treatment_cost
                 + electricity_cost + water_cost + labor_cost
                 + material_cost + allocated_shared_cost

cost_per_saleable_seed = total_batch_cost / saleable_quantity
```

Chi phí chung có thể phân bổ theo số ngày nuôi, thể tích ao/bể, số lượng, sinh khối hoặc mức sử dụng thực tế. Hệ thống phải lưu phương pháp đã chọn khi tạo báo cáo để kết quả có thể giải thích và tái lập.

#### UC08.3 — Xem chi phí theo khu vực

| Thuộc tính | Nội dung |
|---|---|
| Actor | Area Manager |
| Bảng dữ liệu | `expense_records` |
| Điều kiện trước | Đã được gán khu vực |
| Luồng chính | 1. Backend lọc `expense_records` có `batch_id` thuộc lô trong khu vực; trả danh sách + tổng hợp. |
| Luồng thay thế/ngoại lệ | Chưa gán khu vực → rỗng. Chi phí chung trại (`batch_id = NULL`) không hiển thị ở đây, chỉ Owner xem qua UC08.1 |
| Kết quả | Area Manager theo dõi chi phí khu vực mình |
| Quy tắc liên quan | BR03 · ⚠ G2 |

#### UC08.4 — CRUD khách hàng

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner |
| Bảng dữ liệu | `customers` |
| Điều kiện trước | Đã đăng nhập |
| Luồng chính | **Thêm**: 1. Nhập `name`, `phone`, `address`, `customer_type`.<br>**Xem/tìm kiếm**: 2. Tìm theo `name`/`phone`, lọc `customer_type`.<br>**Xem chi tiết**: 3. Trả thông tin + toàn bộ `seed_sales` theo `customer_id`.<br>**Cập nhật**: 4. Sửa thông tin, validate. |
| Luồng thay thế/ngoại lệ | Số điện thoại sai định dạng → 400 |
| Kết quả | Quản lý đầy đủ danh sách và lịch sử mua của khách hàng |
| Quy tắc liên quan | BR15 |

#### UC08.5 — Xuất bán con giống

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner |
| Bảng dữ liệu | `seed_sales`, `seed_batches`, `customers`, `price_lists`, `batch_quantity_events` |
| Điều kiện trước | Khách hàng và lô tồn tại; lô còn đủ số lượng |
| Luồng chính | 1. Chọn `batch_id`, `customer_id`; hệ thống gợi ý `price_lists` theo loài, giai đoạn, chất lượng và số lượng.<br>2. Nhập/xác nhận `quantity_sold`, giá cơ sở, phụ phí chất lượng/chứng nhận, phí vận chuyển, chiết khấu và `sale_date`.<br>3. Kiểm tra `quantity_sold ≤ seed_batches.current_estimated_quantity`; tính `price_per_thousand`, `gross_revenue = (quantity_sold/1000) × price_per_thousand` và `total_revenue = gross_revenue + transport_fee - discount_amount`; tính `survival_rate` tại thời điểm bán.<br>4. Tạo `seed_sales` với snapshot thành phần giá và tạo `batch_quantity_events` loại `sale` trong cùng transaction.<br>5. Hệ thống cập nhật `current_estimated_quantity`; nếu về 0 → `seed_batches.status = sold`. |
| Luồng thay thế/ngoại lệ | `quantity_sold` vượt số lượng còn lại → 409 (BR14). Lô đang `sold`/`cancelled`/`failed` → 409 |
| Kết quả | Hồ sơ xuất bán tạo xong, số lượng/trạng thái lô cập nhật đúng |
| Quy tắc liên quan | BR14, BR16, BR25, BR26 |

#### UC08.6 — Xem doanh thu

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner |
| Bảng dữ liệu | `seed_sales` |
| Điều kiện trước | Đã đăng nhập |
| Luồng chính | 1. Chọn khoảng thời gian.<br>2. Backend tổng hợp `total_revenue` theo tháng/lô/khách hàng. |
| Luồng thay thế/ngoại lệ | Chưa có giao dịch bán → doanh thu = 0 |
| Kết quả | Owner nắm được doanh thu trại |
| Quy tắc liên quan | BR02 |

### 3.7. UC09 — Quản lý thống kê và cảnh báo (cấp 1)

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Area Manager, Technician, Warehouse Staff |
| Mô tả | Dashboard theo phạm vi quyền và toàn bộ cảnh báo hệ thống |
| Use case con | UC09.1–UC09.4 |
| Quan hệ | `<<Include>>` UC01 |

#### UC09.1 — Xem Dashboard theo phạm vi quyền

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner, Area Manager, Technician, Warehouse Staff |
| Bảng dữ liệu | Tổng hợp: `ponds_tanks`, `seed_batches`, `alerts_notifications`, `water_parameter_logs`, `ai_inspections`, `inventory_supplies`, `expense_records`, `seed_sales` |
| Điều kiện trước | Đã đăng nhập |
| Luồng chính | 1. Mở dashboard.<br>2. Backend tổng hợp số liệu theo đúng phạm vi role: Owner (toàn trại), Area Manager/Technician (khu vực phụ trách), Warehouse Staff (kho). |
| Luồng thay thế/ngoại lệ | Chưa gán khu vực (AM/Tech) → dashboard rỗng, hướng dẫn liên hệ Owner |
| Kết quả | Mỗi role có cái nhìn tổng quan đúng phạm vi |
| Quy tắc liên quan | BR02, BR03, BR04, BR05 |

#### UC09.2 — Xem cảnh báo toàn trại

| Thuộc tính | Nội dung |
|---|---|
| Actor | Owner |
| Bảng dữ liệu | `alerts_notifications` |
| Điều kiện trước | Owner đã đăng nhập |
| Luồng chính | 1. Lọc theo `severity`/`alert_type`/đã đọc-chưa đọc.<br>2. Mở chi tiết → `is_read = true`. |
| Luồng thay thế/ngoại lệ | Không có cảnh báo → rỗng |
| Kết quả | Owner theo dõi toàn bộ cảnh báo trại |
| Quy tắc liên quan | BR17 |

#### UC09.3 — Xem cảnh báo theo khu vực

| Thuộc tính | Nội dung |
|---|---|
| Actor | Area Manager, Technician |
| Bảng dữ liệu | `alerts_notifications` |
| Điều kiện trước | Đã được gán khu vực |
| Luồng chính | 1. Backend lọc cảnh báo có `tank_id`/`batch_id` thuộc khu vực phụ trách.<br>2. Mở chi tiết → `is_read = true`. |
| Luồng thay thế/ngoại lệ | Chưa gán khu vực → rỗng |
| Kết quả | Xem đúng phạm vi cảnh báo khu vực |
| Quy tắc liên quan | BR03, BR04, BR17 · ⚠ G2 |

#### UC09.4 — Xem cảnh báo tồn kho

| Thuộc tính | Nội dung |
|---|---|
| Actor | Warehouse Staff |
| Bảng dữ liệu | `alerts_notifications` |
| Điều kiện trước | Đã đăng nhập |
| Luồng chính | 1. Lọc `alert_type = inventory_low`.<br>2. Mở chi tiết → `is_read = true`. |
| Luồng thay thế/ngoại lệ | Không có cảnh báo kho → rỗng |
| Kết quả | Warehouse Staff theo dõi vật tư cần bổ sung |
| Quy tắc liên quan | BR17 |

> **Ghi chú triển khai (không phải use case):** cảnh báo hiển thị ở UC09.2–UC09.4 do một tiến trình nền (cron/job) tự động tạo: so `water_parameter_logs` với ngưỡng cấu hình (môi trường), so `average_confidence`/`density_per_ml` của `ai_inspections` với rule bất thường (AI), so `inventory_supplies.quantity` với `min_threshold` sau mỗi `inventory_transactions` (tồn kho). Không có actor người dùng nào chủ động kích hoạt các luồng này nên không gắn mã use case riêng, và không xuất hiện trên USECASE-DIAGRAM.drawio.

---

## 4. Bảng tổng hợp số lượng use case

| Nhóm | Use case cấp 1 | Use case cấp 2 |
|---|---:|---:|
| Độc lập (UC01, UC02) | — | — |
| UC03 Quản lý nhân viên | 1 | 3 |
| UC04 Quản lý trang trại | 1 | 3 |
| UC05 Quản lý lô giống và chăm sóc | 1 | 6 |
| UC06 Kiểm tra và phân tích AI | 1 | 2 |
| UC07 Quản lý vật tư | 1 | 6 |
| UC08 Quản lý tài chính và bán giống | 1 | 6 |
| UC09 Quản lý thống kê và cảnh báo | 1 | 4 |
| **Tổng** | **7** | **30** |

**Tổng cộng toàn hệ thống: 2 (độc lập) + 7 (cấp 1) + 30 (cấp 2) = 39 use case.**

---

## 5. Việc cần làm tiếp theo trước khi hiện thực hóa đầy đủ

1. Hoàn thiện luồng user hiện hữu nhận thêm membership ở farm khác và kiểm thử role/trạng thái độc lập giữa các farm.
2. Khi được phép thay đổi database, tạo migration hiệu chỉnh mới để bỏ ràng buộc legacy một-farm; không sửa migration đã áp dụng.
3. Bổ sung `ponds_tanks.area_id` và các FK/phạm vi `farm_id` cần thiết cho module nghiệp vụ.
4. Bổ sung bảng `supply_requests` nếu giữ UC07.3 trong phạm vi MVP; nếu không, lược bỏ use case này theo SRS §13.2.
5. Tạo migration cho các bảng nghiệp vụ và dùng `TEXT` cho mọi FK trỏ tới `users`.
6. Đồng bộ sơ đồ ERD/class sau mỗi migration và cập nhật trạng thái đã triển khai của từng use case.

## 6. Ánh xạ quy chuẩn vào luồng use case

Các nội dung trong tài liệu tổng hợp quy chuẩn được coi là luồng con của use case hiện có, không làm thay đổi số lượng 39 use case:

| Luồng nghiệp vụ | Use case | Điều kiện/kết quả cần lưu |
|---|---|---|
| Tiếp nhận lô giống | UC05.1 | Nhà cung cấp, mã lô, loài, giai đoạn PL, số lượng chứng từ/thực tế, vận chuyển, chứng nhận |
| Kiểm tra chất lượng đầu vào | UC05.1 | Cỡ mẫu, loại kiểm tra, tỷ lệ dị hình/sống, kết quả PCR hoặc quan sát, bằng chứng |
| Chuẩn bị và thả vào ao/bể | UC04.3, UC05.1 | Trạng thái ao/bể, thời điểm thả, số lượng thực tế, thông tin thuần hóa |
| Theo dõi môi trường | UC05.3 | Thông số, đơn vị, phương pháp đo, thời gian, ngưỡng đã áp dụng |
| Điều chỉnh khẩu phần | UC05.4 | Sinh khối/số lượng tham chiếu, lượng khuyến nghị, lượng thực tế, kiểm tra ăn thừa |
| Lấy mẫu tăng trưởng | UC05.1, UC06.1 | Cỡ mẫu, phương pháp, kích thước, khối lượng, sinh khối, độ đồng đều |
| Kiểm tra bằng AI | UC06.1 | Ảnh gốc, detection, confidence, thể tích mẫu, kết quả hiệu chỉnh |
| Ghi nhận biến động số lượng | UC05.1, UC08.5 | Chết, bán, chuyển bể, điều chỉnh; không cho tồn âm |
| Tính giá vốn và giá bán | UC08.1, UC08.5 | Chi phí trực tiếp/chung, phương pháp phân bổ, bảng giá, snapshot giao dịch |
| Kết thúc và tổng kết lô | UC05.2, UC08.6, UC09.1 | Tỷ lệ sống, doanh thu, giá vốn, lợi nhuận, ROI nếu đủ dữ liệu |

### Quy tắc kiểm thử đặc thù

- Các phép tính phải kiểm tra mẫu số khác 0 và không cho số lượng, khối lượng, giá trị phần trăm hoặc tiền âm.
- Dữ liệu theo chứng từ và dữ liệu thực tế phải được lưu riêng; tỷ lệ sống dùng số lượng thực tế sau thả.
- Ngưỡng môi trường và định mức thức ăn phải có nguồn tham chiếu, ngày hiệu lực và có thể thay đổi theo loài/giai đoạn/loại ao-bể.
- `treatment_logs` vẫn là nhật ký cấp ao/bể qua `tank_id`; `ai_inspections` là bản ghi cấp lô qua `batch_id` và không thêm `tank_id` dư thừa.
- Các protocol stress test, xét nghiệm và xử lý thuốc phải được thực hiện bởi người có chuyên môn; phần mềm chỉ lưu và kiểm tra dữ liệu, không tự đưa ra chỉ định điều trị.

---

## 7. Đặc tả chi tiết 5 use case trọng tâm

Năm use case dưới đây được chọn từ danh sách `UC03.1–UC09.4` vì đại diện cho các điểm quan trọng nhất của hệ thống:

| Thứ tự | Mã | Use case | Lý do lựa chọn |
|---|---|---|---|
| 1 | UC04.2 | CRUD ao hoặc bể | Là nền tảng để gắn khu vực, lô giống và các nhật ký vận hành. |
| 2 | UC05.1 | CRUD lô giống | Là đối tượng trung tâm của quy trình ương và truy xuất tôm giống. |
| 3 | UC06.1 | Thực hiện AI Inspection | Là chức năng khác biệt của đề tài, hỗ trợ phân tích ảnh mẫu. |
| 4 | UC08.5 | Xuất bán con giống | Kết thúc chuỗi nghiệp vụ và tạo doanh thu cho trang trại. |
| 5 | UC09.1 | Xem Dashboard theo phạm vi quyền | Tổng hợp dữ liệu để hỗ trợ giám sát và ra quyết định. |

### 7.1. UC04.2 — CRUD ao hoặc bể

| **Use case: UC04.2 — CRUD ao hoặc bể** | **Nội dung** |
|---|---|
| Mục đích | Cho phép người dùng xem, tạo, cập nhật và quản lý thông tin ao/bể trong trang trại. |
| Mô tả | Người dùng chọn trang trại, tra cứu danh sách ao/bể, nhập thông tin ao/bể mới hoặc cập nhật ao/bể đã có trong phạm vi được phân quyền. |
| Tác nhân | `OWNER`, `AREA_MANAGER`; `TECHNICIAN` chỉ được xem trong khu vực phụ trách. |
| Điều kiện trước | Người dùng đã đăng nhập; có membership `active`; khu vực và trang trại hợp lệ; actor có quyền ghi nếu thực hiện tạo/cập nhật. |
| Điều kiện sau | Ao/bể được lưu đúng `farm_id`; mã ao/bể không trùng trong farm; ao/bể mới có trạng thái `empty`; dữ liệu ngoài phạm vi không bị truy cập. |
| Bảng dữ liệu | `farms`, `areas`, `farm_members`, `ponds_tanks`, `seed_batches`. |

#### Luồng sự kiện chính (Basic flow)

| **Actor** | **System** |
|---|---|
| 1. Chọn trang trại cần làm việc. | |
| | 2. Kiểm tra phiên đăng nhập, membership, role và `area_id`. |
| 3. Mở chức năng quản lý ao/bể. | |
| | 4. Hiển thị danh sách ao/bể đã lọc theo farm và phạm vi khu vực. |
| 5. Chọn tạo mới hoặc cập nhật một ao/bể. | |
| | 6. Hiển thị biểu mẫu mã, tên, loại, khu vực, thể tích và mô tả. |
| 7. Nhập hoặc điều chỉnh thông tin ao/bể. | |
| | 8. Kiểm tra trường bắt buộc, `volume_m3 > 0`, mã không trùng và khu vực cùng farm. |
| 9. Nhấn “Lưu”. | |
| | 10. Tạo hoặc cập nhật bản ghi `ponds_tanks` và trả kết quả mới. |

#### Luồng sự kiện thay thế (Alternate flow)

**AF04.2.1.** Nếu actor chỉ có quyền xem → Hệ thống khóa thao tác thêm, sửa, xóa và chỉ hiển thị dữ liệu trong phạm vi membership → quay lại bước 4.

**AF04.2.2.** Nếu người dùng nhập từ khóa hoặc bộ lọc → Hệ thống lọc theo mã, tên, loại, khu vực hoặc trạng thái → quay lại bước 4.

**AF04.2.3.** Nếu Owner cập nhật thông tin farm từ màn hình liên quan → Hệ thống kiểm tra mã farm duy nhất, lưu `code`, `name`, `address` và quay lại bước 3.

**AF04.2.4.** Nếu người dùng yêu cầu xóa ao/bể → Hệ thống chỉ cho xóa mềm hoặc chuyển `inactive` khi ao/bể không còn lô và không có dữ liệu lịch sử cần bảo toàn → quay lại bước 4.

#### Luồng ngoại lệ

| Mã | Tình huống và xử lý |
|---|---|
| EX04.2.1 | Không có membership hoặc membership bị `suspended` → trả `403`. |
| EX04.2.2 | Ao/bể hoặc khu vực không thuộc farm đang chọn → trả `403` hoặc `404`. |
| EX04.2.3 | Mã ao/bể bị trùng → trả `409` và yêu cầu nhập lại. |
| EX04.2.4 | Thể tích không hợp lệ hoặc thiếu dữ liệu bắt buộc → trả `400`. |
| EX04.2.5 | Ao/bể đang có lô hoạt động → không cho xóa hoặc chuyển trực tiếp sang `empty`. |

#### Input, output và quy tắc

| Nhóm | Nội dung |
|---|---|
| Input | `farm_id`, `area_id`, `code`, `name`, `tank_type`, `volume_m3`, `description`. |
| Output | Danh sách/chi tiết ao-bể, trạng thái, khu vực và lô hiện tại nếu có. |
| Quy tắc | Owner quản lý toàn farm; Area Manager quản lý khu vực; Technician chỉ xem. Một ao/bể không được có nhiều lô hoạt động đồng thời. |

### 7.2. UC05.1 — CRUD lô giống

| **Use case: UC05.1 — CRUD lô giống** | **Nội dung** |
|---|---|
| Mục đích | Quản lý hồ sơ lô tôm giống từ khi tiếp nhận, gán vào ao/bể đến khi theo dõi và truy xuất thông tin lô. |
| Mô tả | Người dùng tạo lô, ghi nguồn giống, loài, giai đoạn PL, số lượng và ao/bể; có thể xem hoặc cập nhật thông tin được phép. Việc đổi trạng thái lô thuộc UC05.2. |
| Tác nhân | `OWNER`, `AREA_MANAGER`; `TECHNICIAN` được xem và cập nhật dữ liệu kỹ thuật được cấp quyền. |
| Điều kiện trước | Người dùng có membership `active`; ao/bể tồn tại cùng farm; khi tạo mới, ao/bể phải sẵn sàng và chưa có lô hoạt động. |
| Điều kiện sau | Lô được lưu đúng `farm_id` và `tank_id`; số lượng ban đầu được ghi nhận; lịch sử lô có thể truy xuất; không tạo lô trùng hoặc số lượng âm. |
| Bảng dữ liệu | `seed_batches`, `ponds_tanks`, `seed_suppliers`, `seed_quality_checks`, `batch_quantity_events`, `growth_sampling_logs`. |

#### Luồng sự kiện chính (Basic flow)

| **Actor** | **System** |
|---|---|
| 1. Chọn farm và ao/bể tiếp nhận lô. | |
| | 2. Kiểm tra membership, phạm vi khu vực, trạng thái ao/bể và lô đang chiếm dụng. |
| 3. Chọn “Tạo lô giống”. | |
| | 4. Hiển thị biểu mẫu mã lô, loài, giai đoạn PL, nhà cung cấp, số lượng và ngày tiếp nhận. |
| 5. Nhập thông tin lô và kết quả kiểm tra đầu vào nếu có. | |
| | 6. Kiểm tra mã lô duy nhất, số lượng dương, loài/giai đoạn hợp lệ và các quan hệ cùng farm. |
| 7. Xác nhận lưu lô. | |
| | 8. Trong một transaction, tạo `seed_batches` và ghi sự kiện số lượng ban đầu. |
| 9. Chọn một lô đã có để xem hoặc cập nhật. | |
| | 10. Hiển thị chi tiết, lịch sử chất lượng, biến động số lượng và mẫu tăng trưởng. |
| 11. Cập nhật các trường được phép. | |
| | 12. Kiểm tra dữ liệu và lưu thay đổi, không ghi đè lịch sử đã phát sinh. |

#### Luồng sự kiện thay thế (Alternate flow)

**AF05.1.1.** Nếu người dùng chỉ xem lô → Hệ thống trả danh sách/chi tiết theo farm, khu vực, ao/bể và trạng thái → quay lại bước 9.

**AF05.1.2.** Nếu ao/bể chưa có lô hoạt động → Hệ thống cho phép tiếp nhận lô mới, đặt số lượng hiện tại bằng số lượng thực tế sau kiểm đếm → tiếp tục bước 7.

**AF05.1.3.** Nếu có hồ sơ chất lượng hoặc kiểm dịch → Hệ thống lưu thêm `seed_quality_checks` và tệp bằng chứng nếu có → quay lại bước 9.

**AF05.1.4.** Nếu Technician cập nhật → Hệ thống chỉ cho sửa thông tin kỹ thuật hoặc ghi nhận dữ liệu mẫu; các trường quản trị bị khóa → quay lại bước 11.

**AF05.1.5.** Nếu người dùng yêu cầu xóa lô đã có lịch sử → Hệ thống không xóa cứng mà yêu cầu chuyển trạng thái phù hợp hoặc lưu dấu vết hủy → quay lại bước 9.

#### Luồng ngoại lệ

| Mã | Tình huống và xử lý |
|---|---|
| EX05.1.1 | Ao/bể không tồn tại, khác farm hoặc đã có lô hoạt động → trả `409`. |
| EX05.1.2 | Mã lô bị trùng hoặc số lượng không dương → trả `400/409`. |
| EX05.1.3 | Actor thao tác ngoài khu vực → trả `403`. |
| EX05.1.4 | Lỗi transaction khi tạo lô → rollback cả lô và sự kiện số lượng. |
| EX05.1.5 | Lô đã kết thúc và không được phép sửa → trả `409`. |

#### Input, output và quy tắc

| Nhóm | Nội dung |
|---|---|
| Input | Mã lô, nhà cung cấp, loài, giai đoạn PL, số lượng chứng từ/thực tế, ngày tiếp nhận, `tank_id`, chứng nhận. |
| Output | Hồ sơ lô, số lượng hiện tại, ao/bể, lịch sử chất lượng, biến động số lượng và mẫu tăng trưởng. |
| Quy tắc | `current_estimated_quantity` không được âm; mọi biến động phải tạo `batch_quantity_events`; một ao/bể chỉ có tối đa một lô hoạt động. |

### 7.3. UC06.1 — Thực hiện AI Inspection

| **Use case: UC06.1 — Thực hiện AI Inspection** | **Nội dung** |
|---|---|
| Mục đích | Hỗ trợ đếm tôm giống và tính mật độ mẫu từ ảnh kiểm tra. |
| Mô tả | Người dùng chọn lô, tải ảnh mẫu, nhập thông tin lấy mẫu, gửi yêu cầu đến AI Service và nhận kết quả detection/confidence. |
| Tác nhân | `OWNER`, `AREA_MANAGER`, `TECHNICIAN`, `AI_SERVICE`. |
| Điều kiện trước | Lô tồn tại và thuộc phạm vi quyền; ảnh hợp lệ; có thể tích mẫu nếu cần tính mật độ; AI Service sẵn sàng trong kiến trúc triển khai. |
| Điều kiện sau | `ai_inspections` được lưu ở trạng thái `completed` hoặc `failed`; ảnh gốc, kết quả gốc và phiên bản model được bảo toàn. |
| Bảng dữ liệu | `ai_inspections`, `seed_batches`, `growth_sampling_logs`, `alerts_notifications`. |

#### Luồng sự kiện chính (Basic flow)

| **Actor** | **System** |
|---|---|
| 1. Mở chi tiết lô và chọn “Thực hiện AI Inspection”. | |
| | 2. Kiểm tra membership, khu vực và trạng thái lô. |
| 3. Lấy mẫu, đặt mẫu vào khay/đĩa và chụp hoặc tải ảnh. | |
| | 4. Kiểm tra định dạng, kích thước, dung lượng và lưu ảnh gốc. |
| 5. Nhập phương pháp lấy mẫu, thể tích mẫu và ghi chú. | |
| | 6. Tạo bản ghi `ai_inspections` với trạng thái `pending`. |
| 7. Xác nhận gửi phân tích. | |
| | 8. Chuyển trạng thái sang `processing` và gửi ảnh đến AI Service. |
| | 9. AI Service trả detections, bounding box, confidence và model version. |
| | 10. Backend tính `detected_count`, `average_confidence`, `density_per_ml` và lưu kết quả. |
| 11. Xem kết quả phân tích. | |
| | 12. Hiển thị ảnh gốc, ảnh chú thích và thông báo AI chỉ hỗ trợ đánh giá. |
| 13. Nhập số đếm thủ công nếu cần. | |
| | 14. Lưu hiệu chỉnh riêng, không ghi đè kết quả AI ban đầu. |

#### Luồng sự kiện thay thế (Alternate flow)

**AF06.1.1.** Nếu không nhập thể tích mẫu → Hệ thống vẫn lưu số lượng và confidence, đặt `density_per_ml = NULL` và thông báo không thể tính mật độ → quay lại bước 11.

**AF06.1.2.** Nếu confidence thấp → Hệ thống hiển thị cảnh báo cần kiểm tra thủ công, không tự kết luận chất lượng lô → chuyển đến bước 13.

**AF06.1.3.** Nếu inspection trước đó bị `failed` → Người dùng chọn thử lại; hệ thống tạo lần xử lý mới và giữ lịch sử lỗi → quay lại bước 7.

**AF06.1.4.** Nếu người dùng nhập `manual_count` → Hệ thống dùng số đếm thủ công cho kết quả xác nhận nhưng vẫn giữ kết quả AI để đối chiếu → quay lại bước 11.

#### Luồng ngoại lệ

| Mã | Tình huống và xử lý |
|---|---|
| EX06.1.1 | Ảnh sai định dạng hoặc quá dung lượng → trả `400` trước khi gửi AI. |
| EX06.1.2 | Actor không có quyền trên lô → trả `403`. |
| EX06.1.3 | AI Service timeout hoặc trả response không hợp lệ → cập nhật `status = failed`. |
| EX06.1.4 | Confidence ngoài khoảng 0–1 hoặc thiếu detection bắt buộc → từ chối kết quả. |
| EX06.1.5 | Lưu kết quả thất bại → không hiển thị kết quả chưa được commit. |

#### Input, output và quy tắc

| Nhóm | Nội dung |
|---|---|
| Input | `batch_id`, ảnh mẫu, `sampling_method`, `sample_volume_ml`, thời gian và ghi chú. |
| Output | `detected_count`, `density_per_ml`, `average_confidence`, detections, ảnh chú thích, model version và trạng thái. |
| Công thức | `density_per_ml = effective_count / sample_volume_ml` khi thể tích lớn hơn 0. |
| Quy tắc | AI không tự chẩn đoán bệnh, không tự chỉ định thuốc và không thay thế đánh giá chuyên môn. |

### 7.4. UC08.5 — Xuất bán con giống

| **Use case: UC08.5 — Xuất bán con giống** | **Nội dung** |
|---|---|
| Mục đích | Cho phép Owner tạo giao dịch bán tôm giống và cập nhật số lượng còn lại của lô. |
| Mô tả | Owner chọn khách hàng, lô giống đủ điều kiện, số lượng bán, đơn giá và các khoản phụ phí để xác nhận giao dịch. |
| Tác nhân | `OWNER`. |
| Điều kiện trước | Owner có membership `active`; khách hàng và lô cùng farm; lô ở trạng thái `ready_for_sale`; số lượng bán không vượt số lượng hiện tại. |
| Điều kiện sau | Giao dịch `seed_sales` được lưu; số lượng lô giảm đúng lượng bán; giao dịch lưu snapshot giá; lô chuyển `sold` nếu hết số lượng. |
| Bảng dữ liệu | `seed_sales`, `customers`, `seed_batches`, `price_lists`, `batch_quantity_events`, `expense_records`. |

#### Luồng sự kiện chính (Basic flow)

| **Actor** | **System** |
|---|---|
| 1. Owner mở chức năng “Xuất bán con giống”. | |
| | 2. Kiểm tra membership Owner và tải danh sách khách hàng, bảng giá và lô đủ điều kiện. |
| 3. Chọn khách hàng và lô giống. | |
| | 4. Hiển thị số lượng hiện tại, đơn giá phù hợp và thông tin chất lượng lô. |
| 5. Nhập số lượng bán, đơn giá, vận chuyển, phụ phí và chiết khấu. | |
| | 6. Kiểm tra khách hàng/lô cùng farm, số lượng hợp lệ và tính doanh thu tạm tính. |
| 7. Xem lại và xác nhận giao dịch. | |
| | 8. Trong một transaction, tạo `seed_sales`, tạo sự kiện `sale` và giảm số lượng lô. |
| | 9. Nếu số lượng còn lại bằng 0, chuyển lô sang `sold`; trả thông tin giao dịch thành công. |
| 10. Mở lịch sử bán hoặc báo cáo doanh thu. | |
| | 11. Hiển thị giao dịch, doanh thu, giá snapshot và số lượng còn lại. |

#### Luồng sự kiện thay thế (Alternate flow)

**AF08.5.1.** Nếu không có bảng giá phù hợp → Owner nhập đơn giá thủ công; hệ thống lưu snapshot và đánh dấu nguồn giá nhập tay → quay lại bước 6.

**AF08.5.2.** Nếu chỉ bán một phần lô → Hệ thống giảm số lượng, giữ trạng thái `ready_for_sale` khi còn giống và hoàn tất giao dịch → quay lại bước 10.

**AF08.5.3.** Nếu không có phụ phí, phí vận chuyển hoặc chiết khấu → Hệ thống mặc định giá trị bằng 0 và tiếp tục tính doanh thu → quay lại bước 7.

**AF08.5.4.** Nếu Owner hủy trước khi xác nhận → Hệ thống không tạo `seed_sales` và quay lại bước 3.

#### Luồng ngoại lệ

| Mã | Tình huống và xử lý |
|---|---|
| EX08.5.1 | Số lượng bán lớn hơn số lượng hiện tại → trả `409`. |
| EX08.5.2 | Lô chưa `ready_for_sale`, đã `sold`, `failed` hoặc `cancelled` → từ chối giao dịch. |
| EX08.5.3 | Khách hàng hoặc lô thuộc farm khác → trả `403/400`. |
| EX08.5.4 | Số tiền, số lượng hoặc chiết khấu không hợp lệ → trả `400`. |
| EX08.5.5 | Giao dịch đồng thời làm vượt số lượng → rollback transaction và yêu cầu tải lại dữ liệu. |

#### Input, output và quy tắc

| Nhóm | Nội dung |
|---|---|
| Input | `batch_id`, `customer_id`, `quantity_sold`, `price_per_thousand`, phí vận chuyển, phụ phí, chiết khấu và ngày bán. |
| Doanh thu gộp | `gross_revenue = quantity_sold / 1000 × price_per_thousand`. |
| Doanh thu cuối | `total_revenue = gross_revenue + transport_fee - discount_amount`. |
| Output | Giao dịch bán, số lượng còn lại, doanh thu và trạng thái lô. |
| Quy tắc | Tạo giao dịch bán, sự kiện số lượng và cập nhật lô phải nằm trong cùng transaction. |

### 7.5. UC09.1 — Xem Dashboard theo phạm vi quyền

| **Use case: UC09.1 — Xem Dashboard theo phạm vi quyền** | **Nội dung** |
|---|---|
| Mục đích | Cung cấp thông tin tổng quan về hoạt động trang trại theo đúng role và phạm vi dữ liệu của người dùng. |
| Mô tả | Người dùng chọn farm, khoảng thời gian và bộ lọc; hệ thống tổng hợp dữ liệu ao/bể, lô giống, cảnh báo, kho, chi phí hoặc doanh thu theo quyền. |
| Tác nhân | `OWNER`, `AREA_MANAGER`, `TECHNICIAN`, `WAREHOUSE_STAFF`. |
| Điều kiện trước | Người dùng đã đăng nhập; membership `active`; farm đang chọn hợp lệ; dữ liệu nguồn có thể truy vấn. |
| Điều kiện sau | Dashboard hiển thị KPI và dữ liệu đúng phạm vi; thao tác xem không làm thay đổi dữ liệu nghiệp vụ. |
| Bảng dữ liệu | `farms`, `farm_members`, `ponds_tanks`, `seed_batches`, các bảng nhật ký, `inventory_supplies`, `expense_records`, `seed_sales`, `alerts_notifications`. |

#### Luồng sự kiện chính (Basic flow)

| **Actor** | **System** |
|---|---|
| 1. Người dùng chọn farm và mở Dashboard. | |
| | 2. Kiểm tra phiên, membership, role và phạm vi `area_id`. |
| 3. Chọn khoảng thời gian hoặc bộ lọc. | |
| | 4. Truy vấn dữ liệu trong đúng `farm_id` và `area_id`. |
| | 5. Tính số ao/bể, lô hoạt động, cảnh báo, tồn kho, chi phí và doanh thu theo quyền. |
| | 6. Trả KPI, biểu đồ và thời điểm cập nhật gần nhất. |
| 7. Chọn một KPI hoặc biểu đồ. | |
| | 8. Hiển thị danh sách chi tiết và cho phép truy ngược bản ghi nguồn. |

#### Luồng sự kiện thay thế (Alternate flow)

**AF09.1.1.** Nếu người dùng là Owner → Hệ thống tổng hợp toàn farm, gồm vận hành, kho, cảnh báo, chi phí và doanh thu → tiếp tục bước 6.

**AF09.1.2.** Nếu người dùng là Area Manager hoặc Technician → Hệ thống chỉ tổng hợp dữ liệu thuộc `area_id` được phân công → tiếp tục bước 6.

**AF09.1.3.** Nếu người dùng là Warehouse Staff → Hệ thống chỉ hiển thị dữ liệu vật tư, tồn kho và cảnh báo kho → tiếp tục bước 6.

**AF09.1.4.** Nếu không có dữ liệu trong khoảng thời gian → Hệ thống hiển thị trạng thái rỗng và KPI bằng 0 hoặc không xác định, không dùng dữ liệu farm khác → quay lại bước 3.

**AF09.1.5.** Nếu người dùng đổi farm → Hệ thống xóa dữ liệu dashboard cũ, tải lại membership và KPI theo farm mới → quay lại bước 2.

#### Luồng ngoại lệ

| Mã | Tình huống và xử lý |
|---|---|
| EX09.1.1 | Membership bị `suspended` → request tiếp theo trả `403` và loại bỏ dữ liệu không còn quyền. |
| EX09.1.2 | Khoảng thời gian hoặc bộ lọc không hợp lệ → trả `400`. |
| EX09.1.3 | Một nguồn tổng hợp lỗi → hiển thị trạng thái lỗi, không trình bày dữ liệu cũ như dữ liệu hiện tại. |
| EX09.1.4 | Query vượt thời gian → cho phép thử lại và ghi log kỹ thuật. |

#### Input, output và quy tắc

| Nhóm | Nội dung |
|---|---|
| Input | `farm_id`, khoảng thời gian, bộ lọc khu vực và loại KPI. |
| Output | KPI, biểu đồ, số liệu vận hành, tồn kho, chi phí, doanh thu và thời điểm cập nhật. |
| Phạm vi Owner | Toàn bộ farm đang có membership Owner `active`. |
| Phạm vi Area Manager/Technician | Chỉ dữ liệu thuộc khu vực được phân công. |
| Phạm vi Warehouse Staff | Chỉ dữ liệu kho và cảnh báo tồn kho. |
| Quy tắc | Mọi KPI phải dùng cùng farm, timezone, khoảng thời gian và điều kiện lọc; không truy cập chéo tenant. |
