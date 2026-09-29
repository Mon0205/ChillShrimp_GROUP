# Danh sách cảnh báo nghiệp vụ cần chốt

Thư mục này ghi nhận các điểm chưa thống nhất hoặc có rủi ro trong codebase hiện tại để nhóm trao đổi với partner trước khi tiếp tục phát triển. Đây không phải danh sách lỗi đã được xác nhận hoàn toàn; mỗi mục cần có quyết định nghiệp vụ và người phụ trách trước khi sửa code hoặc migration.

## Tài liệu theo nhóm chức năng

| Nhóm | Tài liệu | Mức ưu tiên |
| --- | --- | --- |
| Tài khoản, lời mời và nhiều trang trại | [01-AUTH-MULTI-FARM-INVITATION.md](./01-AUTH-MULTI-FARM-INVITATION.md) | Critical |
| Toàn vẹn dữ liệu và quan hệ database | [02-DATABASE-DATA-INTEGRITY.md](./02-DATABASE-DATA-INTEGRITY.md) | Critical |
| Vòng đời trang trại và khu vực | [03-FARM-AREA-LIFECYCLE.md](./03-FARM-AREA-LIFECYCLE.md) | High |
| Quản lý ao/bể | [04-POND-TANK-BUSINESS-RULES.md](./04-POND-TANK-BUSINESS-RULES.md) | High |
| Kiểm thử, thông báo và tính nhất quán API | [05-TESTING-ERROR-HANDLING.md](./05-TESTING-ERROR-HANDLING.md) | Medium |

## Bảng quyết định tổng hợp

| ID | Nội dung cần chốt | Trạng thái | Quyết định | Người phụ trách |
| --- | --- | --- | --- | --- |
| AUTH-01 | Mọi role có được tham gia nhiều farm không? | Chờ chốt |  |  |
| AUTH-02 | Luồng mời user đã có tài khoản vào farm mới | Chờ chốt |  |  |
| AUTH-03 | Cơ chế khôi phục khi Neon Auth thành công nhưng Prisma thất bại | Chờ chốt |  |  |
| DB-01 | Quan hệ User–Farm khi xóa người tạo farm | Chờ chốt |  |  |
| DB-02 | Constraint bảo đảm `area_id` thuộc đúng `farm_id` | Chờ chốt |  |  |
| DB-03 | Cách chống race condition cho archive/deactivate/delete | Chờ chốt |  |  |
| FARM-01 | Điều kiện chính xác để archive farm | Chờ chốt |  |  |
| AREA-01 | Có cho phép xóa vật lý khu vực không? | Chờ chốt |  |  |
| POND-01 | Mọi ao/bể có bắt buộc thuộc một khu vực không? | Chờ chốt |  |  |
| POND-02 | Mã ao/bể đã xóa có được tái sử dụng không? | Chờ chốt |  |  |
| POND-03 | Có cho phép `active → inactive` trực tiếp không? | Chờ chốt |  |  |
| POND-04 | Điều kiện xóa mềm sau khi có lô giống và nhật ký | Chờ chốt |  |  |
| API-01 | PATCH body rỗng phải trả lỗi hay chấp nhận no-op? | Chờ chốt |  |  |

## Quy ước cập nhật

- `Chờ chốt`: chưa có quyết định thống nhất.
- `Đã chốt`: đã thống nhất nghiệp vụ nhưng chưa chắc đã hiện thực.
- `Đang xử lý`: đã giao người phụ trách.
- `Đã xử lý`: code, migration và test đã hoàn thành.
- Mọi quyết định ảnh hưởng database phải ghi rõ có cần migration mới hay không.
- Không sửa migration đã được áp dụng trên Neon; tạo migration mới nếu cần thay đổi schema.

