# Bộ test case cho use case đã hiện thực

Ngày lập: 2026-10-09. 451 test case cho 25 use case, 33 nhóm nghiệp vụ. Tất cả **Not run**; không thực thi hay chỉnh sửa dữ liệu ứng dụng trong công việc lập testcase này.

## Cách sử dụng

- **Phạm vi:** 451 test case / 25 use case / 33 nhóm nghiệp vụ, đối chiếu code ngày 2026-10-09.
- **Trạng thái:** Tất cả Not run. Đây là thiết kế test, không phải kết quả chạy và không nhập lại PASS/FAIL từ bảng auth cũ.
- **Kết quả:** Sau chạy điền Pass/Fail/Blocked/Skipped, kết quả thực tế và evidence trong Ghi chú.
- **Payload:** Tab Payload chứa body gốc từng module; áp dụng biến thể mỗi case, bỏ/thay field đúng chỉ dẫn. Không gửi chuỗi tên fixture làm UUID.
- **Fixtures:** UUID trong Fixtures là ví dụ hợp lệ để chuẩn bị staging. Tạo/seed đúng dữ liệu rồi thay bằng ID thực. UserId/Cloudinary/token lấy từ provider, không dùng ID bịa trên production.
- **Isolation:** Reset hoặc clone dữ liệu trước từng case. Case trạng thái/mortality/import/usage/accept token làm thay đổi fixture; không nối trạng thái giữa case độc lập.
- **Actor:** Mỗi case chọn đúng actor mô tả trong dữ liệu. Nếu tiêu đề bao gồm nhiều role/category/giá trị, chạy từng biến thể độc lập và lưu bằng chứng từng lần.
- **Môi trường:** Frontend/API,Neon,Cloudinary,SMTP/OTP đều cấu hình cho staging; tài khoản/hộp thư test riêng.
- **Email:** OTP do Neon email OTP gửi; invitation do SMTP service gửi. HTTP200/201 không chứng minh giao mail.
- **API:** HTTP status ghi trong Expected dành cho request API trực tiếp; frontend có thể chặn sớm bằng validation và không gửi request.
- **Công thức:** Khuyến nghị100kg,rate2..4%=3kg;10000seed,2g/1000=20g. AI4con/10ml=0.4con/ml,confidence mean0.85.
- **Múi giờ:** UI Việt Nam UTC+7; report daily SQL dùng Asia/Ho_Chi_Minh. Ngày mẫu09/10/2026; thay date/clock đồng bộ khi chạy sau ngày mẫu.
- **Ngưỡng:** Số pH7..9,danger6..10 chỉ là fixture QA, không phải hướng dẫn sinh học áp dụng sản xuất.
- **Đồng thời:** Cần PostgreSQL staging thật và điều phối hai request. Mock chỉ kiểm logic,không chứng minh khóa/rollback/isolation DB.
- **Regression:** 6 case riêng trong tab Regression. Expected bảo toàn dữ liệu/khả năng phục hồi; code hiện có rủi ro,không coi đó là hành vi đúng. Case cần policy/accuracy threshold phải chốt trước chạy.
- **Đã loại khỏi phạm vi:** UC07.4 và UC08.1..UC08.6 chưa hiện thực; không có test execution rows cho workflow chưa tồn tại.
- **Giới hạn khác:** Không có API sửa/xóa nhật ký; không DELETE batch; không API hiệu chỉnh manualCount; không CRUD guideline; low stock chỉ là catalog/filter.
- **Ma trận role:** Tab Phan_quyen lấy từ routes/middleware hiện tại. Các khác biệt tài liệu được ghi trong tab Usecase.
- **Thứ tự:** Auth → Profile → Farm/Area → Member → Tank → Supplier/Batch → Growth/Quality → Care/Threshold → Inventory → AI → Report/Alerts → Concurrency/Regression.
- **Đối chiếu 120 case cũ:** Giữ nguyên bảng Google auth và file review cũ; bộ mới dùng ID UC/module để truy vết và không ghi đè kết quả cũ.

## Ánh xạ use case

| Use case | Chức năng | Phạm vi | Số case | Lưu ý |
| --- | --- | --- | ---: | --- |
| UC01 | Đăng nhập và phiên | Đã hiện thực | 20 | Bốn role; OTP dùng Neon,60s; app session tối đa24h. |
| UC02 | Hồ sơ cá nhân | Đã hiện thực | 8 | Chỉ name/phone; đổi password qua Neon. |
| UC03.1 | Mời/nhận/thu hồi lời mời | Đã hiện thực, giới hạn | 21 | Code cho Manager mời Technician cùng area; user email đã tồn tại bị409; multi-farm onboarding chưa hoàn tất. |
| UC03.2 | Quản lý thành viên | Đã hiện thực | 15 | Owner quản lý; Manager sửa Technician cùng area. |
| UC03.3 | Danh sách nhân viên | Đã hiện thực | 10 | Pending chỉ hiển thị khi bật switch. |
| UC04.1 | Trang trại và khu vực | Đã hiện thực | 26 | Tạo/sửa,archive/restore farm;CRUD/lifecycle area là nghiệp vụ bên trong, không gán UC mới. |
| UC04.2 | Ao/bể | Đã hiện thực | 18 | Soft-delete/restore;Tech xem. |
| UC04.3 | Trạng thái ao/bể | Đã hiện thực | 21 | Suite gồm16 cặp chuyển trạng thái theo code. |
| UC05.1 | Lô và nghiệp vụ liên quan | Đã hiện thực | 75 | Tiếp nhận/update,nhà cung cấp,quantity events,growth,quality;không có DELETE lô. |
| UC05.2 | Trạng thái lô | Đã hiện thực | 32 | 25 cặp trạng thái;Tech bị403 theo route dù tài liệu actor có đoạn mâu thuẫn. |
| UC05.3 | Môi trường nước | Đã hiện thực | 14 | Lưu measurement; sinh alert đồng bộ trong transaction ghi log, không cron. |
| UC05.4 | Cho ăn và khuyến nghị | Đã hiện thực | 16 | Có liên kết kho,ledger;guideline là fixture đã duyệt,không có CRUD guideline API. |
| UC05.5 | Thay nước | Đã hiện thực | 10 | GET/POST nhật ký;không có sửa/xóa. |
| UC05.6 | Thuốc/chế phẩm | Đã hiện thực | 13 | GET/POST và trừ kho;chưa hệ thống tài chính tổng hợp. |
| UC06.1 | Thực hiện AI inspection | Hiện thực một phần | 19 | Upload,pending,analyze,failed retry,metrics đã có;chưa API hiệu chỉnh manualCount,queue/lease recovery. |
| UC06.2 | Lịch sử AI | Đã hiện thực | 8 | GET list và dialog kết quả;không bịa GET detail riêng. |
| UC07.1 | Danh mục vật tư | Đã hiện thực | 14 | Không sửa quantity bằng catalog. |
| UC07.2 | Nhập kho | Đã hiện thực | 11 | Ghi stock/price/import ledger bằng transaction. |
| UC07.3 | Yêu cầu cấp vật tư | Hiện thực tạo/xem | 11 | Chưa workflow approve/fulfill/reject/cancel;không trừ stock khi request. |
| UC07.4 | Xuất/cấp kho theo yêu cầu | Chưa hiện thực | 0 | Không route xuất/cấp hoặc xử lý pending;không coi usage là fulfill request. |
| UC07.5 | Sử dụng vật tư | Đã hiện thực | 11 | Owner/Tech;Tech cần active batch trong area. |
| UC07.6 | Điều chỉnh kho | Đã hiện thực | 12 | Owner/Warehouse;direction +reason;ledger có dấu. |
| UC08.1 | Quản lý chi phí | Chưa hiện thực | 0 | Chưa thấy API và model đầy đủ tương ứng;không lập case như chức năng đã hoàn thành. |
| UC08.2 | Ghi chi phí phát sinh | Chưa hiện thực | 0 | Chưa thấy API và model đầy đủ tương ứng;không lập case như chức năng đã hoàn thành. |
| UC08.3 | Chi phí theo khu vực | Chưa hiện thực | 0 | Chưa thấy API và model đầy đủ tương ứng;không lập case như chức năng đã hoàn thành. |
| UC08.4 | Khách hàng | Chưa hiện thực | 0 | Chưa thấy API và model đầy đủ tương ứng;không lập case như chức năng đã hoàn thành. |
| UC08.5 | Xuất bán | Chưa hiện thực | 0 | Chưa thấy API và model đầy đủ tương ứng;không lập case như chức năng đã hoàn thành. |
| UC08.6 | Doanh thu | Chưa hiện thực | 0 | Chưa thấy API và model đầy đủ tương ứng;không lập case như chức năng đã hoàn thành. |
| UC09.1 | Dashboard | Hiện thực một phần | 17 | Thông tin farm/role và báo cáo feeding;chưa báo cáo doanh thu/chi phí toàn diện. |
| UC09.2 | Cảnh báo toàn trại | Hiện thực môi trường | 31 | Owner xem/cấu hình;không giả định alert AI tự động. |
| UC09.3 | Cảnh báo khu vực | Hiện thực môi trường | 9 | Manager/Tech chỉ area được phân công. |
| UC09.4 | Cảnh báo kho | Hiện thực một phần | 9 | isBelowThreshold và filter catalog;chưa notification/history độc lập. |

## Testcase theo nhóm

### UC01 — Đăng nhập, phiên và khôi phục mật khẩu (AUTH)

Actor: Tất cả vai trò. Endpoint: POST /api/auth/login. UI: /login.

