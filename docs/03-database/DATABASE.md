# DATABASE

## Database Schema — Hệ thống quản lý trại tôm giống

Tài liệu mô tả cấu trúc cơ sở dữ liệu của hệ thống quản lý trại tôm giống. Kiến trúc chuẩn của dự án là **một người dùng có thể tham gia nhiều trang trại**, còn vai trò được gán theo từng quan hệ người dùng–trang trại trong `farm_members`. Schema nghiệp vụ bên dưới là schema đích; các bảng chưa có migration được đánh dấu là phần kế hoạch triển khai.

> Trạng thái hiện thực: Prisma model đã biểu diễn quan hệ N-N qua `farm_members`, nhưng migration đã áp dụng `20260902_004_enforce_single_farm_non_owner` còn chứa ràng buộc cũ giới hạn role không phải Owner ở một farm. Tài liệu này giữ mô hình multi-farm làm chuẩn; theo yêu cầu hiện tại không sửa hoặc thêm migration.

Phạm vi MVP ưu tiên tôm thẻ chân trắng giai đoạn PL và có thể mở rộng cho tôm sú. Các ngưỡng sinh học trong tài liệu là dữ liệu tham khảo theo loài, giai đoạn và hệ thống nuôi, không được hard-code trong backend.

---

## 1. `users` — Người dùng

Quản lý danh tính người dùng dùng chung cho toàn hệ thống. Tài khoản không có role toàn cục; cùng một người có thể là `owner` ở một trang trại và `technician` ở trang trại khác.

| Field | Type | Ý nghĩa |
|---|---|---|
| `id` | TEXT | PK, ID do Neon Auth cấp |
| `email` | VARCHAR(150) | UNIQUE, email đăng nhập |
| `username` | VARCHAR(100) | UNIQUE, nullable |
| `displayName` | VARCHAR(100) | Tên hiển thị, nullable |
| `phone` | VARCHAR(30) | Số điện thoại, nullable |
| `created_at` | TIMESTAMP | Ngày tạo |
| `updated_at` | TIMESTAMP | Ngày cập nhật |

Không lưu `role`, `password_hash` hoặc `is_active` tại đây. Mật khẩu do Neon Auth quản lý; role và trạng thái truy cập theo từng trang trại nằm ở `farm_members`.

---

# 2. `farms` — Trang trại

Mỗi bản ghi là một tenant độc lập. Một người dùng có thể tạo hoặc tham gia nhiều trang trại.

| Field | Type | Ý nghĩa |
|---|---|---|
| `id` | UUID | PK |
| `code` | VARCHAR(30) | UNIQUE, mã trại |
| `name` | VARCHAR(120) | Tên trại |
| `address` | TEXT | Địa chỉ, nullable |
| `created_by` | TEXT | FK → `users.id`, người tạo trại |
| `created_at` | TIMESTAMP | Ngày tạo |
| `updated_at` | TIMESTAMP | Ngày cập nhật |

`created_by` chỉ biểu thị người tạo bản ghi, không phải nguồn phân quyền. Quyền Owner được biểu diễn bằng bản ghi `farm_members` có `role = 'owner'` trong chính trang trại đó. Nếu nghiệp vụ yêu cầu mỗi trang trại chỉ có một Owner, dùng unique có điều kiện trên `(farm_id)` với `role = 'owner'`; không tạo unique toàn hệ thống trên người dùng.

## 2.1. `areas` — Khu vực

| Field | Type | Ý nghĩa |
|---|---|---|
| `id` | UUID | PK |
| `farm_id` | UUID | FK → `farms.id` |
| `code` | VARCHAR(30) | Mã khu vực, unique trong trại |
| `name` | VARCHAR(120) | Tên khu vực |
| `created_at` | TIMESTAMP | Ngày tạo |
| `updated_at` | TIMESTAMP | Ngày cập nhật |

## 2.2. `farm_members` — Thành viên và vai trò theo trại

Đây là bảng nguồn duy nhất để xác định phạm vi quyền nghiệp vụ.

| Field | Type | Ý nghĩa |
|---|---|---|
| `farm_id` | UUID | PK ghép, FK → `farms.id` |
| `user_id` | TEXT | PK ghép, FK → `users.id` |
| `role` | VARCHAR(30) | `owner`, `area_manager`, `technician`, `warehouse_staff` |
| `status` | VARCHAR(20) | `active` hoặc `suspended`, theo từng trại |
| `area_id` | UUID | FK → `areas.id`, nullable |
| `created_at` | TIMESTAMP | Ngày tham gia |

Quy tắc: `area_manager` và `technician` phải có `area_id`; `owner` và `warehouse_staff` không gắn khu vực trong phiên bản hiện tại. Một user có thể có nhiều bản ghi tại nhiều `farm_id`.

## 2.3. `access_sessions` — Phiên truy cập

| Field | Type | Ý nghĩa |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | TEXT | FK → `users.id` |
| `token_hash` | TEXT | UNIQUE |
| `last_activity` | TIMESTAMP | Hoạt động gần nhất |
| `expires_at` | TIMESTAMP | Thời điểm hết hạn |
| `created_at` | TIMESTAMP | Ngày tạo |

## 2.4. `password_reset_otp_windows` — Cửa sổ OTP đặt lại mật khẩu

| Field | Type | Ý nghĩa |
|---|---|---|
| `email` | VARCHAR(150) | PK |
| `expires_at` | TIMESTAMP | Thời điểm hết hạn |
| `created_at` | TIMESTAMP | Ngày tạo |
| `updated_at` | TIMESTAMP | Ngày cập nhật |

---

# 3. `ponds_tanks` — Ao/Bể ương giống

## `tank_type` là gì?

`tank_type` dùng để xác định **mục đích/loại ao-bể trong quá trình sản xuất giống**.

Ví dụ ban đầu mình đề xuất:

- `hatchery`: bể phục vụ giai đoạn ấp/nở.
- `nursery`: bể ương con giống.
- `other`: loại khác.

Tuy nhiên, nếu hệ thống của bạn chủ yếu quản lý **quá trình ương tôm giống đã có lô đầu vào**, thì không nhất thiết phải phân chia phức tạp như vậy.

Có thể đơn giản thành:

```
```

```
nursery_tank    Bể ương
pond            Ao
other           Khác
```

Hoặc thậm chí **bỏ** **`tank_type`** nếu tất cả đều là bể ương.

Mình khuyên **giữ**, vì chi phí phát triển gần như không đáng kể nhưng database rõ nghĩa hơn.

