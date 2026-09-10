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

## 7. Đặc tả chuyên sâu 5 use case trọng tâm

Phần này đặc tả luồng đầu-cuối của năm use case cấp 1 quan trọng nhất. Mã use case tuân theo mô hình hai cấp của tài liệu này; các use case con ở mục 3 vẫn là đơn vị triển khai và kiểm thử chi tiết. Các luồng mô tả kiến trúc đích, còn các điểm G2–G5 là khoảng cách hiện thực cần được xử lý sau.

Sơ đồ tương ứng: [Activity Diagram](./ACTIVITY-DIAGRAMS.md) và [Sequence Diagram](./SEQUENCE-DIAGRAMS.md).

### 7.1. UC04 — Quản lý trang trại

| **Use case: UC04 — Quản lý trang trại** | **Nội dung** |
|---|---|
| Mục đích | Cho phép quản lý hồ sơ trang trại, khu vực, danh sách ao/bể và trạng thái vận hành trong đúng phạm vi được phân quyền. |
| Mô tả | Use case bao quát việc xem/cập nhật trang trại, tạo và cập nhật ao/bể, tra cứu ao/bể theo khu vực và điều khiển vòng đời `empty → active → cleaning → empty`. |
| Tác nhân chính | `OWNER`, `AREA_MANAGER`. |
| Tác nhân phụ | `TECHNICIAN` xem ao/bể thuộc khu vực; `WAREHOUSE_STAFF` chỉ xem thông tin chung của farm. |
| Kích hoạt | Người dùng chọn một farm và mở chức năng “Quản lý trang trại”. |
| Điều kiện trước | 1. Người dùng đã đăng nhập và có phiên ứng dụng hợp lệ.<br>2. Có membership `active` tại farm đang chọn.<br>3. `AREA_MANAGER` và `TECHNICIAN` đã được gán khu vực khi truy cập dữ liệu theo khu vực.<br>4. Để quản lý ao/bể đầy đủ, module `ponds_tanks` và quan hệ khu vực phải được hiện thực. |
| Điều kiện sau | 1. Thông tin farm hoặc ao/bể được lưu đúng tenant.<br>2. Trạng thái ao/bể phản ánh trạng thái vận hành thực tế.<br>3. Không thay đổi dữ liệu của farm/khu vực khác.<br>4. Dữ liệu mới có thời gian tạo/cập nhật và người thực hiện được truy vết ở lớp ứng dụng/audit khi có. |
| Use case con | UC04.1 — Xem/cập nhật farm; UC04.2 — CRUD ao/bể; UC04.3 — Cập nhật trạng thái ao/bể. |
| Bảng dữ liệu | `farms`, `areas`, `farm_members`, `ponds_tanks`, `seed_batches`. |
| Mức ưu tiên | Rất cao — là cấu trúc nền cho toàn bộ dữ liệu sản xuất. |

#### Luồng sự kiện chính (Basic flow)

| **Actor** | **System** |
|---|---|
| 1. Chọn trang trại cần làm việc. | 2. Kiểm tra phiên đăng nhập; tải `farm_members` theo `(farm_id, user_id)` và kiểm tra `status`, `role`, `area_id`. |
| 3. Mở màn hình quản lý trang trại. | 4. Trả hồ sơ farm, khu vực và danh sách ao/bể đã lọc theo phạm vi quyền. |
| 5. Chọn tạo ao/bể mới hoặc cập nhật một ao/bể hiện có. | 6. Hiển thị biểu mẫu gồm mã, tên, khu vực, loại, thể tích, mô tả và trạng thái hiện tại. |
| 7. Nhập hoặc điều chỉnh thông tin ao/bể. | 8. Kiểm tra trường bắt buộc, `volume_m3 > 0`, mã ao/bể không trùng trong farm và khu vực thuộc đúng farm. |
| 9. Xác nhận lưu. | 10. Tạo/cập nhật `ponds_tanks`; ao/bể mới mặc định `status = empty`; trả dữ liệu vừa lưu. |
| 11. Khi vận hành thay đổi, chọn trạng thái mới cho ao/bể. | 12. Kiểm tra chuyển trạng thái và kiểm tra lô `active` hoặc `ready_for_sale` đang chiếm dụng ao/bể. |
| 13. Xác nhận cập nhật trạng thái. | 14. Cập nhật trạng thái, thời gian sửa và hiển thị lại chi tiết ao/bể cùng lô hiện tại nếu có. |

#### Luồng sự kiện thay thế (Alternate flow)

