# BÁO CÁO TIẾN ĐỘ THỰC HIỆN ĐỒ ÁN CHILLSHRIMP

| **Thông tin** | **Nội dung** |
| --- | --- |
| Tên đề tài | Hệ thống quản lý trại ương và xuất bán tôm giống ứng dụng xử lý ảnh và AI |
| Tên hệ thống | ChillShrimp |
| Ngày báo cáo | 06/09/2026 |
| Sinh viên/nhóm thực hiện | ........................................................ |
| Giảng viên hướng dẫn | ........................................................ |
| Giai đoạn hiện tại | Hoàn thiện phân tích, thiết kế và củng cố nền tảng trước khi phát triển nghiệp vụ |

## 1. Nội dung làm việc trong kỳ báo cáo

Trong kỳ báo cáo này, nhóm tập trung vào bốn nội dung chính:

1. Rà soát và chốt phạm vi nghiệp vụ của hệ thống quản lý trại tôm giống.
2. Hoàn thiện bộ tài liệu SRS, cơ sở dữ liệu, ERD, use case và các sơ đồ phân tích.
3. Kiểm tra mức độ phù hợp giữa tài liệu thiết kế với source code hiện có.
4. Xây dựng kế hoạch hiện thực các module nghiệp vụ theo thứ tự phụ thuộc của MVP.

Báo cáo phân biệt rõ ba trạng thái:

- **Đã hiện thực:** chức năng đã có model/API hoặc giao diện trong source code.
- **Hoàn thành một phần:** đã có một phần luồng nhưng còn thiếu quyền, kiểm thử hoặc trường hợp nghiệp vụ.
- **Mới ở mức thiết kế:** đã được mô tả trong tài liệu nhưng chưa có model/API/UI chạy thực tế.

## 2. Tổng quan đề tài

ChillShrimp là hệ thống web-first hỗ trợ quản lý quá trình **tiếp nhận, ương, chăm sóc, kiểm tra chất lượng và xuất bán tôm giống**. Hệ thống không hướng tới quản lý toàn bộ quy trình sản xuất giống từ tôm bố mẹ, sinh sản và ấp nở; đồng thời không phải hệ thống nuôi tôm thương phẩm đến khi bán theo khối lượng.

Luồng nghiệp vụ chính của hệ thống được xác định như sau:

> Tiếp nhận lô tôm giống → kiểm tra chất lượng → phân bổ vào ao/bể → theo dõi môi trường và chăm sóc → lấy mẫu/kiểm tra AI → quản lý vật tư và chi phí → xác nhận đủ điều kiện bán → xuất bán → tổng hợp dashboard và cảnh báo.

Hệ thống được thiết kế theo mô hình **multi-farm**:

- `users` lưu danh tính dùng chung của người dùng.
- `farms` là đơn vị tenant để cô lập dữ liệu.
- `farm_members` lưu vai trò, trạng thái và khu vực phụ trách theo từng trang trại.
- Một người dùng có thể tham gia nhiều trang trại và giữ vai trò khác nhau tại mỗi trang trại.

Bốn vai trò nghiệp vụ đã chốt gồm:

| **Vai trò** | **Phạm vi trách nhiệm** |
| --- | --- |
| `OWNER` | Quản trị và giám sát toàn bộ trang trại |
| `AREA_MANAGER` | Điều hành hoạt động trong khu vực được phân công |
| `TECHNICIAN` | Thực hiện nghiệp vụ kỹ thuật và chăm sóc trong khu vực |
| `WAREHOUSE_STAFF` | Quản lý danh mục vật tư và các giao dịch kho |

`AI_SERVICE` là actor hệ thống bên ngoài, không phải vai trò người dùng và không có membership trong trang trại.

Năm use case trọng tâm để phân tích sâu và tổ chức luồng demo gồm:

1. UC04 - Quản lý trang trại.
2. UC05 - Quản lý lô giống và chăm sóc.
3. UC06 - Kiểm tra và phân tích AI.
4. UC08 - Quản lý tài chính và bán giống.
5. UC09 - Quản lý thống kê và cảnh báo.

