# Nghiệp vụ cảnh báo môi trường, bán tôm giống và khách hàng

## 1. Phạm vi và vai trò

Dữ liệu được quản lý riêng theo trại. Sử dụng các vai trò hiện có, không thêm vai trò nhân viên bán hàng hoặc tài khoản khách tự đặt hàng.

| Nghiệp vụ | Chủ trại / quản lý trại | Quản lý khu vực | Kỹ thuật viên | Nhân viên kho |
| --- | --- | --- | --- | --- |
| Xem cảnh báo | Toàn trại | Đúng khu vực | Đúng khu vực | Không |
| Cấu hình, duyệt ngưỡng | Có | Không | Không | Không |
| Giao cảnh báo | Cho người hợp lệ trong trại | Cho người hợp lệ trong khu vực | Không | Không |
| Nhận, xử lý cảnh báo | Không | Đúng khu vực, được giao hoặc chưa phân công | Đúng khu vực, được giao hoặc chưa phân công | Không |
| Quản lý khách hàng | Trong trại | Trong trại | Không | Không |
| Lập/sửa đơn nháp, ghi giao | Toàn trại | Đơn có toàn bộ lô thuộc khu vực mình | Không | Không |
| Xác nhận giữ lượng, thu tiền | Có | Không | Không | Không |
| Hủy đơn nháp | Có | Trong phạm vi | Không | Không |
| Hủy đơn đã xác nhận | Có, nếu chưa giao và chưa thu | Không | Không | Không |

Thành viên bị đình chỉ hoặc chuyển khu vực không được tiếp tục thao tác ngoài phạm vi mới. Đơn chứa lô từ nhiều khu vực chỉ người có quyền toàn trại được quản lý.

## 2. Cảnh báo môi trường

### Sinh cảnh báo

1. Chủ trại/quản lý trại duyệt và kích hoạt ngưỡng theo loài, giai đoạn phát triển, loại bể và thời gian hiệu lực.
2. Nhân viên ghi số đo tại Nhật ký chăm sóc → Môi trường nước.
3. Backend lưu số đo và sinh cảnh báo vượt ngưỡng trong cùng transaction. Không có ngưỡng phù hợp thì chỉ lưu số đo, không kết luận là an toàn.
4. Tự phân công cho người phụ trách bể nếu là kỹ thuật viên/quản lý khu vực đang hoạt động đúng trại và khu vực. Nếu không hợp lệ thì chọn quản lý khu vực phù hợp; không có người phù hợp thì để chưa phân công.

### Giao, nhận và xử lý

- Người quản lý chỉ giao cho kỹ thuật viên/quản lý khu vực đang hoạt động đúng trại và khu vực của bể. Không giao cho chính mình, chủ trại hoặc quản lý trại.
- Người được giao tự bấm **Nhận xử lý**. Người đủ quyền cùng khu vực có thể tự nhận cảnh báo chưa phân công; không nhận thay hoặc giành việc đã giao người khác.
- Nhận việc lần đầu chuyển cảnh báo sang đang xử lý, ghi nhận người và thời điểm nhận. Chỉ người phụ trách đã nhận việc được ghi kết quả hoặc đóng cảnh báo.
- Cập nhật kết quả phải có ghi chú 1–4.000 ký tự, nêu biện pháp hoặc số đo kiểm tra lại.
- Giao lại hủy xác nhận nhận việc của người cũ. Đổi người phụ trách bể không tự đổi phân công trên các cảnh báo cũ.
- Cập nhật dùng phiên bản để tránh ghi đè khi nhiều người thao tác đồng thời.
- Luồng trạng thái: `open` → `in_progress` → `resolved`; `resolved` là kết thúc. Số đo bình thường mới không tự đóng cảnh báo đang có.

### Chuông thông báo và giao diện

- Chuông mở dropdown hai tab **Hệ thống / Cá nhân**, có số chưa đọc riêng và badge tổng.
- **Hệ thống:** tối đa 5 cảnh báo chưa đọc gần nhất trong phạm vi quyền. Đã đọc thì không còn hiện trong tab này, nhưng vẫn tra cứu được ở danh sách cảnh báo.
- **Cá nhân:** thông báo khi được giao, giao lại hoặc tự phân công lúc sinh cảnh báo. Hiện cả đã đọc/chưa đọc, 5 dòng/trang. Nhận việc và cập nhật kết quả không tạo thêm thông báo.
- Mở thông báo cá nhân đánh dấu đã đọc rồi tới trang chi tiết, không tự nhận xử lý. Đọc lặp giữ thời điểm đọc ban đầu.
- Khi giao lại người khác hoặc người nhận mất quyền, thông báo cũ không còn hiện/đếm chưa đọc cho người đó. Bản ghi sự kiện vẫn được lưu.
- Mỗi người có lượt đọc riêng. **Đã đọc không đồng nghĩa đã xử lý.** Hai nguồn tải độc lập, cập nhật định kỳ 30 giây khi trang đang hiển thị.
- Chi tiết cảnh báo là trang riêng, có quay lại danh sách, số đo, ngưỡng, nhật ký liên quan, phân công và kết quả xử lý. Không mở bằng sidebar hoặc hộp thoại.
- Thống kê danh sách chỉ tính trang hiện tại theo bộ lọc, không phải tổng toàn trại.