| **Mã** | **Điều kiện** | **Xử lý** |
|---|---|---|
| AF04.1 | Actor chỉ có quyền xem. | Hệ thống ẩn/khóa thao tác ghi và chỉ trả dữ liệu trong phạm vi membership. |
| AF04.2 | Owner cập nhật hồ sơ farm. | Hệ thống cho sửa `code`, `name`, `address`; kiểm tra mã farm duy nhất rồi cập nhật `farms`. |
| AF04.3 | Area Manager truy cập. | Hệ thống chỉ trả và cho thao tác ao/bể thuộc `area_id` của membership. |
| AF04.4 | Người dùng lọc hoặc tìm kiếm. | Hệ thống lọc theo mã, tên, khu vực, loại hoặc trạng thái mà không làm thay đổi dữ liệu. |
| AF04.5 | Ao/bể kết thúc một chu kỳ nuôi. | Sau khi lô được kết thúc hợp lệ, hệ thống cho chuyển `active → cleaning`, sau đó `cleaning → empty`. |

#### Luồng ngoại lệ

| **Mã** | **Tình huống và phản hồi hệ thống** |
|---|---|
| EX04.1 | Không có membership hoặc membership bị `suspended` → trả 403 và không lộ dữ liệu farm. |
| EX04.2 | Farm/ao-bể không tồn tại hoặc không thuộc phạm vi → trả 404 hoặc 403 theo chính sách API. |
| EX04.3 | Mã farm hoặc mã ao/bể bị trùng → trả 409, giữ nguyên biểu mẫu để người dùng sửa. |
| EX04.4 | Dữ liệu thiếu hoặc thể tích không hợp lệ → trả 400 kèm lỗi tại trường tương ứng. |
| EX04.5 | Chuyển `active → empty` khi còn lô hoạt động → trả 409 và yêu cầu kết thúc/chuyển lô trước. |
| EX04.6 | Lỗi database hoặc mất kết nối → rollback thao tác và hiển thị thông báo thử lại; không tạo bản ghi dở dang. |

#### Dữ liệu và quy tắc nghiệp vụ

| **Nhóm** | **Chi tiết** |
|---|---|
| Input chính | `farm_id`, `area_id`, `code`, `name`, `tank_type`, `volume_m3`, `description`, trạng thái mới. |
| Output chính | Hồ sơ farm; danh sách/chi tiết ao-bể; lô hiện tại; trạng thái và thời gian cập nhật. |
| Phân quyền | Owner quản lý toàn farm; Area Manager chỉ quản lý khu vực; Technician xem khu vực; Warehouse Staff chỉ xem thông tin farm. |
| Toàn vẹn tenant | `areas.farm_id` và `ponds_tanks.farm_id` phải trùng farm đang chọn; không nhận `area_id` của farm khác. |
| Trạng thái | Luồng chuẩn là `empty → active → cleaning → empty`; `inactive` dùng khi ngừng sử dụng. |
| Bội số lô | Một ao/bể có nhiều lô theo lịch sử nhưng tối đa một lô đang hoạt động tại một thời điểm. |
| Business rules | BR02, BR03, BR07, BR08 và khoảng cách dữ liệu G2. |

### 7.2. UC05 — Quản lý lô giống và chăm sóc

| **Use case: UC05 — Quản lý lô giống và chăm sóc** | **Nội dung** |
|---|---|
| Mục đích | Quản lý toàn bộ vòng đời lô tôm giống từ tiếp nhận, thả vào ao/bể, chăm sóc, lấy mẫu đến khi sẵn sàng bán hoặc kết thúc. |
| Mô tả | Use case kết nối hồ sơ lô với nhật ký môi trường, cho ăn, thay nước, thuốc/chế phẩm, biến động số lượng, kiểm tra chất lượng và lấy mẫu tăng trưởng. |
| Tác nhân | `OWNER`, `AREA_MANAGER`, `TECHNICIAN`. |
| Kích hoạt | Người dùng mở một ao/bể hoặc chọn chức năng “Quản lý lô giống và chăm sóc”. |
| Điều kiện trước | 1. Có membership `active` trong đúng farm.<br>2. Actor thuộc đúng khu vực của ao/bể nếu bị giới hạn theo area.<br>3. Khi tạo lô mới, ao/bể phải `empty` và chưa có lô hoạt động.<br>4. Nhà cung cấp/cấu hình kỹ thuật có thể chưa có trong MVP nhưng không được làm mất dữ liệu đầu vào bắt buộc. |
| Điều kiện sau | 1. Lô và nhật ký được lưu đúng ao/bể/farm.<br>2. Số lượng hiện tại không âm và có thể truy vết từ sự kiện.<br>3. Giao dịch sử dụng vật tư được tạo nếu nhật ký liên kết kho.<br>4. Cảnh báo có thể được sinh khi dữ liệu vượt ngưỡng.<br>5. Trạng thái lô và ao/bể được đồng bộ theo quy tắc. |
| Use case con | UC05.1–UC05.6: CRUD lô, trạng thái lô, môi trường, cho ăn, thay nước, thuốc/chế phẩm. |
| Bảng dữ liệu | `seed_batches`, `ponds_tanks`, `seed_suppliers`, `seed_quality_checks`, `batch_quantity_events`, `growth_sampling_logs`, `water_parameter_logs`, `feeding_logs`, `water_change_logs`, `treatment_logs`, `inventory_supplies`, `inventory_transactions`, `environment_thresholds`, `feed_guidelines`, `alerts_notifications`. |
| Mức ưu tiên | Rất cao — là nghiệp vụ vận hành hằng ngày của trại giống. |

