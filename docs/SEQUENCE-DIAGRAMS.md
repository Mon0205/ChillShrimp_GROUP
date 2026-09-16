# Sơ đồ Sequence cho 5 use case cấp 2 trọng tâm — ChillShrimp

> Nguồn đặc tả: [USECASE-SPECIFICATION.md](./USECASE-SPECIFICATION.md#7-đặc-tả-chi-tiết-5-use-case-trọng-tâm). Tên endpoint trong các sơ đồ mang tính định hướng; khi hiện thực phải tuân theo router và convention API chính thức của dự án.

> Mỗi khối Mermaid là một sơ đồ Sequence độc lập; khi nhập vào draw.io/VPasCode, chỉ sao chép phần mã bên trong từng khối Mermaid.

Các sơ đồ được tách theo đúng năm mã use case:

1. UC04.2 — CRUD ao hoặc bể
2. UC05.1 — CRUD lô giống
3. UC06.1 — Thực hiện AI Inspection
4. UC08.5 — Xuất bán con giống
5. UC09.1 — Xem Dashboard theo phạm vi quyền

## Thành phần dùng chung

- **Vue/Vuetify UI**: hiển thị form, danh sách, dashboard và validation cơ bản phía client.
- **Express API**: tiếp nhận request, validation nghiệp vụ, điều phối transaction và trả response.
- **AuthZ**: kiểm tra phiên, membership, role, status và area_id tại farm đang chọn.
- **Prisma/PostgreSQL**: truy vấn, khóa bản ghi và bảo đảm tính nguyên tử dữ liệu.
- **Object Storage**: lưu ảnh gốc và ảnh chú thích của AI Inspection.
- **AI Service**: phân tích ảnh, trả detection, bounding box, confidence và model version.

> **Bố cục mô phỏng mẫu báo cáo:** actor ở bên trái, tiếp theo là giao diện, API, AuthZ, cơ sở dữ liệu và dịch vụ phụ trợ. Mũi tên đi từ trên xuống dưới; các nhánh alt thể hiện điều kiện thành công, lỗi và xử lý thay thế.

---

## 1. UC04.2 — CRUD ao hoặc bể

```mermaid
sequenceDiagram
    autonumber
    actor U as "Owner / Area Manager / Technician"
    participant FE as "Vue/Vuetify UI"
    participant API as "Express API"
    participant AUTH as "AuthZ"
    participant DB as "Prisma/PostgreSQL"

    U->>FE: Mở Quản lý ao/bể và chọn farm
    FE->>API: GET /farms/{farmId}/ponds-tanks
    API->>AUTH: Kiểm tra session, membership và phạm vi
    AUTH->>DB: Đọc access_sessions và farm_members

    alt Session không hợp lệ hoặc membership không active
        DB-->>AUTH: Không có quyền hợp lệ
        AUTH-->>API: Deny
        API-->>FE: 401/403
        FE-->>U: Hiển thị lỗi, không hiển thị dữ liệu farm
    else Được phép truy cập
        DB-->>AUTH: role, status, area_id
        AUTH-->>API: Scope toàn farm hoặc theo khu vực
        API->>DB: SELECT ponds_tanks theo farm_id và area_id
        DB-->>API: Danh sách ao/bể
        API-->>FE: 200 danh sách
        FE-->>U: Hiển thị danh sách và thao tác được phép

        alt Xem hoặc tìm kiếm
            U->>FE: Nhập từ khóa/bộ lọc
            FE->>API: GET /ponds-tanks?search=&status=&type=
            API->>AUTH: Kiểm tra lại scope
            AUTH-->>API: Cho phép đọc
            API->>DB: Lọc theo mã, tên, loại, status và khu vực
            DB-->>API: Kết quả đã lọc
            API-->>FE: Danh sách/chi tiết
        else Thêm hoặc cập nhật
            U->>FE: Nhập mã, tên, loại, khu vực, thể tích, mô tả
            FE->>API: POST hoặc PATCH /ponds-tanks
            API->>AUTH: Kiểm tra quyền ghi
            AUTH-->>API: Owner hoặc Area Manager đúng khu vực
            API->>DB: Kiểm tra mã duy nhất, farm và area_id
            alt Thiếu dữ liệu, thể tích không hợp lệ hoặc mã trùng
                DB-->>API: Validation conflict
                API-->>FE: 400/403/409
                FE-->>U: Hiển thị lỗi trên biểu mẫu
            else Hợp lệ
                API->>DB: INSERT/UPDATE ponds_tanks
                DB-->>API: Bản ghi ao/bể mới
                API-->>FE: 201/200 dữ liệu mới
                FE-->>U: Thông báo lưu thành công
            end
        else Xóa ao/bể
            U->>FE: Chọn xóa và xác nhận
            FE->>API: DELETE /ponds-tanks/{tankId}
            API->>AUTH: Kiểm tra quyền ghi và ownership của farm
            API->>DB: Kiểm tra lô hoạt động và dữ liệu lịch sử
            alt Còn lô hoạt động hoặc cần giữ lịch sử
                DB-->>API: Không được xóa cứng
                API-->>FE: 409 hoặc yêu cầu xóa mềm
                FE-->>U: Thông báo bảo toàn lịch sử
            else Có thể xóa mềm
                API->>DB: UPDATE status = inactive hoặc deleted_at
                DB-->>API: Đã cập nhật
                API-->>FE: 200 kết quả
                FE-->>U: Danh sách được làm mới
            end
        end
    end
```

**Kết quả:** dữ liệu ao/bể chỉ được tạo, đọc, cập nhật hoặc xóa mềm trong đúng farm và phạm vi khu vực. Việc chuyển trạng thái vận hành của ao/bể là UC04.3.

---

## 2. UC05.1 — CRUD lô giống

```mermaid
sequenceDiagram
    autonumber
    actor U as "Owner / Area Manager / Technician"
    participant FE as "Vue/Vuetify UI"
    participant API as "Express API"
    participant AUTH as "AuthZ"
    participant DB as "Prisma/PostgreSQL"

    U->>FE: Chọn farm, ao/bể và mở Quản lý lô giống
    FE->>API: GET /farms/{farmId}/seed-batches
    API->>AUTH: Kiểm tra session, membership, role và area_id
    AUTH->>DB: Đọc access_sessions, farm_members và areas

    alt Không có quyền hoặc ngoài khu vực
        DB-->>AUTH: Scope không hợp lệ
        AUTH-->>API: Deny
        API-->>FE: 401/403
        FE-->>U: Hiển thị lỗi
    else Được phép
        AUTH-->>API: Scope hợp lệ
        API->>DB: Đọc seed_batches theo farm, tank và status
        DB-->>API: Danh sách lô
        API-->>FE: Danh sách lô giống

        alt Xem chi tiết
            U->>FE: Chọn một lô
            FE->>API: GET /seed-batches/{batchId}
            API->>AUTH: Kiểm tra lại phạm vi lô
            API->>DB: Đọc seed_batches, quality checks, quantity events và samples
            DB-->>API: Hồ sơ và lịch sử lô
            API-->>FE: Chi tiết lô
        else Tạo lô mới
            U->>FE: Nhập mã lô, loài, PL, nhà cung cấp, số lượng và ngày nhận
            FE->>API: POST /seed-batches
            API->>AUTH: Kiểm tra quyền tạo
            AUTH-->>API: Owner hoặc Area Manager, Technician theo quyền được cấp
            API->>DB: Transaction khóa ao/bể và kiểm tra trạng thái
            API->>DB: Kiểm tra ao/bể cùng farm chưa có lô active
            alt Ao/bể không sẵn sàng hoặc mã lô trùng
                DB-->>API: Conflict
                API-->>FE: 400/409
                FE-->>U: Yêu cầu chọn ao/bể hoặc mã khác
            else Dữ liệu hợp lệ
                API->>DB: INSERT seed_batches
                API->>DB: INSERT batch_quantity_events loại initial
                opt Có hồ sơ kiểm dịch/chất lượng
                    API->>DB: INSERT seed_quality_checks
                end
                API->>DB: Commit transaction
                DB-->>API: Lô và số lượng ban đầu
                API-->>FE: 201 lô giống
                FE-->>U: Thông báo tạo thành công
            end
        else Cập nhật lô
            U->>FE: Sửa các trường được phép
            FE->>API: PATCH /seed-batches/{batchId}
            API->>AUTH: Kiểm tra role, farm và area_id
            AUTH-->>API: Cho phép hoặc từ chối trường dữ liệu
            API->>DB: Kiểm tra lô chưa kết thúc và validate dữ liệu
            alt Lô đã sold/failed/cancelled hoặc actor ngoài phạm vi
                DB-->>API: Không thể cập nhật
                API-->>FE: 403/409
                FE-->>U: Hiển thị lý do
            else Hợp lệ
                API->>DB: UPDATE các trường được phép
                DB-->>API: Hồ sơ lô mới
                API-->>FE: 200 dữ liệu cập nhật
                FE-->>U: Làm mới chi tiết lô
            end
        else Yêu cầu xóa lô
            U->>FE: Yêu cầu xóa lô đã có lịch sử
            FE->>API: DELETE /seed-batches/{batchId}
            API->>AUTH: Kiểm tra quyền và phạm vi lô
            AUTH-->>API: Cho phép kiểm tra lịch sử
            API->>DB: Kiểm tra lịch sử số lượng, chất lượng, mẫu và giao dịch
            DB-->>API: Quan hệ cần bảo toàn
            API->>DB: Không xóa cứng; chuyển UC05.2 hoặc lưu dấu vết hủy
            DB-->>API: Trạng thái xử lý mới
            API-->>FE: 200/409 kết quả xử lý
            FE-->>U: Thông báo không xóa cứng dữ liệu lịch sử
        end
    end
```

**Kết quả:** lô mới và sự kiện số lượng ban đầu được ghi nguyên tử; các thay đổi sau đó không ghi đè lịch sử. Yêu cầu xóa được xử lý theo hướng bảo toàn dữ liệu và chuyển trạng thái qua UC05.2. Nhật ký chăm sóc thuộc UC05.3–UC05.6.

---

## 3. UC06.1 — Thực hiện AI Inspection

```mermaid
sequenceDiagram
    autonumber
    actor U as "Owner / Area Manager / Technician"
    participant FE as "Vue/Vuetify UI"
    participant API as "Express API"
    participant AUTH as "AuthZ"
    participant STORE as "Object Storage"
    participant DB as "Prisma/PostgreSQL"
    participant AI as "AI Service"

    U->>FE: Mở chi tiết lô và chọn AI Inspection
    FE->>API: GET /seed-batches/{batchId}/inspection-context
    API->>AUTH: Kiểm tra session, membership, khu vực và lô
    AUTH->>DB: Đọc farm_members và seed_batches

    alt Không có quyền hoặc lô không tồn tại
        AUTH-->>API: Deny
        API-->>FE: 403/404
        FE-->>U: Hiển thị lỗi
    else Được phép
        AUTH-->>API: Cho phép thực hiện
        API-->>FE: Thông tin lô và form lấy mẫu
        U->>FE: Chụp/tải ảnh, nhập phương pháp và thể tích mẫu
        FE->>API: POST /seed-batches/{batchId}/ai-inspections
        API->>API: Validate định dạng, kích thước và dung lượng ảnh

        alt Ảnh không hợp lệ
            API-->>FE: 400
            FE-->>U: Yêu cầu chọn ảnh hợp lệ
        else Ảnh hợp lệ
            API->>STORE: Lưu ảnh gốc
            STORE-->>API: media_url
            API->>DB: INSERT ai_inspections status = pending
            opt Lấy mẫu tăng trưởng
                API->>DB: INSERT growth_sampling_logs liên kết batch_id
            end
            API-->>FE: 202 inspection_id, status = pending
            FE-->>U: Hiển thị đang xử lý

            API->>DB: UPDATE status = processing
            API->>AI: Gửi ảnh và metadata lấy mẫu
            alt AI timeout hoặc response không hợp lệ
                AI-->>API: Timeout/error
                API->>DB: UPDATE status = failed, lưu lỗi
                API-->>FE: 502 hoặc trạng thái failed
                FE-->>U: Thông báo có thể thử lại
                opt Người dùng chọn thử lại
                    U->>FE: Chọn thử lại
                    FE->>API: POST /ai-inspections/{inspectionId}/retry
                    API->>DB: Tạo inspection mới status = pending và giữ lịch sử lỗi
                    API-->>FE: 202 inspection_id mới
                    FE-->>U: Hiển thị yêu cầu mới đang xử lý
                end
            else AI trả kết quả hợp lệ
                AI-->>API: detections, boxes, confidence, model_version
                API->>API: Tính detected_count và average_confidence
                alt Có sample_volume_ml > 0
                    API->>API: Tính density_per_ml = effective_count / sample_volume_ml
                else Thiếu thể tích mẫu
                    API->>API: Đặt density_per_ml = NULL
                end
                API->>STORE: Lưu annotated image
                STORE-->>API: annotated_image_url
                API->>DB: UPDATE kết quả, model_version, status = completed
                opt Confidence thấp hoặc dấu hiệu cần chú ý
                    API->>DB: INSERT alerts_notifications liên kết batch_id
                end
                DB-->>API: Inspection đã commit
                API-->>FE: Kết quả detection/confidence/mật độ
                FE-->>U: Hiển thị ảnh gốc, ảnh chú thích và kết quả

                opt Người dùng hiệu chỉnh thủ công
                    U->>FE: Nhập manual_count hoặc correction_factor
                    FE->>API: PATCH /ai-inspections/{inspectionId}/correction
                    API->>AUTH: Kiểm tra quyền trên lô
                    API->>DB: Lưu hiệu chỉnh riêng, giữ kết quả AI gốc
                    DB-->>API: Kết quả hiệu chỉnh
                    API-->>FE: 200
                    FE-->>U: Hiển thị kết quả đã hiệu chỉnh
                end
            end
        end
    end
```

**Kết quả:** bản ghi ai_inspections luôn có trạng thái rõ ràng pending, processing, completed hoặc failed. AI chỉ hỗ trợ đếm/đánh giá mẫu; không tự chẩn đoán bệnh hay thay thế đánh giá chuyên môn.

---

## 4. UC08.5 — Xuất bán con giống

```mermaid
sequenceDiagram
    autonumber
    actor O as "Owner"
    participant FE as "Vue/Vuetify UI"
    participant API as "Express API"
    participant AUTH as "AuthZ"
    participant DB as "Prisma/PostgreSQL"

    O->>FE: Mở chức năng Xuất bán con giống
    FE->>API: GET /farms/{farmId}/seed-sales/form-data
    API->>AUTH: Kiểm tra session, membership và role OWNER
    AUTH->>DB: Đọc farm_members

    alt Không phải Owner hoặc membership không active
        AUTH-->>API: Deny
        API-->>FE: 403
        FE-->>O: Không cho mở chức năng
    else Được phép
        AUTH-->>API: Owner toàn farm
        API->>DB: Đọc customers, price_lists và seed_batches ready_for_sale
        DB-->>API: Dữ liệu cùng farm
        API-->>FE: Khách hàng, bảng giá và lô đủ điều kiện
        O->>FE: Chọn khách hàng và lô giống
        FE->>API: GET /seed-batches/{batchId}/sale-context
        API->>AUTH: Kiểm tra batch và customer cùng farm
        API->>DB: Đọc số lượng, chất lượng và giá áp dụng
        DB-->>API: Sale context
        API-->>FE: Số lượng hiện tại và đơn giá

        alt Có bảng giá phù hợp
            FE-->>O: Hiển thị price_list_id và đơn giá đề xuất
        else Không có bảng giá phù hợp
            FE-->>O: Cho phép nhập đơn giá thủ công
        end
        O->>FE: Nhập quantity_sold, giá cơ sở, phụ phí, phí vận chuyển và chiết khấu
        FE->>FE: Tính price_per_thousand = giá cơ sở + phụ phí
        FE->>FE: Tính gross_revenue = quantity_sold / 1000 × price_per_thousand
        FE->>FE: Tính total_revenue = gross_revenue + transport_fee - discount_amount
        FE-->>O: Hiển thị doanh thu tạm tính
        O->>FE: Xác nhận giao dịch
        FE->>API: POST /seed-sales
        API->>AUTH: Kiểm tra lại quyền Owner
        API->>DB: Validate farm, trạng thái lô, price_list_id, giá snapshot và số lượng

        alt Dữ liệu không hợp lệ hoặc không đủ số lượng
            DB-->>API: Validation/conflict
            API-->>FE: 400/403/409
            FE-->>O: Yêu cầu sửa hoặc tải lại dữ liệu
        else Dữ liệu hợp lệ
            API->>DB: BEGIN transaction và khóa seed_batches
            API->>DB: Kiểm tra lại current_estimated_quantity
            alt Giao dịch đồng thời làm thiếu số lượng
                DB-->>API: Conflict trong transaction
                API->>DB: ROLLBACK
                API-->>FE: 409
                FE-->>O: Yêu cầu tải lại lô
            else Đủ số lượng
                API->>DB: INSERT seed_sales với price_list_id và toàn bộ giá snapshot
                API->>DB: INSERT batch_quantity_events loại sale
                API->>DB: UPDATE số lượng hiện tại của lô
                alt Số lượng còn lại bằng 0
                    API->>DB: UPDATE seed_batches status = sold
                else Còn số lượng
                    API->>DB: Giữ status = ready_for_sale
                end
                API->>DB: COMMIT transaction
                DB-->>API: Giao dịch và số lượng còn lại
                API-->>FE: 201 thông tin bán
                FE-->>O: Thông báo xuất bán thành công
            end
        end
    end
```

**Kết quả:** giao dịch bán, sự kiện giảm số lượng và trạng thái lô được ghi trong cùng transaction, tránh bán vượt tồn lượng khi có nhiều request đồng thời.

---

## 5. UC09.1 — Xem Dashboard theo phạm vi quyền

```mermaid
sequenceDiagram
    autonumber
    actor U as "Owner / Area Manager / Technician / Warehouse Staff"
    participant FE as "Vue/Vuetify UI"
    participant API as "Express API"
    participant AUTH as "AuthZ"
    participant DB as "Prisma/PostgreSQL"

    U->>FE: Chọn farm và mở Dashboard
    FE->>API: GET /farms/{farmId}/dashboard
    API->>AUTH: Kiểm tra session, membership, role và area_id
    AUTH->>DB: Đọc access_sessions và farm_members

    alt Farm không hợp lệ hoặc membership bị suspended
        DB-->>AUTH: Không có scope hợp lệ
        AUTH-->>API: Deny
        API-->>FE: 401/403
        FE-->>U: Xóa dữ liệu dashboard cũ và hiển thị lỗi
    else Được phép
        AUTH-->>API: Scope của role
        U->>FE: Chọn khoảng thời gian, khu vực hoặc loại KPI
        FE->>API: GET /dashboard?from=&to=&area_id=&metrics=
        API->>API: Validate bộ lọc và timezone

        alt Bộ lọc không hợp lệ
            API-->>FE: 400
            FE-->>U: Yêu cầu chọn lại khoảng thời gian/bộ lọc
        else Bộ lọc hợp lệ
            alt Owner
                API->>DB: Truy vấn và tổng hợp toàn farm: vận hành, kho, cảnh báo, chi phí, doanh thu
            else Area Manager hoặc Technician
                API->>DB: Truy vấn và tổng hợp các bản ghi thuộc area_id được giao
            else Warehouse Staff
                API->>DB: Truy vấn và tổng hợp vật tư, tồn kho và cảnh báo kho
            end
            DB-->>API: Dữ liệu nguồn và kết quả tổng hợp
            API->>API: Tính KPI, biểu đồ và last_updated
            alt Không có dữ liệu
                API-->>FE: KPI rỗng/0 và trạng thái empty
                FE-->>U: Hiển thị dashboard không có dữ liệu
            else Có dữ liệu
                API-->>FE: KPI, biểu đồ và last_updated
                FE-->>U: Hiển thị Dashboard theo phạm vi quyền
            end

            opt Người dùng chọn một KPI hoặc biểu đồ
                U->>FE: Yêu cầu xem chi tiết
                FE->>API: GET /dashboard/details?metric=&filters=
                API->>AUTH: Kiểm tra lại scope cho request chi tiết
                AUTH-->>API: Cho phép hoặc từ chối
                API->>DB: Truy vấn bản ghi nguồn trong cùng scope
                DB-->>API: Danh sách chi tiết
                API-->>FE: Dữ liệu truy ngược
                FE-->>U: Hiển thị chi tiết KPI
            end
        end
    end
```

**Kết quả:** dashboard không làm thay đổi dữ liệu nghiệp vụ và không thể hiển thị dữ liệu chéo farm. Mỗi request, kể cả request xem chi tiết KPI, đều phải kiểm tra lại phạm vi quyền.

---

## Phạm vi không đưa vào 5 sơ đồ này

- UC04.1, UC04.3: thông tin farm và trạng thái ao/bể.
- UC05.2–UC05.6: trạng thái lô, môi trường nước, cho ăn, thay nước và thuốc/chế phẩm.
- UC06.2: xem lịch sử AI Inspection.
- UC08.1–UC08.4, UC08.6: chi phí, khách hàng và doanh thu.
- UC09.2–UC09.4: cảnh báo toàn trại, theo khu vực và cảnh báo tồn kho.

Việc tách phạm vi giúp mỗi Sequence Diagram có một mục tiêu nghiệp vụ rõ ràng, ánh xạ được tới actor, API, AuthZ, Prisma/Database và dịch vụ phụ trợ tương ứng.