## 3. Đánh giá tiến độ tổng thể

Các tỷ lệ dưới đây là ước tính dựa trên khối lượng hiện có trong repository tại ngày 06/09/2026. Đây là số liệu phục vụ báo cáo tiến độ, chưa phải tỷ lệ nghiệm thu chính thức.

| **Hạng mục** | **Mức hoàn thành ước tính** | **Đánh giá hiện tại** |
| --- | ---: | --- |
| Nghiên cứu yêu cầu và nghiệp vụ | 80-85% | Đã xác định phạm vi tôm giống, quy trình tham chiếu, dữ liệu cần quản lý và công thức dự kiến; cần chuyên gia xác nhận ngưỡng và định mức |
| SRS và business rules | 80-85% | Đã có SRS và 30 business rules; còn phải thống nhất mã use case giữa các phần tài liệu |
| Use case và sơ đồ phân tích | 85% | Có 32 use case thao tác cụ thể, 7 mã nhóm phục vụ tổ chức, đặc tả sâu và Activity/Sequence Diagram cho 5 use case trọng tâm |
| Thiết kế database và ERD | 75-80% | Có schema mục tiêu 23 bảng, khóa ngoại và cardinality; chưa ánh xạ đầy đủ sang Prisma và còn một số quyết định mở |
| Kiến trúc và môi trường | 65-70% | Đã có kiến trúc Client-Server, Docker Compose, Nginx, Neon và Prisma; chưa có CI, staging, monitoring và cấu hình production hoàn chỉnh |
| Tài khoản, trang trại và phân quyền nền tảng | 55-65% | Các luồng chính đã có nhưng còn sai khác so với RBAC đích và chưa hoàn chỉnh multi-farm |
| Nghiệp vụ trại tôm UC04-UC09 | 5-10% | Phần lớn mới ở mức tài liệu; chưa có model/API/UI cho ao/bể, lô giống, nhật ký, kho, bán giống và cảnh báo |
| Xử lý ảnh và AI | 0-5% | Mới có yêu cầu, luồng và contract dự kiến; chưa có dataset, model hoặc AI service |
| Kiểm thử tự động và CI | 0-5% | Chưa có test runner, test suite và pipeline CI trong repository |

**Đánh giá chung:** phần phân tích và thiết kế đã đạt khoảng **80-85%** và đủ làm nền để bắt đầu hiện thực nghiệp vụ. Xét toàn bộ phạm vi MVP, phần code hiện tại ước tính khoảng **20-25%**, chủ yếu nằm ở xác thực, hồ sơ, trang trại, khu vực, thành viên, lời mời và hạ tầng. Các chức năng mới chỉ xuất hiện trong tài liệu không được tính là đã hoàn thành.

## 4. Công việc đã thực hiện

### 4.1. Phân tích yêu cầu và tài liệu

- Xác định đề tài tập trung vào trại ương và xuất bán **tôm giống**.
- Xây dựng SRS gồm phạm vi, actor, yêu cầu chức năng, yêu cầu phi chức năng, yêu cầu AI, tiêu chí nghiệm thu và 30 business rules.
- Chốt mô hình phân quyền theo `farm_members`, không sử dụng role toàn cục `ADMIN`, `MANAGER`, `STAFF` hoặc `VIEWER`.
- Xác định 32 use case thao tác cụ thể. Bảy mã UC03-UC09 được dùng để tổ chức theo miền chức năng; nếu tính cả mã nhóm thì mô hình tài liệu có 39 mục.
- Xây dựng ma trận RBAC cho `OWNER`, `AREA_MANAGER`, `TECHNICIAN` và `WAREHOUSE_STAFF`.
- Đặc tả chi tiết toàn bộ use case và đặc tả chuyên sâu 5 use case trọng tâm.
- Xây dựng 5 Activity Diagram và phần diễn giải từng bước từ bắt đầu đến kết thúc.
- Xây dựng 5 Sequence Diagram thể hiện tương tác giữa actor, frontend, backend, Prisma/database và dịch vụ ngoài.
- Thiết kế schema mục tiêu gồm 16 bảng lõi và 7 bảng mở rộng nghiệp vụ.
- Rà soát khóa ngoại và rút gọn các liên kết dư thừa giữa ao/bể, lô giống và nhật ký chăm sóc.
- Tổng hợp dữ liệu chuyên môn cần nghiên cứu: chất lượng giống, môi trường, thức ăn, tăng trưởng, tỷ lệ sống, mật độ, sinh khối, giá vốn và giá bán.
- Xây dựng kiến trúc hệ thống, workflow, backlog và bản thảo báo cáo phân tích thiết kế.