#### Luồng sự kiện chính (Basic flow)

| **Actor** | **System** |
|---|---|
| 1. Chọn farm, khu vực và ao/bể tiếp nhận lô. | 2. Kiểm tra membership, phạm vi khu vực, trạng thái ao/bể và lô đang hoạt động. |
| 3. Chọn “Tạo lô giống”. | 4. Hiển thị biểu mẫu nguồn giống, mã lô, loài, giai đoạn PL, số lượng chứng từ/thực tế, ngày tiếp nhận/thả và chứng nhận. |
| 5. Nhập dữ liệu tiếp nhận và kết quả kiểm tra đầu vào nếu có. | 6. Kiểm tra mã lô duy nhất, số lượng dương, loài/giai đoạn hợp lệ, nhà cung cấp và ao/bể cùng farm. |
| 7. Xác nhận tiếp nhận lô. | 8. Trong một transaction: tạo `seed_batches`, ghi sự kiện số lượng ban đầu, đặt `current_estimated_quantity = initial_quantity` và chuyển ao/bể sang `active`. |
| 9. Trong quá trình nuôi, chọn loại nhật ký cần ghi. | 10. Tải lô hiện tại, ngưỡng môi trường, định mức thức ăn và vật tư phù hợp. |
| 11. Nhập chỉ số đo hoặc thông tin chăm sóc, thời gian và ghi chú. | 12. Kiểm tra miền giá trị, thời gian, đơn vị, quyền khu vực và lượng tồn nếu có `supply_id`. |
| 13. Xác nhận ghi nhật ký. | 14. Lưu nhật ký theo `tank_id`; nếu dùng vật tư thì tạo giao dịch `usage`; nếu vượt ngưỡng thì chuẩn bị/sinh cảnh báo theo cấu hình. |
| 15. Ghi nhận lần lấy mẫu hoặc biến động số lượng. | 16. Lưu `growth_sampling_logs` hoặc `batch_quantity_events`; tính lại số lượng ước tính, tỷ lệ sống, mật độ và sinh khối khi đủ dữ liệu. |
| 17. Chọn trạng thái mới khi lô đạt điều kiện bán hoặc kết thúc. | 18. Kiểm tra chuyển trạng thái hợp lệ, cập nhật `seed_batches.status` và trả hồ sơ tổng hợp của lô. |

#### Luồng sự kiện thay thế (Alternate flow)

| **Mã** | **Điều kiện** | **Xử lý** |
|---|---|---|
| AF05.1 | Chỉ xem lịch sử. | Hệ thống tổng hợp lô, bốn loại nhật ký, mẫu tăng trưởng, AI, chi phí và bán hàng theo thời gian. |
| AF05.2 | Nhật ký không liên kết kho. | Cho phép lưu `supply_id = NULL`; không tạo `inventory_transactions`. |
| AF05.3 | Chưa có ngưỡng hoặc định mức được phê duyệt. | Vẫn lưu dữ liệu thực tế nhưng không tự đưa khuyến nghị/cảnh báo chính thức; hiển thị thiếu cấu hình. |
| AF05.4 | Technician cập nhật. | Chỉ cho sửa dữ liệu kỹ thuật và ghi nhật ký trong khu vực; không cho đổi các thuộc tính quản trị/trạng thái bị giới hạn. |
| AF05.5 | Xử lý ao/bể khi chưa có lô. | Cho phép ghi môi trường hoặc thuốc/chế phẩm phục vụ vệ sinh ao/bể; không cho ghi nhật ký cho ăn cho lô không tồn tại. |
| AF05.6 | Lô được bán một phần. | Ghi sự kiện giảm số lượng nhưng giữ trạng thái `ready_for_sale` nếu số lượng còn lại lớn hơn 0. |

#### Luồng ngoại lệ

| **Mã** | **Tình huống và phản hồi hệ thống** |
|---|---|
| EX05.1 | Ao/bể đang `cleaning`, `inactive` hoặc đã có lô hoạt động → trả 409. |
| EX05.2 | `batch_code` trùng, số lượng không dương hoặc dữ liệu PL không hợp lệ → trả 400/409. |
| EX05.3 | Actor thao tác ngoài farm/khu vực → trả 403. |
| EX05.4 | Lượng vật tư sử dụng vượt tồn kho → trả 409; không lưu nhật ký và giao dịch kho nửa chừng. |
| EX05.5 | Biến động làm số lượng hiện tại âm → trả 409 và yêu cầu kiểm tra lại số lượng. |
| EX05.6 | Sửa lô `sold`, `failed` hoặc `cancelled` trái quy tắc → trả 409. |
| EX05.7 | Một phần transaction thất bại → rollback toàn bộ thay đổi liên quan lô, ao/bể và kho. |

