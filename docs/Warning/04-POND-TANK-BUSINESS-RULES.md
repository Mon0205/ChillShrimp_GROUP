# Cảnh báo: Quy tắc nghiệp vụ ao/bể

## POND-01 — Owner có thể tạo ao/bể không thuộc khu vực

**Mức độ:** High  
**Trạng thái:** Chờ chốt với partner

### Logic hiện tại

`area_id` chỉ bắt buộc khi Area Manager tạo ao/bể. Owner có thể tạo ao/bể với `area_id = null` và giao diện hiển thị phạm vi “Toàn trại”.

### Rủi ro

- Không phù hợp cấu trúc `Farm → Area → Pond/Tank` nếu khu vực là bắt buộc.
- Area Manager và Technician không thể quản lý bản ghi không có khu vực.
- Báo cáo theo khu vực không đầy đủ.

### Cần partner chốt

Mọi ao/bể có bắt buộc thuộc chính xác một khu vực không?

### Đề xuất

Nếu câu trả lời là có, đổi `area_id` thành bắt buộc ở API, frontend và database bằng migration mới sau khi xử lý dữ liệu cũ.

## POND-02 — Mã ao/bể sau soft delete

**Mức độ:** Medium

### Logic hiện tại

Unique constraint `(farm_id, code)` bao gồm cả bản ghi đã soft delete. Mã cũ không thể được tái sử dụng.

### Cần partner chốt

- Mã ao/bể là định danh vĩnh viễn hay có thể tái sử dụng?
- Khi tạo trùng với bản ghi đã xóa, hệ thống yêu cầu khôi phục hay tạo mới?

### Đề xuất

Ưu tiên giữ mã vĩnh viễn để bảo toàn truy vết. Giao diện cần thông báo rõ rằng mã thuộc ao/bể đã xóa và hướng dẫn khôi phục.

## POND-03 — Cho phép chuyển `active → inactive` trực tiếp

**Mức độ:** High

### Logic hiện tại

State machine cho phép ao/bể đang hoạt động chuyển thẳng sang ngừng sử dụng.

### Rủi ro

Khi có module lô giống, thao tác này có thể bỏ qua kết thúc lô, ghi nhận số lượng cuối, xuất bán và vệ sinh.

### Cần partner chốt

- `active → inactive` có phải trường hợp dừng khẩn cấp không?
- Có bắt buộc qua `cleaning` hoặc `empty` trước không?
- Ai được phép thực hiện dừng khẩn cấp?

### Đề xuất

Luồng bình thường nên là `active → cleaning → empty → inactive`. Nếu cần dừng khẩn cấp, tạo thao tác riêng có lý do và audit log.

## POND-04 — Xóa mềm chưa kiểm tra dữ liệu nghiệp vụ tương lai

**Mức độ:** High khi triển khai lô giống

Hiện tại hệ thống chỉ yêu cầu ao/bể ở trạng thái `empty` hoặc `inactive` trước khi soft delete. Khi có lô giống và nhật ký, cần bổ sung điều kiện không còn lô active hoặc nghiệp vụ chưa hoàn tất.

## POND-05 — PATCH body rỗng vẫn được chấp nhận

**Mức độ:** Medium

`updatePondTank()` chưa từ chối body không chứa trường cập nhật hợp lệ. Request rỗng vẫn có thể cập nhật `updated_at`.

### Đề xuất

Trả HTTP `400` với thông báo “Không có thông tin ao/bể cần cập nhật”, nhất quán với `updateArea()`.

## POND-06 — Bộ lọc dữ liệu đã xóa dễ gây hiểu nhầm

**Mức độ:** Low

`includeDeleted=true` trả cả bản ghi đang hoạt động và đã xóa, trong khi nhãn giao diện là “Dữ liệu đã xóa”. Nên đổi thành “Bao gồm ao/bể đã xóa” hoặc dùng filter `active/deleted/all`.

## POND-07 — Frontend hiển thị cả chuyển trạng thái không hợp lệ

**Mức độ:** Medium

Dialog hiện hiển thị toàn bộ trạng thái, sau đó backend mới từ chối transition sai. Nên lọc trạng thái đích dựa trên trạng thái hiện tại và giải thích luồng chuyển hợp lệ.