### 4.2. Backend hiện có

Backend sử dụng Node.js, Express, Neon Auth, Prisma và Neon PostgreSQL. Những phần đã có trong source code gồm:

- Health endpoint tại `/api/health`.
- Đăng nhập, đăng xuất và đọc phiên người dùng qua Neon Auth.
- Phiên ứng dụng trong `access_sessions` và cookie `HttpOnly`.
- Xem/cập nhật hồ sơ cá nhân; đổi mật khẩu và đặt lại mật khẩu bằng OTP.
- Xem, tạo, cập nhật và xóa trang trại ở mức nền tảng.
- Xem và tạo khu vực.
- Xem danh sách thành viên theo farm/khu vực.
- Cập nhật thông tin, vai trò, khu vực và trạng thái membership.
- Tạo, xem, chấp nhận và thu hồi lời mời thành viên.
- Gửi email lời mời qua Nodemailer/SMTP.
- Script tạo tài khoản bootstrap bằng `seed-admin.js`.
- Middleware xác thực, tải membership, kiểm tra trạng thái và một phần RBAC.
- Error middleware và cấu trúc phản hồi API dùng chung.

Prisma schema chạy hiện tại có **7 model**:

1. `users`.
2. `access_sessions`.
3. `farms`.
4. `areas`.
5. `farm_members`.
6. `farm_invitations`.
7. `password_reset_otp_windows`.

### 4.3. Frontend hiện có

Frontend sử dụng Vue 3, Vite, Vuetify và Vue Router. Những phần đã có gồm:

- Màn hình đăng nhập.
- Màn hình thiết lập/đặt lại mật khẩu.
- Màn hình hồ sơ cá nhân.
- Màn hình quản lý người dùng, thành viên và lời mời.
- Giao diện tạo trang trại và khu vực.
- API client gửi cookie bằng `credentials: include`.
- Composable quản lý xác thực, farm context và toast.
- Route guard cho trang yêu cầu đăng nhập.
- App shell dùng chung cho các màn hình sau đăng nhập.

Route `/dashboard` hiện vẫn hiển thị `UsersPage.vue`; Dashboard nghiệp vụ theo UC09 chưa được hiện thực.

### 4.4. Hạ tầng và triển khai

- Có Dockerfile riêng cho frontend và backend.
- Có Docker Compose để build và chạy hai service.
- Nginx phục vụ frontend và reverse proxy `/api` sang backend.
- Backend có healthcheck để frontend chỉ khởi động sau khi backend khỏe.
- Có Prisma Migrate và tập migration nền tảng cho Neon PostgreSQL.
- Có `.env.example` và nguyên tắc chỉ lưu `DATABASE_URL`, Neon Auth secret và SMTP secret ở backend.
- Có hướng dẫn chạy bằng Docker và chạy local trong `README.md`.

## 5. Kết quả kiểm tra repository ngày 06/09/2026

| **Nội dung kiểm tra** | **Kết quả** | **Ghi chú** |
| --- | --- | --- |
| Kiểm tra cú pháp JavaScript backend | Đạt | Toàn bộ file `.js` trong `BE/src` và `seed-admin.js` vượt qua `node --check` |
| Build production frontend | Đạt | Vite build thành công với 298 module |
| Prisma schema validation | Chưa kết luận | Prisma cần tải schema engine nhưng môi trường kiểm tra đang chặn kết nối tới máy chủ binary |
| Trạng thái Docker Compose | Chưa chạy được | Docker Desktop Linux Engine chưa hoạt động tại thời điểm kiểm tra |
| Unit/integration/E2E test | Chưa có | Repository chưa khai báo test script hoặc test suite |
| Migration trên Neon | Chưa xác nhận lại trong lần kiểm tra này | Không kết luận trạng thái production nếu chưa đối chiếu với `_prisma_migrations` trên Neon |

