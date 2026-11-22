# Dashboard và báo cáo doanh thu

Tài liệu mô tả hai chức năng tổng hợp số liệu của ChillShrimp: **Dashboard theo vai trò** và **tab Doanh thu** trong nhóm Kinh doanh. Thiết kế chi tiết và lý do chọn từng con số nằm trong spec; kế hoạch và kết quả kiểm chứng nằm trong plan:

- [Dashboard theo vai trò](../superpowers/specs/2026-11-21-dashboard-design.md), [kế hoạch](../superpowers/plans/2026-11-21-dashboard.md)
- [Báo cáo doanh thu](../superpowers/specs/2026-11-21-revenue-report-design.md), [kế hoạch](../superpowers/plans/2026-11-21-revenue-report.md)

Trạng thái ghi theo nhánh `feature/dashboard`, ngày 22/11/2026. Bố cục lấy theo bộ phác thảo "Phác thảo Dashboard ChillShrimp" trên canvas thiết kế.

## 1. Mục đích

| Chức năng | Trả lời câu hỏi | Người dùng |
| --- | --- | --- |
| Dashboard | "Hôm nay tôi cần xử lý việc gì, ở đâu, và tình hình trại đang thế nào?" | Chủ trại, Quản lý trại, Quản lý khu vực, Kỹ thuật viên |
| Khối Kinh doanh trên Dashboard | "Tháng này bán được bao nhiêu, chi vật tư bao nhiêu, còn bị nợ bao nhiêu?" | Chủ trại, Quản lý trại |
| Tab Doanh thu | "Doanh thu theo từng tháng, từng lô, từng trại; chọn khoảng tháng tùy ý." | Chủ trại, Quản lý trại |

Dashboard là **bảng vận hành**: việc cần làm ở trên, số liệu kinh doanh và sản xuất bên dưới. Phân tích sâu đặt ở trang riêng (tab Doanh thu, tab Báo cáo cho ăn).

## 2. Dashboard theo vai trò

### 2.1 Nguyên tắc chung

- **Cùng phạm vi với trang đích:** số trên thẻ dùng cùng điều kiện và phạm vi với trang mà thẻ mở ra.
  - Chủ trại và Quản lý trại: toàn trại.
  - Quản lý khu vực và Kỹ thuật viên: khu vực được giao.
- **Theo giờ Việt Nam (UTC+7):** "hôm nay" và mốc tháng đều tính theo giờ Việt Nam.
- **Phạm vi ao/bể của Kỹ thuật viên:** các ao/bể có người phụ trách là mình. Chưa phụ trách ao/bể nào thì tính toàn khu, và giao diện ghi "Toàn khu vực".
- **Màu viền thẻ việc:** đỏ là nguy hiểm hoặc trễ hạn, cam là cần làm, xám là không có việc ("Không có việc").
- **Tự cập nhật:** các thẻ cảnh báo tự làm mới qua realtime. Khối Kinh doanh chỉ tải khi mở trang, đổi trại hoặc bấm "Làm mới".
- **Dòng thông tin đầu trang:** "Mã trại · Tên trại · Vai trò · Phạm vi", giờ cập nhật và nút Làm mới.

### 2.2 Bố cục

| Vai trò | Thứ tự các khối |
| --- | --- |
| **Chủ trại, Quản lý trại** (cùng một khung) | Việc cần xử lý → **Kinh doanh** → **Sản xuất** → bảng chính |
| **Quản lý khu vực** | Việc cần xử lý → Tình hình khu → bảng "Ao/bể trong khu hôm nay" |
| **Kỹ thuật viên** ("Việc hôm nay") | Dòng "Phụ trách N ao/bể, M lô" → thanh tiến độ ca → Việc cần làm → bảng "Ao/bể của tôi hôm nay" |

Bảng chính của Chủ trại là **Đơn bán chờ giao**, của Quản lý trại là **Cảnh báo đang mở theo khu vực**.

