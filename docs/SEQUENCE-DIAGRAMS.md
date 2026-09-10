# Sơ đồ Sequence cho 5 use case trọng tâm — ChillShrimp

> Nguồn đặc tả: [USECASE-SPECIFICATION.md](./USECASE-SPECIFICATION.md#7-đặc-tả-chuyên-sâu-5-use-case-trọng-tâm). Tên endpoint trong sơ đồ mang tính định hướng; khi hiện thực phải tuân theo router và convention API chính thức của dự án.

## Thành phần dùng chung

- **Vue/Vuetify UI**: giao diện web và validation cơ bản phía client.
- **Express API**: điều phối use case, validation nghiệp vụ và transaction.
- **AuthZ**: kiểm tra phiên, `farm_members.status`, role và `area_id` tại farm đang chọn.
- **Prisma/PostgreSQL**: truy vấn và bảo đảm tính nguyên tử dữ liệu.
- **Storage/AI Service/Alert Worker**: thành phần chuyên biệt chỉ xuất hiện khi use case cần.

---

## 1. UC04 — Quản lý trang trại

```mermaid
sequenceDiagram
    autonumber
    actor U as Người dùng
    participant FE as Vue/Vuetify UI
    participant API as Express API
    participant AUTH as AuthZ
    participant DB as Prisma/PostgreSQL

    U->>FE: Chọn farm và mở Quản lý trang trại
    FE->>API: GET dữ liệu farm, khu vực và ao/bể
    API->>AUTH: Kiểm tra phiên và quyền tại farm
    AUTH->>DB: Đọc access_sessions và farm_members

    alt Phiên không hợp lệ hoặc membership không active
        DB-->>AUTH: Không có quyền hợp lệ
        AUTH-->>API: Từ chối
        API-->>FE: HTTP 401 hoặc 403
        FE-->>U: Hiển thị lỗi và xóa dữ liệu không còn quyền
    else Được phép truy cập
        DB-->>AUTH: role, status, area_id
        AUTH-->>API: Phạm vi farm hoặc khu vực
        API->>DB: Đọc farms, areas, ponds_tanks và lô hiện tại
        DB-->>API: Dữ liệu đã lọc theo tenant và khu vực
        API-->>FE: Hồ sơ farm và danh sách ao/bể
        FE-->>U: Hiển thị màn hình quản lý

        alt Cập nhật thông tin farm
            U->>FE: Sửa code, tên hoặc địa chỉ
            FE->>API: PATCH farm
            API->>AUTH: Yêu cầu quyền OWNER
            alt Không phải OWNER
                AUTH-->>API: Từ chối
                API-->>FE: HTTP 403
            else Là OWNER
                API->>DB: Kiểm tra code duy nhất
                alt Dữ liệu sai hoặc code trùng
                    DB-->>API: Vi phạm validation/unique
                    API-->>FE: HTTP 400 hoặc 409
                else Hợp lệ
                    API->>DB: UPDATE farms
                    DB-->>API: Farm đã cập nhật
                    API-->>FE: HTTP 200 và dữ liệu mới
                end
            end
        else Tạo hoặc cập nhật ao/bể
            U->>FE: Nhập thông tin ao/bể
            FE->>API: POST hoặc PATCH ao/bể
            API->>AUTH: Yêu cầu OWNER hoặc AREA_MANAGER đúng khu vực
            alt Sai role hoặc ngoài khu vực
                AUTH-->>API: Từ chối
                API-->>FE: HTTP 403
            else Được phép ghi
                AUTH-->>API: Scope hợp lệ
                API->>DB: Kiểm tra area cùng farm, code và volume_m3
                alt Sai tenant hoặc dữ liệu không hợp lệ
                    DB-->>API: Lỗi kiểm tra
                    API-->>FE: HTTP 400 hoặc 409
                else Hợp lệ
                    API->>DB: BEGIN
                    API->>DB: INSERT hoặc UPDATE ponds_tanks
                    Note over API,DB: Ao/bể mới mặc định status = empty
                    API->>DB: COMMIT
                    DB-->>API: Ao/bể đã lưu
                    API-->>FE: HTTP 200 hoặc 201
                end
            end
        else Cập nhật trạng thái ao/bể
            U->>FE: Chọn trạng thái mới
            FE->>API: PATCH trạng thái ao/bể
            API->>AUTH: Kiểm tra quyền và khu vực
            alt Sai role hoặc ngoài khu vực
                AUTH-->>API: Từ chối
                API-->>FE: HTTP 403
            else Được phép đổi trạng thái
                AUTH-->>API: Scope hợp lệ
                API->>DB: Khóa ao/bể và đọc lô đang chiếm dụng
                alt Chuyển trạng thái sai hoặc còn lô hoạt động cản trở
                    DB-->>API: Không thỏa quy tắc
                    API-->>FE: HTTP 409
                    FE-->>U: Yêu cầu kết thúc hoặc chuyển lô trước
                else Chuyển trạng thái hợp lệ
                    API->>DB: UPDATE ponds_tanks.status
                    DB-->>API: Trạng thái mới
                    API-->>FE: HTTP 200
                end
            end
        else Chỉ xem hoặc lọc dữ liệu
            U->>FE: Nhập điều kiện tìm kiếm
            FE->>API: GET ao/bể kèm bộ lọc
            API->>DB: SELECT trong scope đã cấp
            DB-->>API: Danh sách phù hợp
            API-->>FE: HTTP 200
        end

        FE-->>U: Hiển thị kết quả cuối
    end
```

---

## 2. UC05 — Quản lý lô giống và chăm sóc

```mermaid
sequenceDiagram
    autonumber
    actor U as Owner, Area Manager hoặc Technician
    participant FE as Vue/Vuetify UI
    participant API as Express API
    participant AUTH as AuthZ
    participant DB as Prisma/PostgreSQL
    participant JOB as Alert Worker

    U->>FE: Chọn farm, khu vực và ao/bể
    FE->>API: GET ao/bể và lô hiện tại
    API->>AUTH: Kiểm tra phiên, membership và area scope
    AUTH->>DB: Đọc farm_members

    alt Không có quyền hợp lệ
        DB-->>AUTH: Membership thiếu, suspended hoặc sai khu vực
        AUTH-->>API: Từ chối
        API-->>FE: HTTP 403
        FE-->>U: Hiển thị lỗi truy cập
    else Có quyền
        DB-->>AUTH: role và area_id hợp lệ
        AUTH-->>API: Cho phép trong scope
        API->>DB: Đọc ponds_tanks và seed_batches hiện tại
        DB-->>API: Trạng thái ao/bể và lô
        API-->>FE: Dữ liệu vận hành

        opt Tạo lô giống mới
            U->>FE: Nhập nguồn giống, mã lô, PL, số lượng và ngày
            FE->>API: POST seed batch
            API->>AUTH: Kiểm tra quyền tạo lô
            alt Không phải OWNER/AREA_MANAGER hoặc ngoài khu vực
                AUTH-->>API: Từ chối
                API-->>FE: HTTP 403
            else Được phép tạo lô
                AUTH-->>API: Scope hợp lệ
                API->>DB: BEGIN và khóa ao/bể
                API->>DB: Kiểm tra ao/bể empty và không có lô chiếm dụng
                alt Ao/bể không sẵn sàng hoặc dữ liệu lô sai
                    DB-->>API: Vi phạm trạng thái, unique hoặc validation
                    API->>DB: ROLLBACK
                    API-->>FE: HTTP 400 hoặc 409
                else Dữ liệu hợp lệ
                    API->>DB: INSERT seed_batches
                    API->>DB: INSERT batch_quantity_events loại stocking
                    API->>DB: UPDATE ponds_tanks status = active
                    API->>DB: COMMIT
                    DB-->>API: Lô active đã tạo
                    API-->>FE: HTTP 201 và hồ sơ lô
                end
            end
        end

        loop Khi có lô active, mỗi lần ghi nhận chăm sóc
            U->>FE: Chọn môi trường, cho ăn, thay nước hoặc xử lý
            FE->>API: GET cấu hình và vật tư áp dụng
            API->>DB: Đọc lô, ngưỡng, định mức và tồn kho trong scope
            DB-->>API: Dữ liệu tham chiếu
            API-->>FE: Form và dữ liệu gợi ý
            U->>FE: Nhập số liệu thực tế và xác nhận
            FE->>API: POST nhật ký tương ứng
            API->>AUTH: Kiểm tra quyền theo farm và khu vực
            alt Sai role hoặc ngoài khu vực
                AUTH-->>API: Từ chối
                API-->>FE: HTTP 403
            else Được phép ghi nhật ký
                AUTH-->>API: Scope hợp lệ
                API->>API: Validate miền giá trị, đơn vị và thời gian

                alt Dữ liệu không hợp lệ
                    API-->>FE: HTTP 400 và lỗi theo trường
                else Có liên kết supply_id
                    API->>DB: BEGIN và khóa inventory_supplies
                    API->>DB: Kiểm tra số lượng tồn
                    alt Tồn kho không đủ
                        DB-->>API: Không đủ tồn
                        API->>DB: ROLLBACK
                        API-->>FE: HTTP 409
                    else Tồn kho đủ
                        API->>DB: INSERT nhật ký theo tank_id
                        API->>DB: INSERT inventory_transactions loại usage
                        API->>DB: UPDATE số lượng tồn
                        API->>DB: COMMIT
                        API-->>FE: HTTP 201
                    end
                else Không liên kết kho
                    API->>DB: INSERT nhật ký theo tank_id
                    DB-->>API: Nhật ký đã lưu
                    API-->>FE: HTTP 201
                end

                opt Nhật ký đã lưu và thông số vượt ngưỡng đã phê duyệt
                    API-->>JOB: Phát sự kiện cần tạo cảnh báo
                    JOB->>DB: Kiểm tra trùng và INSERT alerts_notifications
                end
            end
        end

        opt Lấy mẫu hoặc cập nhật biến động số lượng
            U->>FE: Nhập dữ liệu mẫu hoặc sự kiện số lượng
            FE->>API: POST growth sample hoặc quantity event
            API->>DB: BEGIN và khóa seed_batches
            API->>API: Tính số lượng mới, tỷ lệ sống, mật độ và sinh khối
            alt Dữ liệu sai hoặc số lượng mới âm
                API->>DB: ROLLBACK
                API-->>FE: HTTP 400 hoặc 409
            else Hợp lệ
                API->>DB: INSERT sự kiện hoặc mẫu tăng trưởng
                API->>DB: UPDATE current_estimated_quantity khi cần
                API->>DB: COMMIT
                API-->>FE: Chỉ số mới của lô
            end
        end

        opt Cập nhật trạng thái lô
            U->>FE: Chọn trạng thái mới
            FE->>API: PATCH seed batch status
            API->>AUTH: Kiểm tra role được phép
            AUTH-->>API: Kết quả
            API->>DB: Kiểm tra state transition
            alt Không hợp lệ
                API-->>FE: HTTP 403 hoặc 409
            else Hợp lệ
                API->>DB: UPDATE seed_batches và đồng bộ ponds_tanks
                DB-->>API: Hồ sơ lô mới
                API-->>FE: HTTP 200
            end
        end

        FE-->>U: Hiển thị hồ sơ và lịch sử chăm sóc đã cập nhật
    end
```

---

## 3. UC06 — Kiểm tra và phân tích AI

```mermaid
sequenceDiagram
    autonumber
    actor U as Owner, Area Manager hoặc Technician
    participant FE as Vue/Vuetify UI
    participant API as Express API
    participant AUTH as AuthZ
    participant DB as Prisma/PostgreSQL
    participant STO as Object Storage
    participant AI as AI Service
    participant JOB as Alert Worker

    U->>FE: Chọn lô và mở Kiểm tra bằng AI
    FE->>API: GET metadata kiểm tra của lô
    API->>AUTH: Kiểm tra phiên, membership và area scope
    AUTH->>DB: Đọc membership, lô và ao/bể liên quan

    alt Không có quyền hoặc trạng thái lô không cho phép
        DB-->>AUTH: Không hợp lệ
        AUTH-->>API: Từ chối
        API-->>FE: HTTP 403 hoặc 409
        FE-->>U: Hiển thị lý do không thể kiểm tra
    else Được phép kiểm tra
        DB-->>AUTH: Scope hợp lệ
        AUTH-->>API: Cho phép
        API-->>FE: Metadata và yêu cầu lấy mẫu
        U->>FE: Chụp/tải ảnh, nhập phương pháp và thể tích mẫu
        FE->>API: POST ảnh và metadata inspection
        API->>API: Kiểm tra MIME, dung lượng, kích thước và metadata

        alt Ảnh hoặc metadata không hợp lệ
            API-->>FE: HTTP 400 và lỗi theo trường
        else Dữ liệu hợp lệ
            API->>STO: Upload ảnh gốc
            alt Storage thất bại
                STO-->>API: Lỗi upload
                API-->>FE: Lỗi có thể thử lại
            else Upload thành công
                STO-->>API: media_url
                API->>DB: INSERT ai_inspections status = pending
                DB-->>API: inspection_id
                API->>DB: UPDATE status = processing
                API->>AI: Gửi media_url, metadata và request ID

                alt AI timeout hoặc trả lỗi
                    AI-->>API: Timeout hoặc error
                    API->>DB: UPDATE status = failed và mã lỗi an toàn
                    API-->>FE: Inspection failed, cho phép retry
                else AI trả kết quả
                    AI-->>API: Detections, confidence và model_version
                    API->>API: Validate response và tính các chỉ số
                    alt Response không hợp lệ
                        API->>DB: UPDATE status = failed
                        API-->>FE: Kết quả AI không hợp lệ
                    else Response hợp lệ
                        API->>STO: Lưu ảnh annotated nếu có
                        STO-->>API: annotated_image_url
                        API->>DB: UPDATE kết quả gốc và status = completed
                        DB-->>API: Inspection hoàn tất

                        opt Confidence thấp hoặc dấu hiệu bất thường
                            API-->>JOB: Phát sự kiện cảnh báo AI
                            JOB->>DB: Kiểm tra trùng và INSERT cảnh báo
                        end

                        API-->>FE: Ảnh gốc, ảnh annotated và chỉ số AI
                        FE-->>U: Hiển thị kết quả kèm giới hạn chuyên môn

                        opt Người dùng xác nhận hoặc hiệu chỉnh
                            U->>FE: Nhập manual_count hoặc correction_factor
                            FE->>API: PATCH hiệu chỉnh inspection
                            API->>AUTH: Kiểm tra quyền với batch_id
                            AUTH-->>API: Cho phép
                            API->>DB: Lưu hiệu chỉnh, giữ nguyên kết quả AI gốc
                            DB-->>API: Kết quả hiệu lực mới
                            API-->>FE: HTTP 200
                            FE-->>U: Hiển thị kết quả đã xác nhận
                        end
                    end
                end
            end
        end
    end
```

---

## 4. UC08 — Quản lý tài chính và bán giống

```mermaid
sequenceDiagram
    autonumber
    actor U as Người dùng
    participant FE as Vue/Vuetify UI
    participant API as Express API
    participant AUTH as AuthZ
    participant DB as Prisma/PostgreSQL

    U->>FE: Chọn farm và mở Tài chính - bán giống
    FE->>API: GET dữ liệu tài chính theo kỳ mặc định
    API->>AUTH: Kiểm tra phiên, membership, role và area scope
    AUTH->>DB: Đọc farm_members

    alt Membership không active
        DB-->>AUTH: Không có quyền
        AUTH-->>API: Từ chối
        API-->>FE: HTTP 403
        FE-->>U: Hiển thị lỗi truy cập
    else Membership hợp lệ
        DB-->>AUTH: role và area_id
        AUTH-->>API: Phạm vi được phép

        alt Ghi nhận chi phí
            U->>FE: Nhập loại, số tiền, ngày và lô nếu có
            FE->>API: POST expense record
            API->>AUTH: Yêu cầu OWNER hoặc TECHNICIAN đúng khu vực
            alt Sai role hoặc ngoài khu vực
                AUTH-->>API: Từ chối
                API-->>FE: HTTP 403
            else Được phép ghi chi phí
                AUTH-->>API: Scope hợp lệ
                API->>DB: Kiểm tra batch cùng farm và khu vực
                alt Dữ liệu không hợp lệ
                    DB-->>API: Lỗi phạm vi/validation
                    API-->>FE: HTTP 400
                else Hợp lệ
                    API->>DB: INSERT expense_records
                    DB-->>API: Chi phí đã tạo
                    API-->>FE: HTTP 201
                    FE-->>U: Hiển thị chi phí mới
                end
            end

        else Xuất bán con giống
            U->>FE: Chọn chức năng xuất bán
            FE->>API: GET lô, khách hàng và bảng giá phù hợp
            API->>AUTH: Yêu cầu role OWNER
            alt Không phải OWNER
                AUTH-->>API: Từ chối
                API-->>FE: HTTP 403
            else Là OWNER
                AUTH-->>API: Cho phép
                API->>DB: Đọc seed_batches, customers và price_lists cùng farm
                DB-->>API: Dữ liệu bán hàng
                API-->>FE: Danh sách và giá đề xuất
                U->>FE: Nhập số lượng, phí, chiết khấu và ngày bán
                FE->>API: POST seed sale
                API->>API: Validate input và tính giá snapshot
                API->>DB: BEGIN
                API->>DB: SELECT seed batch FOR UPDATE
                API->>DB: Kiểm tra trạng thái, customer cùng farm và số lượng

                alt Không đủ số lượng, sai tenant hoặc lô không hợp lệ
                    DB-->>API: Xung đột nghiệp vụ
                    API->>DB: ROLLBACK
                    API-->>FE: HTTP 400, 403 hoặc 409
                    FE-->>U: Hiển thị lý do giao dịch thất bại
                else Giao dịch hợp lệ
                    API->>DB: INSERT seed_sales với snapshot giá
                    API->>DB: INSERT batch_quantity_events loại sale
                    API->>DB: UPDATE current_estimated_quantity
                    opt Số lượng còn lại bằng 0
                        API->>DB: UPDATE seed_batches status = sold
                    end
                    API->>DB: COMMIT
                    DB-->>API: Giao dịch và số lượng còn lại
                    API-->>FE: HTTP 201
                    FE-->>U: Hiển thị kết quả xuất bán
                end
            end

        else Xem doanh thu, chi phí và lợi nhuận
            U->>FE: Chọn kỳ và bộ lọc báo cáo
            FE->>API: GET báo cáo tài chính
            API->>AUTH: Kiểm tra phạm vi xem
            alt Role không được phép xem báo cáo yêu cầu
                AUTH-->>API: Từ chối
                API-->>FE: HTTP 403
            else Được phép xem
                AUTH-->>API: Toàn farm hoặc khu vực
                API->>DB: Tổng hợp seed_sales và expense_records trong scope
                DB-->>API: Doanh thu, chi phí và dữ liệu giá vốn
                API->>API: Tính giá vốn phân bổ và lợi nhuận khi đủ dữ liệu
                API-->>FE: Báo cáo kèm trạng thái dữ liệu
                FE-->>U: Hiển thị báo cáo theo quyền
            end
        end
    end
```

---

## 5. UC09 — Quản lý thống kê và cảnh báo

```mermaid
sequenceDiagram
    autonumber
    actor U as Người dùng
    participant FE as Vue/Vuetify UI
    participant API as Express API
    participant AUTH as AuthZ
    participant DB as Prisma/PostgreSQL
    participant JOB as Scheduler/Alert Worker

    Note over JOB,DB: Luồng nền độc lập, không phải use case do người dùng kích hoạt
    loop Theo lịch hoặc sau sự kiện nghiệp vụ
        JOB->>DB: Đọc log môi trường, kết quả AI và tồn kho
        DB-->>JOB: Dữ liệu mới cần đánh giá
        JOB->>JOB: So ngưỡng đã phê duyệt và xác định severity
        JOB->>DB: Kiểm tra khóa chống trùng cảnh báo
        alt Cảnh báo tương ứng đã tồn tại
            DB-->>JOB: Bỏ qua hoặc cập nhật theo chính sách
        else Chưa tồn tại
            JOB->>DB: INSERT alerts_notifications
            DB-->>JOB: Cảnh báo đã tạo
        end
    end

    U->>FE: Chọn farm và mở Dashboard
    FE->>API: GET dashboard với kỳ và bộ lọc
    API->>AUTH: Kiểm tra phiên và membership tại farm
    AUTH->>DB: Đọc farm_members

    alt Phiên sai hoặc membership không active
        DB-->>AUTH: Không có quyền
        AUTH-->>API: Từ chối
        API-->>FE: HTTP 401 hoặc 403
        FE->>FE: Xóa cache và dữ liệu farm đang hiển thị
        FE-->>U: Hiển thị lỗi truy cập
    else Có quyền
        DB-->>AUTH: role, status và area_id
        AUTH->>AUTH: Suy ra scope theo role
        Note over AUTH: OWNER: toàn farm<br/>AREA_MANAGER, TECHNICIAN: khu vực<br/>WAREHOUSE_STAFF: kho
        AUTH-->>API: Scope đã xác định
        API->>API: Validate thời gian, timezone và bộ lọc

        alt Bộ lọc không hợp lệ
            API-->>FE: HTTP 400
            FE-->>U: Giữ bộ lọc hợp lệ gần nhất
        else Bộ lọc hợp lệ
            API->>DB: Tổng hợp ao/bể, lô và thông số gần nhất
            API->>DB: Tổng hợp kho và cảnh báo chưa đọc
            opt Scope cho phép xem tài chính
                API->>DB: Tổng hợp chi phí và doanh thu
            end
            DB-->>API: Các tập dữ liệu trong đúng scope
            API->>API: Tính KPI bằng cùng kỳ và timezone

            alt Không có dữ liệu
                API-->>FE: KPI bằng 0 hoặc không xác định và empty state
            else Một nguồn dữ liệu lỗi
                API-->>FE: Dữ liệu khả dụng và lỗi từng phần kèm timestamp
            else Thành công
                API-->>FE: KPI, xu hướng và cảnh báo
            end
            FE-->>U: Hiển thị Dashboard theo quyền

            opt Người dùng mở chi tiết KPI
                U->>FE: Chọn KPI hoặc biểu đồ
                FE->>API: GET bản ghi nguồn với cùng bộ lọc
                API->>AUTH: Kiểm tra lại scope
                alt Không còn quyền với phạm vi yêu cầu
                    AUTH-->>API: Từ chối
                    API-->>FE: HTTP 403
                else Còn quyền
                    AUTH-->>API: Scope hợp lệ
                    API->>DB: SELECT dữ liệu chi tiết trong scope
                    DB-->>API: Bản ghi nguồn
                    API-->>FE: Chi tiết truy vết
                    FE-->>U: Hiển thị danh sách chi tiết
                end
            end

            opt Người dùng xem một cảnh báo
                U->>FE: Chọn cảnh báo
                FE->>API: GET chi tiết cảnh báo
                API->>AUTH: Kiểm tra quyền với farm, tank và batch liên quan
                alt Không còn quyền hoặc bản ghi nguồn không còn
                    AUTH-->>API: Từ chối chi tiết
                    API-->>FE: Không trả dữ liệu nhạy cảm
                else Còn quyền
                    AUTH-->>API: Cho phép
                    API->>DB: Đọc cảnh báo và dữ liệu nguồn
                    DB-->>API: Chi tiết cảnh báo
                    API-->>FE: Severity, nội dung, thời gian và liên kết nguồn
                    FE-->>U: Hiển thị cảnh báo

                    opt Đánh dấu đã đọc
                        U->>FE: Chọn Đã đọc
                        FE->>API: PATCH trạng thái đọc
                        API->>DB: UPDATE alerts_notifications.is_read
                        Note over API,DB: is_read hiện là trạng thái chung, chưa tách theo user
                        DB-->>API: Trạng thái mới
                        API-->>FE: HTTP 200
                    end
                end
            end
        end
    end
```