Kết quả trên chỉ phản ánh khả năng kiểm tra trong máy phát triển hiện tại. Việc Prisma và Docker chưa được xác nhận không đồng nghĩa source code sai, nhưng phải kiểm tra lại trong môi trường có Docker Desktop và kết nối mạng hoạt động trước khi demo.

## 6. Công việc còn thiếu và điểm cần chỉnh

### 6.1. Tài liệu cần đồng bộ

- Phần yêu cầu chức năng của `SRS.md` đang dùng bộ mã UC01-UC18, trong khi `USECASE.md` và `USECASE-SPECIFICATION.md` dùng UC01, UC02 và UC03.1-UC09.4. Cần chọn một bộ mã chuẩn và cập nhật traceability đồng nhất.
- Một số đoạn mô tả quyền theo actor chưa hoàn toàn trùng với ma trận RBAC chi tiết, đặc biệt quyền quản lý nhân viên và quyền cập nhật trạng thái lô giống.
- UC07.3 - Yêu cầu cấp vật tư đã có trong use case nhưng bảng `supply_requests` chưa nằm trong schema lõi; cần quyết định bổ sung bảng hoặc gộp luồng vào `inventory_transactions`.
- Cần thống nhất một công nghệ object storage thay vì để nhiều lựa chọn trong tài liệu.
- Các ngưỡng môi trường, định mức thức ăn, tiêu chí chất lượng và công thức giá mới là đề xuất; chưa được người có chuyên môn phê duyệt để dùng như quy tắc vận hành chính thức.

### 6.2. Khoảng cách giữa database mục tiêu và Prisma hiện tại

`DATABASE.md` mô tả 23 bảng mục tiêu nhưng Prisma mới có 7 model nền tảng. Các nhóm dữ liệu chưa được hiện thực gồm:

- Ao/bể và trạng thái sử dụng.
- Nhà cung cấp, lô giống, kiểm tra chất lượng và biến động số lượng.
- Nhật ký môi trường, cho ăn, thay nước và thuốc/chế phẩm.
- Lấy mẫu tăng trưởng và AI inspection.
- Danh mục vật tư và giao dịch kho.
- Chi phí, khách hàng, bảng giá và xuất bán.
- Ngưỡng môi trường, định mức thức ăn và cảnh báo.

Theo quyết định hiện tại, **không sửa hoặc thêm migration trong giai đoạn chỉnh tài liệu**. Khi được duyệt để triển khai, mọi hiệu chỉnh phải được tạo bằng migration mới và kiểm tra trên Neon branch thử nghiệm; không sửa migration đã áp dụng.

### 6.3. Multi-farm và RBAC chưa khớp hoàn toàn

- Migration `20260902_004_enforce_single_farm_non_owner` còn giới hạn người không phải Owner chỉ thuộc một farm, trái với kiến trúc multi-farm đã chốt.
- API lời mời từ chối email đã có trong `users`, vì vậy chưa thể thêm người dùng hiện hữu vào trang trại thứ hai.
- `requireFarmManager` đang cho phép cả `OWNER` và `AREA_MANAGER` truy cập các API quản lý nhân sự. Trong khi ma trận RBAC mục tiêu quy định chỉ `OWNER` được mời và quản lý tài khoản nhân viên; `AREA_MANAGER` chỉ được xem nhân viên khu vực.
- API xóa farm kiểm tra `farms.created_by` thay vì membership `OWNER` đang `active` tại farm.
- API khu vực mới có xem và tạo; chưa có cập nhật, xóa và chưa hoàn chỉnh quyền đọc cho các vai trò cần xem dữ liệu khu vực.
- Cần kiểm tra lại tất cả query nghiệp vụ để bảo đảm không truy cập chéo farm hoặc khu vực.

### 6.4. Các module nghiệp vụ chưa hiện thực

