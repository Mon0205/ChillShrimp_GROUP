# Cảnh báo và thông báo realtime bằng Socket.IO

## Mục tiêu và phạm vi

Thực hiện kế hoạch người dùng cung cấp: thay polling 30 giây của chuông và trang `/alerts` bằng sự kiện Socket.IO. Socket chỉ báo dữ liệu thay đổi; frontend tiếp tục lấy dữ liệu qua API hiện tại, giữ nguyên phân quyền, bộ lọc và phân trang.

Phạm vi: server backend, các service ghi cảnh báo/thông báo, xác thực phiên hiện tại, module socket dùng chung phía frontend, `AlertBell.vue`, trang cảnh báo, cấu hình proxy và dependencies. Không chuyển các trang kho/lô giống sang realtime; không thay schema database.

## Hiện trạng đã kiểm tra

- `BE/src/server.js` chạy Express bằng `app.listen`.
- API xác thực qua cookie Neon, `withAuthContext`, `readNeonSession` và `accountAccess`. Phiên có hạn cố định tối đa 24 giờ.
- `createEnvironmentAlerts(tx, ...)` chạy trong transaction của `createWaterParameterLog`. Thông báo giao việc cũng được ghi trong transaction.
- Phân công, nhận việc và cập nhật xử lý đi qua `mutateAssignment`.
- Cảnh báo hệ thống có trạng thái đọc riêng từng user; thông báo giao việc chỉ dành cho người nhận còn đủ quyền trong khu vực.
- Chuông và trang cảnh báo đều có `setInterval(..., 30000)`.
- Vite và Nginx hiện chỉ proxy API, chưa có cấu hình upgrade WebSocket.

## Phương án

Chọn Socket.IO gửi tín hiệu thay đổi, theo kế hoạch người dùng. So với đẩy toàn bộ bản ghi qua socket, phương án này dùng lại API, serializer và kiểm tra quyền hiện tại. So với SSE, Socket.IO đáp ứng lựa chọn của người dùng và có sẵn cơ chế reconnect.

### Kết nối và xác thực

Gắn Socket.IO vào HTTP server chạy Express, dùng đường dẫn `/socket.io`. CORS dùng cùng origin được cấu hình cho API, bật credentials; kiểm tra origin lúc handshake cho cả WebSocket. Không nhận userId, role hoặc danh sách room do client tự khai báo.

Handshake dùng cookie và cùng cơ chế đọc phiên Neon/kiểm tra tài khoản như API, qua adapter request context. Nếu cookie cần được cập nhật, phải chuyển Set-Cookie qua HTTP handshake; không giả lập cookie setter rồi bỏ qua kết quả. Từ chối phiên không hợp lệ, bị thu hồi hoặc tài khoản bị đình chỉ. Ngắt kết nối khi đến `sessionExpiresAt`.

Backend xác định room user và room phạm vi trại/khu vực từ quyền hiện tại: Owner/Farm Manager xem toàn trại; Area Manager/Technician chỉ xem khu vực được phân công. System admin giữ phạm vi truy cập tương đương API. Role khác không tham gia luồng cảnh báo.

Không chỉ dựa vào quyền lúc kết nối. Trước mỗi đợt phát sự kiện, kiểm tra lại quyền và phiên của các kết nối liên quan, cập nhật room hoặc ngắt kết nối không còn hợp lệ. Lỗi kiểm tra quyền thì không gửi sự kiện cho kết nối đó. Cách này tránh giữ room cũ sau khi đổi khu vực hoặc đình chỉ tài khoản, đồng thời không cần polling quyền định kỳ.

### Sự kiện và transaction

Payload tối thiểu gồm `farmId`, `alertId`; sự kiện thông báo có thêm `notificationId` khi cần. Không gửi nội dung cảnh báo hoặc thông tin người nhận vào room rộng hơn phạm vi được phép.

| Sự kiện | Thời điểm | Người nhận |
| --- | --- | --- |
| `alert:created` | Transaction tạo nhật ký nước và cảnh báo commit thành công | Người có quyền xem cảnh báo đó |
| `alert:updated` | Phân công, nhận việc hoặc lưu xử lý commit thành công | Người có quyền xem cảnh báo đó |
| `notification:created` | Thông báo giao việc đã commit | Riêng người nhận còn đủ quyền |
| `alert:read` | Lưu trạng thái đọc thành công | Các kết nối của chính user, còn quyền xem cảnh báo |
| `notification:read` | Lưu trạng thái đọc thông báo thành công | Các kết nối của chính người nhận, còn đủ quyền |