### 2.3 Các thẻ việc theo vai trò

| Vai trò | Thẻ | Cách tính | Bấm mở |
| --- | --- | --- | --- |
| **Chủ trại** (4) | Cảnh báo nguy hiểm đang mở | Cảnh báo môi trường `critical`, trạng thái `open` hoặc `in_progress` | `/alerts` |
| | Lô quá hạn bán | Lô `active` hoặc `ready_for_sale` có ngày dự kiến bán trước hôm nay | `/seed-batches` |
| | Vật tư dưới ngưỡng tối thiểu | `quantity < minThreshold`, cùng quy tắc bộ lọc "Sắp hết" | `/inventory-supplies` |
| | Đơn bán chờ giao | Đơn `confirmed` hoặc `partially_delivered`; ghi "N đơn trễ hẹn giao" và tô đỏ khi có đơn quá ngày hẹn | `/sales-orders`, tab "Chờ giao" |
| **Quản lý trại** (3) | Cảnh báo chưa giao người xử lý | Cảnh báo đang mở, chưa có người phụ trách | `/alerts` |
| | Yêu cầu vật tư chờ duyệt | Yêu cầu `pending` | `/inventory-requests` |
| | Đơn bán chờ giao | Như Chủ trại, kèm số đơn trễ hẹn | `/sales-orders`, tab "Chờ giao" |
| **Quản lý khu vực** (3) | Cảnh báo chưa giao người xử lý | Như Quản lý trại, trong khu | `/alerts` |
| | Ao/bể chưa đo nước 24 giờ | Ao/bể `active` không có số đo nước trong 24 giờ; ghi tên ao | `/care-logs?tab=water-parameters` |
| | Yêu cầu vật tư chờ duyệt | Yêu cầu `pending` của khu | `/inventory-requests` |
| **Kỹ thuật viên** (4) | Cảnh báo giao cho tôi | Cảnh báo đang mở có người phụ trách là mình, trong khu, đã đọc hay chưa đều tính | `/alerts?assignedToMe=true` |
| | Ao/bể chưa cho ăn hôm nay | Ao/bể `active` không có nhật ký cho ăn từ 0 giờ hôm nay; ghi tên ao | `/care-logs?tab=feeding` |
| | Ao/bể chưa đo nước 24 giờ | Ao/bể `active` không có số đo nước trong 24 giờ; ghi tên ao | `/care-logs?tab=water-parameters` |
| | Kiểm tra AI chờ hoặc lỗi | Lần kiểm tra **do mình tạo**, trạng thái `pending` hoặc `failed`, trong khu | `/quality-checks?status=pending,failed&mine=true` |

Thẻ "Lô đến ngày bán trong 7 ngày" của Quản lý trại và Quản lý khu vực đã bỏ khỏi Dashboard.

### 2.4 Khối Kinh doanh (Chủ trại, Quản lý trại)

Tiêu đề ghi tháng hiện tại và ngày, ví dụ "Kinh doanh · tháng 11, tính đến 21/11".

| Ô | Cách tính |
| --- | --- |
| **Doanh thu** | Σ số con đã giao × đơn giá dòng đơn, theo ngày giao trong tháng |
| **Chi phí vật tư** | Σ số lượng × đơn giá của các lần **xuất dùng** (`usage`) trong tháng, theo ngày xuất. Không tính tiền nhập kho (`import`) và điều chỉnh (`adjustment`). |
| **Lợi nhuận gộp** | Doanh thu − chi phí vật tư; dòng phụ "biên N%" (ẩn khi doanh thu bằng 0). Cộng trừ bằng Decimal. |
| **Còn phải thu** | Σ (tổng tiền − đã thu) của đơn `confirmed`, `partially_delivered`, `delivered`, kèm số đơn; bấm mở `/sales-orders?payment=due` |

**Bộ chọn "Theo doanh thu | Theo lô"** (mặc định "Theo doanh thu", không nhớ lựa chọn lần trước):

