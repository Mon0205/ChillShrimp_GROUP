# Tài liệu dự án ChillShrimp

Thư mục `docs/` được tổ chức theo mục đích sử dụng để nhóm dễ tìm kiếm, review và cập nhật đồng bộ. Khi thêm tài liệu mới, đặt file vào đúng nhóm bên dưới và bổ sung liên kết vào mục lục này.

## 01. Yêu cầu hệ thống

| Tài liệu | Nội dung |
| --- | --- |
| [SRS.md](./01-requirements/SRS.md) | Đặc tả yêu cầu phần mềm, actor, chức năng, phi chức năng và business rules |

## 02. Kiến trúc

| Tài liệu | Nội dung |
| --- | --- |
| [ARCHITECTURE.md](./02-architecture/ARCHITECTURE.md) | Kiến trúc tổng quan và quyết định kỹ thuật |
| [ARCHITECTURE-DETAIL.md](./02-architecture/ARCHITECTURE-DETAIL.md) | Thành phần và luồng xử lý chi tiết |
| [DEPLOY-ARCHITECTURE.MD](./02-architecture/DEPLOY-ARCHITECTURE.MD) | Kiến trúc triển khai và cấu hình môi trường |

## 03. Database và mô hình dữ liệu

| Tài liệu | Nội dung |
| --- | --- |
| [DATABASE.md](./03-database/DATABASE.md) | Schema dữ liệu đích và mô tả các bảng |
| [ERD.md](./03-database/ERD.md) | Sơ đồ quan hệ thực thể và giải thích quan hệ |
| [DATABASE-CLASS-V4.drawio](./03-database/DATABASE-CLASS-V4.drawio) | File Draw.io của sơ đồ class/database |

## 04. Use case và sơ đồ phân tích

| Tài liệu | Nội dung |
| --- | --- |
| [USECASE.md](./04-use-cases/USECASE.md) | Danh sách use case và phân quyền actor |
| [USECASE-SPECIFICATION.md](./04-use-cases/USECASE-SPECIFICATION.md) | Phân rã và đặc tả chi tiết use case |
| [ACTIVITY-DIAGRAMS.md](./04-use-cases/ACTIVITY-DIAGRAMS.md) | Activity diagram và diễn giải luồng |
| [ACTIVITY-DIAGRAMS.drawio](./04-use-cases/ACTIVITY-DIAGRAMS.drawio) | File Draw.io của activity diagram |
| [SEQUENCE-DIAGRAMS.md](./04-use-cases/SEQUENCE-DIAGRAMS.md) | Sequence diagram của các use case trọng tâm |

## 05. Nghiệp vụ trại tôm giống

| Tài liệu | Nội dung |
| --- | --- |
| [WORKFLOWS.md](./05-business-domain/WORKFLOWS.md) | Workflow vận hành tổng quát của hệ thống |
| [tong_hop_quy_chuan_va_quan_ly_trai_tom-v2.md](./05-business-domain/tong_hop_quy_chuan_va_quan_ly_trai_tom-v2.md) | Nguồn tham khảo quy chuẩn, môi trường và công thức quản lý tôm giống |

## 06. Kế hoạch phát triển

| Tài liệu | Nội dung |
| --- | --- |
| [BACKLOG.md](./06-planning/BACKLOG.md) | Danh sách công việc, ưu tiên và khoảng cách triển khai |

## 07. Cảnh báo và quyết định cần chốt

| Tài liệu | Nội dung |
| --- | --- |
| [Warning/README.md](./Warning/README.md) | Danh sách vấn đề nghiệp vụ, rủi ro và quyết định cần thống nhất với partner |

## Quy ước quản lý tài liệu

- Không đặt thêm tài liệu trực tiếp tại `docs/`, ngoại trừ file mục lục `README.md`.
- Sơ đồ nguồn `.drawio` đặt cùng nhóm với tài liệu Markdown mô tả sơ đồ.
- Khi di chuyển hoặc đổi tên file, phải cập nhật tất cả liên kết tương đối.
- Tài liệu yêu cầu mô tả kiến trúc đích; trạng thái code thực tế và khoảng cách triển khai phải được ghi rõ.
- Cảnh báo chưa chốt không được tự động chuyển thành migration hoặc business rule chính thức.
- Không sửa migration đã deploy để khớp tài liệu; nếu cần thay đổi database phải tạo migration mới sau khi được thống nhất.
