# Cảnh báo: Kiểm thử, thông báo và tính nhất quán API

## TEST-01 — Chưa có bộ unit test được commit

**Mức độ:** High

`BE/package.json` đã có lệnh `npm test` và `npm run test:coverage`, nhưng hiện chưa có thư mục `BE/test` trong repository.

### Rủi ro

- Business rule dễ regression khi phát triển lô giống.
- Không xác minh tự động RBAC, area scope, archive và soft delete.
- Pull Request không có bằng chứng kiểm thử lặp lại được.

### Test ưu tiên

1. Role và phạm vi `farm_id`/`area_id`.
2. Archive farm và blocker.
3. Ngừng/xóa khu vực và blocker.
4. State transition ao/bể.
5. Soft delete và restore.
6. Invitation cho user mới và user đã tồn tại.
7. Các tình huống request đồng thời.

## API-01 — Một số PATCH body rỗng không bị từ chối

**Mức độ:** Medium

`updateFarm()` và `updatePondTank()` chưa kiểm tra payload có trường hợp lệ hay không, trong khi `updateArea()` đã kiểm tra. Cần thống nhất quy ước API.

## UI-01 — Trạng thái lỗi và lỗi mạng chưa đầy đủ

**Mức độ:** Medium

Các điểm cần tiếp tục xử lý:

- Phân biệt empty state với lỗi tải dữ liệu.
- Có nút “Thử lại”.
- Reset lỗi sau khi tải thành công.
- Chuyển lỗi `fetch`, timeout và backend unavailable thành thông báo thân thiện.
- Tách lỗi thao tác chính với lỗi tải lại danh sách sau thao tác thành công.

## UI-02 — Validation frontend chưa đồng đều giữa các module

Form ao/bể đã được bổ sung validation từng trường. Form trang trại, khu vực, người dùng và hồ sơ vẫn chủ yếu dựa vào `required`, toast chung hoặc validation backend.

### Đề xuất

Tạo helper validation dùng chung cho mã, tên, email, số điện thoại và giới hạn độ dài; không sao chép quy tắc rời rạc giữa các page.

## API-02 — Thông báo lỗi cần mã lỗi ổn định

Frontend hiện dựa nhiều vào nội dung `message`, ví dụ nhận biết mã ao/bể trùng bằng chuỗi thông báo. Thay đổi câu chữ backend có thể làm frontend mất ánh xạ lỗi trường.

### Đề xuất

Chuẩn hóa response lỗi:

```json
{
  "code": "POND_CODE_EXISTS",
  "message": "Mã ao/bể đã tồn tại trong trang trại.",
  "field": "code"
}
```

Frontend dùng `code` hoặc `field`, không phân tích nội dung tiếng Việt.