- **Theo doanh thu:** biểu đồ cột đôi Doanh thu và Tiền đã thu 6 tháng (tháng hiện tại vẽ nét đứt), dòng "Tháng này đã thu … · đã giao … con".
- **Theo lô:** thanh ngang 10 lô doanh thu cao nhất trong 6 tháng và bảng lô (số con đặt, số con giao, doanh thu, đơn giá bình quân, dòng Tổng); bấm mã lô mở chi tiết lô. Chỉ tải khi chọn lần đầu, dùng lại API báo cáo doanh thu.

Chân khối ghi rõ: chi phí chỉ gồm vật tư đã xuất dùng, chưa gồm điện, nhân công và chi phí khác, nên đây là **lợi nhuận gộp**.

### 2.5 Khối Sản xuất (Chủ trại, Quản lý trại)

| Ô | Cách tính | Ai thấy |
| --- | --- | --- |
| Ao/bể đang nuôi / tổng | Ao/bể `active` trên tổng ao/bể chưa xóa; dòng phụ số ao/bể trống | Cả hai |
| Lô trong bể | Tổng lô `active` và `ready_for_sale`, tách "đang ương" và "sẵn sàng bán" | Cả hai |
| Số con trong bể | Tổng `currentEstimatedQuantity` của các lô trên (ước tính, tự trừ khi giao) | Cả hai |
| Giống còn bán được | Lô `ready_for_sale`: Σ (số con ước tính − đã giữ cho đơn); dòng phụ số con đã giữ | Cả hai |
| Giá trị tồn kho | Σ số lượng × đơn giá nhập gần nhất (vốn nằm trong kho, không phải chi phí) | Chủ trại |
| Xử lý cảnh báo trung bình | Trung bình (`handledAt` − `createdAt`) của cảnh báo đã xử lý trong 30 ngày | Quản lý trại |
| Thức ăn 30 ngày qua | Tổng lượng theo đơn vị, số lần, số ao/bể; bấm mở tab Báo cáo cho ăn | Cả hai |

### 2.6 Các bảng chính

- **Đơn bán chờ giao** (Chủ trại): tối đa 5 đơn, hẹn giao sớm nhất trước. Cột: Mã đơn, Khách hàng, Hẹn giao, Đã giao / đặt, Còn phải thu, Tiến độ ("Trễ N ngày" nền đỏ, "Còn N ngày" nền xanh).
- **Cảnh báo đang mở theo khu vực** (Quản lý trại): thanh ngang theo khu (gồm khu chưa có cảnh báo), ghi số cảnh báo và số nguy hiểm; khu bận nhất xếp đầu.
- **Ao/bể trong khu hôm nay** (Quản lý khu vực) và **Ao/bể của tôi hôm nay** (Kỹ thuật viên): mỗi ao/bể một dòng, tối đa 10, ao còn việc xếp trước, ao trống cuối. Cột: Ao/bể · Lô, Phụ trách (chỉ Quản lý khu vực), Cho ăn hôm nay, Đo nước gần nhất, Thức ăn lần gần nhất (Ăn hết / Còn dư / Chưa kiểm tra), Ghi nhanh (chỉ Kỹ thuật viên).

### 2.7 Quản lý khu vực: Tình hình khu

Ao/bể đang nuôi / tổng (kèm tên ao trống), Lô đang ương và số con, Tiến độ hôm nay ("X/Y ao đã cho ăn", "Z/Y ao đã đo nước trong 24 giờ"), Thức ăn 30 ngày của khu. Không có khối Kinh doanh.

### 2.8 Kỹ thuật viên: Việc hôm nay

Không có thống kê. Thanh tiến độ ca gồm "Cho ăn X/Y ao" và "Đo nước Z/Y ao". Cột "Ghi nhanh" có link "Cho ăn", "Đo nước" mở trang Nhật ký chăm sóc đã lọc đúng ao; ao đã xong ghi "Đã xong".

### 2.9 Nhân viên kho