| Field | Type | Ý nghĩa |              |                                 |
| ---------------- | ------------ | ------------------------------- |
| `id`             | UUID         | PK                              |
| `farm_id`        | UUID         | FK → `farms.id`                 |
| `code`           | VARCHAR(50)  | Mã ao/bể                        |
| `name`           | VARCHAR(100) | Tên ao/bể                       |
| `tank_type`      | VARCHAR(30)  | `nursery_tank`, `pond`, `other` |
| `volume_m3`      | DECIMAL      | Thể tích                        |
| `status`         | VARCHAR(20)  | Trạng thái                      |
| `description`    | TEXT         | Ghi chú                         |
| `created_at`     | TIMESTAMP    | Ngày tạo                        |
| `updated_at`     | TIMESTAMP    | Ngày cập nhật                   |

Trạng thái:

```
```

```
empty       Trống
active      Đang nuôi/ương
cleaning    Đang vệ sinh
inactive    Ngừng sử dụng
```

Luồng phổ biến:

**`empty → active → cleaning → empty`**

## Quy tắc nghiệp vụ: một ao/bể chỉ nuôi một giống tôm tại một thời điểm

- Mỗi bản ghi `seed_batches` thuộc đúng một `ponds_tanks` thông qua `seed_batches.tank_id`.
- Một ao/bể có thể chứa nhiều lô giống trong các chu kỳ khác nhau để lưu được lịch sử sản xuất.
- Tại một thời điểm, một ao/bể chỉ được có tối đa một lô đang chiếm dụng. Các trạng thái chiếm dụng là `active` và `ready_for_sale`.
- Không được tạo hoặc gán lô mới vào ao/bể đang có lô `active`/`ready_for_sale`. Ao/bể chỉ được nhận lô mới sau khi lô cũ kết thúc (`sold`, `failed` hoặc `cancelled`) và ao/bể đã trở về trạng thái `empty`.
- `seed_batches.species` lưu giống tôm của từng lô; không đặt `species` trực tiếp ở `ponds_tanks` vì một ao/bể có thể được tái sử dụng cho lô khác ở chu kỳ sau.

Ở tầng nghiệp vụ, Backend phải kiểm tra quy tắc này trong cùng một transaction. Với PostgreSQL, có thể tăng cường bằng partial unique index:

```sql
CREATE UNIQUE INDEX uq_seed_batches_one_current_per_tank
ON seed_batches (tank_id)
WHERE status IN ('active', 'ready_for_sale');
```

---

# 4. `seed_batches` — Lô giống

Đây vẫn là **bảng nghiệp vụ trung tâm**.

| Field | Type | Ý nghĩa |
|---|---|---|
| `id` | UUID | PK |
| `tank_id` | UUID | FK → `ponds_tanks.id` |
| `supplier_id` | UUID | FK → `seed_suppliers.id`, nullable với dữ liệu cũ/nội bộ |
| `batch_code` | VARCHAR(50) | Mã lô nội bộ, UNIQUE |
| `supplier_lot_code` | VARCHAR(80) | Mã lô của nhà cung cấp |
| `species` | VARCHAR(50) | `white_leg_shrimp` hoặc `black_tiger_shrimp` |
| `development_stage` | VARCHAR(50) | PL10, PL12, PL15, PL20... |
| `broodstock_line` | VARCHAR(100) | Dòng/nguồn tôm bố mẹ nếu có |
| `broodstock_status` | VARCHAR(20) | `spf`, `spr`, `standard`, `unknown` |
| `source` | VARCHAR(150) | Mô tả nguồn giống, giữ để tương thích dữ liệu cũ |
| `documented_quantity` | INTEGER | Số lượng theo chứng từ/hóa đơn |
| `initial_quantity` | INTEGER | Số lượng thực tế sau kiểm đếm và thả |
| `current_estimated_quantity` | INTEGER | Số lượng ước tính hiện tại |
| `production_date` | DATE | Ngày sản xuất/ương tại trại giống, nullable |
| `received_at` | TIMESTAMP | Thời điểm tiếp nhận, nullable |
| `transport_duration_minutes` | INTEGER | Thời gian vận chuyển, nullable |
| `health_certificate_url` | TEXT | Tệp giấy kiểm dịch/chứng nhận, nullable |
| `stocked_date` | DATE | Ngày bắt đầu thả/ương |
| `expected_sale_date` | DATE | Ngày dự kiến xuất bán |
| `status` | VARCHAR(30) | Trạng thái lô |
| `notes` | TEXT | Ghi chú |
| `created_at` | TIMESTAMP | Ngày tạo |
| `updated_at` | TIMESTAMP | Ngày cập nhật |

`initial_quantity` là số lượng chuẩn dùng cho các công thức tỷ lệ sống và sinh khối. `documented_quantity` chỉ phản ánh chứng từ đầu vào, không được dùng làm mẫu số tỷ lệ sống nếu đã có số lượng thực tế sau kiểm đếm.

### Giải thích `status`

**`active`** **— Đang ương**

Lô giống hiện đang được chăm sóc trong bể.

```
```

```
500.000 con PL5
↓
Bể B01
↓
active
```

**`ready_for_sale`** **— Sẵn sàng xuất bán**

Lô đã đạt giai đoạn/điều kiện mà trại quyết định có thể bán.

```
```

```
PL5 → chăm sóc → PL12
                   ↓
            ready_for_sale
```

**`sold`** **— Đã xuất bán hết**

Toàn bộ số lượng con giống cần xuất của lô đã được bán và lô kết thúc.

**`failed`** **— Lô thất bại**

Lô gặp sự cố nghiêm trọng, hao hụt lớn hoặc không còn khả năng tiếp tục sản xuất.

**`cancelled`** **— Hủy lô**

Lô bị hủy vì lý do quản lý/vận hành trước khi hoàn tất chu kỳ.

Luồng bình thường:

**`active → ready_for_sale → sold`**

Luồng bất thường:

**`active → failed`**

hoặc:

**`active → cancelled`**

---

# NHÓM NHẬT KÝ

Theo yêu cầu của bạn, **không dùng** **`care_logs`** **nữa**.

Tách thành 4 bảng.

# 5. `water_parameter_logs` — Môi trường nước

