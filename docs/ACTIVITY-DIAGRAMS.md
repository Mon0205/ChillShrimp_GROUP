# Sơ đồ Activity cho 5 use case trọng tâm — ChillShrimp

> Nguồn đặc tả: [USECASE-SPECIFICATION.md](./USECASE-SPECIFICATION.md#7-đặc-tả-chuyên-sâu-5-use-case-trọng-tâm). Các sơ đồ mô tả kiến trúc đích; những module nghiệp vụ chưa có migration/API vẫn được thể hiện để phục vụ phân tích và thiết kế.

> **Bản dùng cho draw.io:** mở trực tiếp [ACTIVITY-DIAGRAMS.drawio](./ACTIVITY-DIAGRAMS.drawio) bằng **File > Open From > Device**. File gồm 5 page độc lập, sử dụng shape và connector native nên có thể di chuyển, đổi kích thước và chỉnh đường nối mà không cần draw.io hỗ trợ `swimlane-beta`.

## Quy ước trình bày

Mỗi sơ đồ được trình bày theo dạng **swimlane hai cột** tương tự sơ đồ UML trong báo cáo:

- Lane bên trái: hành động hoặc lựa chọn của tác nhân.
- Lane bên phải: xử lý, kiểm tra, quyết định và phản hồi của hệ thống.
- Hình tròn: điểm bắt đầu/kết thúc.
- Hình chữ nhật bo góc: một hoạt động.
- Hình thoi: điều kiện rẽ nhánh.
- Màu đỏ nhạt: lỗi hoặc yêu cầu bị từ chối.

Các sơ đồ dùng cú pháp Mermaid `swimlane-beta TB` (Mermaid 11.16 trở lên). Mỗi `subgraph` tương ứng với một partition dọc, giúp VPasCode hiển thị đúng bố cục **Tác nhân | Hệ thống**.

---

## 1. UC04 — Quản lý trang trại

```mermaid
swimlane-beta TB
    subgraph ACTOR["TÁC NHÂN: NGƯỜI DÙNG"]
        A0((Bắt đầu)):::start
        A1("Chọn farm và mở<br/>Quản lý trang trại"):::actor
        A2{"Chọn thao tác"}:::decision
        A3("Nhập thông tin<br/>cập nhật farm"):::actor
        A4("Nhập thông tin<br/>ao/bể"):::actor
        A5("Chọn trạng thái mới<br/>cho ao/bể"):::actor
        A6{"Thực hiện thao tác khác?"}:::decision
        A7("Nhập điều kiện<br/>tìm kiếm hoặc lọc"):::actor
    end

    subgraph SYSTEM["HỆ THỐNG CHILLSHRIMP"]
        S1("Kiểm tra phiên đăng nhập<br/>và membership tại farm"):::system
        D1{"Phiên hợp lệ và<br/>membership active?"}:::decision
        E1("Từ chối truy cập<br/>HTTP 401 hoặc 403"):::error
        S2("Xác định role, area_id<br/>và phạm vi dữ liệu"):::system
        S3("Đọc và hiển thị farm,<br/>khu vực, ao/bể, lô hiện tại"):::system
        S4("Kiểm tra quyền OWNER,<br/>dữ liệu và code farm"):::system
        D2{"Cập nhật farm hợp lệ?"}:::decision
        E2("Thông báo lỗi quyền,<br/>dữ liệu hoặc trùng code"):::error
        S5("Cập nhật farms và<br/>trả hồ sơ mới"):::system
        S6("Kiểm tra quyền khu vực,<br/>code, loại và thể tích"):::system
        D3{"Thông tin ao/bể hợp lệ?"}:::decision
        E3("Thông báo HTTP<br/>400, 403 hoặc 409"):::error
        S7("Tạo hoặc cập nhật ponds_tanks<br/>Ao/bể mới có status empty"):::system
        S8("Truy vấn ao/bể trong<br/>đúng farm và khu vực"):::system
        S9("Kiểm tra quyền, state transition<br/>và lô đang chiếm dụng"):::system
        D4{"Được phép đổi trạng thái?"}:::decision
        E4("Từ chối chuyển trạng thái<br/>HTTP 403 hoặc 409"):::error
        S10("Cập nhật trạng thái ao/bể<br/>và hiển thị kết quả"):::system
        Z(((Kết thúc))):::finish
    end

    A0 --> A1 --> S1 --> D1
    D1 -->|Không| E1 --> Z
    D1 -->|Có| S2 --> S3 --> A2

    A2 -->|Cập nhật farm| A3 --> S4 --> D2
    D2 -->|Không| E2 --> A2
    D2 -->|Có| S5 --> A6

    A2 -->|Tạo hoặc sửa ao/bể| A4 --> S6 --> D3
    D3 -->|Không| E3 --> A2
    D3 -->|Có| S7 --> A6

    A2 -->|Xem hoặc lọc| A7 --> S8 --> A6

    A2 -->|Đổi trạng thái ao/bể| A5 --> S9 --> D4
    D4 -->|Không| E4 --> A2
    D4 -->|Có| S10 --> A6

    A6 -->|Có| A2
    A6 -->|Không| Z

    classDef actor fill:#bae6fd,stroke:#0369a1,color:#0c4a6e,stroke-width:1.5px;
    classDef system fill:#7dd3fc,stroke:#0369a1,color:#082f49,stroke-width:1.5px;
    classDef decision fill:#ffffff,stroke:#334155,color:#0f172a,stroke-width:1.8px;
    classDef error fill:#fee2e2,stroke:#dc2626,color:#7f1d1d,stroke-width:1.5px;
    classDef start fill:#111827,stroke:#111827,color:#ffffff,stroke-width:2px;
    classDef finish fill:#ffffff,stroke:#111827,color:#111827,stroke-width:4px;
    style ACTOR fill:#ffffff,stroke:#334155,stroke-width:2px
    style SYSTEM fill:#ffffff,stroke:#334155,stroke-width:2px
```

---

## 2. UC05 — Quản lý lô giống và chăm sóc

```mermaid
swimlane-beta TB
    subgraph ACTOR["TÁC NHÂN: OWNER / AREA_MANAGER / TECHNICIAN"]
        A0((Bắt đầu)):::start
        A1("Chọn farm, khu vực<br/>và ao/bể"):::actor
        A2{"Tạo lô mới hay<br/>chọn lô hiện có?"}:::decision
        A3("Nhập nguồn giống, mã lô,<br/>loài, PL, số lượng và ngày"):::actor
        A4{"Chọn nghiệp vụ<br/>trên lô"}:::decision
        A5("Nhập dữ liệu nhật ký<br/>chăm sóc thực tế"):::actor
        A6("Nhập kết quả lấy mẫu<br/>hoặc biến động số lượng"):::actor
        A7("Chọn trạng thái mới<br/>cho lô giống"):::actor
        A8{"Tiếp tục làm việc<br/>với lô?"}:::decision
    end

    subgraph SYSTEM["HỆ THỐNG CHILLSHRIMP"]
        S1("Kiểm tra phiên, membership<br/>và phạm vi khu vực"):::system
        D1{"Có quyền truy cập?"}:::decision
        E1("Từ chối truy cập<br/>HTTP 403"):::error
        S2("Đọc trạng thái ao/bể<br/>và lô hiện tại"):::system
        S3("Kiểm tra quyền tạo lô,<br/>ao/bể empty và lô chiếm dụng"):::system
        D2{"Có thể tạo lô?"}:::decision
        E2("Không có quyền hoặc<br/>ao/bể chưa sẵn sàng"):::error
        S4("Tải lô hiện tại và<br/>lịch sử chăm sóc"):::system
        D3{"Tìm thấy lô?"}:::decision
        E3("Không có lô để thao tác"):::error
        S5("Kiểm tra dữ liệu lô,<br/>mã lô và số lượng"):::system
        D4{"Dữ liệu lô hợp lệ?"}:::decision
        E4("Thông báo lỗi dữ liệu<br/>HTTP 400 hoặc 409"):::error
        S6("Transaction: tạo seed_batches,<br/>stocking event và đặt ao/bể active"):::system
        S7("Tải ngưỡng môi trường,<br/>định mức và vật tư"):::system
        S8("Kiểm tra giá trị, thời gian,<br/>đơn vị và quyền khu vực"):::system
        D5{"Nhật ký hợp lệ?"}:::decision
        E5("Thông báo lỗi nhật ký<br/>HTTP 400 hoặc 403"):::error
        D6{"Có sử dụng vật tư?"}:::decision
        D7{"Tồn kho đủ?"}:::decision
        E6("Không đủ tồn kho<br/>HTTP 409"):::error
        S9("Transaction: lưu nhật ký,<br/>trừ tồn và tạo usage event"):::system
        S10("Lưu nhật ký theo tank_id"):::system
        D8{"Thông số vượt ngưỡng<br/>đã phê duyệt?"}:::decision
        S11("Sinh cảnh báo có<br/>kiểm tra chống trùng"):::system
        S12("Kiểm tra dữ liệu và số lượng<br/>sau biến động không âm"):::system
        D9{"Mẫu hoặc biến động hợp lệ?"}:::decision
        E7("Từ chối cập nhật<br/>HTTP 400 hoặc 409"):::error
        S13("Transaction: lưu mẫu/sự kiện<br/>và tính lại các chỉ số"):::system
        S14("Kiểm tra role và<br/>state transition của lô"):::system
        D10{"Được phép đổi trạng thái?"}:::decision
        E8("Từ chối cập nhật trạng thái<br/>HTTP 403 hoặc 409"):::error
        S15("Cập nhật seed_batches và<br/>đồng bộ trạng thái ao/bể"):::system
        S16("Tổng hợp nhật ký, mẫu, AI,<br/>chi phí và xuất bán"):::system
        Z(((Kết thúc))):::finish
    end

    A0 --> A1 --> S1 --> D1
    D1 -->|Không| E1 --> Z
    D1 -->|Có| S2 --> A2

    A2 -->|Tạo lô mới| S3 --> D2
    D2 -->|Không| E2 --> A1
    D2 -->|Có| A3 --> S5 --> D4
    D4 -->|Không| E4 --> A3
    D4 -->|Có| S6 --> A4

    A2 -->|Chọn lô hiện có| S4 --> D3
    D3 -->|Không| E3 --> A1
    D3 -->|Có| A4

    A4 -->|Ghi nhật ký chăm sóc| S7 --> A5 --> S8 --> D5
    D5 -->|Không| E5 --> A5
    D5 -->|Có| D6
    D6 -->|Có| D7
    D7 -->|Không| E6 --> A5
    D7 -->|Có| S9 --> D8
    D6 -->|Không| S10 --> D8
    D8 -->|Có| S11 --> A8
    D8 -->|Không| A8

    A4 -->|Lấy mẫu hoặc biến động| A6 --> S12 --> D9
    D9 -->|Không| E7 --> A6
    D9 -->|Có| S13 --> A8

    A4 -->|Đổi trạng thái lô| A7 --> S14 --> D10
    D10 -->|Không| E8 --> A4
    D10 -->|Có| S15 --> A8

    A4 -->|Xem lịch sử| S16 --> A8
    A8 -->|Có| A4
    A8 -->|Không| Z

    classDef actor fill:#bae6fd,stroke:#0369a1,color:#0c4a6e,stroke-width:1.5px;
    classDef system fill:#7dd3fc,stroke:#0369a1,color:#082f49,stroke-width:1.5px;
    classDef decision fill:#ffffff,stroke:#334155,color:#0f172a,stroke-width:1.8px;
    classDef error fill:#fee2e2,stroke:#dc2626,color:#7f1d1d,stroke-width:1.5px;
    classDef start fill:#111827,stroke:#111827,color:#ffffff,stroke-width:2px;
    classDef finish fill:#ffffff,stroke:#111827,color:#111827,stroke-width:4px;
    style ACTOR fill:#ffffff,stroke:#334155,stroke-width:2px
    style SYSTEM fill:#ffffff,stroke:#334155,stroke-width:2px
```

---

## 3. UC06 — Kiểm tra và phân tích AI

```mermaid
swimlane-beta TB
    subgraph ACTOR["TÁC NHÂN: OWNER / AREA_MANAGER / TECHNICIAN"]
        A0((Bắt đầu)):::start
        A1("Mở chi tiết lô và chọn<br/>Kiểm tra bằng AI"):::actor
        A2("Lấy mẫu, chụp/tải ảnh,<br/>nhập phương pháp và thể tích"):::actor
        A3{"Thử phân tích lại?"}:::decision
        A4("Xem ảnh gốc, ảnh đánh dấu<br/>và kết quả AI"):::actor
        A5{"Có hiệu chỉnh<br/>kết quả?"}:::decision
        A6("Nhập manual_count hoặc<br/>correction_factor"):::actor
    end

    subgraph SYSTEM["HỆ THỐNG CHILLSHRIMP"]
        S1("Kiểm tra phiên, membership,<br/>khu vực và trạng thái lô"):::system
        D1{"Được phép kiểm tra?"}:::decision
        E1("Từ chối yêu cầu<br/>HTTP 403 hoặc 409"):::error
        S2("Hiển thị yêu cầu lấy mẫu<br/>và metadata cần nhập"):::system
        S3("Kiểm tra MIME, dung lượng,<br/>kích thước và metadata"):::system
        D2{"Ảnh và dữ liệu hợp lệ?"}:::decision
        E2("Thông báo ảnh/dữ liệu<br/>không hợp lệ HTTP 400"):::error
        S4("Lưu ảnh gốc vào<br/>private object storage"):::system
        D3{"Upload thành công?"}:::decision
        E3("Thông báo lỗi storage<br/>và cho phép thử lại"):::error
        S5("Tạo ai_inspections pending<br/>sau đó chuyển processing"):::system
        S6("Gửi ảnh, metadata và<br/>request ID tới AI Service"):::system
        D4{"AI phản hồi đúng hạn?"}:::decision
        S7("Cập nhật status failed<br/>và lưu mã lỗi an toàn"):::error
        S8("Kiểm tra detections,<br/>confidence và model_version"):::system
        D5{"Response AI hợp lệ?"}:::decision
        S9("Tính số lượng, confidence,<br/>mật độ; lưu kết quả gốc"):::system
        D6{"Confidence thấp hoặc<br/>có dấu hiệu bất thường?"}:::decision
        S10("Sinh cảnh báo yêu cầu<br/>kiểm tra thủ công"):::system
        S11("Hiển thị kết quả và<br/>giới hạn chuyên môn của AI"):::system
        S12("Kiểm tra giá trị<br/>hiệu chỉnh"):::system
        D7{"Hiệu chỉnh hợp lệ?"}:::decision
        E4("Thông báo giá trị<br/>hiệu chỉnh không hợp lệ"):::error
        S13("Lưu hiệu chỉnh riêng,<br/>giữ nguyên kết quả AI gốc"):::system
        Z(((Kết thúc))):::finish
    end

    A0 --> A1 --> S1 --> D1
    D1 -->|Không| E1 --> Z
    D1 -->|Có| S2 --> A2 --> S3 --> D2
    D2 -->|Không| E2 --> A2
    D2 -->|Có| S4 --> D3
    D3 -->|Không| E3 --> A2
    D3 -->|Có| S5 --> S6 --> D4

    D4 -->|Không| S7 --> A3
    D4 -->|Có| S8 --> D5
    D5 -->|Không| S7
    A3 -->|Có| S6
    A3 -->|Không| Z

    D5 -->|Có| S9 --> D6
    D6 -->|Có| S10 --> S11
    D6 -->|Không| S11
    S11 --> A4 --> A5
    A5 -->|Không| Z
    A5 -->|Có| A6 --> S12 --> D7
    D7 -->|Không| E4 --> A6
    D7 -->|Có| S13 --> Z

    classDef actor fill:#bae6fd,stroke:#0369a1,color:#0c4a6e,stroke-width:1.5px;
    classDef system fill:#7dd3fc,stroke:#0369a1,color:#082f49,stroke-width:1.5px;
    classDef decision fill:#ffffff,stroke:#334155,color:#0f172a,stroke-width:1.8px;
    classDef error fill:#fee2e2,stroke:#dc2626,color:#7f1d1d,stroke-width:1.5px;
    classDef start fill:#111827,stroke:#111827,color:#ffffff,stroke-width:2px;
    classDef finish fill:#ffffff,stroke:#111827,color:#111827,stroke-width:4px;
    style ACTOR fill:#ffffff,stroke:#334155,stroke-width:2px
    style SYSTEM fill:#ffffff,stroke:#334155,stroke-width:2px
```

---

## 4. UC08 — Quản lý tài chính và bán giống

```mermaid
swimlane-beta TB
    subgraph ACTOR["TÁC NHÂN: OWNER / AREA_MANAGER / TECHNICIAN"]
        A0((Bắt đầu)):::start
        A1("Chọn farm và mở<br/>Tài chính - bán giống"):::actor
        A2{"Chọn nghiệp vụ"}:::decision
        A3("Nhập loại chi phí, số tiền,<br/>ngày và lô nếu có"):::actor
        A4("Chọn lô, khách hàng; nhập<br/>số lượng, phí và chiết khấu"):::actor
        A5("Xem tóm tắt và<br/>xác nhận xuất bán"):::actor
        A6("Chọn kỳ và bộ lọc<br/>báo cáo"):::actor
        A7{"Thực hiện thao tác khác?"}:::decision
    end

    subgraph SYSTEM["HỆ THỐNG CHILLSHRIMP"]
        S1("Kiểm tra phiên đăng nhập<br/>và membership tại farm"):::system
        D1{"Membership active?"}:::decision
        E1("Từ chối truy cập<br/>HTTP 403"):::error
        S2("Xác định role và<br/>phạm vi khu vực"):::system
        D2{"Có quyền ghi chi phí?"}:::decision
        E2("Không đủ quyền<br/>HTTP 403"):::error
        S3("Kiểm tra số tiền, ngày,<br/>lô và phạm vi tenant"):::system
        D3{"Chi phí hợp lệ?"}:::decision
        E3("Thông báo lỗi dữ liệu<br/>HTTP 400 hoặc 403"):::error
        S4("Tạo expense_records và<br/>hiển thị chi phí mới"):::system
        D4{"Actor là OWNER?"}:::decision
        S5("Tải lô ready_for_sale,<br/>khách hàng và bảng giá"):::system
        S6("Kiểm tra cùng farm, trạng thái<br/>và số lượng có thể bán"):::system
        D5{"Giao dịch hợp lệ?"}:::decision
        E4("Từ chối giao dịch<br/>HTTP 400, 403 hoặc 409"):::error
        S7("Tính giá snapshot,<br/>doanh thu và tỷ lệ sống"):::system
        S8("Bắt đầu transaction,<br/>khóa bản ghi lô và kiểm tra lại"):::system
        D6{"Số lượng vẫn đủ?"}:::decision
        S9("Rollback và thông báo<br/>xung đột HTTP 409"):::error
        S10("Tạo seed_sales, sale event,<br/>giảm số lượng và cập nhật status"):::system
        S11("Commit và hiển thị<br/>kết quả xuất bán"):::system
        D7{"Có quyền xem<br/>báo cáo yêu cầu?"}:::decision
        S12("Tổng hợp doanh thu, chi phí,<br/>giá vốn và lợi nhuận theo quyền"):::system
        S13("Hiển thị báo cáo<br/>và trạng thái dữ liệu"):::system
        Z(((Kết thúc))):::finish
    end

    A0 --> A1 --> S1 --> D1
    D1 -->|Không| E1 --> Z
    D1 -->|Có| S2 --> A2

    A2 -->|Ghi chi phí| D2
    D2 -->|Không| E2 --> A2
    D2 -->|Có| A3 --> S3 --> D3
    D3 -->|Không| E3 --> A3
    D3 -->|Có| S4 --> A7

    A2 -->|Xuất bán| D4
    D4 -->|Không| E2
    D4 -->|Có| S5 --> A4 --> S6 --> D5
    D5 -->|Không| E4 --> A4
    D5 -->|Có| S7 --> A5 --> S8 --> D6
    D6 -->|Không| S9 --> A2
    D6 -->|Có| S10 --> S11 --> A7

    A2 -->|Xem báo cáo| D7
    D7 -->|Không| E2
    D7 -->|Có| A6 --> S12 --> S13 --> A7

    A7 -->|Có| A2
    A7 -->|Không| Z

    classDef actor fill:#bae6fd,stroke:#0369a1,color:#0c4a6e,stroke-width:1.5px;
    classDef system fill:#7dd3fc,stroke:#0369a1,color:#082f49,stroke-width:1.5px;
    classDef decision fill:#ffffff,stroke:#334155,color:#0f172a,stroke-width:1.8px;
    classDef error fill:#fee2e2,stroke:#dc2626,color:#7f1d1d,stroke-width:1.5px;
    classDef start fill:#111827,stroke:#111827,color:#ffffff,stroke-width:2px;
    classDef finish fill:#ffffff,stroke:#111827,color:#111827,stroke-width:4px;
    style ACTOR fill:#ffffff,stroke:#334155,stroke-width:2px
    style SYSTEM fill:#ffffff,stroke:#334155,stroke-width:2px
```

---

## 5. UC09 — Quản lý thống kê và cảnh báo

```mermaid
swimlane-beta TB
    subgraph ACTOR["TÁC NHÂN: TẤT CẢ VAI TRÒ"]
        A0((Bắt đầu)):::start
        A1("Chọn farm và mở Dashboard<br/>hoặc danh sách cảnh báo"):::actor
        A2("Chọn khoảng thời gian<br/>và bộ lọc"):::actor
        A3{"Chọn thao tác"}:::decision
        A4("Chọn KPI hoặc<br/>biểu đồ cần xem"):::actor
        A5("Chọn một cảnh báo"):::actor
        A6{"Đánh dấu đã đọc?"}:::decision
        A7{"Tiếp tục xem?"}:::decision
        A8("Chọn farm khác"):::actor
    end

    subgraph SYSTEM["HỆ THỐNG CHILLSHRIMP"]
        BG("Tiến trình nền: so ngưỡng,<br/>tạo cảnh báo và chống trùng"):::background
        S1("Kiểm tra phiên và<br/>membership tại farm"):::system
        D1{"Có quyền truy cập?"}:::decision
        E1("Xóa dữ liệu đang hiển thị<br/>và trả HTTP 401 hoặc 403"):::error
        S2("Xác định scope theo role:<br/>toàn farm, khu vực hoặc kho"):::system
        S3("Kiểm tra thời gian,<br/>timezone và bộ lọc"):::system
        D2{"Bộ lọc hợp lệ?"}:::decision
        E2("Thông báo bộ lọc sai<br/>HTTP 400"):::error
        S4("Truy vấn dữ liệu nguồn trong<br/>đúng farm, area và kỳ"):::system
        D3{"Có dữ liệu?"}:::decision
        S5("Hiển thị empty state và<br/>KPI bằng 0/không xác định"):::system
        D4{"Tất cả nguồn truy vấn<br/>thành công?"}:::decision
        S6("Hiển thị lỗi từng phần;<br/>dữ liệu cũ phải có timestamp"):::error
        S7("Tính và hiển thị KPI,<br/>xu hướng, cảnh báo theo quyền"):::system
        S8("Kiểm tra lại scope và<br/>truy vấn bản ghi nguồn"):::system
        D5{"Còn quyền xem chi tiết?"}:::decision
        E3("Không trả dữ liệu ngoài scope<br/>HTTP 403"):::error
        S9("Hiển thị danh sách<br/>chi tiết truy vết"):::system
        S10("Kiểm tra quyền với farm,<br/>tank và batch của cảnh báo"):::system
        D6{"Cảnh báo còn khả dụng<br/>và thuộc phạm vi?"}:::decision
        E4("Ẩn dữ liệu nhạy cảm và báo<br/>bản ghi không còn khả dụng"):::error
        S11("Hiển thị severity, nội dung,<br/>thời gian và liên kết nguồn"):::system
        S12("Cập nhật is_read theo<br/>schema hiện tại"):::system
        S13("Xóa cache và dữ liệu<br/>của farm trước"):::system
        Z(((Kết thúc))):::finish
    end

    BG -.->|Cung cấp cảnh báo| S4
    A0 --> A1 --> S1 --> D1
    D1 -->|Không| E1 --> Z
    D1 -->|Có| S2 --> A2 --> S3 --> D2
    D2 -->|Không| E2 --> A2
    D2 -->|Có| S4 --> D3
    D3 -->|Không| S5 --> A3
    D3 -->|Có| D4
    D4 -->|Không| S6 --> S7
    D4 -->|Có| S7
    S7 --> A3

    A3 -->|Xem chi tiết KPI| A4 --> S8 --> D5
    D5 -->|Không| E3 --> A7
    D5 -->|Có| S9 --> A7

    A3 -->|Xem cảnh báo| A5 --> S10 --> D6
    D6 -->|Không| E4 --> A7
    D6 -->|Có| S11 --> A6
    A6 -->|Có| S12 --> A7
    A6 -->|Không| A7

    A3 -->|Đổi farm| A8 --> S13 --> A1
    A3 -->|Thoát| Z
    A7 -->|Có| A3
    A7 -->|Không| Z

    classDef actor fill:#bae6fd,stroke:#0369a1,color:#0c4a6e,stroke-width:1.5px;
    classDef system fill:#7dd3fc,stroke:#0369a1,color:#082f49,stroke-width:1.5px;
    classDef decision fill:#ffffff,stroke:#334155,color:#0f172a,stroke-width:1.8px;
    classDef error fill:#fee2e2,stroke:#dc2626,color:#7f1d1d,stroke-width:1.5px;
    classDef background fill:#ede9fe,stroke:#7c3aed,color:#3b0764,stroke-width:1.5px,stroke-dasharray:5 3;
    classDef start fill:#111827,stroke:#111827,color:#ffffff,stroke-width:2px;
    classDef finish fill:#ffffff,stroke:#111827,color:#111827,stroke-width:4px;
    style ACTOR fill:#ffffff,stroke:#334155,stroke-width:2px
    style SYSTEM fill:#ffffff,stroke:#334155,stroke-width:2px
```

> `alerts_notifications.is_read` hiện là trạng thái chung của bản ghi cảnh báo. Nếu cần trạng thái đọc riêng cho từng người dùng, phải bổ sung mô hình dữ liệu tương ứng ở giai đoạn sau.

---

## Diễn giải luồng từ bắt đầu đến kết thúc

### Quy ước đọc sơ đồ

- `A` (Actor): thao tác hoặc lựa chọn của tác nhân.
- `S` (System): bước xử lý do hệ thống thực hiện.
- `D` (Decision): điều kiện rẽ nhánh do hệ thống kiểm tra.
- `E` (Error): thông báo lỗi hoặc yêu cầu bị từ chối.
- `BG` (Background): tiến trình nền, không do người dùng trực tiếp kích hoạt.
- `Z`: điểm kết thúc của luồng.

Mỗi luồng tuân theo nguyên tắc chung: **xác thực phiên → kiểm tra membership và phạm vi → nhận dữ liệu → kiểm tra nghiệp vụ → xử lý/lưu dữ liệu → trả kết quả hoặc lỗi → tiếp tục hoặc kết thúc**. Các mã HTTP trong sơ đồ có ý nghĩa: `400` là dữ liệu đầu vào không hợp lệ, `401` là phiên đăng nhập không hợp lệ, `403` là không đủ quyền, `404` là không tìm thấy tài nguyên và `409` là xung đột dữ liệu hoặc trạng thái nghiệp vụ.

### 1. UC04 — Quản lý trang trại

1. `A0 → A1`: Người dùng bắt đầu, chọn farm cần làm việc và mở màn hình **Quản lý trang trại**. Frontend gửi `farm_id` cùng thông tin phiên đăng nhập lên backend.
2. `S1`: Hệ thống kiểm tra phiên đăng nhập, sau đó tìm membership theo cặp `(farm_id, user_id)` trong `farm_members`.
3. `D1`: Hệ thống kiểm tra phiên có hợp lệ và membership có `status = active` hay không. Nếu không hợp lệ, luồng chuyển tới `E1`, trả `401` hoặc `403`, không trả dữ liệu farm và kết thúc tại `Z`.
4. Nếu hợp lệ, `S2` đọc `role`, `area_id` để xác định phạm vi. `OWNER` được thao tác toàn farm; `AREA_MANAGER` và `TECHNICIAN` bị giới hạn theo khu vực; `WAREHOUSE_STAFF` chỉ xem thông tin chung được phép.
5. `S3`: Hệ thống truy vấn `farms`, `areas`, `ponds_tanks` và lô hiện tại từ `seed_batches`, sau đó chỉ trả những dữ liệu nằm trong phạm vi của membership.
6. `A2`: Người dùng chọn một trong bốn nghiệp vụ: cập nhật farm, tạo/sửa ao-bể, xem/lọc ao-bể hoặc đổi trạng thái ao-bể.
7. Nhánh **Cập nhật farm** đi theo `A3 → S4 → D2`. Người dùng nhập mã, tên hoặc địa chỉ; hệ thống kiểm tra quyền `OWNER`, dữ liệu bắt buộc và tính duy nhất của mã farm. Nếu sai, `E2` hiển thị lỗi rồi quay lại `A2`; nếu đúng, `S5` cập nhật `farms` và trả hồ sơ mới.
8. Nhánh **Tạo hoặc sửa ao-bể** đi theo `A4 → S6 → D3`. Hệ thống kiểm tra khu vực thuộc đúng farm, mã ao-bể không trùng, loại hợp lệ và `volume_m3 > 0`. Nếu sai, `E3` trả `400`, `403` hoặc `409` rồi quay lại `A2`; nếu đúng, `S7` tạo/cập nhật `ponds_tanks`. Ao-bể mới mặc định có trạng thái `empty`.
9. Nhánh **Xem hoặc lọc** đi theo `A7 → S8`. Hệ thống lọc theo mã, tên, khu vực, loại hoặc trạng thái trong đúng phạm vi; thao tác này không làm thay đổi database.
10. Nhánh **Đổi trạng thái ao-bể** đi theo `A5 → S9 → D4`. Hệ thống kiểm tra quyền, state transition và lô `active` hoặc `ready_for_sale` đang chiếm dụng ao-bể. Chuyển sai quy tắc dẫn tới `E4 → A2`; hợp lệ thì `S10` cập nhật trạng thái và hiển thị kết quả.
11. Luồng trạng thái chuẩn là `empty → active → cleaning → empty`; `inactive` dùng khi ngừng sử dụng. Không được chuyển trực tiếp `active → empty` khi còn lô hoạt động.
12. Các nhánh thành công cùng đi tới `A6`. Người dùng chọn **Có** để quay lại `A2` và thực hiện thao tác khác; chọn **Không** để kết thúc tại `Z`.

### 2. UC05 — Quản lý lô giống và chăm sóc

1. `A0 → A1`: Người dùng chọn farm, khu vực và ao-bể tiếp nhận hoặc đang nuôi lô giống.
2. `S1 → D1`: Hệ thống kiểm tra phiên, membership và phạm vi khu vực. Nếu actor không có quyền với ao-bể, `E1` trả `403` và luồng kết thúc tại `Z`.
3. Nếu có quyền, `S2` đọc trạng thái ao-bể và lô hiện tại. Tại `A2`, người dùng chọn **Tạo lô mới** hoặc **Chọn lô hiện có**.
4. Với **Tạo lô mới**, `S3 → D2` kiểm tra quyền tạo lô, ao-bể phải `empty` và chưa có lô hoạt động. Nếu không đạt, `E2` thông báo ao-bể chưa sẵn sàng và quay lại `A1` để chọn lại.
5. Nếu có thể tạo, `A3` nhập nguồn giống, mã lô, loài, giai đoạn PL, số lượng và các mốc ngày. `S5 → D4` kiểm tra mã lô duy nhất, số lượng dương, dữ liệu PL và đối tượng liên quan cùng farm. Sai thì `E4 → A3` để sửa dữ liệu.
6. Dữ liệu hợp lệ đi tới `S6`. Trong một transaction, hệ thống tạo `seed_batches`, ghi sự kiện số lượng ban đầu, đặt `current_estimated_quantity = initial_quantity` và chuyển ao-bể sang `active`. Nếu một bước thất bại, toàn bộ transaction được rollback.
7. Với **Chọn lô hiện có**, `S4 → D3` tải lô và lịch sử chăm sóc. Không tìm thấy lô thì `E3 → A1`; tìm thấy thì chuyển tới `A4`.
8. Tại `A4`, người dùng chọn một trong bốn nghiệp vụ: ghi nhật ký chăm sóc, lấy mẫu/biến động số lượng, đổi trạng thái lô hoặc xem lịch sử.
9. Nhánh **Ghi nhật ký chăm sóc** đi theo `S7 → A5 → S8 → D5`. Hệ thống tải ngưỡng môi trường, định mức thức ăn và vật tư; người dùng nhập dữ liệu; hệ thống kiểm tra miền giá trị, thời gian, đơn vị và quyền khu vực. Sai thì `E5 → A5`.
10. Nhật ký hợp lệ đi tới `D6`. Nếu không dùng vật tư, `S10` lưu nhật ký theo `tank_id`. Nếu có dùng vật tư, `D7` kiểm tra tồn kho; không đủ thì `E6 → A5`, đủ thì `S9` lưu nhật ký, trừ tồn kho và tạo giao dịch `usage` trong cùng transaction.
11. `D8` kiểm tra thông số có vượt ngưỡng đã phê duyệt hay không. Nếu có, `S11` sinh cảnh báo và kiểm tra chống trùng; nếu không, hệ thống không tạo cảnh báo.
12. Nhánh **Lấy mẫu hoặc biến động số lượng** đi theo `A6 → S12 → D9`. Hệ thống kiểm tra dữ liệu và bảo đảm số lượng sau biến động không âm. Sai thì `E7 → A6`; đúng thì `S13` lưu `growth_sampling_logs` hoặc `batch_quantity_events` và tính lại chỉ số.
13. Số lượng hiện tại được tính theo công thức: `initial_quantity - mortality - sale - transfer_out + transfer_in + adjustment`. Mỗi thay đổi phải có sự kiện để truy vết.
14. Khi đủ dữ liệu, hệ thống tính `survival_rate = current_estimated_quantity / initial_quantity × 100`, `density = current_estimated_quantity / volume_m3` và `biomass_kg = current_estimated_quantity × average_weight_g / 1000`.
15. Nhánh **Đổi trạng thái lô** đi theo `A7 → S14 → D10`. Hệ thống kiểm tra role và state transition; không hợp lệ thì `E8 → A4`, hợp lệ thì `S15` cập nhật `seed_batches` và đồng bộ trạng thái ao-bể.
16. Nhánh **Xem lịch sử** đi tới `S16`, nơi hệ thống tổng hợp nhật ký, mẫu tăng trưởng, AI, chi phí và xuất bán theo thời gian.
17. Các nhánh đi tới `A8`. Chọn **Có** để quay lại `A4`; chọn **Không** để kết thúc tại `Z`.

### 3. UC06 — Kiểm tra và phân tích AI

1. `A0 → A1`: Người dùng mở chi tiết lô và chọn **Kiểm tra bằng AI**.
2. `S1 → D1`: Hệ thống kiểm tra membership, khu vực và trạng thái lô. Lô kết thúc chỉ được xem lịch sử; yêu cầu phân tích không hợp lệ dẫn tới `E1`, trả `403` hoặc `409` và kết thúc tại `Z`.
3. Nếu được phép, `S2` hiển thị hướng dẫn lấy mẫu và metadata bắt buộc. `A2` lấy mẫu, chụp/tải ảnh, nhập `sampling_method`, `sample_volume_ml` và ghi chú.
4. `S3 → D2`: Hệ thống kiểm tra MIME type, dung lượng, kích thước, khả năng đọc ảnh và metadata. Sai thì `E2` trả `400` và quay lại `A2`; lúc này chưa tạo inspection.
5. Ảnh hợp lệ được `S4` tải lên private object storage. `D3` kiểm tra upload; thất bại thì `E3` báo lỗi storage và quay lại `A2`.
6. Upload thành công đi tới `S5`: tạo `ai_inspections` với `status = pending`, sau đó chuyển sang `processing`. `S6` gửi ảnh, metadata và request ID tới AI Service.
7. `D4` kiểm tra AI có phản hồi đúng hạn hay không. Nếu timeout hoặc mất kết nối, `S7` đặt inspection thành `failed`, lưu mã lỗi an toàn và chuyển tới `A3`.
8. Nếu AI phản hồi, `S8 → D5` kiểm tra detections, bounding box, confidence và `model_version`. Response thiếu trường hoặc confidence ngoài khoảng `0–1` cũng đi tới `S7 → A3`.
9. Tại `A3`, người dùng chọn thử lại. Chọn **Có** thì quay lại `S6`; chọn **Không** thì kết thúc tại `Z`. Lịch sử lần xử lý lỗi không bị xóa.
10. Response hợp lệ đi tới `S9`: hệ thống tính `detected_count`, `average_confidence` và `density_per_ml`, tạo ảnh chú thích rồi lưu kết quả AI gốc.
11. `average_confidence = tổng confidence / số detection`; nếu không có detection thì để `NULL`. `density_per_ml = effective_count / sample_volume_ml`; nếu thiếu thể tích mẫu thì để `NULL`.
12. `D6` kiểm tra confidence thấp hoặc dấu hiệu bất thường. Nếu có, `S10` sinh cảnh báo yêu cầu kiểm tra thủ công; cả hai nhánh sau đó tới `S11` để hiển thị kết quả và giới hạn chuyên môn của AI.
13. `A4` xem ảnh gốc, ảnh đánh dấu và các chỉ số. Tại `A5`, người dùng quyết định có hiệu chỉnh kết quả hay không. Chọn **Không** thì kết thúc tại `Z`.
14. Nếu hiệu chỉnh, `A6` nhập `manual_count` hoặc `correction_factor`; `S12 → D7` kiểm tra giá trị. Sai thì `E4 → A6`; đúng thì `S13` lưu hiệu chỉnh riêng, giữ nguyên ảnh, detections, số AI và phiên bản model, sau đó kết thúc tại `Z`.

### 4. UC08 — Quản lý tài chính và bán giống

1. `A0 → A1`: Người dùng chọn farm và mở màn hình **Tài chính - bán giống**.
2. `S1 → D1`: Hệ thống kiểm tra phiên và membership. Không active thì `E1` trả `403` rồi kết thúc tại `Z`; hợp lệ thì `S2` xác định role và phạm vi khu vực.
3. Tại `A2`, người dùng chọn **Ghi chi phí**, **Xuất bán** hoặc **Xem báo cáo**.
4. Nhánh **Ghi chi phí** bắt đầu tại `D2`. Không đủ quyền thì `E2 → A2`; đủ quyền thì `A3` nhập loại chi phí, số tiền, ngày và lô nếu có.
5. `S3 → D3` kiểm tra số tiền, ngày, `batch_id` và phạm vi tenant. Sai thì `E3 → A3`; đúng thì `S4` tạo `expense_records`. Chi phí chung được phép có `batch_id = NULL` nhưng phải có phương pháp phân bổ khi tính giá vốn.
6. Nhánh **Xuất bán** bắt đầu tại `D4`. Chỉ `OWNER` được phép bán; actor khác đi tới `E2 → A2`.
7. Nếu là Owner, `S5` tải lô `ready_for_sale`, khách hàng cùng farm và bảng giá. `A4` chọn lô, khách hàng, nhập số lượng, giá theo nghìn con, phí vận chuyển và chiết khấu.
8. `S6 → D5` kiểm tra khách hàng/lô cùng farm, trạng thái lô và số lượng có thể bán. Sai thì `E4 → A4`; đúng thì `S7` tính snapshot giá, doanh thu và tỷ lệ sống.
9. Doanh thu gộp được tính bằng `quantity_sold / 1000 × price_per_thousand`; doanh thu cuối bằng `gross_revenue + transport_fee - discount_amount`. Các thành phần giá phải được lưu snapshot.
10. `A5` xem tóm tắt và xác nhận. `S8` mở transaction, khóa bản ghi lô và `D6` kiểm tra lại số lượng để xử lý trường hợp hai giao dịch đồng thời.
11. Nếu số lượng không còn đủ, `S9` rollback, trả `409` và quay lại `A2`. Nếu vẫn đủ, `S10` tạo `seed_sales`, tạo sự kiện `sale`, giảm `current_estimated_quantity` và cập nhật trạng thái lô; `S11` commit và hiển thị kết quả.
12. Nhánh **Xem báo cáo** đi qua `D7`. Không có quyền thì `E2 → A2`; có quyền thì `A6` chọn kỳ và bộ lọc, `S12` tổng hợp doanh thu, chi phí, giá vốn, lợi nhuận, sau đó `S13` hiển thị báo cáo.
13. Tại `A7`, người dùng chọn **Có** để quay lại `A2` và thực hiện thao tác khác; chọn **Không** để kết thúc tại `Z`.

### 5. UC09 — Quản lý thống kê và cảnh báo

1. `BG` là tiến trình nền chạy độc lập với người dùng. Tiến trình so dữ liệu với ngưỡng, kiểm tra môi trường, AI và tồn kho, tạo cảnh báo có chống trùng rồi cung cấp dữ liệu cho `S4`.
2. `A0 → A1`: Người dùng chọn farm và mở Dashboard hoặc danh sách cảnh báo.
3. `S1 → D1`: Hệ thống kiểm tra phiên và membership. Nếu không còn quyền, `E1` xóa dữ liệu đang hiển thị, trả `401/403` và kết thúc tại `Z`.
4. Có quyền thì `S2` xác định scope: Owner xem toàn farm; Area Manager/Technician xem khu vực; Warehouse Staff chỉ xem dữ liệu và cảnh báo kho.
5. `A2` chọn khoảng thời gian và bộ lọc. `S3 → D2` kiểm tra timezone, mốc đầu/cuối kỳ và tham số lọc. Sai thì `E2 → A2`; đúng thì `S4` truy vấn các bảng nguồn trong đúng farm, area và kỳ.
6. `D3` kiểm tra có dữ liệu hay không. Không có thì `S5` hiển thị empty state và KPI bằng `0` hoặc không xác định, sau đó tới `A3`.
7. Nếu có dữ liệu, `D4` kiểm tra mọi nguồn truy vấn có thành công không. Nếu một nguồn lỗi, `S6` hiển thị lỗi từng phần và timestamp của dữ liệu cũ; sau đó `S7` vẫn hiển thị phần KPI hợp lệ. Nếu tất cả thành công thì đi thẳng tới `S7`.
8. `S7` tính số ao-bể theo trạng thái, lô đang hoạt động, thông số gần nhất, tồn kho thấp, cảnh báo chưa đọc, chi phí và doanh thu theo quyền. Sau đó người dùng chọn thao tác tại `A3`.
9. Nhánh **Xem chi tiết KPI** đi theo `A4 → S8 → D5`. Hệ thống kiểm tra lại scope trước khi truy vấn bản ghi nguồn. Mất quyền thì `E3 → A7`; còn quyền thì `S9` hiển thị danh sách chi tiết truy vết rồi tới `A7`.
10. Nhánh **Xem cảnh báo** đi theo `A5 → S10 → D6`. Hệ thống kiểm tra farm, ao-bể và lô của cảnh báo còn thuộc phạm vi người dùng hay không. Không còn khả dụng thì `E4 → A7`; hợp lệ thì `S11` hiển thị severity, nội dung, thời gian và liên kết nguồn.
11. Tại `A6`, người dùng chọn có đánh dấu đã đọc hay không. Chọn **Có** thì `S12` cập nhật `is_read`; chọn **Không** thì giữ nguyên; cả hai đi tới `A7`.
12. Nhánh **Đổi farm** đi theo `A8 → S13`. Hệ thống xóa cache và dữ liệu của farm trước rồi quay lại `A1` để tải membership và dashboard của farm mới, tránh lộ dữ liệu chéo farm.
13. Nhánh **Thoát** từ `A3` đi trực tiếp tới `Z`.
14. Tại `A7`, chọn **Có** để quay lại `A3` và tiếp tục xem; chọn **Không** để kết thúc tại `Z`.

### Các điểm cần nhấn mạnh khi trình bày

1. Phân quyền được kiểm tra ở backend cho từng request; việc ẩn nút trên frontend không được xem là cơ chế bảo mật.
2. Mọi truy vấn nghiệp vụ đều bị giới hạn theo `farm_id` và, khi cần, `area_id`, phù hợp với mô hình một người dùng có thể tham gia nhiều trang trại.
3. Transaction được dùng khi một nghiệp vụ làm thay đổi nhiều bảng, như tạo lô, trừ kho hoặc xuất bán, để tránh dữ liệu nửa chừng.
4. Các vòng quay lại biểu mẫu giúp người dùng sửa lỗi mà không mất toàn bộ ngữ cảnh; nhánh kết thúc chỉ xuất hiện khi không thể tiếp tục hoặc người dùng chủ động dừng.
5. AI chỉ là công cụ hỗ trợ. Hệ thống giữ dữ liệu AI gốc, cho phép xác nhận thủ công và không tự chẩn đoán bệnh hoặc quyết định sử dụng thuốc.
6. Scheduler/worker là thành phần kỹ thuật chạy nền, không phải actor người dùng và không được mô hình hóa thành một use case độc lập.
7. Năm sơ đồ mô tả kiến trúc đích. Các module chưa có API/migration trong code hiện tại là phạm vi sẽ được hiện thực theo lộ trình, không được trình bày như chức năng đã hoàn thành.