Nhân viên kho không có Dashboard. Vào `/dashboard` thì được chuyển sang trang Vật tư, và menu ẩn mục "Dashboard". Lý do: việc của kho (vật tư sắp hết, yêu cầu chờ xử lý) đã có sẵn bộ lọc ở trang Vật tư và Yêu cầu vật tư.

## 3. Báo cáo doanh thu

### 3.1 Định nghĩa các con số

| Con số | Cách tính | Tính vào tháng nào |
| --- | --- | --- |
| **Doanh thu** | Σ số con đã giao × đơn giá của dòng đơn | Tháng ghi giao hàng |
| **Số con đã giao** | Σ số con trong các lần giao | Tháng ghi giao hàng |
| **Giá trị đơn chốt** | Σ tổng tiền các đơn đã xác nhận, trừ đơn nháp và đơn hủy | Tháng xác nhận đơn |
| **Tiền đã thu** | Σ các khoản thu tiền | Tháng ghi thu tiền |
| **Còn phải thu** | Σ (tổng tiền − đã thu) của đơn `confirmed`, `partially_delivered`, `delivered` | Không theo tháng; tính tại thời điểm xem |

- Mốc tháng tính theo giờ Việt Nam: một lần giao lúc 6 giờ sáng ngày 1 thuộc tháng mới.
- Đơn nháp và đơn hủy không lọt vào con số nào.
- Số tiền cộng bằng kiểu Decimal, không cộng bằng số thực JavaScript.
- **Doanh thu không gồm tiền nhập vật tư.** Tiền nhập vật tư không phải chi phí đã dùng; chỉ vật tư xuất dùng mới được tính vào chi phí ở Dashboard.

### 3.2 Nội dung tab "Doanh thu" (`/sales-revenue`)

| Phần | Nội dung |
| --- | --- |
| Đầu trang | Tiêu đề, dòng "Mã trại · Tên trại · Doanh thu tính theo ngày giao hàng"; bộ lọc **Từ tháng / Đến tháng** (mặc định 6 tháng gần nhất, tối đa 24 tháng) |
| Số tổng | 5 ô: Doanh thu (tô nổi), Số con đã giao (kèm giá bình quân/con), Giá trị đơn chốt, Tiền đã thu, Còn phải thu |
| Theo tháng | Biểu đồ cột đôi Doanh thu và Tiền đã thu; bảng theo tháng có dòng Tổng |
| Theo lô | Thanh ngang 10 lô doanh thu cao nhất; bảng mọi lô, có dòng Tổng; bấm mã lô mở chi tiết lô ở trang Lô giống |

Tổng theo lô bằng tổng theo tháng, vì cả hai cùng tính từ các lần giao trong khoảng.

### 3.3 Xem gộp nhiều trại

- Chủ trại sở hữu từ 2 trại trở lên thấy thêm ô **Phạm vi**: "Trại đang chọn" hoặc "Tất cả trại của tôi (N trại)".
- Danh sách trại do backend tự xác định: các trại mà người dùng có membership Chủ trại đang hoạt động, gồm cả trại đã ngừng hoạt động hoặc đã lưu trữ; quyền quản trị hệ thống không được tính thêm trại.
- Khi xem gộp: số tổng và bảng theo tháng là số cộng các trại; **bảng theo trại** thay cho bảng theo lô, có cột Trạng thái và Còn phải thu; bấm tên trại đang hoạt động thì chuyển sang trại đó.

### 3.4 Quyền xem

| Vai trò | Tab Doanh thu | Khối Kinh doanh trên Dashboard |
| --- | --- | --- |
| Chủ trại | Có, toàn trại; xem gộp nếu có từ 2 trại | Có |
| Quản lý trại | Có, toàn trại | Có |
| Quản lý khu vực | Không thấy tab; mở thẳng đường dẫn thì thấy "Bạn không có quyền xem doanh thu của trại này". Vẫn xem tiền từng đơn trong phạm vi. | Không |
| Kỹ thuật viên, Nhân viên kho | Không | Không |