#### Dữ liệu, công thức và quy tắc nghiệp vụ

| **Nhóm** | **Chi tiết** |
|---|---|
| Input tiếp nhận | Mã lô, nhà cung cấp, loài, giai đoạn, số lượng chứng từ, số lượng thực tế, ngày sản xuất/nhận/thả, chứng nhận và ao/bể. |
| Input chăm sóc | Chỉ số môi trường; thức ăn; tỷ lệ thay nước; thuốc/chế phẩm; thời gian; người thực hiện; phương pháp đo; vật tư sử dụng. |
| Output | Hồ sơ lô, lịch sử chăm sóc, số lượng hiện tại, tỷ lệ sống, mật độ, sinh khối, cảnh báo và trạng thái lô. |
| Số lượng hiện tại | `current_quantity = initial_quantity - mortality - sale - transfer_out + transfer_in + adjustment`. `adjustment` là phần điều chỉnh có dấu; mỗi thay đổi phải có sự kiện để truy vết và không được làm số lượng âm. |
| Tỷ lệ sống | `survival_rate = current_estimated_quantity / initial_quantity × 100`; chỉ tính khi `initial_quantity > 0`. |
| Mật độ | `density = current_estimated_quantity / volume_m3`; đơn vị con/m³ và chỉ tính khi thể tích dương. |
| Sinh khối | `biomass_kg = current_estimated_quantity × average_weight_g / 1000`. |
| Thức ăn khuyến nghị | `recommended_feed_kg = biomass_kg × feeding_rate_percent / 100`; định mức phải chọn theo loài/giai đoạn và có nguồn. |
| Business rules | BR04, BR08, BR09, BR12, BR13, BR18–BR23 và G2. |

### 7.3. UC06 — Kiểm tra và phân tích AI

| **Use case: UC06 — Kiểm tra và phân tích AI** | **Nội dung** |
|---|---|
| Mục đích | Hỗ trợ đếm tôm giống, ước tính mật độ mẫu và đánh giá sơ bộ kích thước/độ đồng đều từ ảnh trong điều kiện lấy mẫu chuẩn hóa. |
| Mô tả | Người dùng chọn lô, chụp hoặc tải ảnh mẫu; Backend lưu yêu cầu, chuyển ảnh cho AI Service, nhận detections/confidence, tính chỉ số và cho phép xác nhận thủ công mà vẫn giữ kết quả gốc. |
| Tác nhân chính | `OWNER`, `AREA_MANAGER`, `TECHNICIAN`. |
| Tác nhân phụ | `AI_SERVICE`; object storage khi được cấu hình. |
| Kích hoạt | Người dùng chọn “Kiểm tra bằng AI” từ chi tiết lô giống. |
| Điều kiện trước | 1. Lô tồn tại và thuộc phạm vi farm/khu vực của actor.<br>2. Lô không ở trạng thái kết thúc (`sold`, `failed`, `cancelled`); với lô đã kết thúc, hệ thống chỉ cho xem lịch sử kiểm tra.<br>3. Có ảnh hợp lệ; ảnh chụp theo quy trình lấy mẫu tương đối chuẩn hóa.<br>4. Có `sample_volume_ml` nếu cần tính mật độ trên ml. |
| Điều kiện sau | 1. Khi yêu cầu đã được chấp nhận và tạo inspection, bản ghi kết thúc ở `completed` hoặc `failed`; ảnh không hợp lệ bị từ chối trước khi tạo bản ghi.<br>2. Kết quả gốc, phiên bản model và ảnh nguồn không bị ghi đè bởi hiệu chỉnh thủ công.<br>3. Kết quả thuộc đúng `batch_id` và phạm vi tenant.<br>4. Dấu hiệu bất thường chỉ tạo cảnh báo hỗ trợ, không tự chẩn đoán bệnh. |
| Use case con | UC06.1 — Thực hiện inspection; UC06.2 — Xem kết quả và lịch sử. |
| Bảng dữ liệu | `ai_inspections`, `seed_batches`, `growth_sampling_logs`, `alerts_notifications`. |
| Mức ưu tiên | Rất cao — là điểm khác biệt nghiên cứu của đề tài. |

#### Luồng sự kiện chính (Basic flow)