- Chưa có API/UI quản lý ao/bể và lô giống.
- Chưa có nhật ký môi trường và chăm sóc.
- Chưa có transaction tồn kho và cơ chế chống tồn âm.
- Chưa có quản lý chi phí, bảng giá, khách hàng và xuất bán.
- Chưa có job sinh cảnh báo và cơ chế chống tạo cảnh báo trùng.
- Chưa có Dashboard và báo cáo nghiệp vụ thực tế.
- `AI_SERVICE` mới là thư mục giữ chỗ; chưa có dataset, model, API hoặc pipeline xử lý ảnh.
- Chưa có OpenAPI, audit log, request ID, rate limiting, CI và bộ kiểm thử tự động.

## 7. Thuận lợi trong quá trình thực hiện

- Phạm vi đề tài và đối tượng tôm giống đã được thu hẹp rõ hơn so với giai đoạn đầu.
- Bốn vai trò nghiệp vụ và nguyên tắc phân quyền theo farm/khu vực đã được xác định.
- Bộ tài liệu SRS, database, ERD, use case, Activity Diagram và Sequence Diagram đã tạo được nền tảng phân tích tương đối đầy đủ.
- Frontend và backend đã tách riêng, thuận lợi cho phát triển và kiểm thử từng lớp.
- Vue/Vuetify, Express và Prisma phù hợp với năng lực hiện tại của nhóm và hỗ trợ phát triển MVP nhanh.
- Neon PostgreSQL giảm khối lượng vận hành database local và cho phép tạo branch để thử migration.
- Docker Compose và Nginx tạo một cách chạy thống nhất giữa các thành viên.
- AI được tách thành dịch vụ riêng nên có thể nghiên cứu song song mà không chặn việc phát triển các chức năng quản lý cơ bản.
- Nền tảng xác thực, phiên, farm và membership đã có, nên nhóm không phải bắt đầu toàn bộ hệ thống từ đầu.

## 8. Khó khăn và hướng giải quyết

| **Khó khăn** | **Ảnh hưởng** | **Hướng giải quyết** |
| --- | --- | --- |
| Phạm vi gồm trại, chăm sóc, kho, tài chính, báo cáo và AI | Nguy cơ phát triển dàn trải nhưng không có luồng hoàn chỉnh | Ưu tiên một luồng dọc MVP: farm → ao/bể → lô giống → nhật ký → cảnh báo → bán → dashboard |
| Tài liệu còn hai hệ mã use case | Khó truy vết SRS, sơ đồ, API và test case | Chọn `USECASE.md` làm danh mục chuẩn, lập bảng ánh xạ rồi cập nhật các tài liệu còn lại |
| Thiết kế database lớn hơn Prisma hiện tại | Dễ tạo migration dồn dập và khó tìm lỗi | Chia schema theo module, review SQL, thử trên Neon branch và chỉ deploy sau khi có integration test |
| Multi-farm chưa khớp code và migration cũ | Có thể chặn user tham gia farm thứ hai hoặc cấp sai quyền | Viết test tenant/RBAC trước; khi được phép mới tạo migration hiệu chỉnh mới, không sửa lịch sử đã chạy |
| RBAC tài liệu khác code quản lý nhân sự | Area Manager có thể thực hiện thao tác vượt phạm vi mục tiêu | Chốt quyền với giảng viên, sau đó đưa mọi endpoint nhân sự qua middleware Owner-only và kiểm thử API trực tiếp |
| Thiếu dữ liệu chuyên môn đã được xác nhận | Cảnh báo và công thức có thể không phù hợp thực tế | Lưu ngưỡng theo cấu hình, đơn vị, nguồn, phiên bản và thời gian hiệu lực; xin xác nhận từ giảng viên/chuyên gia |
| Chưa có dataset AI | Không thể cam kết độ chính xác | Thu hẹp bài toán về đếm tôm trên khay chụp chuẩn, xây protocol chụp/gán nhãn và đo baseline trước |
| Chưa chốt object storage và contract AI | Dễ thay đổi backend nhiều lần | Chọn công nghệ theo tiêu chí private object, signed URL, chi phí và SDK; chốt API contract trước khi lập trình model |
| Chưa có kiểm thử tự động | Khó phát hiện lỗi phân quyền, transaction và dữ liệu chéo tenant | Ưu tiên integration test cho auth, multi-farm, tồn kho, số lượng lô và xuất bán; thêm E2E cho luồng demo |
| Docker/Prisma phụ thuộc môi trường máy | Có thể gián đoạn build, migration hoặc demo | Chuẩn hóa checklist môi trường, bật Docker Desktop trước demo, cache dependency và kiểm tra trên một máy staging ổn định |
| SMTP có thể bị antivirus/proxy chèn chứng chỉ | Email mời thất bại với lỗi TLS | Dùng App Password và CA hợp lệ; kiểm tra Mail Shield/proxy; dùng SMTP sandbox ở dev, không tắt kiểm tra TLS trong production |