| Field | Type | Ý nghĩa |
|---|---|---|
| `id` | UUID | PK |
| `tank_id` | UUID | FK → `ponds_tanks.id` |
| `recorded_by` | TEXT | FK → `users.id` |
| `temperature` | DECIMAL | °C, nullable nếu không đo |
| `ph` | DECIMAL | pH, nullable nếu không đo |
| `salinity` | DECIMAL | ppt, nullable nếu không đo |
| `dissolved_oxygen` | DECIMAL | DO mg/L, nullable nếu không đo |
| `nh3` | DECIMAL | NH3 mg/L, nullable nếu không đo |
| `tan` | DECIMAL | Tổng ammonia nitrogen (TAN) mg/L, nullable nếu không đo |
| `no2` | DECIMAL | NO2 mg/L, nullable nếu không đo |
| `nitrate` | DECIMAL | NO3 mg/L, nullable |
| `alkalinity` | DECIMAL | mg/L CaCO3, nullable |
| `h2s` | DECIMAL | H2S ppm, nullable |
| `turbidity` | DECIMAL | Độ đục hoặc độ trong theo quy ước đo, nullable |
| `water_level_m` | DECIMAL | Mực nước mét, nullable |
| `measurement_method` | VARCHAR(20) | `manual`, `iot`, `lab` |
| `measurement_device` | VARCHAR(100) | Thiết bị đo, nullable |
| `recorded_at` | TIMESTAMP | Thời gian đo |
| `notes` | TEXT | Ghi chú |
| `created_at` | TIMESTAMP | Ngày tạo |

Mỗi bản ghi có thể chỉ chứa các thông số được đo ở thời điểm đó. Không tạo giá trị 0 giả cho thông số không đo; dùng `NULL` để phân biệt "chưa đo" với giá trị thực tế bằng 0.

> **Quyết định mô hình:** `water_parameter_logs` là nhật ký đo điều kiện nước của ao/bể, nên chỉ cần `tank_id` và `recorded_by`. Do một ao/bể chỉ có một lô/giống đang chiếm dụng tại một thời điểm, `batch_id` là khóa ngoại dư thừa. Giữ đồng thời `tank_id` và `batch_id` có thể tạo dữ liệu mâu thuẫn, ví dụ log ghi cho ao A nhưng `batch_id` lại thuộc ao B. Nếu cần truy vết chính xác log theo từng lô sau khi ao/bể được tái sử dụng, nên bổ sung bảng lịch sử phân bổ ao/bể-lô thay vì thêm một FK độc lập vào log.

---

# 6. `feeding_logs` — Nhật ký cho ăn

> **Quyết định mô hình:** `feeding_logs` là nhật ký cho ăn tại ao/bể, nên chỉ liên kết với `tank_id` và `performed_by`. Lô/giống đang chiếm dụng được xác định từ quan hệ `ponds_tanks`–`seed_batches` tại thời điểm ghi. Nếu cần truy vết tuyệt đối theo từng lô sau khi ao/bể được tái sử dụng, cần bổ sung bảng lịch sử phân bổ ao/bể-lô thay vì thêm một `batch_id` độc lập vào nhật ký.

| Field | Type | Ý nghĩa |              |                                        |
| ---------------- | ------------ | -------------------------------------- |
| `id`             | UUID         | PK                                     |
| `tank_id`        | UUID         | FK                                     |
| `performed_by`   | TEXT         | FK → users                             |
| `supply_id`      | UUID         | FK → `inventory_supplies.id`, nullable |
| `feed_name`      | VARCHAR(150) | Tên thức ăn                            |
| `amount`         | DECIMAL      | Khối lượng                             |
| `unit`           | VARCHAR(20)  | kg, g...                               |
| `biomass_snapshot_kg` | DECIMAL | Sinh khối dùng làm cơ sở tính khẩu phần, nullable |
| `feeding_rate_percent` | DECIMAL | Tỷ lệ cho ăn theo sinh khối, nullable |
| `recommended_amount` | DECIMAL | Lượng khuyến nghị, cùng đơn vị với `amount`, nullable |
| `feed_check_status` | VARCHAR(20) | `consumed`, `leftover`, `not_checked`, nullable |
| `feeding_time`   | TIMESTAMP    | Thời gian cho ăn                       |
| `notes`          | TEXT         | Ghi chú                                |
| `created_at`     | TIMESTAMP    | Ngày tạo                               |

---

# 7. `water_change_logs` — Nhật ký thay nước

> **Quyết định mô hình:** `water_change_logs` là hoạt động xử lý nước của ao/bể, nên chỉ liên kết với `tank_id` và `performed_by`. Không lưu thêm `batch_id` vì một ao/bể chỉ có tối đa một lô đang chiếm dụng tại một thời điểm và hai khóa này có thể bị lệch dữ liệu.

| FieldTypeÝ nghĩa          |           |             |
| ------------------------- | --------- | ----------- |
| `id`                      | UUID      | PK          |
| `tank_id`                 | UUID      | FK          |
| `performed_by`            | TEXT      | FK → users  |
| `water_change_percentage` | DECIMAL   | % nước thay |
| `performed_at`            | TIMESTAMP | Thời gian   |
| `notes`                   | TEXT      | Ghi chú     |
| `created_at`              | TIMESTAMP | Ngày tạo    |

---

# 8. `treatment_logs` — Thuốc/chế phẩm

> **Quyết định mô hình:** `treatment_logs` là hoạt động xử lý thuốc/chế phẩm tại ao/bể, cùng nhóm với `water_parameter_logs`, `feeding_logs`, `water_change_logs`, nên áp dụng thống nhất cùng một quy tắc neo dữ liệu: chỉ liên kết với `tank_id` và `performed_by`. Không lưu thêm `batch_id` vì một ao/bể chỉ có tối đa một lô đang chiếm dụng tại một thời điểm (xem "Quy tắc nghiệp vụ" ở mục `ponds_tanks`), nên `batch_id` là khóa ngoại dư thừa và có nguy cơ lệch dữ liệu nếu tồn tại song song với `tank_id`. Neo theo `tank_id` còn cho phép ghi nhận xử lý thuốc/chế phẩm khi ao/bể đang ở trạng thái `empty`/`cleaning` (vd sát khuẩn giữa hai vụ nuôi), thời điểm chưa có lô nào đang chiếm dụng. Trước đây bảng này từng được neo theo `batch_id` với lý do "áp dụng trực tiếp cho một lô giống" — lý do đó áp dụng y hệt được cho cả `feeding_logs`/`water_change_logs`/`water_parameter_logs`, nên đã được chuẩn hóa lại theo `tank_id` để 4 bảng nhật ký chăm sóc nhất quán với nhau.

| Field | Type | Ý nghĩa |              |                                        |
| ---------------- | ------------ | -------------------------------------- |
| `id`             | UUID         | PK                                     |
| `tank_id`        | UUID         | FK → `ponds_tanks.id`                  |
| `performed_by`   | TEXT         | FK → users                             |
| `supply_id`      | UUID         | FK → `inventory_supplies.id`, nullable |
| `product_name`   | VARCHAR(150) | Thuốc/chế phẩm                         |
| `amount`         | DECIMAL      | Số lượng                               |
| `unit`           | VARCHAR(20)  | g, ml, kg...                           |
| `purpose`        | TEXT         | Mục đích sử dụng                       |
| `performed_at`   | TIMESTAMP    | Thời gian                              |
| `notes`          | TEXT         | Ghi chú                                |
| `created_at`     | TIMESTAMP    | Ngày tạo                               |