| **Actor** | **System** |
|---|---|
| 1. Mở chi tiết lô và chọn “Kiểm tra bằng AI”. | 2. Kiểm tra membership, khu vực, trạng thái lô và tải hướng dẫn/metadata lần kiểm tra. |
| 3. Lấy mẫu, đặt mẫu vào khay/đĩa và chụp hoặc tải ảnh. | 4. Kiểm tra MIME type, dung lượng, kích thước, khả năng đọc ảnh và lưu ảnh gốc vào storage. |
| 5. Nhập phương pháp lấy mẫu, thể tích mẫu và ghi chú. | 6. Tạo `ai_inspections` với `status = pending`, `batch_id`, `created_by`, `media_url` và dữ liệu mẫu. |
| 7. Xác nhận gửi phân tích. | 8. Chuyển trạng thái sang `processing`, gửi ảnh và request ID tới AI Service. |
| — | 9. AI Service trả danh sách detections, bounding box, confidence và phiên bản model. |
| — | 10. Kiểm tra response, tính số lượng phát hiện, confidence trung bình và mật độ nếu đủ thể tích; tạo ảnh chú thích và cập nhật `status = completed`. |
| 11. Xem ảnh gốc, ảnh đánh dấu và các chỉ số. | 12. Hiển thị kết quả cùng cảnh báo rõ ràng rằng AI chỉ hỗ trợ đánh giá. |
| 13. Nếu cần, nhập số đếm thủ công hoặc hệ số hiệu chỉnh. | 14. Lưu hiệu chỉnh riêng, giữ nguyên detections/kết quả AI gốc và cập nhật kết quả sử dụng cho báo cáo. |

#### Luồng sự kiện thay thế (Alternate flow)

| **Mã** | **Điều kiện** | **Xử lý** |
|---|---|---|
| AF06.1 | Không nhập thể tích mẫu. | Vẫn đếm và lưu confidence nhưng để `density_per_ml = NULL`; giao diện nêu lý do không tính được mật độ. |
| AF06.2 | Confidence thấp. | Lưu kết quả, gắn trạng thái/cảnh báo cần kiểm tra thủ công và không tự kết luận chất lượng lô. |
| AF06.3 | Người dùng nhập `manual_count`. | Dùng số thủ công làm kết quả đã xác nhận cho báo cáo; vẫn hiển thị số AI để đối chiếu. |
| AF06.4 | Inspection trước đó `failed`. | Actor chọn thử lại; hệ thống tạo lần xử lý mới hoặc tăng attempt theo thiết kế job, không xóa lịch sử lỗi. |
| AF06.5 | Chỉ xem lịch sử. | Trả danh sách theo `batch_id`, sắp xếp thời gian giảm dần và không gọi lại AI Service. |

#### Luồng ngoại lệ

| **Mã** | **Tình huống và phản hồi hệ thống** |
|---|---|
| EX06.1 | Ảnh sai định dạng, quá dung lượng hoặc không đọc được → trả 400 trước khi gửi AI. |
| EX06.2 | Không có quyền với lô → trả 403; không trả URL ảnh hoặc metadata của farm khác. |
| EX06.3 | Upload storage thất bại → không tạo inspection hoàn tất; thông báo thử lại. |
| EX06.4 | AI Service timeout/lỗi response → cập nhật `status = failed`, lưu mã lỗi an toàn và cho phép retry. |
| EX06.5 | Detections thiếu trường hoặc confidence ngoài 0–1 → từ chối response, đánh dấu `failed`. |
| EX06.6 | Lưu kết quả database thất bại → giữ request có thể đối soát bằng request ID, không hiển thị kết quả chưa được commit. |

#### Dữ liệu, công thức và quy tắc nghiệp vụ

| **Nhóm** | **Chi tiết** |
|---|---|
| Input | `batch_id`, ảnh nguồn, `sampling_method`, `sample_volume_ml`, thời gian, ghi chú. |
| Output | `detected_count`, `density_per_ml`, `average_confidence`, `detections`, `annotated_image_url`, `model_version`, `manual_count`, trạng thái. |
| Confidence trung bình | `average_confidence = tổng confidence / số detection`; để `NULL` khi không có detection. |
| Số lượng hiệu lực | Ưu tiên `manual_count` khi đã xác nhận; nếu không thì dùng số AI sau hệ số hiệu chỉnh đã được lưu và giải thích. |
| Mật độ mẫu | `density_per_ml = effective_count / sample_volume_ml`; chỉ tính khi thể tích lớn hơn 0. |
| Bảo toàn dữ liệu | Không ghi đè ảnh gốc, detections, model version hoặc số AI sau khi người dùng hiệu chỉnh. |
| Giới hạn chuyên môn | AI không tự kết luận bệnh, không tự quyết định dùng thuốc và không thay thế kiểm tra chuyên môn/PCR. |
| Business rules | BR10, BR11, BR20, BR24. |

### 7.4. UC08 — Quản lý tài chính và bán giống