## 9. Kế hoạch công việc sắp tới

Kế hoạch được sắp theo quan hệ phụ thuộc. Mỗi giai đoạn chỉ được xem là hoàn thành khi có database, API, giao diện tối thiểu, xử lý lỗi và kiểm thử phù hợp.

| **Ưu tiên** | **Giai đoạn** | **Công việc chính** | **Sản phẩm đầu ra** |
| ---: | --- | --- | --- |
| 1 | Chốt baseline tài liệu | Đồng bộ mã use case, RBAC, traceability và quyết định `supply_requests`/object storage | Bộ SRS, use case và database không còn mâu thuẫn chính |
| 2 | Củng cố nền tảng | Bổ sung test framework, test RBAC/multi-farm, chuẩn hóa error format và API convention | Test matrix P0, integration test nền tảng và tài liệu API |
| 3 | Hoàn thiện UC04 | Hoàn chỉnh khu vực; hiện thực `ponds_tanks`, CRUD, trạng thái và phạm vi quyền | Luồng database → API → UI quản lý ao/bể chạy được |
| 4 | Hiện thực UC05 | Tạo lô giống, gán ao/bể, biến động số lượng, kiểm tra chất lượng và bốn nhật ký chăm sóc | Luồng tiếp nhận lô đến ghi nhật ký hoạt động, không sai lệch số lượng |
| 5 | Kho và cảnh báo | Hiện thực vật tư, nhập/xuất/sử dụng, ngưỡng và job cảnh báo | Không cho tồn kho âm; cảnh báo đúng farm/khu vực và không trùng |
| 6 | UC08 và UC09 | Chi phí, khách hàng, bảng giá, xuất bán, doanh thu và dashboard theo role | Luồng bán một phần/toàn lô trong transaction và KPI truy vết được |
| 7 | Nhánh AI song song | Chốt protocol chụp, thu thập/gán nhãn ảnh, baseline đếm và contract AI service | Dataset v1, báo cáo metric và API demo có manual correction |
| 8 | Hoàn thiện MVP | E2E test, security review, staging, hướng dẫn sử dụng và kịch bản demo | Một luồng end-to-end ổn định trên môi trường staging |

### 9.1. Mục tiêu cho lần báo cáo tiếp theo

1. Chốt một hệ mã use case dùng chung trong toàn bộ tài liệu.
2. Chốt ma trận RBAC chính thức và lập đủ test case chống truy cập chéo farm/khu vực.
3. Hoàn thiện thiết kế API và dữ liệu cho UC04.
4. Có ít nhất một module nghiệp vụ mới chạy xuyên suốt database → API → giao diện.
5. Có quyết định chính thức về object storage và contract của AI Service.
6. Có protocol thu thập ảnh hoặc bộ ảnh mẫu ban đầu cho bài toán đếm tôm giống.

## 10. Nội dung cần xin ý kiến giảng viên