Không emit bên trong `createEnvironmentAlerts(tx, ...)` hoặc `createAssignmentNotification(tx, ...)`. Trả dữ liệu cần phát về service sở hữu transaction, rồi emit sau khi `await prisma.$transaction(...)` thành công. Rollback không phát sự kiện. Giữ nguyên optimistic concurrency bằng `assignmentVersion`.

Thông báo cũ của người từng được giao có thể biến mất sau khi phân công lại; `alert:updated` làm chuông của những người có quyền trong phạm vi tải lại cả hai danh sách để đồng bộ trường hợp này.

Lỗi phát socket được ghi log và không biến thao tác database đã commit thành lỗi API. Không retry ghi database để bù lỗi socket. Khi reconnect, API nạp lại trạng thái hiện tại. Không bổ sung outbox hoặc adapter đa server trong thay đổi này.

### Frontend

Một module quản lý một socket cho mỗi tab, dùng endpoint suy ra từ cấu hình API hiện tại và gửi cookie bằng credentials. Lifecycle gắn với trạng thái đăng nhập: tạo kết nối khi có user, ngắt và xóa listener khi logout/mất phiên/đổi user. Server không nhận token từ localStorage.

Component đăng ký bằng hàm subscribe có trả về hàm cleanup. Gộp tín hiệu trong khoảng 200 ms trước khi gọi API; lọc theo `farmId` đang chọn. Không dùng lại vòng polling 30 giây làm fallback.

- Chuông: tải lần đầu như hiện tại; nhận sự kiện thì tải lại danh sách và số chưa đọc tương ứng. `alert:updated` cũng làm mới thông báo cá nhân. Giữ thao tác thử lại và mở chuông thủ công.
- Trang `/alerts`: làm mới danh sách theo bộ lọc/phân trang hiện tại. Nếu sự kiện liên quan chi tiết đang mở, tải lại chi tiết bằng hàm riêng, không gọi hàm mở trang đang xóa form và hủy thao tác ghi.
- Không xóa ghi chú chưa lưu khi nhận sự kiện. Nếu đang lưu hoặc đang tải chi tiết, giữ cờ cần làm mới và thực hiện sau đó. Dữ liệu quyền/trạng thái/assignmentVersion phải được cập nhật; API vẫn kiểm tra xung đột khi lưu.
- Khi socket kết nối hoặc kết nối lại: tải lại dữ liệu của component đang hoạt động, gồm chi tiết đang mở. Nếu tab ẩn, giữ cờ và cập nhật khi hiện lại.
- Khi đổi trại hoặc unmount: hủy request và debounce đang chờ, bỏ listener; không để response của trại cũ ghi đè dữ liệu mới.
- Gộp cả tín hiệu socket và `alerts:refresh` hiện tại để hạn chế request trùng khi chính tab đó vừa thao tác API.

### Proxy và dependencies

Thêm `socket.io` cho backend, `socket.io-client` cho frontend, cập nhật đúng lockfile. Vite proxy `/socket.io` với `ws: true`. Nginx thêm location tương ứng, HTTP/1.1, các header Upgrade/Connection và timeout phù hợp heartbeat. Giữ đường dẫn socket nhất quán giữa browser, proxy và server.

## Kiểm chứng trước khi hoàn thành

1. Handshake thiếu cookie/sai phiên/hết hạn/bị đình chỉ bị từ chối; origin không được phép bị từ chối.
2. Owner/manager nhận đúng phạm vi; kỹ thuật viên khu vực khác và thành viên trại khác không nhận sự kiện. Đổi quyền hoặc khu vực khi socket đang mở không giữ quyền cũ.
3. Commit tạo cảnh báo, phân công, nhận việc và xử lý phát đúng sự kiện; rollback không phát. Thông báo cá nhân chỉ tới đúng người nhận; đọc đồng bộ các tab của cùng user.
4. Burst sự kiện được gộp; reconnect làm mới danh sách và chi tiết; unmount/logout không còn listener hay request chờ.
5. Cập nhật chi tiết giữ ghi chú đang nhập; sự kiện đến trong lúc lưu không hủy request lưu và không bị bỏ mất.
6. Chạy test phù hợp backend/frontend, build frontend, kiểm tra cấu hình proxy và xác nhận hai component không còn polling 30 giây.

## Giới hạn triển khai

Thiết kế dành cho một tiến trình backend như server hiện tại. Nhiều replica cần adapter/pub-sub chung để phát xuyên tiến trình. Socket không lưu lịch sử sự kiện; reconnect khôi phục trạng thái qua API. Ngừng kết nối kéo dài vẫn cho phép người dùng làm mới thủ công.

## Trạng thái

Người dùng đã yêu cầu triển khai. Code và test đã được bổ sung; kết quả kiểm chứng nằm trong `../plans/2026-11-21-alert-realtime.md`.