| **Use case: UC08 — Quản lý tài chính và bán giống** | **Nội dung** |
|---|---|
| Mục đích | Theo dõi chi phí, khách hàng, giá bán, giao dịch xuất bán và doanh thu để đánh giá hiệu quả từng lô và toàn farm. |
| Mô tả | Use case tập hợp chi phí trực tiếp/chung, cho phép Owner quản lý khách hàng và bán tôm giống theo đơn vị nghìn con, đồng thời cập nhật số lượng lô trong một transaction. |
| Tác nhân chính | `OWNER`. |
| Tác nhân phụ | `TECHNICIAN` ghi chi phí phát sinh; `AREA_MANAGER` xem chi phí thuộc khu vực. |
| Kích hoạt | Người dùng mở chức năng tài chính hoặc Owner chọn “Xuất bán” trên một lô `ready_for_sale`. |
| Điều kiện trước | 1. Có membership `active` trong farm.<br>2. Khi bán: khách hàng tồn tại trong cùng farm, lô hợp lệ và còn đủ số lượng.<br>3. Khi ghi chi phí theo lô: lô thuộc đúng farm/khu vực của actor.<br>4. Giá trị tiền và số lượng phải lớn hơn hoặc bằng 0 theo loại trường. |
| Điều kiện sau | 1. Chi phí/giao dịch bán được lưu đúng farm.<br>2. Số lượng lô giảm đúng bằng lượng bán và không âm.<br>3. Thành phần giá được lưu snapshot để báo cáo lịch sử không thay đổi theo bảng giá mới.<br>4. Doanh thu, giá vốn và lợi nhuận có thể tái lập từ dữ liệu nguồn. |
| Use case con | UC08.1–UC08.6: chi phí, chi phí phát sinh, chi phí khu vực, khách hàng, xuất bán và doanh thu. |
| Bảng dữ liệu | `expense_records`, `customers`, `seed_sales`, `seed_batches`, `price_lists`, `batch_quantity_events`, `users`. |
| Mức ưu tiên | Rất cao — hoàn tất đầu ra thương mại của quy trình nuôi giống. |

#### Luồng sự kiện chính (Basic flow)

| **Actor** | **System** |
|---|---|
| 1. Chọn farm và mở màn hình tài chính. | 2. Kiểm tra membership; tải chi phí, doanh thu và bộ lọc đúng phạm vi role. |
| 3. Nhập một khoản chi phí phát sinh, chọn loại và lô nếu có. | 4. Kiểm tra số tiền, ngày, lô cùng farm/khu vực; tạo `expense_records`. |
| 5. Owner mở chức năng xuất bán. | 6. Hiển thị các lô đủ điều kiện, số lượng còn lại, khách hàng và bảng giá phù hợp. |
| 7. Chọn lô, khách hàng; nhập số lượng bán, giá, phụ phí, chiết khấu, vận chuyển và ngày bán. | 8. Kiểm tra số lượng, trạng thái lô, khách hàng cùng farm và tính trước doanh thu, tỷ lệ sống, giá vốn ước tính. |
| 9. Xem lại bản tóm tắt và xác nhận bán. | 10. Trong một transaction: tạo `seed_sales`, tạo sự kiện `sale`, giảm `current_estimated_quantity`; chuyển lô sang `sold` nếu số lượng còn lại bằng 0. |
| 11. Mở báo cáo doanh thu/chi phí. | 12. Tổng hợp theo thời gian, lô, khách hàng và loại chi phí; trả doanh thu, giá vốn và lợi nhuận nếu đủ dữ liệu. |

#### Luồng sự kiện thay thế (Alternate flow)

| **Mã** | **Điều kiện** | **Xử lý** |
|---|---|---|
| AF08.1 | Chi phí chung không thuộc riêng một lô. | Lưu `batch_id = NULL`; khi báo cáo phải chọn và lưu phương pháp phân bổ. |
| AF08.2 | Không có bảng giá phù hợp. | Owner nhập giá thủ công; hệ thống vẫn lưu snapshot giá và đánh dấu nguồn giá nhập tay. |
| AF08.3 | Bán một phần lô. | Giảm số lượng, giữ lô `ready_for_sale` khi còn giống; cho phép giao dịch tiếp theo. |
| AF08.4 | Area Manager xem chi phí. | Chỉ tổng hợp chi phí gắn với lô/ao-bể trong khu vực; không hiển thị chi phí chung toàn farm nếu chưa phân bổ. |
| AF08.5 | Technician ghi chi phí. | Cho tạo bản ghi trong khu vực, không được sửa/xóa chi phí đã duyệt hoặc xem doanh thu. |
| AF08.6 | Chưa có giao dịch trong kỳ. | Trả các chỉ số bằng 0 và trạng thái rỗng, không coi là lỗi. |

#### Luồng ngoại lệ

| **Mã** | **Tình huống và phản hồi hệ thống** |
|---|---|
| EX08.1 | Số lượng bán lớn hơn số lượng hiện tại → trả 409 và hiển thị số lượng tối đa có thể bán. |
| EX08.2 | Lô `sold`, `failed` hoặc `cancelled` → trả 409, không tạo giao dịch. |
| EX08.3 | Khách hàng/lô thuộc farm khác → trả 403 hoặc 400; không liên kết chéo tenant. |
| EX08.4 | Số tiền, số lượng, phụ phí hoặc chiết khấu không hợp lệ → trả 400 tại trường tương ứng. |
| EX08.5 | Hai giao dịch đồng thời làm vượt số lượng → khóa/transaction phát hiện xung đột; chỉ một giao dịch được commit. |
| EX08.6 | Cập nhật số lượng lô thất bại → rollback cả `seed_sales` và `batch_quantity_events`. |