## 4. API

| Phương thức và đường dẫn | Dùng cho | Quyền |
| --- | --- | --- |
| `GET /api/farms/:farmId/dashboard/summary` | Thẻ việc và số liệu Dashboard (`cards`, `stats`) | Thành viên trại; Nhân viên kho nhận 403 |
| `GET /api/farms/:farmId/sales-orders/reports/revenue?from=YYYY-MM&to=YYYY-MM` | Báo cáo doanh thu một trại (gồm `byBatch`) | Chủ trại, Quản lý trại |
| `GET /api/reports/revenue?from=YYYY-MM&to=YYYY-MM` | Báo cáo gộp các trại của Chủ trại | Chủ trại có từ 2 trại |
| `GET /api/farms/:farmId/sales-orders?status=confirmed,partially_delivered&payment=due` | Danh sách đơn: `status` nhận nhiều giá trị; `payment=due` chỉ lấy đơn còn nợ | Như danh sách đơn hiện có |
| `GET /api/farms/:farmId/environment-thresholds/alerts?assignedToMe=true` | Danh sách cảnh báo "Giao cho tôi"; trả thêm `summary: { pending, critical, inProgress, unassigned }` đếm theo cùng bộ lọc | Như danh sách cảnh báo hiện có |
| `GET /api/farms/:farmId/seed-batches/inspection-history?status=pending,failed&mine=true` | Lịch sử kiểm tra AI lọc theo trạng thái và "lần của tôi" | Như lịch sử hiện có |

`stats` của Dashboard theo vai trò:

| Vai trò | Khóa trong `stats` |
| --- | --- |
| Chủ trại | `production`, `business`, `pendingOrders`, `inventoryValue` (kèm các khóa cũ `batches`, `estimatedQuantity`, `revenue`) |
| Quản lý trại | `production`, `business`, `pendingOrders`, `alertsByArea`, `alertResolution` |
| Quản lý khu vực | `production` (ao/bể), `activeBatches`, `progress`, `tankRows` |
| Kỹ thuật viên | `scope`, `progress`, `tankRows` |

Tham số tháng sai định dạng, khoảng ngược hoặc quá 24 tháng trả 400. Quản lý khu vực và Kỹ thuật viên không bao giờ nhận `business` và `pendingOrders`.

## 5. Mã nguồn chính

| Phần | File |
| --- | --- |
| Service Dashboard | [summary.service.js](../../BE/src/services/dashboard/summary.service.js) |
| Service doanh thu | [revenue-report.service.js](../../BE/src/services/sales/revenue-report.service.js) |
| Lọc cảnh báo, tóm tắt cảnh báo | [environment-threshold.service.js](../../BE/src/services/environment/environment-threshold.service.js) |
| Lịch sử kiểm tra AI | [quality-history.service.js](../../BE/src/services/seed/quality-history.service.js) |
| Route, controller doanh thu | [routes/sales/sales](../../BE/src/routes/sales/sales/), [controllers/sales/sales/get.js](../../BE/src/controllers/sales/sales/get.js) |
| Trang Dashboard và component | [pages/dashboard/index.vue](../../FE/src/pages/dashboard/index.vue), [components/](../../FE/src/pages/dashboard/components/), [format.js](../../FE/src/pages/dashboard/format.js) |
| Trang Doanh thu | [pages/sales-revenue/index.vue](../../FE/src/pages/sales-revenue/index.vue) |
| Trang Cảnh báo, Kiểm tra AI | [pages/alerts/index.vue](../../FE/src/pages/alerts/index.vue), [pages/quality/index.vue](../../FE/src/pages/quality/index.vue) |
| Tab Báo cáo cho ăn | [FeedingReport.vue](../../FE/src/pages/care/components/FeedingReport.vue) |
| Test backend | [dashboard-summary.test.js](../../BE/test/dashboard-summary.test.js), [revenue-report.test.js](../../BE/test/revenue-report.test.js), [sales-order-status-filter.test.js](../../BE/test/sales-order-status-filter.test.js), [alert-list-filters.test.js](../../BE/test/alert-list-filters.test.js), [quality-history-filters.test.js](../../BE/test/quality-history-filters.test.js) |
| Test frontend | [format.test.js](../../FE/src/pages/dashboard/format.test.js) |