## 3. Khách hàng và bán tôm giống

### Khách hàng

- Khách hàng là danh mục chung trong trại. Tên bắt buộc; điện thoại và địa chỉ tùy chọn.
- Giao diện gồm bảng, tìm kiếm và nút thêm; thêm/sửa bằng hộp thoại giữa màn hình. Không hiển thị thống kê khách hàng.
- Không thêm người phụ trách riêng cho khách hàng. **Người lập đơn chính là người phụ trách đơn đó**, lấy từ `SalesOrder.createdBy` / `creator`.
- Đơn giữ thông tin khách tại thời điểm lập. Sửa danh mục không làm thay đổi thông tin lịch sử trên đơn.

### Luồng bán giống

1. Tạo/chọn khách hàng; chuẩn bị lô ở trạng thái `ready_for_sale` trong bể và khu vực đang hoạt động.
2. Lập đơn nháp theo 3 bước: khách hàng, ngày giao và ghi chú; chọn lô, số lượng và đơn giá; kiểm tra rồi lưu.
3. Một đơn có thể gồm nhiều lô, không trùng lô. Số lượng là số con nguyên dương, đơn giá tối đa 2 chữ số thập phân. Backend tính tiền chính xác; nháp chưa giữ lượng.
4. Chủ trại/quản lý trại xác nhận đơn. Hệ thống kiểm tra lại trạng thái lô và lượng khả dụng, rồi giữ lượng trong transaction.
5. Ghi giao từng đợt theo từng dòng, không vượt lượng đặt còn lại. Mỗi lần giao giảm đồng thời lượng ước tính và lượng đang giữ của lô.
6. Chủ trại/quản lý trại ghi tiền cọc hoặc các lần thanh toán sau khi xác nhận đơn. Tổng thu không vượt giá trị đơn.
7. Giao hàng và thu tiền độc lập. Giao đủ và thu đủ thì đơn tự hoàn tất; giao đủ nhưng còn nợ thì tiếp tục theo dõi thu tiền.
8. Xuất hết lô thì chuyển `sold`. Bể chuyển `cleaning` khi không còn lô mở; sau vệ sinh, nhân viên cập nhật bể theo quy trình hiện có.

Trạng thái đơn: `draft`, `confirmed`, `partially_delivered`, `delivered`, `completed`, `cancelled`. Trạng thái thanh toán riêng: `unpaid`, `partial`, `paid`.

Danh sách tách rõ tiến độ giao, thanh toán, người lập và trạng thái đơn. Chi tiết dùng hộp thoại giữa màn hình với các tab giống trong đơn, giao hàng, thu tiền và hủy đơn theo quyền. Thống kê đơn chỉ tính trang hiện tại theo bộ lọc.

### Kiểm soát số lượng và giao dịch

- Khả dụng = `currentEstimatedQuantity − reservedQuantity`.
- Khóa transaction ngăn nhiều đơn cùng giữ lượng vượt khả dụng.
- Không giảm lượng ước tính xuống dưới lượng đang giữ, kết thúc lô còn giữ hàng hoặc chuyển `sold` thủ công để bỏ qua xuất giao.
- Mỗi lần giao/thu dùng `idempotencyKey`. Gửi lại cùng key và dữ liệu không tạo giao dịch trùng; key cũ với dữ liệu khác bị từ chối. Sau lỗi kết nối, lần thử lại giữ nguyên nội dung giao dịch trước.
- Chỉ hủy đơn đã xác nhận khi chưa giao và chưa nhận tiền; hủy giải phóng lượng đã giữ. Hoàn trả và hoàn tiền chưa nằm trong luồng hiện tại.
- Chứng từ ghi người thực hiện và thời gian máy chủ. Tồn là số lượng ước tính, cần kiểm tra thực tế trước khi ghi giao.

## 4. Database và vận hành

Các migration đã áp dụng vào DB đang dùng:

| Migration | Thay đổi |
| --- | --- |
| `20261107_001_add_alert_reads_and_handling` | Lượt đọc riêng từng người và thông tin xử lý cảnh báo |
| `20261107_002_add_seed_sales` | Khách hàng, đơn/dòng đơn, giao/dòng giao, thu tiền và lượng giữ trên lô |
| `20261107_003_add_alert_responsibility` | Người phụ trách, thông tin giao/nhận và phiên bản cảnh báo |
| `20261108_004_add_alert_assignment_notifications` | Thông báo giao việc cá nhân và bổ sung thông báo cho người nhận hợp lệ |

Đổi giao diện và sắp xếp cấu trúc backend không cần migration mới. Khi thay đổi backend/schema cần build lại, chạy tại thư mục gốc:

```bash
docker compose up -d --build backend
```

Backend khởi động bằng script migration của dự án; Prisma client được tạo khi build image. Không sửa migration đã áp dụng hoặc reset DB. Các cảnh báo, số đo và ngưỡng `[TEST]` thêm ngày 07/11/2026 đã được xóa theo yêu cầu.

Hiện chỉ có thông báo trong ứng dụng, chưa gửi email/Zalo/push. Kết quả xử lý cảnh báo lưu lần cập nhật gần nhất, chưa có lịch sử đầy đủ từng lần xử lý.