1. Xác nhận tên và phạm vi đề tài tập trung vào **trại ương và xuất bán tôm giống**.
2. Xác nhận 32 use case thao tác cụ thể và 7 mã nhóm có phù hợp cách trình bày báo cáo hay không.
3. Xác nhận quyền quản lý nhân viên chỉ thuộc `OWNER`; `AREA_MANAGER` chỉ xem nhân viên trong khu vực.
4. Xác nhận mô hình multi-farm, trong đó một người dùng được tham gia nhiều farm và có role khác nhau theo `farm_members`.
5. Xác nhận mức AI của MVP tập trung vào đếm, mật độ ước tính, confidence và hiệu chỉnh thủ công; không kết luận bệnh thay chuyên gia.
6. Xin góp ý về nguồn chuyên môn để xác nhận ngưỡng môi trường, định mức thức ăn, tiêu chí chất lượng và cách tính giá bán.
7. Xác nhận thứ tự phát triển một luồng end-to-end trước khi mở rộng video, realtime và báo cáo nâng cao.

## 11. Mẫu trình bày ngắn với giảng viên

> Thưa thầy, trong giai đoạn vừa qua nhóm tập trung hoàn thiện phần phân tích và thiết kế cho ChillShrimp. Nhóm đã xác định phạm vi là quản lý trại ương và xuất bán tôm giống, chốt mô hình multi-farm cùng bốn vai trò, xây dựng SRS, database mục tiêu, ERD, danh sách use case và các sơ đồ phân tích. Hiện nhóm có 32 use case thao tác cụ thể; năm use case trọng tâm đã được đặc tả sâu và có Activity Diagram, Sequence Diagram.
>
> Về phần mềm, nhóm đã có nền tảng Vue/Vuetify, Express, Neon Auth, Prisma, Neon PostgreSQL và Docker Compose. Các chức năng đang hiện thực gồm đăng nhập, hồ sơ, trang trại, khu vực, thành viên, phân quyền và lời mời. Frontend build production thành công và mã JavaScript backend không có lỗi cú pháp. Tuy nhiên, các module ao/bể, lô giống, nhật ký chăm sóc, kho, AI, tài chính, bán giống và dashboard hiện chủ yếu mới ở mức thiết kế. Vì vậy nhóm đánh giá tài liệu đạt khoảng 80-85%, còn code của toàn bộ MVP khoảng 20-25%.
>
> Khó khăn hiện tại là phạm vi tương đối rộng, tài liệu còn hai cách đánh mã use case, kiến trúc multi-farm chưa khớp hoàn toàn với code/migration cũ và nhóm chưa có dataset AI cũng như thông số chuyên môn đã được xác nhận. Nhóm đề xuất xử lý bằng cách chốt lại baseline tài liệu, viết kiểm thử phân quyền trước, triển khai từng module theo một luồng dọc hoàn chỉnh và thu hẹp AI trước mắt vào bài toán đếm tôm trên khay chụp chuẩn.
>
> Trong giai đoạn tiếp theo, nhóm sẽ ưu tiên đồng bộ tài liệu và RBAC, sau đó hoàn thiện UC04 về khu vực và ao/bể, rồi phát triển lô giống và nhật ký chăm sóc. Nhánh AI sẽ thực hiện song song từ quy trình thu thập ảnh, gán nhãn và xây dựng baseline. Nhóm mong thầy góp ý về phạm vi MVP, quyền của từng vai trò, mức yêu cầu AI và nguồn dữ liệu chuyên môn để triển khai đúng trọng tâm.

## 12. Kết luận

Dự án đã có nền tảng phân tích và kiến trúc tương đối rõ, nhưng khoảng cách giữa thiết kế mục tiêu và source code còn lớn. Ưu tiên quan trọng nhất hiện nay không phải tiếp tục mở rộng tài liệu hoặc thêm nhiều chức năng rời rạc, mà là:

1. Đồng bộ các quyết định đã chốt trong toàn bộ tài liệu.
2. Củng cố multi-farm và RBAC bằng kiểm thử tự động.
3. Hoàn thành lần lượt các luồng nghiệp vụ end-to-end có thể trình diễn và kiểm chứng.
4. Chỉ tích hợp AI sau khi có dữ liệu, tiêu chí đánh giá và cơ chế hiệu chỉnh thủ công.

Với cách triển khai này, ChillShrimp có khả năng đáp ứng tốt yêu cầu đồ án ở mức MVP và vẫn giữ được kiến trúc để mở rộng trong các giai đoạn sau.
