# Cảnh báo: Vòng đời trang trại và khu vực

## FARM-01 — Điều kiện archive farm cần được chốt chính thức

**Mức độ:** High  
**Trạng thái:** Chờ chốt với partner

### Logic hiện tại

Farm chỉ được archive khi không còn:

- Khu vực active.
- Ao/bể chưa inactive và chưa soft delete.
- Lời mời pending.
- Nhân viên active khác Owner.

### Điểm cần làm rõ

- Có cần chặn archive khi còn giao dịch hoặc nghiệp vụ tương lai chưa hoàn tất không?
- Ao/bể đã soft delete nhưng trạng thái cũ là active có được bỏ qua không?
- Owner có được khôi phục farm bất kỳ lúc nào không?
- Các dashboard và báo cáo có bao gồm farm archived không?

### Đề xuất

Định nghĩa một checklist đóng farm thống nhất cho các module: nhân sự, ao/bể, lô giống, kho, chi phí, bán giống và cảnh báo.

## AREA-01 — Xóa vật lý khu vực hay chỉ ngừng hoạt động

**Mức độ:** Medium

### Logic hiện tại

Khu vực inactive có thể bị xóa vật lý nếu không còn member, invitation hoặc pond/tank liên kết.

### Rủi ro

- Sau khi thêm nhật ký hoặc báo cáo, khu vực có thể còn được tham chiếu gián tiếp.
- Xóa vật lý làm mất danh mục phục vụ truy vết lịch sử.

### Cần partner chốt

- Khu vực đã từng vận hành có được xóa không?
- Có cần soft delete giống ao/bể không?

### Đề xuất

Khu vực đã phát sinh dữ liệu nghiệp vụ chỉ nên chuyển `inactive`. Chỉ cho xóa vật lý khu vực vừa tạo và chưa từng được sử dụng, hoặc chuyển toàn bộ sang soft delete.

## AREA-02 — Thông báo middleware chưa đúng ngữ cảnh

**Mức độ:** Low

`requireFarmManager` được dùng cho API khu vực nhưng thông báo hiện tại nói người dùng không có quyền “quản lý người dùng”. Nên đổi sang thông báo chung về quản lý farm/khu vực hoặc tách middleware theo chức năng.