Việc có `supply_id` giúp kết nối nhật ký sử dụng với kho.

---

# NHÓM AI

# 9. `ai_inspections` — Kiểm tra AI

Đây là bảng cần giải thích kỹ vì có nhiều field không phải dữ liệu CRUD thông thường.

| Field | Ý nghĩa |                                                     |
| --------------------- | --------------------------------------------------- |
| `id`                  | ID của lần kiểm tra                                 |
| `batch_id`            | Lô giống được kiểm tra                              |
| `created_by`          | Kỹ thuật viên thực hiện                             |
| `media_url`           | Đường dẫn ảnh mẫu gốc                               |
| `annotated_image_url` | Ảnh sau khi AI vẽ bounding box                      |
| `sampling_method`     | Phương pháp lấy mẫu: `manual`, `ai`, `combined`    |
| `sample_volume_ml`    | Thể tích mẫu lấy từ bể                              |
| `manual_count`        | Số lượng do kỹ thuật viên đếm/xác nhận, nullable    |
| `detected_count`      | Tổng số tôm giống AI phát hiện trong ảnh            |
| `density_per_ml`      | Mật độ cá thể trên 1 ml mẫu                         |
| `correction_factor`   | Hệ số hiệu chỉnh sau đối chiếu thủ công, nullable   |
| `average_confidence`  | Độ tin cậy trung bình của AI                        |
| `average_size_mm`     | Kích thước trung bình nếu model/pipeline hỗ trợ     |
| `uniformity_score`    | Điểm thể hiện mức độ đồng đều kích thước nếu hỗ trợ |
| `detections`          | JSONB chứa từng detection/bounding box              |
| `model_version`       | Phiên bản model AI                                  |
| `status`              | Trạng thái xử lý AI                                 |
| `inspected_at`        | Thời điểm kiểm tra                                  |
| `notes`               | Ghi chú                                             |
| `created_at`          | Ngày tạo record                                     |

`ai_inspections` liên kết với `seed_batches` làm đối tượng kiểm tra chính. Ao/bể lấy mẫu được suy ra qua `seed_batches.tank_id`, tránh lưu đồng thời `batch_id` và `tank_id` rồi phát sinh dữ liệu không nhất quán. `manual_count` và `correction_factor` chỉ là dữ liệu xác nhận/hiệu chỉnh, không thay thế kết quả AI gốc.

### Ví dụ

Kỹ thuật viên lấy:

```
```

```
250 ml mẫu
```

AI phát hiện:

```
```

```
detected_count = 82
```

thì:

```
```

```
density_per_ml
= 82 / 250
= 0.328 con/ml
```

`average_confidence`:

```
```

```
0.91 = 91%
```

cho biết mức confidence trung bình của các detection.

`detections`:

```
```

```
[
  {
    "class": "shrimp_seed",
    "confidence": 0.93,
    "bbox": [120, 80, 160, 190]
  },
  {
    "class": "shrimp_seed",
    "confidence": 0.89,
    "bbox": [200, 100, 250, 210]
  }
]
```

Nhờ dùng JSONB, không cần tạo hàng chục/hàng trăm row `ai_detections`.

### `status`

```
```

```
pending       Chờ xử lý
processing    AI đang xử lý
completed     Xử lý thành công
failed        Xử lý thất bại
```

### Hai field nên nullable

```
```

```
average_size_mm
uniformity_score
```

Vì prototype AI ban đầu chưa nhất thiết đo được hai chỉ số này. Không nên giả định model detection tự động tính được kích thước thực tế.

---

# NHÓM KHO

## 10. `inventory_supplies` — Danh mục vật tư

Bạn hỏi:

> Có cần quản lý việc nhập kho và sử dụng không?

**Có.** Nếu đã có chức năng "quản lý kho", chỉ lưu `quantity` mà không có lịch sử tăng/giảm thì rất khó giải thích tồn kho đến từ đâu.

Vì vậy nên thêm lại `inventory_transactions`.

`inventory_supplies` lưu **trạng thái tồn hiện tại**:

| Field | Type | Ý nghĩa |              |                 |
| ---------------- | ------------ | --------------- |
| `id`             | UUID         | PK              |
| `farm_id`        | UUID         | FK → `farms.id` |
| `name`           | VARCHAR(150) | Tên vật tư      |
| `category`       | VARCHAR(30)  | Loại            |
| `unit`           | VARCHAR(20)  | Đơn vị          |
| `quantity`       | DECIMAL      | Tồn hiện tại    |
| `unit_price`     | DECIMAL      | Đơn giá         |
| `min_threshold`  | DECIMAL      | Ngưỡng cảnh báo |
| `description`    | TEXT         | Ghi chú         |
| `created_at`     | TIMESTAMP    | Ngày tạo        |
| `updated_at`     | TIMESTAMP    | Ngày cập nhật   |

Category:

```
```

```
feed
medicine
chemical
probiotic
other
```

---

# 11. `inventory_transactions` — Nhập/Xuất vật tư

Bảng này giải quyết lịch sử kho.

| FieldTypeÝ nghĩa   |             |                                 |
| ------------------ | ----------- | ------------------------------- |
| `id`               | UUID        | PK                              |
| `supply_id`        | UUID        | FK → inventory                  |
| `batch_id`         | UUID        | FK → batch, nullable            |
| `created_by`       | TEXT        | FK → users                      |
| `transaction_type` | VARCHAR(20) | `import`, `usage`, `adjustment` |
| `quantity`         | DECIMAL     | Số lượng                        |
| `unit_price`       | DECIMAL     | Giá tại thời điểm giao dịch     |
| `transaction_date` | TIMESTAMP   | Thời gian                       |
| `notes`            | TEXT        | Ghi chú                         |
| `created_at`       | TIMESTAMP   | Ngày tạo                        |

Ví dụ:

```
```

```
Nhập 20kg Artemia
        ↓
transaction_type = import
quantity = 20
        ↓
Tồn = tồn + 20
```

Khi cho ăn:

```
```

```
feeding_logs
Artemia = 0.8kg
       ↓
inventory_transactions
type = usage
quantity = 0.8
       ↓
Tồn = tồn - 0.8
```

Như vậy kho có thể truy vết được.

---

# 12. `expense_records` — Chi phí

| Field | Type | Ý nghĩa |             |                |
| ---------------- | ----------- | -------------- |
| `id`             | UUID        | PK             |
| `farm_id`        | UUID        | FK → `farms.id` |
| `batch_id`       | UUID        | FK, nullable   |
| `created_by`     | TEXT        | FK             |
| `expense_type`   | VARCHAR(30) | Loại chi phí   |
| `description`    | TEXT        | Nội dung       |
| `amount`         | DECIMAL     | Số tiền        |
| `allocation_method` | VARCHAR(20) | `days`, `volume`, `quantity`, `biomass`, `actual_usage`, nullable |
| `expense_date`   | DATE        | Ngày phát sinh |
| `created_at`     | TIMESTAMP   | Ngày tạo       |