## 6. Kiểm thử và kiểm chứng

- **Test backend:** 51 test đạt (Prisma giả), gồm: số thẻ từng vai trò (4, 3, 3, 4); mốc "hôm nay" và mốc tháng theo giờ Việt Nam; đơn trễ hẹn; sản xuất và giống còn bán được; chi phí vật tư chỉ cộng `usage` và lợi nhuận cộng Decimal; Quản lý khu vực, Kỹ thuật viên không nhận `business`; bảng ao/bể; phân quyền và quy tắc báo cáo doanh thu; xem gộp chỉ tính trại có membership Chủ trại thật; bộ lọc "Giao cho tôi", tóm tắt cảnh báo, lọc trạng thái và "lần của tôi".
- **Test frontend:** 8 test đạt; `npm run build` đạt.
- **Đối chiếu trên database thật** (chỉ đọc): doanh thu, giá trị đơn chốt, tiền đã thu, còn phải thu khớp phép tính độc lập; chi phí vật tư tháng 11 (250.000 đ) khớp tổng các lần `usage`, tiền nhập kho và điều chỉnh không bị tính; giống còn bán được khớp số khả dụng khi lập đơn; số cảnh báo giao cho Kỹ thuật viên khớp thẻ Dashboard.

## 7. Giới hạn và việc còn lại

| Việc | Tình trạng |
| --- | --- |
| Xem giao diện trên trình duyệt với từng vai trò, độ rộng điện thoại, 5 đường vào của Nhân viên kho, realtime thẻ cảnh báo | **Chưa kiểm tra.** |
| Link "Ghi nhanh" của Kỹ thuật viên | Mới mở trang Nhật ký chăm sóc đã lọc đúng ao, chưa tự mở sẵn form ghi (cần quyết định thêm hành vi mới). |
| Cột "Mã đơn" ở bảng đơn chờ giao | Hiển thị chữ thường, chưa bấm mở đơn vì trang đơn bán chưa mở được một đơn theo đường dẫn. |
| Các thẻ khác (vật tư sắp hết, yêu cầu chờ duyệt, lô quá hạn, cảnh báo nguy hiểm hoặc chưa giao người) | Chỉ mở trang thường, chưa lọc sẵn; hiện chỉ thẻ đơn bán, thẻ Kỹ thuật viên mở đúng danh sách đã lọc. |
| Ô tóm tắt của trang Bán giống | Vẫn chỉ đếm trên trang đang xem (trang Cảnh báo đã sửa). |
| Ao/bể `active` nhưng không có lô | Vẫn bị tính vào "chưa cho ăn" và "chưa đo nước"; chưa đổi quy tắc. |
| Chi phí khác ngoài vật tư, lợi nhuận ròng, chi phí và lợi nhuận theo lô | Chưa có module chi phí; khi xuất kho không ghi lô nên chưa phân bổ theo lô được. |
| Các mục đã bỏ khỏi Dashboard | Khối "Cần chú ý", dải "Đang chờ duyệt", bảng và thẻ "Lô đến ngày bán trong 7 ngày", dòng nhắc trong Nhật ký chăm sóc. |
| Cập nhật SRS, use case, sơ đồ, `PERMISSIONS.md`, `WORKFLOWS.md` (UC18, UC09.1, UC08.6) | Chưa làm (giai đoạn 7 của plan). |
| Xem gộp nhiều trại | Đã có test backend, chưa thử trên giao diện với dữ liệu thật của một Chủ trại sở hữu từ 2 trại. |
