# Cảnh báo: Toàn vẹn dữ liệu và quan hệ database

## DB-01 — Xóa người tạo có thể cascade xóa trang trại

**Mức độ:** Critical  
**Trạng thái:** Chờ chốt với partner

### Logic hiện tại

Quan hệ `Farm.creator` sử dụng `onDelete: Cascade`. Farm lại là cha của khu vực, membership, lời mời và ao/bể.

### Rủi ro

Nếu bản ghi User của người tạo farm bị xóa, toàn bộ farm và dữ liệu con có thể bị xóa theo dây chuyền.

### Cần partner chốt

- User có được xóa vật lý không?
- Khi người tạo rời hệ thống, farm phải được chuyển ownership hay chỉ vô hiệu hóa user?

### Đề xuất

- Không xóa vật lý User đã có dữ liệu nghiệp vụ.
- Dùng trạng thái vô hiệu hóa tài khoản.
- Đổi quan hệ người tạo sang `Restrict`, hoặc nullable kết hợp `SetNull` nếu chấp nhận mất liên kết người tạo.
- Thay đổi này phải đi qua migration mới.

## DB-02 — `area_id` chưa được ràng buộc cùng `farm_id`

**Mức độ:** High

### Logic hiện tại

`farm_members`, `farm_invitations` và `ponds_tanks` chứa cả `farm_id` và `area_id`, nhưng khóa ngoại `area_id` chỉ tham chiếu `areas.id`.

### Rủi ro

Database có thể nhận bản ghi có `farm_id` thuộc Farm A nhưng `area_id` thuộc Farm B nếu dữ liệu được ghi ngoài các luồng API đang kiểm tra.

### Đề xuất

Dùng composite foreign key `(farm_id, area_id)` hoặc trigger database kiểm tra `areas.farm_id = farm_id`. Đồng thời giữ validation ở service/controller để trả thông báo thân thiện.

## DB-03 — Race condition trong các business rule dạng “kiểm tra rồi cập nhật”

**Mức độ:** High

### Luồng bị ảnh hưởng

- Archive farm.
- Ngừng khu vực.
- Xóa khu vực.
- Xóa mềm ao/bể.

### Rủi ro

Một request có thể kiểm tra không còn blocker, trong khi request khác đồng thời tạo member, invitation hoặc ao/bể trước khi request đầu cập nhật trạng thái.

### Đề xuất

- Thực hiện kiểm tra và cập nhật trong transaction.
- Chọn isolation level phù hợp cho PostgreSQL.
- Bổ sung constraint/trigger cho bất biến không được phép vi phạm.
- Thêm integration test chạy hai thao tác đồng thời.

## DB-04 — Trạng thái và loại đang dùng String trong Prisma

**Mức độ:** Low

Database có check constraint nhưng Prisma khai báo `String` cho trạng thái farm, area, pond/tank và `tankType`. Điều này làm mất type safety ở application layer.

### Đề xuất

Chỉ chuyển sang Prisma enum khi đã chốt tập trạng thái dài hạn và kiểm tra khả năng tương thích migration hiện tại.