Chi phí kho có thể lấy từ transaction nếu muốn tự động hóa, còn bảng này đặc biệt hữu ích cho các loại chi phí vận hành chung của cả trại, không thuộc riêng một lô nào:

```
```

```
seed_purchase
feed
medicine
chemical
electricity
water
labor
transport
other
```

`allocation_method` có thể được lưu ở bảng mở rộng hoặc cấu hình tại backend cho chi phí chung: `days`, `volume`, `quantity`, `biomass`, `actual_usage`.

> **Quyết định mô hình:** `batch_id` phải là **nullable**. Các `expense_type` như `electricity`, `water`, `labor` thường phát sinh theo cả trang trại hoặc theo tháng, không gắn với một lô giống cụ thể — nếu bắt buộc `batch_id` thì mọi chi phí vận hành chung sẽ bị ép gán khiên cưỡng vào một lô, làm sai lệch chính báo cáo "chi phí theo lô" mà bảng này phục vụ. Khi `batch_id = NULL`, chi phí được hiểu là chi phí chung của trang trại trong kỳ đó; khi có `batch_id`, chi phí được tính riêng cho lô đó (vd chi phí con giống, thức ăn/thuốc phát sinh ngoài kho). Cách xử lý này thống nhất với `inventory_transactions.batch_id`, vốn cũng nullable với cùng lý do.

---

# KHÁCH HÀNG & XUẤT BÁN

Bạn yêu cầu tách khách hàng khỏi `seed_sales`. **Nên tách.**

## 13. `customers` — Khách hàng

Quản lý các hộ nuôi/trại nuôi mua con giống.

| Field | Type | Ý nghĩa |              |                     |
| ---------------- | ------------ | ------------------- |
| `id`             | UUID         | PK                  |
| `farm_id`        | UUID         | FK → `farms.id`     |
| `name`           | VARCHAR(150) | Tên khách hàng/trại |
| `phone`          | VARCHAR(20)  | SĐT                 |
| `address`        | TEXT         | Địa chỉ             |
| `customer_type`  | VARCHAR(30)  | Loại khách hàng     |
| `notes`          | TEXT         | Ghi chú             |
| `created_at`     | TIMESTAMP    | Ngày tạo            |
| `updated_at`     | TIMESTAMP    | Ngày cập nhật       |

`customer_type`:

```
```

```
farm
household
cooperative
other
```

---

# 14. `seed_sales` — Xuất bán con giống

Sau khi tách customer, bảng này không cần:

```
```

```
customer_name
customer_phone
```

mà dùng:

```
```

```
customer_id
```

| Field | Type | Ý nghĩa |
|---|---|---|
| `id` | UUID | PK |
| `batch_id` | UUID | FK → `seed_batches.id` |
| `customer_id` | UUID | FK → `customers.id` |
| `created_by` | TEXT | FK → `users.id` |
| `price_list_id` | UUID | FK → `price_lists.id`, nullable |
| `quantity_sold` | INTEGER | Số con bán |
| `base_price_per_thousand` | DECIMAL | Giá cơ sở tại thời điểm bán, nullable |
| `quality_surcharge_per_thousand` | DECIMAL | Phụ phí chất lượng, nullable |
| `certificate_surcharge_per_thousand` | DECIMAL | Phụ phí chứng nhận, nullable |
| `transport_fee` | DECIMAL | Phí vận chuyển, nullable |
| `discount_amount` | DECIMAL | Khoản chiết khấu, nullable |
| `price_per_thousand` | DECIMAL | Đơn giá tôm giống/1.000 con sau phụ phí đơn vị, chưa gồm phí/chiết khấu giao dịch |
| `gross_revenue` | DECIMAL | Doanh thu tiền giống trước phí vận chuyển và chiết khấu |
| `total_revenue` | DECIMAL | Doanh thu ròng = doanh thu tiền giống + phí vận chuyển - chiết khấu |
| `survival_rate` | DECIMAL | Tỷ lệ sống tại thời điểm bán |
| `sale_date` | DATE | Ngày xuất |
| `notes` | TEXT | Ghi chú |
| `created_at` | TIMESTAMP | Ngày tạo |

Quan hệ:

```
```

```
customers
    │
    │ 1
    │
    └──────< seed_sales
                 >────── seed_batches
```

Một khách hàng có thể mua nhiều lần.

Một lô cũng có thể xuất bán nhiều lần.

`transport_fee` và `discount_amount` là số tiền ở cấp giao dịch; khi để trống phải được coi là 0. Vì vậy `price_per_thousand` chỉ chứa đơn giá theo 1.000 con, còn `total_revenue` mới là doanh thu ròng của giao dịch.

> **Quyết định mô hình:** `survival_rate` là tỷ lệ sống **tại thời điểm `sale_date` của đúng lần bán đó**, không phải một giá trị cố định của lô được sao chép lặp lại vào mọi dòng `seed_sales`. Công thức đề xuất: `survival_rate = current_estimated_quantity_ngay_trước_khi_trừ / initial_quantity` (lấy từ `seed_batches` tại thời điểm ghi nhận). Vì một lô có thể có nhiều lần xuất bán ở các thời điểm khác nhau với hao hụt tích lũy khác nhau, mỗi dòng `seed_sales` được phép — và nên — có `survival_rate` khác nhau; đây là dữ liệu lịch sử theo giao dịch, không phải dữ liệu dư thừa của `seed_batches`.

---

# 15. `alerts_notifications` — Cảnh báo

| Field | Type | Ý nghĩa |              |                               |
| ---------------- | ------------ | ----------------------------- |
| `id`             | UUID         | PK                            |
| `farm_id`        | UUID         | FK → `farms.id`               |
| `batch_id`       | UUID         | FK, nullable                  |
| `tank_id`        | UUID         | FK, nullable                  |
| `alert_type`     | VARCHAR(30)  | Loại cảnh báo                 |
| `severity`       | VARCHAR(20)  | `info`, `warning`, `critical` |
| `title`          | VARCHAR(150) | Tiêu đề                       |
| `message`        | TEXT         | Nội dung                      |
| `is_read`        | BOOLEAN      | Đã đọc                        |
| `created_at`     | TIMESTAMP    | Ngày tạo                      |

# 16. `farm_invitations` — Lời mời thành viên

Mục đích: lưu lời mời thành viên mới vào farm và thông tin phân quyền ban đầu khi người dùng tham gia hệ thống.