#### Dữ liệu, công thức và quy tắc nghiệp vụ

| **Nhóm** | **Chi tiết** |
|---|---|
| Input chi phí | `farm_id`, `batch_id` nullable, `expense_type`, `amount`, `expense_date`, mô tả và phương pháp phân bổ khi cần. |
| Input bán hàng | `batch_id`, `customer_id`, `quantity_sold`, `price_per_thousand`, phụ phí, phí vận chuyển, chiết khấu, ngày bán. |
| Output | Giao dịch bán, số lượng còn lại, doanh thu, chi phí, giá vốn, lợi nhuận và báo cáo theo kỳ. |
| Doanh thu gộp | `gross_revenue = quantity_sold / 1000 × price_per_thousand`. |
| Doanh thu cuối | `total_revenue = gross_revenue + transport_fee - discount_amount`; các thành phần phải lưu snapshot. |
| Tổng giá vốn lô | Tổng chi phí trực tiếp cộng phần chi phí chung được phân bổ bằng phương pháp đã lưu. |
| Giá vốn mỗi con bán được | `cost_per_saleable_seed = total_batch_cost / saleable_quantity`; chỉ tính khi mẫu số dương. |
| Lợi nhuận | `profit = total_revenue - allocated_cost_of_goods_sold`; không đồng nhất doanh thu với lợi nhuận. |
| Tính nguyên tử | Tạo giao dịch bán, sự kiện số lượng và cập nhật lô phải nằm trong cùng transaction. |
| Business rules | BR02–BR04, BR14–BR16, BR18, BR21, BR25, BR26 và G2. |

### 7.5. UC09 — Quản lý thống kê và cảnh báo

| **Use case: UC09 — Quản lý thống kê và cảnh báo** | **Nội dung** |
|---|---|
| Mục đích | Cung cấp cái nhìn tổng quan đúng phạm vi và giúp người dùng phát hiện sớm vấn đề môi trường, AI hoặc tồn kho. |
| Mô tả | Hệ thống tổng hợp dữ liệu vận hành thành KPI/dashboard và hiển thị cảnh báo do tiến trình nền tạo; mỗi role chỉ thấy nội dung thuộc farm, khu vực hoặc kho được phân công. |
| Tác nhân | `OWNER`, `AREA_MANAGER`, `TECHNICIAN`, `WAREHOUSE_STAFF`. |
| Tác nhân nền | Scheduler/worker sinh cảnh báo; không phải actor người dùng và không tạo use case riêng. |
| Kích hoạt | Người dùng đăng nhập, chọn farm và mở Dashboard hoặc danh sách cảnh báo. |
| Điều kiện trước | 1. Phiên đăng nhập và membership `active` hợp lệ.<br>2. Dữ liệu nguồn thuộc cùng farm.<br>3. Ngưỡng môi trường/AI/tồn kho đã được cấu hình nếu cần sinh cảnh báo chính thức.<br>4. Job tổng hợp hoặc API aggregate hoạt động. |
| Điều kiện sau | 1. Dashboard phản ánh dữ liệu trong phạm vi và khoảng thời gian đã chọn.<br>2. Người dùng có thể mở cảnh báo và đánh dấu đã đọc theo khả năng schema.<br>3. Không lộ KPI hoặc cảnh báo của farm/khu vực khác.<br>4. Việc xem dashboard không thay đổi dữ liệu nghiệp vụ nguồn. |
| Use case con | UC09.1 — Dashboard; UC09.2 — Cảnh báo toàn farm; UC09.3 — Cảnh báo khu vực; UC09.4 — Cảnh báo tồn kho. |
| Bảng dữ liệu | `ponds_tanks`, `seed_batches`, `water_parameter_logs`, `ai_inspections`, `inventory_supplies`, `expense_records`, `seed_sales`, `alerts_notifications`, `environment_thresholds`. |
| Mức ưu tiên | Cao — chuyển dữ liệu vận hành thành thông tin hỗ trợ quyết định. |

#### Luồng sự kiện chính (Basic flow)

