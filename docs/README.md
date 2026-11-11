# Tài liệu dự án Shrimp Group

## Bắt đầu từ đâu?

- Muốn hiểu hệ thống làm gì: đọc [luồng nghiệp vụ](./05-business-domain/WORKFLOWS.md).
- Làm cảnh báo, khách hàng hoặc bán giống: đọc [đặc tả nghiệp vụ mới](./05-business-domain/ALERTS-AND-SALES.md).
- Sửa code hoặc tìm thư mục: đọc [kiến trúc](./02-architecture/ARCHITECTURE.md).
- Tra quyền từng vai trò và nghiệp vụ đang triển khai: đọc [phân quyền hiện tại](./02-architecture/PERMISSIONS.md).
- Cài đặt, chạy ứng dụng hoặc migration: đọc [README dự án](../README.md).
- Tra cứu yêu cầu, dữ liệu hoặc sơ đồ: dùng mục lục bên dưới.

## Mục lục

| Nhóm | Tài liệu | Dùng để |
| --- | --- | --- |
| `01-requirements` | [SRS.md](./01-requirements/SRS.md) | Tra yêu cầu chức năng, phi chức năng và quy tắc hệ thống |
| `02-architecture` | [ARCHITECTURE.md](./02-architecture/ARCHITECTURE.md) | Hiểu thành phần, phân lớp backend, phân quyền và triển khai |
| | [PERMISSIONS.md](./02-architecture/PERMISSIONS.md) | Ma trận quyền hiện tại theo vai trò, trại/khu vực và từng nghiệp vụ |
| `03-database` | [DATABASE.md](./03-database/DATABASE.md) | Đọc tổng quan thiết kế dữ liệu và quy tắc liên quan |
| | [DATABASE-FIELDS.md](./03-database/DATABASE-FIELDS.md) | Tra ý nghĩa từng bảng/cột |
| | [ERD.md](./03-database/ERD.md) | Xem quan hệ dữ liệu bằng Mermaid |
| `04-use-cases` | [USECASE.md](./04-use-cases/USECASE.md) | Xem danh sách use case và actor |
| | [USECASE-SPECIFICATION.md](./04-use-cases/USECASE-SPECIFICATION.md) | Tra điều kiện, luồng chính và ngoại lệ từng use case |
| | [ACTIVITY-DIAGRAMS.md](./04-use-cases/ACTIVITY-DIAGRAMS.md) | Xem luồng hoạt động |
| | [SEQUENCE-DIAGRAMS.md](./04-use-cases/SEQUENCE-DIAGRAMS.md) | Xem tương tác giữa các thành phần |
| `05-business-domain` | [WORKFLOWS.md](./05-business-domain/WORKFLOWS.md) | Hiểu quy trình vận hành xuyên suốt |
| | [ALERTS-AND-SALES.md](./05-business-domain/ALERTS-AND-SALES.md) | Tra cảnh báo, phân công, thông báo, khách hàng và bán giống |
| | [HATCHERY-REFERENCE.md](./05-business-domain/HATCHERY-REFERENCE.md) | Tham khảo kỹ thuật, công thức và quy chuẩn trại giống |

Các file nguồn sơ đồ `.drawio`, DBML và dữ liệu xuất giữ cùng thư mục chuyên môn; không thay thế tài liệu nghiệp vụ.

## Phạm vi và cách cập nhật

- Nội dung viết tiếng Việt; tên file và thư mục dùng tiếng Anh, không có khoảng trắng; phần mở rộng Markdown dùng `.md`.
- Mỗi nội dung có một nơi mô tả chính. Tài liệu khác dẫn liên kết thay vì chép lại toàn bộ.
- Luồng tổng quan nằm trong `WORKFLOWS.md`; phần cảnh báo và bán giống được mô tả chi tiết trong tài liệu nghiệp vụ riêng.
- SRS và use case là tài liệu đặc tả; không mặc định mọi nội dung đã triển khai. Tài liệu database có ghi mốc thiết kế, không phải báo cáo trạng thái DB đang chạy.
- Cấu trúc dữ liệu hiện hành tra tại [schema.prisma](../BE/prisma/schema.prisma). Trạng thái migration kiểm tra tại môi trường đích; không suy ra từ tài liệu.
- Đổi tên hoặc di chuyển file phải cập nhật liên kết. Không sửa lịch sử migration để khớp tài liệu.