```sql
farm_invitations (
    id              UUID PRIMARY KEY,
    farm_id         UUID NOT NULL REFERENCES farms(id),
    invited_user_id TEXT NULL REFERENCES users(id),
    invited_by      TEXT NOT NULL REFERENCES users(id),

    email           VARCHAR(150) NOT NULL,

    role            VARCHAR(30) NOT NULL,
    -- owner không được mời
    -- area_manager | technician | warehouse_staff

    area_id         UUID NULL,
    -- dùng nếu nhân viên được mời vào khu vực cụ thể

    token_hash      TEXT NOT NULL,

    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending | accepted | cancelled

    expires_at      TIMESTAMP NOT NULL,
    accepted_at     TIMESTAMP NULL,

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

| Field | Type | Ý nghĩa |
|---|---|---|
| `id` | UUID | PK |
| `farm_id` | UUID | FK → `farms.id`, trang trại gửi lời mời |
| `invited_user_id` | TEXT | FK → `users.id`, nullable sau khi chấp nhận |
| `invited_by` | TEXT | FK → `users.id`, người gửi lời mời |
| `email` | VARCHAR(150) | Email của người được mời |
| `role` | VARCHAR(30) | Vai trò được cấp khi chấp nhận lời mời |
| `area_id` | UUID | Khu vực được phân công, nullable |
| `token_hash` | TEXT | Token lời mời đã được hash |
| `status` | VARCHAR(20) | Trạng thái lời mời |
| `expires_at` | TIMESTAMP | Thời điểm lời mời hết hạn |
| `accepted_at` | TIMESTAMP | Thời điểm chấp nhận, nullable |
| `created_at` | TIMESTAMP | Ngày tạo lời mời |

### Role được phép mời

```text
area_manager
technician
warehouse_staff
```

`owner` không được tạo thông qua lời mời thành viên.

### Trạng thái lời mời

```text
pending     Đang chờ chấp nhận
accepted    Đã chấp nhận
cancelled   Đã hủy
```

> Hết hạn được xác định bằng `expires_at` khi đọc hoặc chấp nhận lời mời; không cần thêm giá trị `expired` vào enum hiện tại. `area_id` là khóa ngoại nullable đến `areas.id`.

---

## 17. `seed_suppliers` — Cơ sở cung cấp giống

Lưu hồ sơ trại sản xuất hoặc đơn vị cung cấp lô tôm giống. Bảng này giúp thay cho việc chỉ ghi tên nhà cung cấp trong một chuỗi `source` tự do.

| Field | Type | Ý nghĩa |
|---|---|---|
| `id` | UUID | PK |
| `farm_id` | UUID | FK → `farms.id` |
| `name` | VARCHAR(150) | Tên cơ sở cung cấp |
| `license_no` | VARCHAR(80) | Số giấy phép/chứng nhận, nullable |
| `phone` | VARCHAR(20) | Số điện thoại, nullable |
| `address` | TEXT | Địa chỉ, nullable |
| `broodstock_information` | TEXT | Thông tin tôm bố mẹ/SPF/SPR nếu có |
| `notes` | TEXT | Ghi chú |
| `created_at` | TIMESTAMP | Ngày tạo |
| `updated_at` | TIMESTAMP | Ngày cập nhật |

## 18. `seed_quality_checks` — Kiểm tra chất lượng lô giống

Mỗi dòng là một lần kiểm tra một lô. Bảng dùng chung cho kiểm tra cảm quan, dị hình, stress test, soi kính hiển vi và xét nghiệm bệnh. Với xét nghiệm PCR, `disease_code` nhận một trong các mã `WSSV`, `TSV`, `YHV`, `IMNV`, `IHHNV`, `AHPND`, `EHP`.

| Field | Type | Ý nghĩa |
|---|---|---|
| `id` | UUID | PK |
| `batch_id` | UUID | FK → `seed_batches.id` |
| `checked_by` | TEXT | FK → `users.id` |
| `check_type` | VARCHAR(30) | `visual`, `deformity`, `salinity_stress`, `formalin_stress`, `microscopy`, `pcr` |
| `disease_code` | VARCHAR(20) | Mã bệnh khi `check_type = pcr`, nullable |
| `sample_size` | INTEGER | Số cá thể mẫu |
| `live_count` | INTEGER | Số cá thể sống sau stress test, nullable |
| `abnormal_count` | INTEGER | Số cá thể dị hình/bất thường, nullable |
| `survival_rate` | DECIMAL | Tỷ lệ sống của mẫu, nullable |
| `deformity_rate` | DECIMAL | Tỷ lệ dị hình, nullable |
| `length_min_mm` | DECIMAL | Chiều dài nhỏ nhất, nullable |
| `length_max_mm` | DECIMAL | Chiều dài lớn nhất, nullable |
| `uniformity_score` | DECIMAL | Điểm đồng đều, nullable |
| `test_method` | VARCHAR(100) | PCR, soi kính hiển vi, cảm quan... |
| `protocol_parameters` | JSONB | Nồng độ, thời gian hoặc thông số protocol, nullable |
| `result` | VARCHAR(20) | `pass`, `warning`, `fail`, `inconclusive` |
| `lab_name` | VARCHAR(150) | Đơn vị xét nghiệm, nullable |
| `evidence_url` | TEXT | Ảnh/phiếu xét nghiệm, nullable |
| `checked_at` | TIMESTAMP | Thời điểm kiểm tra |
| `notes` | TEXT | Ghi chú |
| `created_at` | TIMESTAMP | Ngày tạo |

Các protocol stress test và giá trị đạt nên được cấu hình theo hướng dẫn chuyên môn, không tự động áp dụng nếu chưa được người có chuyên môn xác nhận. QCVN 02-34-1:2021/BNNPTNT là nguồn tham khảo chính cho phạm vi PL và danh mục bệnh; tài liệu được lưu tại [Cổng thông tin văn bản pháp luật](https://vbpl.vn/FileData/TW/Lists/vbpq/Attachments/151252/VanBanGoc_14-2021-TT-0122021-QCtom-su.pdf).

## 19. `batch_quantity_events` — Biến động số lượng lô

Không nên chỉ ghi đè `seed_batches.current_estimated_quantity`. Bảng này lưu các sự kiện làm tăng/giảm số lượng để có thể kiểm tra lại lịch sử.

| Field | Type | Ý nghĩa |
|---|---|---|
| `id` | UUID | PK |
| `batch_id` | UUID | FK → `seed_batches.id` |
| `from_tank_id` | UUID | FK → `ponds_tanks.id`, nullable |
| `to_tank_id` | UUID | FK → `ponds_tanks.id`, nullable |
| `created_by` | TEXT | FK → `users.id` |
| `event_type` | VARCHAR(30) | `stocking`, `mortality`, `sale`, `transfer_in`, `transfer_out`, `adjustment` |
| `quantity` | INTEGER | Số lượng biến động, luôn lớn hơn 0 |
| `occurred_at` | TIMESTAMP | Thời điểm phát sinh |
| `reason` | TEXT | Lý do, bắt buộc với chết/điều chỉnh |
| `reference_type` | VARCHAR(30) | Loại chứng từ liên quan, nullable |
| `reference_id` | UUID | ID chứng từ liên quan, nullable |
| `notes` | TEXT | Ghi chú |
| `created_at` | TIMESTAMP | Ngày tạo |

Backend phải tạo sự kiện và cập nhật số lượng lô trong cùng transaction. Không cho phép số lượng sau biến động âm.

## 20. `growth_sampling_logs` — Lấy mẫu tăng trưởng

Lưu kết quả lấy mẫu định kỳ để tính khối lượng trung bình, sinh khối, kích thước và độ đồng đều.

| Field | Type | Ý nghĩa |
|---|---|---|
| `id` | UUID | PK |
| `batch_id` | UUID | FK → `seed_batches.id` |
| `sampled_by` | TEXT | FK → `users.id` |
| `sampled_at` | TIMESTAMP | Thời điểm lấy mẫu |
| `method` | VARCHAR(20) | `manual`, `ai`, `combined` |
| `sample_count` | INTEGER | Số cá thể trong mẫu |
| `total_sample_weight_g` | DECIMAL | Tổng khối lượng mẫu, nullable |
| `average_weight_g` | DECIMAL | Khối lượng trung bình/con, nullable |
| `average_length_mm` | DECIMAL | Chiều dài trung bình, nullable |
| `length_min_mm` | DECIMAL | Chiều dài nhỏ nhất, nullable |
| `length_max_mm` | DECIMAL | Chiều dài lớn nhất, nullable |
| `estimated_quantity` | INTEGER | Số lượng ước tính tại thời điểm lấy mẫu, nullable |
| `biomass_kg` | DECIMAL | Sinh khối ước tính, nullable |
| `uniformity_score` | DECIMAL | Điểm đồng đều, nullable |
| `notes` | TEXT | Ghi chú |
| `created_at` | TIMESTAMP | Ngày tạo |

## 21. `environment_thresholds` — Ngưỡng môi trường

Lưu cấu hình theo bốn chiều: **loài tôm + giai đoạn + loại ao/bể + thông số**.

| Field | Type | Ý nghĩa |
|---|---|---|
| `id` | UUID | PK |
| `farm_id` | UUID | FK → `farms.id` |
| `species` | VARCHAR(50) | Loài tôm hoặc `all` |
| `development_stage` | VARCHAR(50) | PL12-PL20, PL20-PL30 hoặc `all` |
| `tank_type` | VARCHAR(30) | `nursery_tank`, `pond`, `other`, `all` |
| `parameter_code` | VARCHAR(30) | `temperature`, `ph`, `salinity`, `do`, `nh3`, `tan`, `no2`, `nitrate`, `alkalinity`, `h2s`, `turbidity`, `water_level` |
| `unit` | VARCHAR(20) | Đơn vị đo |
| `optimal_min` | DECIMAL | Cận dưới tối ưu, nullable |
| `optimal_max` | DECIMAL | Cận trên tối ưu, nullable |
| `warning_min` | DECIMAL | Cận cảnh báo dưới, nullable |
| `warning_max` | DECIMAL | Cận cảnh báo trên, nullable |
| `danger_min` | DECIMAL | Cận nguy cấp dưới, nullable |
| `danger_max` | DECIMAL | Cận nguy cấp trên, nullable |
| `source_reference` | TEXT | Nguồn hoặc quyết định chuyên môn |
| `approved_by` | TEXT | FK → `users.id`, nullable |
| `approved_at` | TIMESTAMP | Thời điểm phê duyệt, nullable |
| `effective_from` | DATE | Ngày bắt đầu áp dụng |
| `effective_to` | DATE | Ngày kết thúc, nullable |
| `is_active` | BOOLEAN | Có sử dụng hay không |
| `created_at` | TIMESTAMP | Ngày tạo |
| `updated_at` | TIMESTAMP | Ngày cập nhật |

Giá trị trong bảng là cấu hình tham khảo và phải được kỹ thuật viên/Owner phê duyệt trước khi sinh cảnh báo. Không coi một ngưỡng duy nhất là phù hợp cho mọi loài, mùa vụ và mô hình nuôi.

## 22. `feed_guidelines` — Định mức thức ăn

Lưu định mức theo loài, giai đoạn và loại ao/bể; giúp hệ thống đưa ra lượng khuyến nghị nhưng vẫn cho phép kỹ thuật viên điều chỉnh theo sàng ăn và môi trường.

| Field | Type | Ý nghĩa |
|---|---|---|
| `id` | UUID | PK |
| `farm_id` | UUID | FK → `farms.id` |
| `species` | VARCHAR(50) | Loài tôm |
| `development_stage` | VARCHAR(50) | Giai đoạn |
| `tank_type` | VARCHAR(30) | Loại ao/bể |
| `feeding_rate_min_percent` | DECIMAL | Tỷ lệ thấp nhất theo sinh khối, nullable |
| `feeding_rate_max_percent` | DECIMAL | Tỷ lệ cao nhất theo sinh khối, nullable |
| `feed_per_1000_seed_g` | DECIMAL | Định mức cho 1.000 con, phù hợp PL nhỏ, nullable |
| `meals_per_day` | INTEGER | Số cữ tham khảo |
| `adjustment_notes` | TEXT | Quy tắc điều chỉnh |
| `source_reference` | TEXT | Nguồn hoặc quyết định chuyên môn |
| `approved_by` | TEXT | FK → `users.id`, nullable |
| `approved_at` | TIMESTAMP | Thời điểm phê duyệt, nullable |
| `effective_from` | DATE | Ngày bắt đầu áp dụng |
| `effective_to` | DATE | Ngày kết thúc, nullable |
| `is_active` | BOOLEAN | Có sử dụng hay không |
| `created_at` | TIMESTAMP | Ngày tạo |
| `updated_at` | TIMESTAMP | Ngày cập nhật |

## 23. `price_lists` — Bảng giá con giống

Lưu giá cơ sở theo loài, giai đoạn, chất lượng và khoảng số lượng. Giá thực tế của từng giao dịch vẫn phải được lưu snapshot tại `seed_sales`.

| Field | Type | Ý nghĩa |
|---|---|---|
| `id` | UUID | PK |
| `farm_id` | UUID | FK → `farms.id` |
| `species` | VARCHAR(50) | Loài tôm |
| `development_stage` | VARCHAR(50) | Giai đoạn PL |
| `quality_level` | VARCHAR(30) | Mức chất lượng |
| `base_price_per_thousand` | DECIMAL | Giá cơ sở/1.000 con |
| `quality_surcharge_per_thousand` | DECIMAL | Phụ phí chất lượng, nullable |
| `certificate_surcharge_per_thousand` | DECIMAL | Phụ phí chứng nhận, nullable |
| `min_quantity` | INTEGER | Số lượng tối thiểu áp dụng, nullable |
| `max_quantity` | INTEGER | Số lượng tối đa áp dụng, nullable |
| `valid_from` | DATE | Ngày bắt đầu |
| `valid_to` | DATE | Ngày kết thúc, nullable |
| `is_active` | BOOLEAN | Có sử dụng hay không |
| `notes` | TEXT | Ghi chú |
| `created_at` | TIMESTAMP | Ngày tạo |
| `updated_at` | TIMESTAMP | Ngày cập nhật |

---

## Tổng hợp schema

### 16 bảng nghiệp vụ lõi

| # | Nhóm | Table | Chức năng |            |                          |                                     |
| ------------------- | ---------- | ------------------------ | ----------------------------------- |
| 1                   | Người dùng | `users`                  | Danh tính dùng chung, không chứa role |
| 2                   | Trang trại | `farms`                  | Tenant/trang trại                   |
| 3                   | Thành viên | `farm_invitations`       | Lưu lời mời thành viên vào farm     |
| 4                   | Sản xuất   | `ponds_tanks`            | Ao/bể ương                          |
| 5                   | Sản xuất   | `seed_batches`           | Lô giống                            |
| 6                   | Môi trường | `water_parameter_logs`   | Thông số nước                       |
| 7                   | Chăm sóc   | `feeding_logs`           | Cho ăn                              |
| 8                   | Chăm sóc   | `water_change_logs`      | Thay nước                           |
| 9                   | Chăm sóc   | `treatment_logs`         | Thuốc/chế phẩm                      |
| 10                  | AI         | `ai_inspections`         | Kiểm tra ảnh bằng AI                |
| 11                  | Kho        | `inventory_supplies`     | Danh mục + tồn kho                  |
| 12                  | Kho        | `inventory_transactions` | Nhập/xuất/sử dụng vật tư            |
| 13                  | Tài chính  | `expense_records`        | Chi phí theo lô                     |
| 14                  | Khách hàng | `customers`              | Trại/hộ mua giống                   |
| 15                  | Xuất bán   | `seed_sales`             | Xuất bán con giống                  |
| 16                  | Cảnh báo   | `alerts_notifications`   | Cảnh báo môi trường/AI/kho          |

### 7 bảng mở rộng nghiệp vụ

| # | Nhóm | Table | Chức năng |
|---:|---|---|---|
| 17 | Nguồn giống | `seed_suppliers` | Hồ sơ cơ sở cung cấp giống |
| 18 | Chất lượng | `seed_quality_checks` | Kiểm tra mẫu, stress test, PCR và bằng chứng |
| 19 | Sản xuất | `batch_quantity_events` | Nhật ký biến động số lượng lô |
| 20 | Sản xuất | `growth_sampling_logs` | Lấy mẫu tăng trưởng và sinh khối |
| 21 | Môi trường | `environment_thresholds` | Cấu hình ngưỡng theo loài/giai đoạn/ao-bể |
| 22 | Chăm sóc | `feed_guidelines` | Định mức thức ăn theo giai đoạn |
| 23 | Xuất bán | `price_lists` | Bảng giá và phụ phí theo điều kiện bán |

Các bảng nền tảng phân quyền `areas`, `farm_members`, `access_sessions` và `password_reset_otp_windows` đã được migrate và mô tả ở mục 2.1–2.4. `supply_requests` vẫn là bảng kế hoạch, chỉ cần bổ sung nếu giữ workflow yêu cầu cấp vật tư. Nếu cần truy vết chính xác việc một lô chiếm dụng ao/bể theo thời gian, có thể bổ sung `batch_tank_assignments`.

### Quy tắc phạm vi tenant

- Mọi truy vấn nghiệp vụ phải bắt đầu từ `farm_id` của membership đang hoạt động hoặc suy ra qua quan hệ dữ liệu có `farm_id`.
- `OWNER` chỉ có quyền trong các trang trại mà người đó có membership `role = 'owner'` và `status = 'active'`.
- `AREA_MANAGER` và `TECHNICIAN` chỉ truy cập dữ liệu có `area_id` thuộc membership của mình.
- `WAREHOUSE_STAFF` chỉ thao tác dữ liệu kho của trang trại được phân công.
- Các FK trỏ đến `users` dùng kiểu `TEXT`; các ID của entity nghiệp vụ dùng UUID.
- Với bảng có `farm_id` và đồng thời tham chiếu bản ghi nghiệp vụ khác, Backend phải kiểm tra các bản ghi liên quan cùng thuộc một farm trước khi đọc/ghi; đây là ràng buộc chống truy cập chéo tenant.

## Quy tắc dữ liệu nghiệp vụ từ quy chuẩn

- `species` và `development_stage` phải được lưu nhất quán; MVP ưu tiên `white_leg_shrimp` với PL12 trở lên, sau đó mở rộng `black_tiger_shrimp` với PL15 trở lên.
- `documented_quantity` là số lượng theo chứng từ; `initial_quantity` là số lượng thực tế sau kiểm đếm và là mẫu số của tỷ lệ sống.
- Tỷ lệ dị hình, kết quả stress test và xét nghiệm bệnh phải lưu theo từng lần kiểm tra trong `seed_quality_checks`, không ghi đè vào `seed_batches`.
- Bốn nhật ký chăm sóc (`water_parameter_logs`, `feeding_logs`, `water_change_logs`, `treatment_logs`) vẫn neo theo `tank_id`. `ai_inspections` neo theo `batch_id`; ao/bể được suy ra qua `seed_batches.tank_id`.
- Số lượng, sinh khối, mật độ, tỷ lệ sống và giá vốn là dữ liệu dẫn xuất. Khi cần tái lập báo cáo lịch sử, nên lưu snapshot kết quả trong bản ghi lấy mẫu/giao dịch bán.
- Đơn vị phải rõ ràng: số lượng là `con`, khối lượng là `g` hoặc `kg`, thể tích là `ml` hoặc `m3`, giá bán là VND/1.000 con. Không trộn các đơn vị trong cùng một phép tính.
- Ngưỡng môi trường và định mức thức ăn phải có `source_reference`, thời gian hiệu lực và người phê duyệt. Các giá trị tham khảo không được xem là quy chuẩn áp dụng tự động cho mọi trại.