| **Actor** | **System** |
|---|---|
| 1. Chọn farm và mở Dashboard. | 2. Kiểm tra membership; xác định phạm vi toàn farm, khu vực hoặc kho dựa trên role. |
| 3. Chọn khoảng thời gian hoặc bộ lọc. | 4. Truy vấn các bảng nguồn trong đúng `farm_id` và `area_id`; tính KPI theo cùng múi giờ/kỳ báo cáo. |
| — | 5. Trả số ao/bể theo trạng thái, lô đang hoạt động, thông số gần nhất, cảnh báo chưa đọc, tồn kho thấp, chi phí và doanh thu theo quyền. |
| 6. Chọn một KPI hoặc biểu đồ. | 7. Mở danh sách chi tiết đã áp dụng cùng bộ lọc và phạm vi, cho phép truy ngược bản ghi nguồn. |
| 8. Mở danh sách cảnh báo. | 9. Lọc cảnh báo theo role: Owner toàn farm; Area Manager/Technician theo khu vực; Warehouse Staff chỉ cảnh báo kho. |
| 10. Chọn một cảnh báo. | 11. Hiển thị loại, mức độ, nội dung, thời gian, ao/bể hoặc lô liên quan và liên kết tới dữ liệu nguồn. |
| 12. Chọn đánh dấu đã đọc. | 13. Cập nhật trạng thái đọc theo thiết kế hiện có và trả danh sách mới. |

#### Luồng sự kiện thay thế (Alternate flow)

| **Mã** | **Điều kiện** | **Xử lý** |
|---|---|---|
| AF09.1 | Owner xem dashboard. | Tổng hợp toàn farm, bao gồm vận hành, cảnh báo, kho, chi phí và doanh thu. |
| AF09.2 | Area Manager hoặc Technician xem. | Chỉ tổng hợp ao/bể, lô, nhật ký, AI và cảnh báo thuộc khu vực membership. |
| AF09.3 | Warehouse Staff xem. | Chỉ hiển thị danh mục kho, tồn thấp, nhập/xuất và cảnh báo kho; không hiển thị doanh thu. |
| AF09.4 | Không có dữ liệu trong khoảng thời gian. | Hiển thị trạng thái rỗng và KPI bằng 0/không xác định phù hợp, không dùng dữ liệu farm khác để lấp chỗ trống. |
| AF09.5 | Thiếu cấu hình ngưỡng. | Hiển thị dữ liệu thô và cảnh báo cấu hình thiếu; không tự gán mức nguy cấp bằng hằng số không được phê duyệt. |
| AF09.6 | Người dùng đổi farm. | Xóa kết quả/bộ nhớ đệm của farm trước, tải lại membership và toàn bộ KPI theo farm mới. |

#### Luồng ngoại lệ

| **Mã** | **Tình huống và phản hồi hệ thống** |
|---|---|
| EX09.1 | Membership bị suspend sau khi mở trang → request kế tiếp trả 403 và xóa dữ liệu dashboard đang hiển thị. |
| EX09.2 | Tham số thời gian/bộ lọc không hợp lệ → trả 400 và giữ bộ lọc hợp lệ gần nhất. |
| EX09.3 | Một nguồn tổng hợp lỗi → hiển thị trạng thái lỗi rõ ràng; không trình bày dữ liệu cũ như dữ liệu hiện tại nếu không có timestamp. |
| EX09.4 | Cảnh báo trỏ tới bản ghi đã xóa/không còn quyền → không trả dữ liệu chi tiết nhạy cảm; hiển thị cảnh báo không còn khả dụng. |
| EX09.5 | Job sinh cảnh báo chạy lặp → áp dụng khóa chống trùng/idempotency để tránh nhiều cảnh báo giống nhau cho cùng sự kiện. |
| EX09.6 | Query vượt thời gian → trả lỗi có thể thử lại và ghi log kỹ thuật, không mở rộng phạm vi query để lấy dữ liệu nhanh hơn. |

#### Dữ liệu, công thức và quy tắc nghiệp vụ

| **Nhóm** | **Chi tiết** |
|---|---|
| Input | `farm_id`, khoảng thời gian, loại KPI, loại/mức cảnh báo, trạng thái đọc và bộ lọc khu vực. |
| Output | KPI, biểu đồ xu hướng, danh sách cảnh báo, dữ liệu chi tiết và thời điểm cập nhật gần nhất. |
| Lô hoạt động | Đếm `seed_batches.status` thuộc `active` hoặc `ready_for_sale` trong phạm vi. |
| Tồn kho thấp | Vật tư có `quantity <= min_threshold`; đánh giá sau giao dịch kho và theo job kiểm tra định kỳ. |
| Cảnh báo chưa đọc | Đếm bản ghi cảnh báo phù hợp phạm vi có `is_read = false`. |
| Doanh thu/chi phí | Tổng `seed_sales.total_revenue` và `expense_records.amount` trong cùng kỳ, farm và phạm vi cho phép. |
| Tính nhất quán | Mọi KPI phải dùng cùng timezone, mốc đầu/cuối kỳ, điều kiện trạng thái và timestamp dữ liệu. |
| Hạn chế schema hiện tại | `alerts_notifications.is_read` là trạng thái chung. Nếu cần trạng thái đọc riêng cho từng user, phải thiết kế bảng đọc cảnh báo riêng trong giai đoạn sau. |
| Business rules | BR02–BR05, BR11–BR13, BR17, BR18, BR22 và G2. |