Payload gốc: `{"email":"{EMAIL_ACTOR}","password":"{PASSWORD_TEST}"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC01-AUTH-001 | Đăng nhập thành công | Tài khoản active, thông tin đúng | Nhập email/mật khẩu và nhấn Đăng nhập; kiểm tra cookie và trang đích | 200; có session HttpOnly, tokenHash lưu trong access_sessions; chuyển /dashboard hoặc redirect hợp lệ | Chức năng / P1 |  |
| TC-UC01-AUTH-002 | Sai mật khẩu | password=WrongPassword123 | Gửi login với email đã đăng ký và mật khẩu sai | 401; thông báo chung email/mật khẩu sai; không tạo session | Chức năng / P1 |  |
| TC-UC01-AUTH-003 | Email chưa đăng ký | email=missing@example.test | Login bằng email không tồn tại | 401; không tiết lộ danh tính; không tạo session | Chức năng / P1 |  |
| TC-UC01-AUTH-004 | Email rỗng | email="" | Bỏ trống email và submit; gọi API trực tiếp | Form chặn; API 400; không gọi provider | Chức năng / P1 |  |
| TC-UC01-AUTH-005 | Mật khẩu rỗng | password="" | Bỏ trống mật khẩu và submit; gọi API trực tiếp | Form chặn; API 400 | Chức năng / P1 |  |
| TC-UC01-AUTH-006 | Email sai định dạng | email=abc | Nhập abc và gửi form/API | Form chặn; API 400 | Chức năng / P1 |  |
| TC-UC01-AUTH-007 | Hiện/ẩn mật khẩu | password=Password123 | Nhấn icon mắt hai lần | type đổi password → text → password; giá trị không thay đổi | UI / P1 |  |
| TC-UC01-AUTH-008 | Truy cập khi chưa đăng nhập | Không cookie | Mở /profile và GET /api/users/me | UI về /login; API 401 | Phân quyền / P1 |  |
| TC-UC01-AUTH-009 | Đăng xuất và dùng lại phiên | Phiên hợp lệ | POST /api/auth/logout; replay cookie cũ tới API bảo vệ | 200 logout; session bị hủy; replay bị 401; UI về login | Phiên / P1 |  |
| TC-UC01-AUTH-010 | Hết hạn cố định 24 giờ | Session createdAt quá 24 giờ | Gọi API bảo vệ dù vẫn vừa hoạt động | 401; xóa/clear session hết hạn; không kéo dài deadline | Biên / P1 |  |
| TC-UC01-AUTH-011 | Chỉ có membership suspended | Actor bị suspended tại mọi farm | Đăng nhập bằng mật khẩu đúng | 403; không cấp quyền truy cập ứng dụng | Phân quyền / P1 |  |
| TC-UC01-AUTH-012 | Neon user chưa có users ứng dụng | Danh tính Neon hợp lệ nhưng không có users | Đăng nhập | 403; không tạo access_session | Phân quyền / P1 |  |
| TC-UC01-AUTH-013 | Khôi phục OTP thành công | Hộp thư test; OTP còn dưới 60s | POST /api/users/password-otp; nhận email; POST /api/users/password-otp/reset với otp,newPassword,confirmPassword | API gửi 200; reset 200; mật khẩu mới đăng nhập được, mật khẩu cũ bị từ chối | Tích hợp / P0 | Cần Neon và hộp thư test thật; HTTP 200 không đủ chứng minh giao email |
| TC-UC01-AUTH-014 | OTP sai khi còn hạn | OTP window còn hạn; otp khác mã gửi | Gửi reset với OTP sai và password hợp lệ | 400; password không đổi; không nhầm thành lỗi hết hạn | Chức năng / P1 |  |
| TC-UC01-AUTH-015 | OTP hết hạn | Chờ expiresAt + 1 giây | Gửi reset bằng mã đã nhận | 410; yêu cầu gửi mã mới; password không đổi | Chức năng / P1 |  |
| TC-UC01-AUTH-016 | OTP không đủ sáu số | otp=123 | Gửi reset với email/password hợp lệ | 400; không gọi provider reset | Chức năng / P1 |  |
| TC-UC01-AUTH-017 | Mật khẩu mới ngắn | newPassword=short; confirmPassword=short | Reset với OTP sáu số | 400; form báo tối thiểu tám ký tự | Chức năng / P1 |  |
| TC-UC01-AUTH-018 | Xác nhận không khớp | newPassword=Password123; confirmPassword=Different123 | Gửi reset | 400; password không đổi | Chức năng / P1 |  |
| TC-UC01-AUTH-019 | Gửi lại OTP | Email test; đã có một OTP window | Gửi lại; kiểm tra countdown và dùng mã mới | expiresAt được làm mới; UI countdown gần 60s; mã mới reset được | Tích hợp / P1 |  |
| TC-UC01-AUTH-020 | Dùng lại OTP đã reset | Reset thành công | Gửi lại request reset với OTP cũ | 400; OTP window không còn; password giữ nguyên | Chức năng / P1 |  |

### UC02 — Hồ sơ cá nhân (PROFILE)

Actor: Tất cả vai trò. Endpoint: GET/PATCH /api/users/me. UI: /profile.

Payload gốc: `{"displayName":"QA Name","phone":"0123456789"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC02-PROFILE-001 | Xem hồ sơ | Phiên active | GET /api/users/me; mở /profile | 200; email, họ tên, phone, memberships đúng actor | Chức năng / P1 |  |
| TC-UC02-PROFILE-002 | Cập nhật tên/điện thoại | Payload mẫu | PATCH /api/users/me; reload UI | 200; dữ liệu lưu; navbar cập nhật tên | Chức năng / P1 |  |
| TC-UC02-PROFILE-003 | Tên rỗng/quá dài | displayName="" hoặc 101 ký tự | Gửi từng payload | 400; hồ sơ không đổi | Chức năng / P1 |  |
| TC-UC02-PROFILE-004 | Phone quá dài | phone dài 31 ký tự | PATCH | 400; hồ sơ không đổi | Chức năng / P1 |  |
| TC-UC02-PROFILE-005 | Email/role chỉ đọc | Thêm email và role vào body | Thử sửa UI và PATCH trực tiếp | UI disabled; backend chỉ ghi name/phone, email/role không đổi | Phân quyền / P1 |  |
| TC-UC02-PROFILE-006 | Đổi mật khẩu cũ đúng | currentPassword hợp lệ; newPassword=NewPassword123; confirmPassword khớp | POST /api/users/me/change-password; login bằng mật khẩu mới | 200; password mới dùng được; các phiên Neon khác bị revoke | Tích hợp / P1 |  |
| TC-UC02-PROFILE-007 | Sai mật khẩu hiện tại | currentPassword=WrongPassword123 | POST change-password | 400; password cũ vẫn dùng được | Chức năng / P1 |  |
| TC-UC02-PROFILE-008 | Đổi mật khẩu validation | newPassword dưới 8 ký tự hoặc confirm khác | POST change-password cho từng payload | 400; không đổi password | Chức năng / P1 |  |

### UC03.1 — Lời mời và nhận lời mời (INVITE)

Actor: OWNER; AREA_MANAGER chỉ mời TECHNICIAN cùng khu vực. Endpoint: POST /api/users/invitations. UI: /users; /set-password.

Payload gốc: `{"farmId":"{FARM_A}","email":"{NEW_EMAIL}","role":"technician","areaId":"{AREA_A1}"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC03-1-INVITE-001 | Owner mời từng role | Lần lượt owner,area_manager,technician,warehouse_staff; email mới riêng | Gửi bốn lời mời; kiểm tra token và areaId | 201; role đúng; owner/warehouse areaId null; manager/technician có area; token hash, hạn 24h | Chức năng / P1 |  |
| TC-UC03-1-INVITE-002 | Area Manager mời kỹ thuật viên | Actor MANAGER_A1; body areaId=AREA_A2 | Gửi lời mời Technician | 201; areaId bị ép AREA_A1, không được dùng AREA_A2 | Phân quyền / P1 |  |
| TC-UC03-1-INVITE-003 | Manager mời role không được phép | role=owner/area_manager/warehouse_staff | Gửi từng request với MANAGER_A1 | 403; không tạo lời mời | Phân quyền / P1 |  |
| TC-UC03-1-INVITE-004 | Thiếu khu vực bắt buộc | Owner; role=technician/area_manager; areaId=null | Gửi từng role | 400; không tạo lời mời | Chức năng / P1 |  |
| TC-UC03-1-INVITE-005 | Khu vực khác farm hoặc inactive | areaId=AREA_B1 hoặc AREA_INACTIVE | Gửi lời mời | 400; không tạo lời mời | Chức năng / P1 |  |
| TC-UC03-1-INVITE-006 | Email sai | email=abc | Submit UI/API | Form chặn hoặc API400; không gửi email | Chức năng / P1 |  |
| TC-UC03-1-INVITE-007 | Email đã có tài khoản | email của TECH_A1 | Gửi invitation | 409 theo giới hạn hiện tại; không tạo membership mới | Âm tính / P1 | Chức năng mời user hiện hữu sang farm khác chưa hoàn tất |
| TC-UC03-1-INVITE-008 | Lời mời pending trùng | Email đã pending tại FARM_A | Gửi lại email cùng farm | 409; không tạo duplicate | Chức năng / P1 |  |
| TC-UC03-1-INVITE-009 | Email lời mời thật | SMTP staging cấu hình | Gửi invitation và mở hộp thư | Mail có tên farm, link /set-password, thời hạn 1 ngày; link tới đúng môi trường | Tích hợp / P1 |  |
| TC-UC03-1-INVITE-010 | Đọc token còn hạn | Token pending còn 24h | GET /api/users/invitation/{TOKEN}; mở URL | 200; đúng email, farm, role, area; hiện form | Chức năng / P1 |  |
| TC-UC03-1-INVITE-011 | Token malformed/không tồn tại | token=bad; sau đó hex64 không tồn tại | GET invitation | Malformed400; unknown410; không hiện form | Chức năng / P1 |  |
| TC-UC03-1-INVITE-012 | Token quá hạn | expiresAt trong quá khứ | GET và POST /api/users/accept-invitation | 410; không tạo user/membership | Chức năng / P1 |  |
| TC-UC03-1-INVITE-013 | Chấp nhận thành công | Pending token; password/confirm Password123 | POST accept-invitation; đọc membership | 200; Neon identity, users, farmMember đúng role/area; invitation accepted; UI về /login | Tích hợp / P1 |  |
| TC-UC03-1-INVITE-014 | Password nhận lời mời không hợp lệ | password ngắn hoặc confirm khác | Gửi từng body | 400; không tạo tài khoản | Chức năng / P1 |  |
| TC-UC03-1-INVITE-015 | Dùng lại token accepted | Token đã nhận | GET/POST bằng token cũ | 410; không tạo tài khoản trùng | Chức năng / P1 |  |
| TC-UC03-1-INVITE-016 | Thu hồi và mở lại | Pending invitation; actor có quyền | DELETE /api/users/invitations/{INVITATION}; mở lại token | 204; status cancelled; token bị 410; toast; biến khỏi pending | Chức năng / P1 |  |
| TC-UC03-1-INVITE-017 | Thu hồi trái quyền | TECH_A1 hoặc actor farm khác | DELETE invitation FARM_A | 403; lời mời không đổi | Phân quyền / P1 |  |
| TC-UC03-1-INVITE-018 | Lỗi SMTP sau tạo invitation | SMTP staging giả lập thất bại | POST invitation; kiểm tra invitation/email và retry | Lỗi được báo rõ; không thông báo đã nhận mail; xác định pending còn lại và cách retry | Tích hợp / P1 | Case quan sát lỗi từng phần; code tạo pending trước sendMail, cần quyết định cơ chế retry |
| TC-UC03-1-INVITE-019 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC03-1-INVITE-020 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC03-1-INVITE-021 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC03.2 — Quản lý thành viên (MEMBER)

Actor: OWNER; AREA_MANAGER chỉ sửa TECHNICIAN cùng khu vực. Endpoint: PATCH /api/users/{USER_ID}. UI: /users.

Payload gốc: `{"farmId":"{FARM_A}","displayName":"QA Technician","phone":"0123456789","role":"technician","areaId":"{AREA_A1}","status":"active"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC03-2-MEMBER-001 | Owner cập nhật tên/phone | Target TECH_A1 | PATCH và tải lại danh sách | 200; name/phone mới được lưu | Chức năng / P1 |  |
| TC-UC03-2-MEMBER-002 | Owner đổi role và khu vực | role=area_manager; areaId=AREA_A2 | PATCH target TECH_A1 | 200; membership chuyển role/area đúng | Chức năng / P1 |  |
| TC-UC03-2-MEMBER-003 | Đổi thành Warehouse Staff | role=warehouse_staff; areaId=AREA_A1 | PATCH target | 200; areaId null | Chức năng / P1 |  |
| TC-UC03-2-MEMBER-004 | Suspend rồi active lại | status suspended rồi active | PATCH target hai lần; thử API target sau mỗi lần | Suspended bị 403 tại farm; active được truy cập | Chức năng / P1 |  |
| TC-UC03-2-MEMBER-005 | Tự suspend/đổi role | Target là OWNER_A đang đăng nhập | PATCH status=suspended hoặc role khác | 400; UI khóa self role/status; membership không đổi | Chức năng / P1 |  |
| TC-UC03-2-MEMBER-006 | Email không sửa được | email=new@example.test bổ sung | PATCH target | Email DB không đổi; UI email disabled | Chức năng / P1 |  |
| TC-UC03-2-MEMBER-007 | Manager sửa Technician cùng area | Actor MANAGER_A1; target TECH_A1 | Sửa name/phone/status | 200; cập nhật đúng trường; role/area giữ nguyên | Chức năng / P1 |  |
| TC-UC03-2-MEMBER-008 | Manager cố đổi role/area | Body role=owner; areaId=AREA_A2 | PATCH TECH_A1 bằng MANAGER_A1 | Không đổi role/area; UI khóa hai trường | Phân quyền / P1 |  |
| TC-UC03-2-MEMBER-009 | Manager sửa ngoài area/role | Target TECH_A2 hoặc OWNER_A hoặc WAREHOUSE_A | PATCH từng target | 403; không đổi user/membership | Phân quyền / P1 |  |
| TC-UC03-2-MEMBER-010 | Thiếu area cho role bắt buộc | role=technician; areaId=null | Owner PATCH | 400; không đổi membership | Chức năng / P1 |  |
| TC-UC03-2-MEMBER-011 | Trường profile quá dài | displayName101 hoặc phone31 | PATCH từng body | 400; không ghi dữ liệu | Chức năng / P1 |  |
| TC-UC03-2-MEMBER-012 | Suspend riêng một farm | OWNER_AB active FARM_A/FARM_B; Owner khác suspend tại A | Gọi API A và B; reload farm selector | A bị403; B còn truy cập; không mất toàn bộ account | Phân quyền / P1 |  |
| TC-UC03-2-MEMBER-013 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC03-2-MEMBER-014 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC03-2-MEMBER-015 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC03.3 — Danh sách thành viên (MEMBER-LIST)

Actor: OWNER; AREA_MANAGER. Endpoint: GET /api/users?farmId={FARM_A}. UI: /users.

Payload gốc: `{}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC03-3-MEMBER-LIST-001 | Owner xem toàn trại | A có thành viên AREA_A1 và AREA_A2 | Mở /users chọn A | 200; đủ thành viên hai khu vực, không có farm B | Chức năng / P1 |  |
| TC-UC03-3-MEMBER-LIST-002 | Manager xem đúng area | Actor MANAGER_A1 | GET users và invitations farm A | Chỉ AREA_A1; không lộ AREA_A2 | Phân quyền / P1 |  |
| TC-UC03-3-MEMBER-LIST-003 | Tech/Warehouse không quản lý users | TECH_A1 và WAREHOUSE_A | GET /api/users?farmId=A | 403 | Phân quyền / P1 |  |
| TC-UC03-3-MEMBER-LIST-004 | Gộp pending khi bật switch | Có invitation pending | Bật Xem lời mời đang chờ | Cùng bảng members/pending; pending Chưa tham gia; tắt switch ẩn pending | Chức năng / P1 |  |
| TC-UC03-3-MEMBER-LIST-005 | Định dạng và tên role | createdAt=2026-10-01T05:30:00Z | Xem bảng với timezone UTC+7 | 12:30 01/10/2026; role tiếng Việt; không có cột expiry | UI / P1 |  |
| TC-UC03-3-MEMBER-LIST-006 | Tìm kiếm và phân trang UI | Ít nhất 12 members | Tìm theo name/email/role; đổi trang | Kết quả phù hợp; phân trang không trùng/mất dòng | UI / P1 |  |
| TC-UC03-3-MEMBER-LIST-007 | Danh sách rỗng | Farm không có staff ngoài Owner | Mở trang; tìm chuỗi không tồn tại | Thông báo rỗng phù hợp; không lỗi JavaScript | UI / P1 |  |
| TC-UC03-3-MEMBER-LIST-008 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC03-3-MEMBER-LIST-009 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC03-3-MEMBER-LIST-010 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC04.1 — Trang trại và vòng đời (FARM)

Actor: OWNER tạo/sửa; các role active xem. Endpoint: GET/POST /api/farms; PATCH/DELETE /api/farms/{FARM_A}. UI: /farms.

Payload gốc: `{"code":"QA_FARM","name":"Trại kiểm thử","address":"Địa chỉ test"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC04-1-FARM-001 | Tạo farm và Owner membership | OWNER_A; mã mới | POST /api/farms; đọc membership | 201; farm và owner membership cùng transaction | Chức năng / P1 |  |
| TC-UC04-1-FARM-002 | Địa chỉ không bắt buộc | address="" | POST tạo farm | 201; address null | Chức năng / P1 |  |
| TC-UC04-1-FARM-003 | Chuẩn hóa mã | code=" qa_farm " mới | POST | code QA_FARM; name trim | Chức năng / P1 |  |
| TC-UC04-1-FARM-004 | Trùng mã farm | code đã tồn tại | POST | 409; không tạo farm/membership | Chức năng / P1 |  |
| TC-UC04-1-FARM-005 | Code/name không hợp lệ | code rỗng/1/31 ký tự; name rỗng/121 | Gửi từng biến thể | 400; không tạo farm | Chức năng / P1 |  |
| TC-UC04-1-FARM-006 | Role không phải Owner không tạo farm | Area Manager / Technician/Warehouse chỉ có membership non-owner | POST /api/farms | 403; nút tạo không có trong trạng thái dữ liệu thông thường | Phân quyền / P1 |  |
| TC-UC04-1-FARM-007 | Cập nhật thông tin | Owner; name/address mới | PATCH farm; reload | 200; đúng dữ liệu | Chức năng / P1 |  |
| TC-UC04-1-FARM-008 | Danh sách active theo membership | Có active, suspended và archived farm | GET /api/farms; includeArchived=true | Mặc định chỉ active farm/membership; includeArchived chỉ Owner thấy archived | Chức năng / P1 |  |
| TC-UC04-1-FARM-009 | Archive khi còn phụ thuộc | Còn active area/tank/staff hoặc pending invitation | PATCH /status archived; DELETE farm | 409; liệt kê phụ thuộc; farm giữ active | Chức năng / P1 |  |
| TC-UC04-1-FARM-010 | Archive đủ điều kiện | Không active area/staff/pending; tank inactive | PATCH /status archived hoặc DELETE | Lưu status archived; không xóa vật lý; Owner truy được với includeArchived | Chức năng / P1 |  |
| TC-UC04-1-FARM-011 | Restore archived | Owner membership active; farm archived | PATCH /status active | 200; archivedAt/By null; farm hiện lại | Chức năng / P1 |  |
| TC-UC04-1-FARM-012 | Chọn farm và reload | OWNER_AB có hai farm | Đổi select navbar; reload | Dữ liệu theo farm mới; selectedFarmId được giữ | UI / P1 |  |

### UC04.1 — Khu vực thuộc trang trại (AREA)

Actor: OWNER tạo/sửa/archive/delete; AREA_MANAGER xem. Endpoint: GET/POST /api/farms/{FARM_A}/areas. UI: /farms.

Payload gốc: `{"code":"QA_AREA","name":"Khu vực kiểm thử"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC04-1-AREA-001 | Tạo khu vực | Owner; mã mới | POST areas | 201; farmId đúng; code uppercase | Chức năng / P1 |  |
| TC-UC04-1-AREA-002 | Trùng mã cùng farm | Code đã có ở A | POST areas A | 409; không tạo duplicate | Chức năng / P1 |  |
| TC-UC04-1-AREA-003 | Cùng mã hai farm | Owner có quyền A/B; mã mới trong từng farm | POST cùng code tại A và B | Cả hai201; unique là farmId+code | Chức năng / P1 |  |
| TC-UC04-1-AREA-004 | Code/name không hợp lệ | code rỗng/31; name rỗng/121 | POST từng body | 400 | Chức năng / P1 |  |
| TC-UC04-1-AREA-005 | Manager xem area riêng | MANAGER_A1 | GET areas A | Chỉ AREA_A1 | Chức năng / P1 |  |
| TC-UC04-1-AREA-006 | Manager không tạo/sửa/delete area | MANAGER_A1 | POST/PATCH/DELETE area | 403 | Phân quyền / P1 |  |
| TC-UC04-1-AREA-007 | Inactive còn phụ thuộc | Area có active member/pending hoặc tank chưa inactive | PATCH /areas/{AREA_A1}/status inactive | 409; không đổi status | Chức năng / P1 |  |
| TC-UC04-1-AREA-008 | Inactive và includeInactive | Area không còn phụ thuộc active | Owner đổi inactive; GET mặc định và includeInactive=true | 200; mặc định ẩn; Owner includeInactive thấy; Manager includeInactive bị403 | Chức năng / P1 |  |
| TC-UC04-1-AREA-009 | Xóa area có lịch sử liên kết | Area inactive còn member/invitation/tank bất kỳ | DELETE area | 409; bảo toàn lịch sử | Chức năng / P1 |  |
| TC-UC04-1-AREA-010 | Xóa area trống | Area inactive không FK liên kết | DELETE area | 204; không còn DB record | Chức năng / P1 |  |
| TC-UC04-1-AREA-011 | Phục hồi area | Area inactive | PATCH status active | 200; xuất hiện danh sách active | Chức năng / P1 |  |
| TC-UC04-1-AREA-012 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC04-1-AREA-013 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC04-1-AREA-014 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC04.2 — Ao/bể (TANK)

Actor: OWNER; AREA_MANAGER quản lý; TECHNICIAN xem. Endpoint: GET/POST /api/farms/{FARM_A}/ponds-tanks. UI: /ponds-tanks.

Payload gốc: `{"code":"QA_TANK","name":"Bể kiểm thử","tankType":"nursery_tank","volumeM3":100,"areaId":"{AREA_A1}"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC04-2-TANK-001 | Tạo ao/bể | Owner; khu active; code mới | POST ponds-tanks | 201; status empty; farm/area đúng; Decimal volume | Chức năng / P1 |  |
| TC-UC04-2-TANK-002 | Manager tạo trong area | MANAGER_A1; areaId thiếu | POST ponds-tanks | 201; areaId tự gán AREA_A1 | Chức năng / P1 |  |
| TC-UC04-2-TANK-003 | Manager khai area khác | MANAGER_A1; areaId=AREA_A2 | POST | 403; không tạo | Chức năng / P1 |  |
| TC-UC04-2-TANK-004 | Owner thiếu area | areaId=null | POST | 400; phải gán khu vực | Chức năng / P1 |  |
| TC-UC04-2-TANK-005 | Code/name/type sai | code rỗng; name101; tankType=invalid | Gửi từng body | 400 | Chức năng / P1 |  |
| TC-UC04-2-TANK-006 | Biên thể tích | volumeM3=0,-1,1000001; sau đó1000000 | POST từng biến thể mã mới | Ba giá trị đầu400; 1000000 được201 | Biên / P1 |  |
| TC-UC04-2-TANK-007 | Trùng code | Code đã có cùng farm | POST | 409 | Chức năng / P1 |  |
| TC-UC04-2-TANK-008 | Danh sách và detail scoped | Có tank ở A1/A2/B1 | Owner / Area Area Manager / Technician GET list và detail | Owner toàn A; Area Manager / Technician A1; detail ngoài scope404 | Chức năng / P1 |  |
| TC-UC04-2-TANK-009 | Tìm kiếm/type/status | q=QA; tankType=pond; status=empty | GET list với từng filter | Chỉ dòng khớp; status invalid400 | Chức năng / P1 |  |
| TC-UC04-2-TANK-010 | Cập nhật tên/thể tích | Owner hoặc manager trong area | PATCH /ponds-tanks/{TANK_A1} | 200; reload đúng; farmId không đổi | Chức năng / P1 |  |
| TC-UC04-2-TANK-011 | Tech chỉ xem | TECH_A1 | POST/PATCH/DELETE | 403; UI không có thao tác quản lý | Phân quyền / P1 |  |
| TC-UC04-2-TANK-012 | Soft-delete trạng thái phù hợp | Tank empty hoặc inactive | DELETE tank; GET list/detail | 204; deletedAt/By có; mặc định ẩn; không xóa log lịch sử | Chức năng / P1 |  |
| TC-UC04-2-TANK-013 | Chặn xóa active/cleaning | Tank active hoặc cleaning | DELETE | 409; không đổi deletedAt | Chức năng / P1 |  |
| TC-UC04-2-TANK-014 | Xem deleted và restore | Tank deleted, area active | Owner GET includeDeleted=true; PATCH /{tankId}/restore | 200; deletedAt/By null; hiện lại | Chức năng / P1 |  |
| TC-UC04-2-TANK-015 | Restore khi area inactive | Tank deleted, area inactive | PATCH restore | 400; chưa restore | Chức năng / P1 |  |
| TC-UC04-2-TANK-016 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC04-2-TANK-017 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC04-2-TANK-018 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC04.3 — Trạng thái ao/bể (TANK-STATUS)

Actor: OWNER; AREA_MANAGER. Endpoint: PATCH /api/farms/{FARM_A}/ponds-tanks/{TANK_A1}/status. UI: /ponds-tanks.

Payload gốc: `{"status":"cleaning"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC04-3-TANK-STATUS-001 | Trạng thái không thuộc enum | status=sold | PATCH status | 400; status cũ giữ nguyên | Chức năng / P1 |  |
| TC-UC04-3-TANK-STATUS-002 | Technician không đổi trạng thái | TECH_A1 | PATCH status=cleaning | 403 | Phân quyền / P1 |  |
| TC-UC04-3-TANK-STATUS-003 | Chuyển bể empty → empty | Fixture tank.status=empty; body.status=empty | PATCH /status trên fixture riêng | 200;status=empty | Chuyển trạng thái / P1 |  |
| TC-UC04-3-TANK-STATUS-004 | Chuyển bể empty → active | Fixture tank.status=empty; body.status=active | PATCH /status trên fixture riêng | 200;status=active | Chuyển trạng thái / P1 |  |
| TC-UC04-3-TANK-STATUS-005 | Chuyển bể empty → cleaning | Fixture tank.status=empty; body.status=cleaning | PATCH /status trên fixture riêng | 200;status=cleaning | Chuyển trạng thái / P1 |  |
| TC-UC04-3-TANK-STATUS-006 | Chuyển bể empty → inactive | Fixture tank.status=empty; body.status=inactive | PATCH /status trên fixture riêng | 200;status=inactive | Chuyển trạng thái / P1 |  |
| TC-UC04-3-TANK-STATUS-007 | Chuyển bể active → empty | Fixture tank.status=active; body.status=empty | PATCH /status trên fixture riêng | 409;status vẫnactive | Chuyển trạng thái / P1 |  |
| TC-UC04-3-TANK-STATUS-008 | Chuyển bể active → active | Fixture tank.status=active; body.status=active | PATCH /status trên fixture riêng | 200;status=active | Chuyển trạng thái / P1 |  |
| TC-UC04-3-TANK-STATUS-009 | Chuyển bể active → cleaning | Fixture tank.status=active; body.status=cleaning | PATCH /status trên fixture riêng | 200;status=cleaning | Chuyển trạng thái / P1 |  |
| TC-UC04-3-TANK-STATUS-010 | Chuyển bể active → inactive | Fixture tank.status=active; body.status=inactive | PATCH /status trên fixture riêng | 200;status=inactive | Chuyển trạng thái / P1 |  |
| TC-UC04-3-TANK-STATUS-011 | Chuyển bể cleaning → empty | Fixture tank.status=cleaning; body.status=empty | PATCH /status trên fixture riêng | 200;status=empty | Chuyển trạng thái / P1 |  |
| TC-UC04-3-TANK-STATUS-012 | Chuyển bể cleaning → active | Fixture tank.status=cleaning; body.status=active | PATCH /status trên fixture riêng | 409;status vẫncleaning | Chuyển trạng thái / P1 |  |
| TC-UC04-3-TANK-STATUS-013 | Chuyển bể cleaning → cleaning | Fixture tank.status=cleaning; body.status=cleaning | PATCH /status trên fixture riêng | 200;status=cleaning | Chuyển trạng thái / P1 |  |
| TC-UC04-3-TANK-STATUS-014 | Chuyển bể cleaning → inactive | Fixture tank.status=cleaning; body.status=inactive | PATCH /status trên fixture riêng | 200;status=inactive | Chuyển trạng thái / P1 |  |
| TC-UC04-3-TANK-STATUS-015 | Chuyển bể inactive → empty | Fixture tank.status=inactive; body.status=empty | PATCH /status trên fixture riêng | 200;status=empty | Chuyển trạng thái / P1 |  |
| TC-UC04-3-TANK-STATUS-016 | Chuyển bể inactive → active | Fixture tank.status=inactive; body.status=active | PATCH /status trên fixture riêng | 409;status vẫninactive | Chuyển trạng thái / P1 |  |
| TC-UC04-3-TANK-STATUS-017 | Chuyển bể inactive → cleaning | Fixture tank.status=inactive; body.status=cleaning | PATCH /status trên fixture riêng | 409;status vẫninactive | Chuyển trạng thái / P1 |  |
| TC-UC04-3-TANK-STATUS-018 | Chuyển bể inactive → inactive | Fixture tank.status=inactive; body.status=inactive | PATCH /status trên fixture riêng | 200;status=inactive | Chuyển trạng thái / P1 |  |
| TC-UC04-3-TANK-STATUS-019 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC04-3-TANK-STATUS-020 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC04-3-TANK-STATUS-021 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC05.1 — Nhà cung cấp giống (SUPPLIER)

Actor: OWNER quản lý; AREA_MANAGER xem. Endpoint: GET/POST /api/farms/{FARM_A}/seed-suppliers. UI: /seed-suppliers.

Payload gốc: `{"name":"Nhà cung cấp QA"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC05-1-SUPPLIER-001 | Tạo và cập nhật nhà cung cấp | Owner; name hợp lệ | POST supplier; PATCH /{SUPPLIER_A} | 201 tạo,200 sửa; đúng farm | Chức năng / P1 |  |
| TC-UC05-1-SUPPLIER-002 | Tên rỗng/quá dài | name="" hoặc 151 ký tự | POST từng biến thể | 400; không ghi | Chức năng / P1 |  |
| TC-UC05-1-SUPPLIER-003 | Xem/tìm kiếm/phân trang | Có >=3 supplier | GET ?q=QA&page=1&limit=2 | items/pagination đúng; không lộ farm B | Chức năng / P1 |  |
| TC-UC05-1-SUPPLIER-004 | Xem lô của supplier | SUPPLIER_A có lô ở các area | GET /{supplierId}/seed-batches bằng Owner / Area Manager | Owner thấy lô A; Manager chỉ lô trong area phụ trách | Chức năng / P1 |  |
| TC-UC05-1-SUPPLIER-005 | Manager không sửa; Tech không xem | MANAGER_A1 PATCH; TECH_A1 GET | Gọi endpoint tương ứng | 403 | Phân quyền / P1 |  |
| TC-UC05-1-SUPPLIER-006 | Supplier farm khác | SUPPLIER_B | GET/PATCH supplier B dưới path farm A | 404; không sửa B | Chức năng / P1 |  |
| TC-UC05-1-SUPPLIER-007 | Page/limit/q sai | page=0; limit=101; q151 | GET từng query | 400 | Chức năng / P1 |  |
| TC-UC05-1-SUPPLIER-008 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC05-1-SUPPLIER-009 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC05-1-SUPPLIER-010 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC05.1 — Tiếp nhận và cập nhật lô giống (BATCH)

Actor: OWNER; AREA_MANAGER; TECHNICIAN sửa thông tin kỹ thuật. Endpoint: GET/POST /api/farms/{FARM_A}/seed-batches. UI: /seed-batches.

Payload gốc: `{"batchCode":"QA_BATCH","supplierLotCode":"SUP_LOT_01","supplierId":"{SUPPLIER_A}","tankId":"{TANK_EMPTY_A1}","species":"white_leg_shrimp","developmentStage":"PL12","source":"Nhà cung cấp QA","initialQuantity":10000,"documentedQuantity":10000,"stockedDate":"2026-10-09","expectedSaleDate":"2026-10-20"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC05-1-BATCH-001 | Tiếp nhận vào bể empty | Bể active area, status empty | POST batch; đọc batch,tank,quantity-events | 201; batch active/current=initial=10000; tank active; stocking event10000 cùng transaction | Chức năng / P1 |  |
| TC-UC05-1-BATCH-002 | Bể đang có lô | tankId=TANK_A1 active | POST batch | 409; không tạo lô/stocking event | Chức năng / P1 |  |
| TC-UC05-1-BATCH-003 | Bể deleted hoặc area inactive | Tank deleted hoặc area inactive | POST với từng tank | 404 deleted hoặc409 inactive area; không nhận lô | Chức năng / P1 |  |
| TC-UC05-1-BATCH-004 | Supplier không cùng farm | supplierId=SUPPLIER_B | POST batch | 400; không nhận lô | Chức năng / P1 |  |
| TC-UC05-1-BATCH-005 | Mã lô trùng | batchCode đã tồn tại | POST bể empty khác | 409; không tạo lô | Chức năng / P1 |  |
| TC-UC05-1-BATCH-006 | Thiếu trường bắt buộc | Lần lượt bỏ batchCode,supplierLotCode,species,developmentStage,source,stockedDate,expectedSaleDate | POST từng body | 400; không nhận lô | Chức năng / P1 |  |
| TC-UC05-1-BATCH-007 | Ngày bán trước ngày thả | expectedSaleDate=2026-10-08; stockedDate=2026-10-09 | POST | 400 | Chức năng / P1 |  |
| TC-UC05-1-BATCH-008 | Số lượng nhận sai | initialQuantity=0,-1,1.5 hoặc null | POST từng body | 400 | Chức năng / P1 |  |
| TC-UC05-1-BATCH-009 | Species sai | species=unknown_species | POST | 400 | Chức năng / P1 |  |
| TC-UC05-1-BATCH-010 | Xem list/detail/filter | Có lô nhiều status/area | GET list ?status=active&q=QA; GET /{BATCH_A1} | 200; đúng bộ lọc và scope | Chức năng / P1 |  |
| TC-UC05-1-BATCH-011 | Area Manager / Technician ngoài area | BATCH_A2 | GET/PATCH dưới FARM_A bằng actor A1 | 404; không lộ/sửa lô khác area | Chức năng / P1 |  |
| TC-UC05-1-BATCH-012 | Tech sửa đúng trường kỹ thuật | PATCH species/developmentStage/broodstockLine/broodstockStatus/notes | TECH_A1 cập nhật BATCH_A1 | 200; chỉ các trường cho phép thay đổi | Chức năng / P1 |  |
| TC-UC05-1-BATCH-013 | Tech cố sửa số liệu nguồn | PATCH batchCode/supplierId/documentedQuantity hoặc tankId | TECH_A1 gửi từng field | 403; không cập nhật | Phân quyền / P1 |  |
| TC-UC05-1-BATCH-014 | Không chuyển bể bằng PATCH | Owner; tankId=TANK_EMPTY_A1 | PATCH /{BATCH_A1} | 403 do field không thuộc EDITABLE_FIELDS; không chuyển bể | Chức năng / P1 |  |
| TC-UC05-1-BATCH-015 | Lô kết thúc không sửa | Batch sold/failed/cancelled | PATCH metadata bằng Owner | 409; dữ liệu giữ nguyên | Chức năng / P1 |  |
| TC-UC05-1-BATCH-016 | Giấy kiểm dịch upload | Ảnh/pdf staging hợp lệ <=10MiB | POST /attachments/upload-signature; upload Cloudinary; gửi healthCertificatePublicId trong create/PATCH | Asset được verify folder FARM_A; URL do server lấy từ asset; lưu PublicId/format | Tích hợp / P1 |  |
| TC-UC05-1-BATCH-017 | Giấy kiểm dịch sai nguồn | PublicId asset farm B hoặc thiếu/unsupported/>10MiB | PATCH healthCertificatePublicId | 400; không gắn file sai | Chức năng / P1 |  |
| TC-UC05-1-BATCH-018 | Hai request nhận cùng một bể | Hai batchCode mới cùng bể empty | Gửi hai POST đồng thời | Chỉ một thành công; request còn lại409; không hai lô active, không stocking mồ côi | Đồng thời / P1 |  |
| TC-UC05-1-BATCH-019 | PATCH đồng thời chuyển scope/kết thúc | R1 kiểm quyền A1 rồi R2 chuyển lô A2/kết thúc | Điều phối hai request và thử R1 ghi tiếp | Không cho request dùng quyền/trạng thái đã cũ ghi vào lô ngoài scope/đã kết thúc | Regression / P0 | Rủi ro đã thấy: updateSeedBatch chỉ lọc id khi ghi; case expected là bảo toàn dữ liệu, không coi hành vi hiện tại là đúng |
| TC-UC05-1-BATCH-020 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC05-1-BATCH-021 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC05-1-BATCH-022 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC05.1 — Biến động số lượng và chuyển bể (QUANTITY)

Actor: TECHNICIAN ghi mortality; OWNER/AREA_MANAGER adjustment/transfer. Endpoint: GET/POST /api/farms/{FARM_A}/seed-batches/{BATCH_A1}/quantity-events. UI: /seed-batches.

Payload gốc: `{"eventType":"mortality","quantity":100,"reason":"Theo dõi chết","occurredAt":"2026-10-09T08:00:00+07:00"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC05-1-QUANTITY-001 | Ghi chết | currentQuantity10000; quantity100 | TECH_A1 POST mortality | 201; còn9900; event lưu actor/reason; tank không đổi | Chức năng / P1 |  |
| TC-UC05-1-QUANTITY-002 | Chết hết lô | quantity=current10000 | POST mortality | 201; quantity0; batch failed; tank empty | Chức năng / P1 |  |
| TC-UC05-1-QUANTITY-003 | Chết vượt số lượng | quantity10001 | POST | 409; không event; quantity giữ10000 | Chức năng / P1 |  |
| TC-UC05-1-QUANTITY-004 | Số lượng/lý do sai | quantity0/âm/lẻ; reason="" | POST từng body | 400 | Chức năng / P1 |  |
| TC-UC05-1-QUANTITY-005 | Adjustment tăng/giảm | eventType=adjustment; direction increase/decrease; quantity100 | Owner POST từng hướng với fixture reset | 201; tăng10100 hoặc giảm9900; ledger đúng dấu | Chức năng / P1 |  |
| TC-UC05-1-QUANTITY-006 | Adjustment thiếu hướng | eventType=adjustment; không adjustmentDirection | POST | 400 | Chức năng / P1 |  |
| TC-UC05-1-QUANTITY-007 | Tech không adjustment/transfer | TECH_A1; eventType adjustment hoặc transfer | POST | 403 | Phân quyền / P1 |  |
| TC-UC05-1-QUANTITY-008 | Transfer toàn bộ | current10000; target=TANK_EMPTY_A1; quantity10000 | Owner POST transfer | 201; batch.tankId đổi; source empty,target active; hai events out/in, quantity tổng không đổi | Chức năng / P1 |  |
| TC-UC05-1-QUANTITY-009 | Transfer một phần | quantity100; current10000 | POST transfer | 400; không chuyển; không tạo events | Chức năng / P1 |  |
| TC-UC05-1-QUANTITY-010 | Đích không hợp lệ | Đích trùng nguồn/active hoặc area ngoài scope | POST từng request với Owner / Area Manager | Cùng bể400; đích không trống409; ngoài scope404; không ghi | Chức năng / P1 |  |
| TC-UC05-1-QUANTITY-011 | Hai thao tác giảm đồng thời | current100; mỗi request mortality80 | Gửi hai request đồng thời | Một201 một409; cuối20, không âm, một event80 | Đồng thời / P1 |  |
| TC-UC05-1-QUANTITY-012 | Lịch sử có phân trang | Có >=3 events | GET ?page=1&limit=2; trang2 | 200; thời gian desc; pagination đầy đủ; không events lô khác | Chức năng / P1 |  |
| TC-UC05-1-QUANTITY-013 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC05-1-QUANTITY-014 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC05-1-QUANTITY-015 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC05.1 — Lấy mẫu tăng trưởng (GROWTH)

Actor: OWNER; AREA_MANAGER; TECHNICIAN. Endpoint: GET/POST /api/farms/{FARM_A}/seed-batches/{BATCH_A1}/growth-samples. UI: /seed-batches.

Payload gốc: `{"method":"manual","sampleCount":100,"totalSampleWeightG":50,"estimatedQuantity":10000}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC05-1-GROWTH-001 | Tính khối lượng và sinh khối | 100 con; tổng50g; estimate10000 | POST không nhập averageWeightG/biomassKg | 201; averageWeightG0.5g; biomassKg5 | Chức năng / P1 |  |
| TC-UC05-1-GROWTH-002 | Bảo toàn số liệu nhập rõ | averageWeightG0.6; biomassKg6 | POST | 201; giữ số đã nhập, không ghi đè bởi số dẫn xuất | Chức năng / P1 |  |
| TC-UC05-1-GROWTH-003 | Cỡ mẫu sai | sampleCount0 hoặc1.5 | POST | 400 | Chức năng / P1 |  |
| TC-UC05-1-GROWTH-004 | Min chiều dài lớn hơn max | lengthMinMm20; lengthMaxMm10 | POST | 400 | Chức năng / P1 |  |
| TC-UC05-1-GROWTH-005 | Độ đồng đều ngoài biên | uniformityScore=-1,101; sau đó0,100 | POST từng giá trị | Ngoài biên400; biên0/100 hợp lệ | Biên / P1 |  |
| TC-UC05-1-GROWTH-006 | Lô kết thúc | Batch sold/failed/cancelled | POST sample | 409; không ghi | Chức năng / P1 |  |
| TC-UC05-1-GROWTH-007 | Method sai | method=invalid | POST | 400 | Chức năng / P1 |  |
| TC-UC05-1-GROWTH-008 | Danh sách mẫu | Có >=3 growth samples | GET ?page=1&limit=2 | 200; sampledAt desc; actor,derived values đúng | Chức năng / P1 |  |
| TC-UC05-1-GROWTH-009 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC05-1-GROWTH-010 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC05-1-GROWTH-011 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC05.1 — Kiểm định chất lượng và duyệt (QUALITY)

Actor: TECHNICIAN ghi; OWNER/AREA_MANAGER duyệt. Endpoint: GET/POST /api/farms/{FARM_A}/seed-batches/{BATCH_A1}/quality-checks. UI: /seed-batches.

Payload gốc: `{"checkType":"salinity_stress","sampleSize":100,"liveCount":95,"abnormalCount":2,"testMethod":"QA protocol","result":"pass"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC05-1-QUALITY-001 | Stress test và tỷ lệ | Payload mẫu | TECH_A1 POST quality-check | 201; survivalRate95%; deformityRate2%; checkedBy đúng | Chức năng / P1 |  |
| TC-UC05-1-QUALITY-002 | PCR hợp lệ | checkType=pcr; diseaseCode=WSSV; testMethod PCR; sampleSize100 | TECH_A1 POST | 201; lưu diseaseCode và result | Chức năng / P1 |  |
| TC-UC05-1-QUALITY-003 | PCR thiếu/sai disease | checkType=pcr; diseaseCode thiếu hoặc UNKNOWN | POST từng body | 400 | Chức năng / P1 |  |
| TC-UC05-1-QUALITY-004 | Sample/count sai | sampleSize0/lẻ; liveCount101; abnormalCount-1 | POST từng body | 400 | Chức năng / P1 |  |
| TC-UC05-1-QUALITY-005 | Stress thiếu liveCount | checkType=formalin_stress; thiếu liveCount | POST | 400 | Chức năng / P1 |  |
| TC-UC05-1-QUALITY-006 | Owner / Area Manager không ghi kiểm định | Actor Owner / Area Manager | POST quality-check | 403 theo hiện thực; không ghi | Phân quyền / P1 |  |
| TC-UC05-1-QUALITY-007 | Evidence upload | TECH_A1; image/pdf đúng folder batch <=10MiB | POST /quality-checks/upload-signature; upload; POST evidencePublicId/evidenceResourceType | 201; URL,format verify đúng batch | Tích hợp / P1 |  |
| TC-UC05-1-QUALITY-008 | Evidence sai folder/loại | Asset của batch khác hoặc type video | POST evidence | 400; không gắn asset | Chức năng / P1 |  |
| TC-UC05-1-QUALITY-009 | Duyệt xác nhận | Review pending | Owner PATCH /{CHECK_A1}/review {reviewStatus:confirmed} | 200; reviewer/reviewedAt có | Chức năng / P1 |  |
| TC-UC05-1-QUALITY-010 | Yêu cầu xử lý rồi resolve | pending; reviewNotes có nội dung | PATCH action_required; PATCH resolved | 200 mỗi bước; notes được lưu | Chức năng / P1 |  |
| TC-UC05-1-QUALITY-011 | Transition/notes sai | confirmed→resolved hoặc action_required thiếu notes | PATCH review từng body | Transition409; thiếu notes400; trạng thái không đổi | Chức năng / P1 |  |
| TC-UC05-1-QUALITY-012 | Tech không duyệt | TECH_A1 | PATCH review | 403 | Chức năng / P1 |  |
| TC-UC05-1-QUALITY-013 | Hai người duyệt cùng lúc | Review pending | R1 confirmed; R2 action_required đồng thời | Một thành công; request dùng status cũ409; không ghi đè | Đồng thời / P1 |  |
| TC-UC05-1-QUALITY-014 | Sai checkId trong path batch | CHECK_A2 thuộc lô khác cùng farm/area | PATCH /BATCH_A1/quality-checks/CHECK_A2/review | 404; không duyệt kiểm định thuộc lô khác | Regression / P0 | Đã ghi nhận query review thiếu batchId; cần sửa trước khi case đạt |
| TC-UC05-1-QUALITY-015 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC05-1-QUALITY-016 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC05-1-QUALITY-017 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC05.2 — Trạng thái lô (BATCH-STATUS)

Actor: OWNER; AREA_MANAGER. Endpoint: PATCH /api/farms/{FARM_A}/seed-batches/{BATCH_A1}/status. UI: /seed-batches.

Payload gốc: `{"status":"ready_for_sale"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC05-2-BATCH-STATUS-001 | Status ngoài enum | status=empty | PATCH status | 400 | Chức năng / P1 |  |
| TC-UC05-2-BATCH-STATUS-002 | Tech không đổi status | TECH_A1; status ready_for_sale | PATCH status | 403 theo route; tài liệu có đoạn actor mâu thuẫn, suite theo hiện thực | Phân quyền / P1 |  |
| TC-UC05-2-BATCH-STATUS-003 | Hai request status đồng thời | active; R1 ready_for_sale; R2 failed | Gửi đồng thời sau cùng trạng thái đọc | Chỉ một update theo status cũ thành công; không ghi đè status đã đổi | Đồng thời / P1 |  |
| TC-UC05-2-BATCH-STATUS-004 | Đồng bộ bể khi kết thúc lô | Batch ready_for_sale→sold hoặc active→failed/cancelled | Đổi status; kiểm tra bể và khả năng tiếp nhận lô tiếp | Ao/bể được chuyển theo quy trình kết thúc đã chốt; không giữ trạng thái gây chặn lô mới ngoài ý muốn | Regression / P1 | Code chỉ cập nhật batch; cần chốt empty hay cleaning, không tự giả định chính sách |
| TC-UC05-2-BATCH-STATUS-005 | Chuyển lô active → active | Fixture batch.status=active;body.status=active | PATCH /status trên fixture riêng | 409;status vẫnactive | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-006 | Chuyển lô active → ready_for_sale | Fixture batch.status=active;body.status=ready_for_sale | PATCH /status trên fixture riêng | 200;status=ready_for_sale | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-007 | Chuyển lô active → sold | Fixture batch.status=active;body.status=sold | PATCH /status trên fixture riêng | 409;status vẫnactive | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-008 | Chuyển lô active → failed | Fixture batch.status=active;body.status=failed | PATCH /status trên fixture riêng | 200;status=failed | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-009 | Chuyển lô active → cancelled | Fixture batch.status=active;body.status=cancelled | PATCH /status trên fixture riêng | 200;status=cancelled | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-010 | Chuyển lô ready_for_sale → active | Fixture batch.status=ready_for_sale;body.status=active | PATCH /status trên fixture riêng | 409;status vẫnready_for_sale | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-011 | Chuyển lô ready_for_sale → ready_for_sale | Fixture batch.status=ready_for_sale;body.status=ready_for_sale | PATCH /status trên fixture riêng | 409;status vẫnready_for_sale | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-012 | Chuyển lô ready_for_sale → sold | Fixture batch.status=ready_for_sale;body.status=sold | PATCH /status trên fixture riêng | 200;status=sold | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-013 | Chuyển lô ready_for_sale → failed | Fixture batch.status=ready_for_sale;body.status=failed | PATCH /status trên fixture riêng | 409;status vẫnready_for_sale | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-014 | Chuyển lô ready_for_sale → cancelled | Fixture batch.status=ready_for_sale;body.status=cancelled | PATCH /status trên fixture riêng | 409;status vẫnready_for_sale | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-015 | Chuyển lô sold → active | Fixture batch.status=sold;body.status=active | PATCH /status trên fixture riêng | 409;status vẫnsold | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-016 | Chuyển lô sold → ready_for_sale | Fixture batch.status=sold;body.status=ready_for_sale | PATCH /status trên fixture riêng | 409;status vẫnsold | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-017 | Chuyển lô sold → sold | Fixture batch.status=sold;body.status=sold | PATCH /status trên fixture riêng | 409;status vẫnsold | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-018 | Chuyển lô sold → failed | Fixture batch.status=sold;body.status=failed | PATCH /status trên fixture riêng | 409;status vẫnsold | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-019 | Chuyển lô sold → cancelled | Fixture batch.status=sold;body.status=cancelled | PATCH /status trên fixture riêng | 409;status vẫnsold | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-020 | Chuyển lô failed → active | Fixture batch.status=failed;body.status=active | PATCH /status trên fixture riêng | 409;status vẫnfailed | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-021 | Chuyển lô failed → ready_for_sale | Fixture batch.status=failed;body.status=ready_for_sale | PATCH /status trên fixture riêng | 409;status vẫnfailed | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-022 | Chuyển lô failed → sold | Fixture batch.status=failed;body.status=sold | PATCH /status trên fixture riêng | 409;status vẫnfailed | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-023 | Chuyển lô failed → failed | Fixture batch.status=failed;body.status=failed | PATCH /status trên fixture riêng | 409;status vẫnfailed | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-024 | Chuyển lô failed → cancelled | Fixture batch.status=failed;body.status=cancelled | PATCH /status trên fixture riêng | 409;status vẫnfailed | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-025 | Chuyển lô cancelled → active | Fixture batch.status=cancelled;body.status=active | PATCH /status trên fixture riêng | 409;status vẫncancelled | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-026 | Chuyển lô cancelled → ready_for_sale | Fixture batch.status=cancelled;body.status=ready_for_sale | PATCH /status trên fixture riêng | 409;status vẫncancelled | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-027 | Chuyển lô cancelled → sold | Fixture batch.status=cancelled;body.status=sold | PATCH /status trên fixture riêng | 409;status vẫncancelled | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-028 | Chuyển lô cancelled → failed | Fixture batch.status=cancelled;body.status=failed | PATCH /status trên fixture riêng | 409;status vẫncancelled | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-029 | Chuyển lô cancelled → cancelled | Fixture batch.status=cancelled;body.status=cancelled | PATCH /status trên fixture riêng | 409;status vẫncancelled | Chuyển trạng thái / P1 |  |
| TC-UC05-2-BATCH-STATUS-030 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC05-2-BATCH-STATUS-031 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC05-2-BATCH-STATUS-032 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC05.3 — Thông số môi trường nước (WATER)

Actor: OWNER; AREA_MANAGER; TECHNICIAN. Endpoint: GET/POST /api/farms/{FARM_A}/water-parameter-logs. UI: /water-parameter-logs.

Payload gốc: `{"tankId":"{TANK_A1}","temperature":29,"ph":8,"salinity":20,"dissolvedOxygen":5,"measurementMethod":"manual","recordedAt":"2026-10-09T08:00:00+07:00"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC05-3-WATER-001 | Ghi các thông số đã đo | Payload mẫu | POST water-parameter-logs | 201; Decimal values; actor/time đúng; alerts trả theo rule | Chức năng / P1 |  |
| TC-UC05-3-WATER-002 | Chỉ nhập một chỉ số | Chỉ ph8; bỏ các measurement khác | POST | 201; chỉ ph có giá trị; các thông số còn lại null | Chức năng / P1 |  |
| TC-UC05-3-WATER-003 | Không chỉ số nào | Tất cả measurement null/thiếu | POST | 400 | Chức năng / P1 |  |
| TC-UC05-3-WATER-004 | pH biên | ph=0,14; sau đó-0.001,14.001 | POST từng biến thể | 0/14 hợp lệ; ngoài0..14 trả400 | Biên / P1 |  |
| TC-UC05-3-WATER-005 | Nhiệt độ âm | temperature=-1; các measurement còn lại bỏ | POST | 201 theo validation hiện tại; không tự áp ngưỡng sinh học chưa cấu hình | Chức năng / P1 |  |
| TC-UC05-3-WATER-006 | Âm/sai precision thông số khác | salinity=-1 hoặc1.0001 | POST từng body | 400 | Chức năng / P1 |  |
| TC-UC05-3-WATER-007 | Ngày/method sai | recordedAt=bad hoặc measurementMethod=unknown | POST từng body | 400 | Chức năng / P1 |  |
| TC-UC05-3-WATER-008 | Ngoài area/deleted | TECH_A1; tank A2 hoặc deleted | POST/GET với từng tank | Không được ghi/đọc ngoài scope; detail/tank lookup404 | Chức năng / P1 |  |
| TC-UC05-3-WATER-009 | Lọc lịch sử | tankId=TANK_A1; from<=to; page1 limit2 | GET logs | 200; đúng tank/thời gian; không log farm B | Chức năng / P1 |  |
| TC-UC05-3-WATER-010 | Unknown field/notes dài | body thêm batchId hoặc notes4001 | POST | 400; batch được suy ra, không nhận liên kết từ client | Chức năng / P1 |  |
| TC-UC05-3-WATER-011 | Rollback nếu sinh alert thất bại | DB staging gây lỗi createMany alerts | POST measurement vượt ngưỡng | Không commit log một phần khi transaction alert thất bại | Tích hợp / P1 |  |
| TC-UC05-3-WATER-012 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC05-3-WATER-013 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC05-3-WATER-014 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC09.2 — Cấu hình và duyệt ngưỡng môi trường (THRESHOLD)

Actor: OWNER cấu hình; OWNER/AREA_MANAGER/TECHNICIAN xem. Endpoint: GET/POST /api/farms/{FARM_A}/environment-thresholds. UI: /environment-thresholds.

Payload gốc: `{"species":"white_leg_shrimp","developmentStage":"PL12","tankType":"nursery_tank","parameterCode":"ph","unit":"pH","warningMin":7,"warningMax":9,"dangerMin":6,"dangerMax":10,"sourceReference":"Fixture QA, không phải quy chuẩn sản xuất","effectiveFrom":"2026-10-09"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC09-2-THRESHOLD-001 | Tạo draft | Owner; payload mẫu | POST thresholds | 201; chưa approve/inactive; không áp cảnh báo | Chức năng / P1 |  |
| TC-UC09-2-THRESHOLD-002 | Duyệt ngưỡng | Draft THRESHOLD_A | POST /{thresholdId}/approve | 200; approvedBy/At có; isActive=true | Chức năng / P1 |  |
| TC-UC09-2-THRESHOLD-003 | Kích hoạt chưa duyệt | Draft; isActive true | PATCH /{thresholdId}/status | 409; vẫn inactive | Chức năng / P1 |  |
| TC-UC09-2-THRESHOLD-004 | Sửa draft | Draft; payload hợp lệ đầy đủ | PATCH threshold | 200; cập nhật cùng id; approvedAt null/isActive false | Chức năng / P1 |  |
| TC-UC09-2-THRESHOLD-005 | Sửa ngưỡng đã duyệt | Approved; warningMax = 9.5 | PATCH đầy đủ payload mới | 201 tạo revision id mới; bản cũ không bị sửa; revision cần duyệt | Chức năng / P1 |  |
| TC-UC09-2-THRESHOLD-006 | Vô hiệu ngưỡng | Approved active; isActive false | PATCH status; ghi log mới | 200; không áp rule bị tắt cho log mới | Chức năng / P1 |  |
| TC-UC09-2-THRESHOLD-007 | Min / max và danger sai | warningMin>max hoặc dangerMax<warningMax | POST từng body | 400 | Chức năng / P1 |  |
| TC-UC09-2-THRESHOLD-008 | Thiếu mọi bound cảnh báo | warningMin/Max,dangerMin/Max đều null | POST | 400 | Chức năng / P1 |  |
| TC-UC09-2-THRESHOLD-009 | Ngày hiệu lực đảo | effectiveTo trước effectiveFrom | POST | 400 | Chức năng / P1 |  |
| TC-UC09-2-THRESHOLD-010 | Parameter/source/unit sai | parameterCode invalid; sourceReference thiếu; unit rỗng | POST từng body | 400 | Chức năng / P1 |  |
| TC-UC09-2-THRESHOLD-011 | Role không phải Owner không cấu hình | MANAGER_A1/TECH_A1 | POST/PATCH/approve/status | 403; vẫn được GET thresholds | Phân quyền / P1 |  |
| TC-UC09-2-THRESHOLD-012 | Áp dụng rule đặc hiệu | Hai rules wildcard và species/stage/tank cụ thể, đều duyệt | Ghi water log vượt rule cụ thể | Rule có độ đặc hiệu cao hơn được chọn; cùng score chọn effectiveFrom/updatedAt mới hơn | Chức năng / P1 |  |
| TC-UC09-2-THRESHOLD-013 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC09-2-THRESHOLD-014 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC09-2-THRESHOLD-015 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC05.4 — Nhật ký cho ăn và khuyến nghị (FEED)

Actor: OWNER; AREA_MANAGER; TECHNICIAN. Endpoint: GET/POST /api/farms/{FARM_A}/feeding-logs. UI: /feeding-logs.

Payload gốc: `{"tankId":"{TANK_A1}","feedName":"Thức ăn QA","amount":2,"unit":"kg","feedCheckStatus":"consumed","feedingTime":"2026-10-09T08:00:00+07:00"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC05-4-FEED-001 | Ghi không liên kết kho | Không supplyId | POST feeding-log | 201; lưu log/actor; không tạo giao dịch kho | Chức năng / P1 |  |
| TC-UC05-4-FEED-002 | Ghi có liên kết thức ăn kho | supplyId=FEED_A; tồn10kg; amount2kg | POST; đọc stock và transaction | 201; stock = 8; log và usage2 cùng transaction; tên/unit theo supply | Chức năng / P1 |  |
| TC-UC05-4-FEED-003 | Kho không đủ | Tồn1kg; amount2 | POST với vật tư liên kết supply | 409; không log/ledger; stock vẫn1 | Chức năng / P1 |  |
| TC-UC05-4-FEED-004 | Sai nhóm/khác farm | supplyId=MEDICINE_A hoặc FEED_B | POST | 404; không log/trừ kho | Chức năng / P1 |  |
| TC-UC05-4-FEED-005 | Sai đơn vị | FEED_A unit kg; body unit g | POST | 400; không tự quy đổi/trừ kho | Chức năng / P1 |  |
| TC-UC05-4-FEED-006 | Lượng/time/status sai | amount0/âm/precision4; feedingTime bad; feedCheckStatus invalid | POST từng biến thể | 400 | Chức năng / P1 |  |
| TC-UC05-4-FEED-007 | Tên/unit bắt buộc | feedName="" hoặc unit="" | POST | 400 | Chức năng / P1 |  |
| TC-UC05-4-FEED-008 | Bể không active | tank empty/cleaning/deleted | POST | 404; không log | Chức năng / P1 |  |
| TC-UC05-4-FEED-009 | Khuyến nghị theo sinh khối | Approved guideline rateMin2%,max4%; biomass100kg | GET /recommendation?tankId=TANK_A1&biomassSnapshotKg=100 | 200; amount3kg,rate3%; đúng sourceReference | Chức năng / P1 |  |
| TC-UC05-4-FEED-010 | Khuyến nghị theo số lượng | Không biomass; guideline feedPer1000SeedG2; quantity10000 | GET recommendation | amount20g; không đổi thành kg | Chức năng / P1 |  |
| TC-UC05-4-FEED-011 | Thiếu guideline/lô | Không rule approved còn hiệu lực hoặc tank không có batch | GET recommendation | 200; recommendation null; giải thích thiếu dữ liệu | Chức năng / P1 |  |
| TC-UC05-4-FEED-012 | Lịch sử/lọc/tổng theo unit | Log A1:2kg,3kg và100g | GET logs từ/to hợp lệ | Tổng kg5,g100 riêng; không cộng khác unit; đúng phạm vi | Chức năng / P1 |  |
| TC-UC05-4-FEED-013 | Rollback khi update kho thất bại | Staging mock stockUpdate count0 | POST với vật tư liên kết feed | 409; transaction rollback cả log/usage; stock không đổi | Tích hợp / P1 |  |
| TC-UC05-4-FEED-014 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC05-4-FEED-015 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC05-4-FEED-016 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC05.5 — Nhật ký thay nước (WATERCHANGE)

Actor: OWNER; AREA_MANAGER; TECHNICIAN. Endpoint: GET/POST /api/farms/{FARM_A}/water-change-logs. UI: /water-change-logs.

Payload gốc: `{"tankId":"{TANK_A1}","waterChangePercentage":25,"performedAt":"2026-10-09T08:00:00+07:00","notes":"QA"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC05-5-WATERCHANGE-001 | Ghi thay nước | Payload mẫu | POST water-change-log | 201; đúng tank,25%,actor/time | Chức năng / P1 |  |
| TC-UC05-5-WATERCHANGE-002 | Biên phần trăm | 0 và100 | POST từng biến thể | 201 theo validation; lưu đúng giá trị | Biên / P1 |  |
| TC-UC05-5-WATERCHANGE-003 | Ngoài biên | -0.01 hoặc100.01 | POST | 400; không log | Chức năng / P1 |  |
| TC-UC05-5-WATERCHANGE-004 | Sai precision | waterChangePercentage25.001 | POST | 400; tối đa2 chữ số thập phân | Chức năng / P1 |  |
| TC-UC05-5-WATERCHANGE-005 | Ngày/UUID sai | performedAt bad hoặc tankId bad | POST | 400 | Chức năng / P1 |  |
| TC-UC05-5-WATERCHANGE-006 | Notes tùy chọn/dài | notes null hoặc4001 ký tự | POST | null hợp lệ; quá4000 bị400 | Chức năng / P1 |  |
| TC-UC05-5-WATERCHANGE-007 | Lọc lịch sử | Có log hai area | GET tankId/from/to/page/limit | 200; đúng filter/scope; from>to hoặc limit101 bị400 | Chức năng / P1 |  |
| TC-UC05-5-WATERCHANGE-008 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC05-5-WATERCHANGE-009 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC05-5-WATERCHANGE-010 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC05.6 — Nhật ký thuốc/chế phẩm (TREATMENT)

Actor: OWNER; AREA_MANAGER; TECHNICIAN. Endpoint: GET/POST /api/farms/{FARM_A}/treatment-logs. UI: /treatment-logs.

Payload gốc: `{"tankId":"{TANK_A1}","productName":"Chế phẩm QA","amount":2,"unit":"kg","purpose":"Kiểm thử ghi nhận","performedAt":"2026-10-09T08:00:00+07:00"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC05-6-TREATMENT-001 | Ghi không vật tư liên kết | Không supplyId | POST treatment | 201; lưu log; không giao dịch kho | Chức năng / P1 |  |
| TC-UC05-6-TREATMENT-002 | Linked medicine/chemical/probiotic | Mỗi case độc lập dùng từng category,stock = 10; amount2 | POST supplyId từng category | 201; stock = 8; ledger usage2; log/ledger cùng transaction | Chức năng / P1 |  |
| TC-UC05-6-TREATMENT-003 | Sai category | Linked feed/other | POST | 404; không log/usage | Chức năng / P1 |  |
| TC-UC05-6-TREATMENT-004 | Kho không đủ | stock1; amount2 | POST | 409; không log; stock giữ1 | Chức năng / P1 |  |
| TC-UC05-6-TREATMENT-005 | Đơn vị không khớp | supply kg; input ml | POST | 400; không trừ kho | Chức năng / P1 |  |
| TC-UC05-6-TREATMENT-006 | Thiếu name/unit/purpose | Bỏ từng field | POST | 400 | Chức năng / P1 |  |
| TC-UC05-6-TREATMENT-007 | Amount sai | 0,-1 hoặc2.0001 | POST từng biến thể | 400 | Chức năng / P1 |  |
| TC-UC05-6-TREATMENT-008 | Ngày/notes sai | performedAt bad hoặc notes4001 | POST | 400 | Chức năng / P1 |  |
| TC-UC05-6-TREATMENT-009 | Lịch sử theo phạm vi | Có log A1, A2, B | GET logs bằng Owner / Technician | Owner chỉA; Tech chỉA1; bộ lọc ngày và phân trang đúng | Chức năng / P1 |  |
| TC-UC05-6-TREATMENT-010 | Rollback | Ép bước trừ kho thất bại sau create log | POST | Không commit log/giao dịch; báo conflict nếu count0 | Tích hợp / P1 |  |
| TC-UC05-6-TREATMENT-011 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC05-6-TREATMENT-012 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC05-6-TREATMENT-013 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC06.1 — Upload và phân tích ảnh AI (AI)

Actor: OWNER; AREA_MANAGER; TECHNICIAN. Endpoint: POST /api/farms/{FARM_A}/seed-batches/{BATCH_A1}/ai-inspections. UI: /seed-batches.

Payload gốc: `{"mediaPublicId":"{IMAGE_UUID}","samplingMethod":"ai","sampleVolumeMl":10,"notes":"Ảnh kiểm thử"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC06-1-AI-001 | Ký upload đúng batch | BatchA1 trong quyền | POST /ai-inspections/upload-signature; upload jpg <=10MiB staging | 200; folder farm A/batchA1/ai-inspections; publicId UUID; signature hợp lệ | Tích hợp / P1 |  |
| TC-UC06-1-AI-002 | Tạo inspection pending | Ảnh đã upload đúng folder | POST ai-inspections payload | 201; pending; creator,batch,secureUrl,publicId đúng | Chức năng / P1 |  |
| TC-UC06-1-AI-003 | File sai folder/format/dung lượng | Asset farm B hoặc gif/video/>10MiB | POST inspection tham chiếu asset | 400; không ghi pending | Chức năng / P1 |  |
| TC-UC06-1-AI-004 | PublicId không UUID | mediaPublicId=bad | POST | 400 | Chức năng / P1 |  |
| TC-UC06-1-AI-005 | Thể tích mẫu biên | sampleVolumeMl0,-1,1000001; rồi1000000 | POST từng giá trị với asset riêng | Không hợp lệ400; biên1000000 được lưu | Biên / P1 |  |
| TC-UC06-1-AI-006 | Phương pháp mẫu | manual,ai,combined; rồiunknown | POST từng giá trị | Ba giá trị hợp lệ; unknown400; manual hiện chỉ metadata, không có API nhập manualCount | Chức năng / P1 |  |
| TC-UC06-1-AI-007 | Phân tích thành công có số liệu | StubAI count4; detections confidence0.8,0.9,0.7,1.0; volume10ml | POST /{INSPECTION}/analyze | 200; completed,detectedCount4,density0.4,averageConfidence0.85,modelVersion và annotatedUrl | Tích hợp / P1 |  |
| TC-UC06-1-AI-008 | Không có detections | StubAI count0,detections[];volume10 | POST analyze | completed; detectedCount0,density0,confidence null; không chia0 | Chức năng / P1 |  |
| TC-UC06-1-AI-009 | Không nhập volume | sampleVolumeMl=null; AI count4 | POST tạo inspection, sau đó POST analyze | 201/200; densityPerMl null; count vẫn4 | Chức năng / P1 |  |
| TC-UC06-1-AI-010 | AI timeout/lỗi HTTP | AI unavailable/HTTP500 hoặc timeout180s | POST analyze | 502; status failed; ảnh gốc còn; không lưu completed | Tích hợp / P1 |  |
| TC-UC06-1-AI-011 | Prediction sai contract | count khác length; confidence1.2; annotatedURL ngoài Cloudinary | POST analyze với từng stub response | 502; status failed; không lưu kết quả sai | Chức năng / P1 |  |
| TC-UC06-1-AI-012 | Gửi analyze đồng thời | Inspection pending; stubAI giữ response | Gửi hai POST analyze đồng thời | Một claim processing; request khác409; một kết quả completed | Đồng thời / P1 |  |
| TC-UC06-1-AI-013 | Analyze lại completed | Inspection completed | POST analyze hai lần | 200 trả kết quả lưu; không gọi AI lại, không duplicate | Chức năng / P1 |  |
| TC-UC06-1-AI-014 | Retry failed | Inspection failed; AI hoạt động trở lại | POST analyze | Có thể claim lại; completed sau thành công | Chức năng / P1 |  |
| TC-UC06-1-AI-015 | Khởi động lại lúc processing | Inspection processing; backend bị restart ở staging | Gọi analyze lại sau khi hết thời gian xử lý | Tác vụ có cơ chế thu hồi/retry sau deadline, không processing vĩnh viễn | Regression / P0 | Code chưa có lease/recovery; đây là case lỗi đã ghi nhận, không bịa API retry riêng |
| TC-UC06-1-AI-016 | Tải ảnh thật và đếm đối chiếu | Ảnh test đã gán nhãn, số đếm chuẩn và ngưỡng sai số chốt trước | Upload/analyze qua Cloudinary/YOLO thật; so count và runtime | Kết quả trong ngưỡng nghiệm thu đã chốt; ghi count chuẩn/dự đoán/sai số/ms và ảnh overlay | Tích hợp / P1 | Chưa có ngưỡng độ chính xác chung; phải chốt trước chạy, không gán pass chỉ vì HTTP200 |
| TC-UC06-1-AI-017 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC06-1-AI-018 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC06-1-AI-019 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC06.2 — Lịch sử và kết quả AI (AI-HISTORY)

Actor: OWNER; AREA_MANAGER; TECHNICIAN. Endpoint: GET /api/farms/{FARM_A}/seed-batches/{BATCH_A1}/ai-inspections. UI: /seed-batches.

Payload gốc: `{}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC06-2-AI-HISTORY-001 | Danh sách mới nhất | Có pending/failed/completed | GET history limit50; mở UI | 200; sort inspectedAt desc nullsLast rồi createdAt; đúng lô; status thể hiện | Chức năng / P1 |  |
| TC-UC06-2-AI-HISTORY-002 | Chi tiết ảnh và metrics | Completed inspection | Mở chi tiết AI | Ảnh gốc/annotated hiển thị; count,density,confidence,modelVersion đúng dữ liệu | Chức năng / P1 |  |
| TC-UC06-2-AI-HISTORY-003 | Danh sách rỗng | Lô chưa inspection | GET/mở UI | 200 items[]; UI thông báo rỗng | Chức năng / P1 |  |
| TC-UC06-2-AI-HISTORY-004 | Limit sai | limit0,101 hoặcabc | GET từng query | 400 | Chức năng / P1 |  |
| TC-UC06-2-AI-HISTORY-005 | Inspection sai batch | Inspection thuộc BATCH_A2 | POST analyze dưới BATCH_A1 | 404; không gọi AI/lưu | Chức năng / P1 |  |
| TC-UC06-2-AI-HISTORY-006 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC06-2-AI-HISTORY-007 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC06-2-AI-HISTORY-008 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC07.1 — Danh mục vật tư (SUPPLY)

Actor: OWNER/WAREHOUSE_STAFF quản lý; MANAGER/TECH xem. Endpoint: GET/POST /api/farms/{FARM_A}/inventory-supplies. UI: /inventory-supplies.

Payload gốc: `{"name":"Vật tư QA","category":"feed","unit":"kg","unitPrice":12000,"minThreshold":5}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC07-1-SUPPLY-001 | Tạo danh mục từng category | feed,medicine,chemical,probiotic,other | POST từng item độc lập | 201; quantity ban đầu0; đúng category/unit/price/minThreshold | Chức năng / P1 |  |
| TC-UC07-1-SUPPLY-002 | Cập nhật partial | PATCH name và unitPrice12500 | PATCH supply; reload | 200; trường không gửi giữ nguyên | Chức năng / P1 |  |
| TC-UC07-1-SUPPLY-003 | Thiếu name/category/unit | Bỏ từng field | POST | 400 | Chức năng / P1 |  |
| TC-UC07-1-SUPPLY-004 | Giá/ngưỡng âm hoặc quá precision | unitPrice-1 hoặc1.001;minThreshold-1 hoặc1.0001 | POST/PATCH từng body | 400; price scale2,quantity threshold scale3 | Chức năng / P1 |  |
| TC-UC07-1-SUPPLY-005 | Giới hạn chiều dài | name151,unit21,description4001 | POST từng biến thể | 400 | Chức năng / P1 |  |
| TC-UC07-1-SUPPLY-006 | Không sửa quantity ở catalog | quantity100 bổ sung | POST/PATCH | 400; phải dùng transaction kho | Chức năng / P1 |  |
| TC-UC07-1-SUPPLY-007 | Tìm/filter/pagination | category medicine;q QA;page1 limit2 | GET list | items/pagination đúng; không farm B | Chức năng / P1 |  |
| TC-UC07-1-SUPPLY-008 | Xóa quantity0 không lịch sử | Supply0, không transactions | DELETE supply | 200; deleted true; DB record không còn | Chức năng / P1 |  |
| TC-UC07-1-SUPPLY-009 | Không xóa còn hàng/lịch sử | Supply stock1 hoặc stock = 0 đã có transaction | DELETE | 409; bảo toàn catalog/ledger | Chức năng / P1 |  |
| TC-UC07-1-SUPPLY-010 | Area Manager / Technician không ghi | MANAGER_A1/TECH_A1 | POST/PATCH/DELETE | 403; GET allowed | Phân quyền / P1 |  |
| TC-UC07-1-SUPPLY-011 | Query/UUID sai | category invalid,limit101,lowStock=abc,supplyId bad | GET từng request | 400 | Chức năng / P1 |  |
| TC-UC07-1-SUPPLY-012 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC07-1-SUPPLY-013 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC07-1-SUPPLY-014 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC07.2 — Nhập kho (IMPORT)

Actor: OWNER; WAREHOUSE_STAFF. Endpoint: GET/POST /api/farms/{FARM_A}/inventory-transactions/imports. UI: /inventory-supplies.

Payload gốc: `{"supplyId":"{FEED_A}","quantity":5.125,"unitPrice":13000,"transactionDate":"2026-10-09T08:00:00+07:00"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC07-2-IMPORT-001 | Nhập và ghi ledger | Stock10; payload mẫu | POST import; đọc stock/price/ledger | 201; stock15.125; unitPrice13000; import ledger đúng actor/time | Chức năng / P1 |  |
| TC-UC07-2-IMPORT-002 | Đơn giá0 | unitPrice0 | POST import | 201; nhận giá0 hợp lệ | Chức năng / P1 |  |
| TC-UC07-2-IMPORT-003 | Quantity/price sai | quantity0/âm/4dec;priceâm/3dec | POST từng body | 400; stock/ledger không đổi | Chức năng / P1 |  |
| TC-UC07-2-IMPORT-004 | Supply khác farm | supplyId=FEED_B | POST dưới A | 404; không nhập | Chức năng / P1 |  |
| TC-UC07-2-IMPORT-005 | History và lọc ngày | Có imports A và B | GET imports?supplyId=FEED_A&from=...&to=... | 200; chỉ imports phù hợp, scope A; date desc, phân trang đúng | Chức năng / P1 |  |
| TC-UC07-2-IMPORT-006 | Hai import cùng lúc | stock = 10; R1+5,R2+7 | POST đồng thời | Cả hai thành công; stock = 22; hai ledger không mất cập nhật | Đồng thời / P1 |  |
| TC-UC07-2-IMPORT-007 | Rollback khi ghi ledger lỗi | Staging DB giả lập create transaction thất bại | POST import | Không tăng stock/đổi price nếu transaction chưa commit | Tích hợp / P1 |  |
| TC-UC07-2-IMPORT-008 | Tổng tồn vượt cột Decimal | Stock gần999999999.999; import làm vượt | POST valid quantity nhưng total overflow | Không commit/không stock sai; ghi nhận lỗi thân thiện cần xử lý thay vì500 | Regression / P1 | Import chưa kiểm tra tổng tồn trước increment; case bắt lỗi biên |
| TC-UC07-2-IMPORT-009 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC07-2-IMPORT-010 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC07-2-IMPORT-011 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC07.3 — Yêu cầu cấp vật tư (REQUEST)

Actor: OWNER/AREA_MANAGER tạo; OWNER/AREA_MANAGER/WAREHOUSE_STAFF xem. Endpoint: GET/POST /api/farms/{FARM_A}/inventory-transactions/requests. UI: /inventory-requests.

Payload gốc: `{"supplyId":"{FEED_A}","areaId":"{AREA_A1}","quantity":5,"notes":"Yêu cầu QA"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC07-3-REQUEST-001 | Owner tạo yêu cầu | Payload mẫu | POST request | 201; pending; requestedBy đúng; stock không đổi; không xuất ledger | Chức năng / P1 |  |
| TC-UC07-3-REQUEST-002 | Manager area tự gán | Actor MANAGER_A1;body areaId=AREA_A2 | POST request | 201; areaIdAREA_A1; không nhận area khác client | Chức năng / P1 |  |
| TC-UC07-3-REQUEST-003 | Owner request toàn trại | areaId null | POST | 201; areaId null | Chức năng / P1 |  |
| TC-UC07-3-REQUEST-004 | Quantity sai | 0,âm hoặc4dec | POST từng body | 400 | Chức năng / P1 |  |
| TC-UC07-3-REQUEST-005 | Supply/area không phù hợp | SupplyB,AreaB hoặc area inactive | POST từng body | 404; không request | Chức năng / P1 |  |
| TC-UC07-3-REQUEST-006 | Danh sách theo quyền | Có requestsA1,A2 | Owner/Warehouse GET tất cả A;ManagerA1 GET | Owner/Warehouse thấy A1+A2;Manager chỉA1 | Chức năng / P1 |  |
| TC-UC07-3-REQUEST-007 | Tech không xem/tạo;Warehouse không tạo | TECH_A1 GET/POST;WAREHOUSE_A POST | Gọi từng endpoint | 403 | Phân quyền / P1 |  |
| TC-UC07-3-REQUEST-008 | Status filter/page | status=pending; page1 limit2; sau đóstatus invalid | GET requests | Pending lọc đúng; invalid400; pagination đúng | Chức năng / P1 |  |
| TC-UC07-3-REQUEST-009 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC07-3-REQUEST-010 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC07-3-REQUEST-011 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC07.5 — Sử dụng vật tư (USAGE)

Actor: OWNER; TECHNICIAN. Endpoint: GET /api/farms/{FARM_A}/inventory-transactions; POST /api/farms/{FARM_A}/inventory-transactions/usage. UI: /inventory-usage.

Payload gốc: `{"supplyId":"{MEDICINE_A}","batchId":"{BATCH_A1}","quantity":2,"transactionDate":"2026-10-09T08:00:00+07:00"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC07-5-USAGE-001 | Tech dùng cho lô đang nuôi | Stock10; batchA1 active thuộc area | POST usage | 201; stock = 8; ledger usage2 liên kết batch/actor | Chức năng / P1 |  |
| TC-UC07-5-USAGE-002 | Owner dùng toàn trại | batchId null; stock = 10 | POST usage | 201; stock = 8; batchIdnull; ledger hợp lệ | Chức năng / P1 |  |
| TC-UC07-5-USAGE-003 | Tech bắt buộc batch | Actor TECH_A1;batchIdnull | POST | 400; không trừ kho | Chức năng / P1 |  |
| TC-UC07-5-USAGE-004 | Batch kết thúc/khác area | Batch sold hoặcA2 | TECH_A1 POST usage | 404; không trừ kho | Chức năng / P1 |  |
| TC-UC07-5-USAGE-005 | Kho thiếu và bằng tồn | Stock2;quantity3 rồiquantity2 với fixture reset | POST từng biến thể | Thiếu409; bằng tồn201,stock = 0 | Biên / P1 |  |
| TC-UC07-5-USAGE-006 | Quantity/date/UUID sai | quantity0/âm/4dec;date bad; UUID bad | POST từng body | 400 | Chức năng / P1 |  |
| TC-UC07-5-USAGE-007 | History scope | Ledger nhiều area/farm | Owner / Technician GET transaction list | Owner chỉA;Tech chỉbatch trongA1; không farm B | Chức năng / P1 |  |
| TC-UC07-5-USAGE-008 | Hai usage tranh tồn | Stock3;hai request quantity2 | POST đồng thời | Một201 một409;stock1; một ledger | Đồng thời / P1 |  |
| TC-UC07-5-USAGE-009 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC07-5-USAGE-010 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC07-5-USAGE-011 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC07.6 — Điều chỉnh tồn kho (ADJUST)

Actor: OWNER; WAREHOUSE_STAFF. Endpoint: GET/POST /api/farms/{FARM_A}/inventory-transactions/adjustments. UI: /inventory-supplies.

Payload gốc: `{"supplyId":"{FEED_A}","direction":"increase","quantity":2,"transactionDate":"2026-10-09T08:00:00+07:00","reason":"Kiểm kê QA"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC07-6-ADJUST-001 | Điều chỉnh tăng | stock = 10;+2 | POST adjustment | 201;stock12; ledger adjustment quantity+2;reason/actor có | Chức năng / P1 |  |
| TC-UC07-6-ADJUST-002 | Điều chỉnh giảm | stock = 10;direction decrease;quantity2 | POST | 201;stock = 8;ledger quantity-2 | Chức năng / P1 |  |
| TC-UC07-6-ADJUST-003 | Giảm bằng/vượt tồn | stock = 2;quantity2 hoặc3 | POST từng biến thể reset fixture | Bằng tồn201,stock = 0;vượt409 không ledger | Chức năng / P1 |  |
| TC-UC07-6-ADJUST-004 | Tăng vượt giới hạn | Stock = 999999999.998; tăng0.002 | POST | 409;stock/ledger không đổi | Chức năng / P1 |  |
| TC-UC07-6-ADJUST-005 | Thiếu lý do/sai direction | reason="" hoặc direction invalid | POST | 400 | Chức năng / P1 |  |
| TC-UC07-6-ADJUST-006 | Precision/số lượng sai | quantity0/âm/1.0001 | POST từng body | 400 | Chức năng / P1 |  |
| TC-UC07-6-ADJUST-007 | History adjustment | Có ledger import/usage/adjustment | GET adjustments filter supply/date | Chỉ adjustment; số âm thể hiện đúng | Chức năng / P1 |  |
| TC-UC07-6-ADJUST-008 | Area Manager / Technician bị chặn | MANAGER_A1/TECH_A1 | GET/POST adjustments | 403 | Phân quyền / P1 |  |
| TC-UC07-6-ADJUST-009 | Adjustment và usage đồng thời | Stock3; decrease2 và usage2 | Gửi đồng thời | Không âm; một success/một409; ledger phản ánh đúng lượng | Đồng thời / P1 |  |
| TC-UC07-6-ADJUST-010 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC07-6-ADJUST-011 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC07-6-ADJUST-012 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC09.1 — Dashboard và báo cáo cho ăn (DASHBOARD)

Actor: Tất cả vai trò xem dashboard; OWNER/MANAGER/TECH xem feeding report. Endpoint: GET /api/farms; GET /api/farms/{FARM_A}/reports/feeding. UI: /dashboard.

Payload gốc: `{}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC09-1-DASHBOARD-001 | Dashboard theo farm/role | Bốn actor active riêng | Mở dashboard bằng từng actor | Tên farm/role/area đúng; Warehouse không hiện feeding report | Chức năng / P1 |  |
| TC-UC09-1-DASHBOARD-002 | Đổi farm cập nhật báo cáo | OWNER_AB hai farm có totals khác | ChọnA rồiB | Báo cáo theo B; không giữ số liệu A | Chức năng / P1 |  |
| TC-UC09-1-DASHBOARD-003 | Tổng theo đơn vị và số khuyến nghị | Log 2kg rec1.5;3kg recnull;100g rec80 | GET feeding report khoảng chứa3log | kg actual5,rec1.5,variance0.5,comparableCount1/2;g actual100,rec80,variance20;totalFeedings3 | Chức năng / P1 |  |
| TC-UC09-1-DASHBOARD-004 | Theo bể và ngày | Có log nhiều tank/ngày | GET report; đối chiếu byTank/daily | Tổng byTank/daily khớp dữ liệu; không cộng khácunit | Chức năng / P1 |  |
| TC-UC09-1-DASHBOARD-005 | Ranh giới ngày UTC+7 | Log2026-10-08T17:00:00Z và16:59:59Z | GET report ngày09/10 theo UI UTC+7 | Log17:00 thuộc09/10; log16:59:59 thuộc08/10; bucket daily đúng | Chức năng / P1 |  |
| TC-UC09-1-DASHBOARD-006 | Không có log | Khoảng ngày không có log | GET report | 200;totalFeedings0;arrays[];UI không NaN | Chức năng / P1 |  |
| TC-UC09-1-DASHBOARD-007 | Khoảng ngày sai/quá dài | from>to;invaliddate;range367days | GET từngquery | 400 | Chức năng / P1 |  |
| TC-UC09-1-DASHBOARD-008 | Giới hạn366ngày | from/to chênh366days đúng | GET | 200; không từ chối biên hợp lệ | Biên / P1 |  |
| TC-UC09-1-DASHBOARD-009 | Role/area report | MANAGER_A1/TECH_A1 vàWAREHOUSE_A | GET reportA với quyền tương ứng | Area Manager / Technician chỉA1;Warehouse403 | Chức năng / P1 |  |
| TC-UC09-1-DASHBOARD-010 | Recent tối đa12 | Có15log trong khoảng | GET báo cáo | recent chỉ12mới nhất;totalFeedings15 | Chức năng / P1 |  |

### UC09.2 — Xem cảnh báo môi trường (ALERT-OWNER)

Actor: OWNER. Endpoint: GET /api/farms/{FARM_A}/environment-thresholds/alerts. UI: /environment-thresholds.

Payload gốc: `{}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC09-2-ALERT-OWNER-001 | Danh sách đúng phạm vi | Có alertA1,A2,B1 | GET /alerts bằng OWNER | Owner thấyA1+A2; không farm B | Chức năng / P1 |  |
| TC-UC09-2-ALERT-OWNER-002 | Chi tiết cảnh báo | ALERT_A1 thuộc quyền | GET /alerts/{ALERT_A1}; mở dialog | 200;observedValue,rule,sourceLog,tank,batch đúng;không mất rule snapshot tham chiếu | Chức năng / P1 |  |
| TC-UC09-2-ALERT-OWNER-003 | Filterseverity/read/page | severitywarning/critical;isReadtrue/false;limit2 | GET với từng filter;đổi trang | 200;items/total đúng;sortcreatedAt desc | Chức năng / P1 |  |
| TC-UC09-2-ALERT-OWNER-004 | Query sai | severityinvalid;isReadabc;limit101 | GET từngquery | 400 | Chức năng / P1 |  |
| TC-UC09-2-ALERT-OWNER-005 | Markread idempotent | ALERT_A1 unread | PATCH /alerts/{ALERT_A1}/read hai lần | 200 cả hai;isReadtrue;không tạo alert mới;UI bỏnútmarkread | Chức năng / P1 |  |
| TC-UC09-2-ALERT-OWNER-006 | Alertngoài scope | ALERT_B1; vớiManager thêmALERT_A2 | GET chi tiết vàPATCHread dướiFarm A | 404 nếu cómembershipA nhưngresourcekhácscope;không đổiisRead | Chức năng / P1 |  |
| TC-UC09-2-ALERT-OWNER-007 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC09-2-ALERT-OWNER-008 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC09-2-ALERT-OWNER-009 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC09.3 — Xem cảnh báo môi trường (ALERT-AREA)

Actor: AREA_MANAGER; TECHNICIAN. Endpoint: GET /api/farms/{FARM_A}/environment-thresholds/alerts. UI: /environment-thresholds.

Payload gốc: `{}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC09-3-ALERT-AREA-001 | Danh sách đúng phạm vi | Có alertA1,A2,B1 | GET /alerts bằng AREA_MANAGER; TECHNICIAN | Area Manager / Technician chỉA1; không farm B | Chức năng / P1 |  |
| TC-UC09-3-ALERT-AREA-002 | Chi tiết cảnh báo | ALERT_A1 thuộc quyền | GET /alerts/{ALERT_A1}; mở dialog | 200;observedValue,rule,sourceLog,tank,batch đúng;không mất rule snapshot tham chiếu | Chức năng / P1 |  |
| TC-UC09-3-ALERT-AREA-003 | Filterseverity/read/page | severitywarning/critical;isReadtrue/false;limit2 | GET với từng filter;đổi trang | 200;items/total đúng;sortcreatedAt desc | Chức năng / P1 |  |
| TC-UC09-3-ALERT-AREA-004 | Query sai | severityinvalid;isReadabc;limit101 | GET từngquery | 400 | Chức năng / P1 |  |
| TC-UC09-3-ALERT-AREA-005 | Markread idempotent | ALERT_A1 unread | PATCH /alerts/{ALERT_A1}/read hai lần | 200 cả hai;isReadtrue;không tạo alert mới;UI bỏnútmarkread | Chức năng / P1 |  |
| TC-UC09-3-ALERT-AREA-006 | Alertngoài scope | ALERT_B1; vớiManager thêmALERT_A2 | GET chi tiết vàPATCHread dướiFarm A | 404 nếu cómembershipA nhưngresourcekhácscope;không đổiisRead | Chức năng / P1 |  |
| TC-UC09-3-ALERT-AREA-007 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC09-3-ALERT-AREA-008 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC09-3-ALERT-AREA-009 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC09.2 — Sinh cảnh báo khi ghi môi trường (ALERT-RULE)

Actor: OWNER; AREA_MANAGER; TECHNICIAN. Endpoint: POST /api/farms/{FARM_A}/water-parameter-logs. UI: /water-parameter-logs; /environment-thresholds.

Payload gốc: `{"tankId":"{TANK_A1}","ph":9.001,"recordedAt":"2026-10-09T08:00:00+07:00"}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC09-2-ALERT-RULE-001 | BằngwarningMax không cảnh báo | Approved rule pH warningMax = 9,dangerMax = 10;ph9 | POST log | 201;không có alert vì chỉ so > hoặc < | Biên / P1 |  |
| TC-UC09-2-ALERT-RULE-002 | Vượtwarning | ph9.001 | POST log | alert mức warning duy nhất cho ph;sourceLogId đúng | Chức năng / P1 |  |
| TC-UC09-2-ALERT-RULE-003 | BằngdangerMax | ph10 | POST log | warning,khôngcritical vì chưa >10 | Biên / P1 |  |
| TC-UC09-2-ALERT-RULE-004 | Vượtdanger | ph10.001 | POST log | alert mức critical;không thêmwarning cho cùng parameter | Chức năng / P1 |  |
| TC-UC09-2-ALERT-RULE-005 | Nhiều chỉ số vượt | pH vàDO đều vượt hai rule tương ứng | POST một log | Mỗiparameter mộtalert;2 alerts cùng sourceLogId | Chức năng / P1 |  |
| TC-UC09-2-ALERT-RULE-006 | Draft/inactive/outdate không áp | Rule chưa duyệt,tắt,hết hạn hoặcspecieskhác | POST logvượt cácbound | Khôngalert từrule không áp dụng | Chức năng / P1 |  |
| TC-UC09-2-ALERT-RULE-007 | Không log trùng theo source / parameter | CùngsourceLogId / parameterCode đã có alert | Gọi lại service trên fixture test | Unique constraint chặn duplicate;không nhân đôi alert | Tích hợp / P1 | Không giả định HTTPrequest ghi logmới cóidempotency; logmới vẫn là sựkiện mới |

### UC09.4 — Cảnh báo tồn kho trong danh mục (LOW-STOCK)

Actor: WAREHOUSE_STAFF; các role có quyền xem danh mục. Endpoint: GET /api/farms/{FARM_A}/inventory-supplies?lowStock=true. UI: /inventory-supplies.

Payload gốc: `{}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC09-4-LOW-STOCK-001 | Dưới ngưỡng | Supply stock = 4,minThreshold5 | GET chi tiết/list | isBelowThresholdtrue;UI badge dưới ngưỡng | Chức năng / P1 |  |
| TC-UC09-4-LOW-STOCK-002 | Bằng/vượt ngưỡng | stock = 5 hoặc6;minThreshold = 5 | GET chi tiết/list | isBelowThresholdfalse;không lọtlowStock=true | Biên / P1 |  |
| TC-UC09-4-LOW-STOCK-003 | Lọc chỉ hàng thấp | A cóstock = 4 / 5 / 6, minThreshold = 5 vàB cóstock = 0, minThreshold = 5 | WarehouseGET tại FARM_A ?lowStock=true | Chỉ hàngA stock = 4;đúngpagination/total;khôngB | Chức năng / P1 |  |
| TC-UC09-4-LOW-STOCK-004 | Cập nhật sau nhập/sử dụng | stock = 4, minThreshold = 5;nhập2 rồi sửdụng2 | Reload danh mục sau từnggiao dịch | Sau nhập6không cảnh báo;sauusage4cảnh báo trởlại | Chức năng / P1 |  |
| TC-UC09-4-LOW-STOCK-005 | Ngưỡng0/tồn0 | stock = 0,minThreshold = 0 | GET | false;không tự coi0dưới0 | Chức năng / P1 |  |
| TC-UC09-4-LOW-STOCK-006 | Filter invalid | lowStock=abc | GET | 400 | Chức năng / P1 |  |
| TC-UC09-4-LOW-STOCK-007 | Không có phiên | Không gửi cookie; payload / query / path còn lại hợp lệ | Gọi endpoint của module trực tiếp | 401; không đọc/ghi dữ liệu; không thay đổi DB | Phân quyền / P0 |  |
| TC-UC09-4-LOW-STOCK-008 | Membership farm bị suspended | Actor cómembershipactive ởfarm khác đểaccount cònlogin;membershipA suspended | Gọiendpointfarm A bằngsessionhợp lệ | 403; không đọc/ghi dữ liệu Farm A | Phân quyền / P0 |  |
| TC-UC09-4-LOW-STOCK-009 | Truy cập farm không có membership | Actor OWNER_A chỉ thuộc A; path/query/body farmId=FARM_B; fixture B hợp lệ | Gọiendpointtươngđươngfarm B | 403; không lộ hoặc ghi dữ liệu B | Phân quyền / P0 |  |

### UC09.1 — Giao diện dùng chung (UI)

Actor: Tất cả vai trò. Endpoint: Frontend. UI: Toàn bộ trang đã hiện thực.

Payload gốc: `{}`. ID fixture phải được thay bằng ID thực trong staging.

| ID | Tên test | Dữ liệu / điều kiện riêng | Thao tác | Mong đợi | Loại / ưu tiên | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UC09-1-UI-001 | Menu tài khoản | Đã login | Clickavatar; clickngoài; chọnprofile; logout | Mở/đóng đúng;điều hướng/profile/logout đúng | Chức năng / P1 |  |
| TC-UC09-1-UI-002 | Sidebar mode / hover / ghi nhớ | Desktop1440px | Chọnthu gọn;hover/rời;reload | Drawer72px;hover250px;rời thu lại;localStoragemode giữ | Chức năng / P1 |  |
| TC-UC09-1-UI-003 | Toast success / error và đóng | Thao tác thành công/lỗi | Quan sát màu,5 giây; nhấn X | Đúng màu;ẩn sau5000 ms;X đóng ngay;layout không dịch | Chức năng / P1 |  |
| TC-UC09-1-UI-004 | Toast mới thay cũ | Hai thông báo cách 1 giây | Kích hoạt success rồi error | Chỉ thông báo mới;timer reset đủ 5 giây | Chức năng / P1 |  |
| TC-UC09-1-UI-005 | Mobile bảng/dialog/navbar | 390x844 và320x568;Owner có 2 farm | Mở từng trang bảng;dialog thêm/sửa;navbar | Không chồng lấn;table cuộn ngang;dialog cuộn được;save/cancel truy cập được | Chức năng / P1 |  |
| TC-UC09-1-UI-006 | LỗiAPI tải danh sách | Stub503 hoặcmất kết nối mạng | Mở từng trang dữ liệu | Loading dừng; có thông báo lỗi đọc được; không hiển thị dữ liệu rỗng như tải thành công | Chức năng / P1 |  |
| TC-UC09-1-UI-007 | Menu mode rời chuột | Menuđang mở | Hover menu rồi di chuột ra ngoài | Menu đóng nếu giữ yêu cầu TC112 của bảngauth | Regression / P2 | Hiện code chưa đóng theo hover; cần chốt yêu cầu UI |

