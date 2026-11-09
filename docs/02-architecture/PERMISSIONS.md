# Phân quyền hiện tại của ChillShrimp

Cập nhật: **10/11/2026**. Tài liệu mô tả hành vi đang triển khai trong backend và frontend, bao gồm các bản sửa phân quyền hiện có trong workspace. Không phải xác nhận các thay đổi hoặc migration đã được triển khai lên môi trường chạy thật.

## 1. Vai trò và phạm vi

Mã role trong Prisma Client, backend, dữ liệu API và frontend dùng chữ hoa: `OWNER`, `FARM_MANAGER`, `AREA_MANAGER`, `TECHNICIAN`, `WAREHOUSE_STAFF`. Prisma `@map` ánh xạ chúng tới giá trị enum chữ thường hiện có trong PostgreSQL (`owner`, `farm_manager`, `area_manager`, `technician`, `warehouse_staff`); không đổi dữ liệu hoặc cần migration chỉ cho việc viết hoa mã trong code. Tên hiển thị tiếng Việt độc lập với mã role.

| Vai trò | Mã trong code | Phạm vi | Trách nhiệm |
| --- | --- | --- | --- |
| Chủ trại | `OWNER` | Toàn bộ trại có membership Chủ trại; được thuộc nhiều trại | Quản trị trại, thành viên và toàn bộ nghiệp vụ quản lý |
| Quản lý trại | `FARM_MANAGER` | Một trại được phân công | Vận hành toàn trại, quản lý nhân viên và nghiệp vụ; không can thiệp quyền Chủ trại |
| Quản lý khu vực | `AREA_MANAGER` | Một khu vực trong trại được phân công | Quản lý ao/bể, lô, Kỹ thuật viên và công việc trong khu vực; một số danh mục dùng chung được xem ở cấp trại |
| Kỹ thuật viên | `TECHNICIAN` | Một khu vực trong trại được phân công | Theo dõi ao/bể, cập nhật dữ liệu kỹ thuật, ghi nhật ký, kiểm tra AI và xử lý cảnh báo |
| Nhân viên kho | `WAREHOUSE_STAFF` | Kho của trại được phân công | Quản lý vật tư, nhập kho, điều chỉnh tồn và xử lý yêu cầu cấp vật tư |

### Chủ trại và admin toàn hệ thống

- `OWNER` là vai trò cao nhất tại trại. Vai trò này không tự cấp quyền truy cập mọi trại trong hệ thống.
- Tài khoản có email khớp cấu hình `ADMIN_EMAIL` là **admin toàn hệ thống**. Backend cấp ngữ cảnh tương đương `OWNER` khi truy cập một trại, kể cả không có membership riêng tại trại đó.
- Không có giá trị `admin` trong enum `FarmRole`; admin được nhận diện riêng bằng cấu hình backend.
- Các bảng bên dưới ghi quyền Chủ trại theo phạm vi trại. Admin có cùng quyền quản lý trên các trại, nhưng vẫn chịu điều kiện trạng thái dữ liệu và ngoại lệ quy trình.
- Quyền quản trị cao không có nghĩa được thực hiện thay mọi bước của nhân viên: tạo yêu cầu vật tư và nhận/xử lý cảnh báo có quy tắc riêng ở mục 7–8.

### Quan hệ giữa các vai trò

- Chủ trại quản lý được các vai trò trong trại, bao gồm Chủ trại khác, với giới hạn tự thao tác ở mục 3.
- Quản lý trại không được sửa, đình chỉ, hạ chức vụ Chủ trại, cấp quyền Chủ trại hoặc thu hồi lời mời Chủ trại.
- Quản lý trại hiện được quản lý Quản lý trại khác trong cùng trại và được cấp vai trò `FARM_MANAGER` cho thành viên hợp lệ.
- Quản lý khu vực chỉ được quản lý Kỹ thuật viên trong khu vực của mình; không quản lý người ngang hoặc cao cấp hơn.
- Nhân viên kho là vai trò chuyên môn riêng; không có quyền quản lý Kỹ thuật viên hoặc Quản lý khu vực.
- Ngoài Chủ trại, các vai trò còn lại bị giới hạn một trại theo trigger membership trong migration. Trạng thái áp dụng trigger trên DB thật cần kiểm tra tại môi trường đích.

## 2. Điều kiện truy cập chung

1. API nghiệp vụ yêu cầu phiên đăng nhập hợp lệ.
2. Ngoại trừ admin toàn hệ thống, người thao tác phải có membership trong đúng trại và membership phải `active`.
3. Trại phải đang hoạt động đối với API nghiệp vụ thông thường. Các API quản lý thông tin/trạng thái trại có ngoại lệ cho Chủ trại và Quản lý trại để truy cập trại ngừng hoạt động hoặc lưu trữ.
4. Nếu `farmId` xuất hiện đồng thời ở đường dẫn, query và body thì các giá trị phải nhất quán. Không dùng mã trại này để kiểm tra quyền rồi thao tác trên trại khác.
5. Quản lý khu vực và Kỹ thuật viên phải có khu vực hợp lệ. Dữ liệu ao/bể, lô, nhật ký và cảnh báo được giới hạn qua quan hệ tới khu vực.
6. Backend lấy quyền từ phiên, membership trong database và cấu hình admin; không tin `role` hoặc `areaId` do frontend tự khai báo.
7. Frontend ẩn/khóa thao tác theo quyền để hỗ trợ người dùng. Backend là nơi quyết định cuối cùng; gọi API trực tiếp vẫn phải qua kiểm tra.
8. Thành viên bị đình chỉ ở tất cả các trại bị chặn truy cập ứng dụng qua kiểm tra tài khoản; admin toàn hệ thống được xử lý riêng.

**Ký hiệu:** “Trại” là trong trại được cấp quyền; “Khu” là trong khu vực được phân công; “Không” là backend không cấp thao tác đó. “Xem” không bao gồm quyền thêm/sửa.

## 3. Tài khoản, thành viên và lời mời

| Thao tác | Chủ trại | Quản lý trại | Quản lý khu vực | Kỹ thuật viên | Nhân viên kho |
| --- | --- | --- | --- | --- | --- |
| Xem/sửa hồ sơ cá nhân, đổi mật khẩu | Bản thân | Bản thân | Bản thân | Bản thân | Bản thân |
| Xem danh sách thành viên | Trại | Trại | Khu | Không | Không |
| Sửa họ tên, điện thoại thành viên | Trại | Trừ Chủ trại | Chỉ Kỹ thuật viên cùng khu | Không | Không |
| Kích hoạt/đình chỉ thành viên | Trại | Trừ Chủ trại | Chỉ Kỹ thuật viên cùng khu | Không | Không |
| Đổi chức vụ/gán khu vực | Trại | Không tác động Chủ trại, không cấp `OWNER` | Không | Không | Không |
| Tạo lời mời | Các vai trò | Các vai trò trừ `OWNER` | Chỉ Kỹ thuật viên cùng khu | Không | Không |
| Xem danh sách lời mời | Trại | Trại | Khu | Không | Không |
| Thu hồi lời mời | Trại | Trừ lời mời Chủ trại | Chỉ lời mời Kỹ thuật viên cùng khu | Không | Không |

Các giới hạn bổ sung:

- API cập nhật hồ sơ cá nhân chỉ dùng ID của phiên đăng nhập, không dùng ID người khác do client truyền vào.
- Chỉnh sửa thành viên không cho đổi email.
- Không được đổi chức vụ hoặc đình chỉ chính mình qua form sửa thành viên. API đổi trạng thái riêng từ chối thao tác trên chính mình.
- Quản lý khu vực sửa thành viên vẫn giữ chức vụ và khu vực hiện tại của Kỹ thuật viên; không thể gửi `role = OWNER` hoặc khu vực khác để nâng quyền/chuyển người.
- `AREA_MANAGER` và `TECHNICIAN` bắt buộc có khu vực thuộc trại. `OWNER`, `FARM_MANAGER`, `WAREHOUSE_STAFF` không gắn khu vực.
- Luồng mời mới hiện từ chối email đã có user ứng dụng; không dùng luồng này để ghép tài khoản có sẵn sang trại khác.
- Lời mời cần token hợp lệ, chưa bị thu hồi, chưa dùng và chưa hết hạn; hiệu lực tối đa 24 giờ. API nhận lời mời là API công khai dựa trên token, không yêu cầu đăng nhập sẵn.
- Nhận lời mời và thu hồi dùng cập nhật trạng thái có điều kiện, tránh ghi đè nhau khi chạy đồng thời.
- Nếu lần nhận trước chỉ tạo được tài khoản xác thực bên ngoài, lần thử lại có thể xác thực đúng mật khẩu và email trước khi tạo user/membership. Không bỏ qua kiểm tra lời mời.

## 4. Trại, khu vực và ao/bể

| Thao tác | Chủ trại | Quản lý trại | Quản lý khu vực | Kỹ thuật viên | Nhân viên kho |
| --- | --- | --- | --- | --- | --- |
| Xem trại mình được cấp quyền | Có | Có | Có | Có | Có |
| Tạo trại mới | Có | Không | Không | Không | Không |
| Sửa thông tin/trạng thái trại, lưu trữ trại | Trại | Trại | Không | Không | Không |
| Xem danh sách khu vực qua API khu vực | Trại | Trại | Chỉ khu được giao | Không | Không |
| Tạo/sửa/kích hoạt/ngừng/xóa khu vực | Trại | Trại | Không | Không | Không |
| Xem khu vực ngừng hoạt động | Có | Có | Không | Không | Không |
| Xem danh sách/chi tiết ao/bể | Trại | Trại | Khu | Khu | Không |
| Tạo/sửa/đổi trạng thái ao/bể | Trại | Trại | Khu | Không | Không |
| Phân công/gỡ người phụ trách ao/bể | Trại | Trại | Khu | Không | Không |

- Nhân viên phụ trách ao/bể phải là Kỹ thuật viên đang hoạt động trong cùng trại và khu vực; tối đa 5 ao/bể chưa xóa trên toàn hệ thống.
- Quản lý khu vực không được tạo ao/bể trong khu khác hoặc chuyển ao sang khu khác.
- Lưu trữ trại, ngừng/xóa khu vực vẫn phải thỏa điều kiện dữ liệu liên quan. Có quyền không đồng nghĩa được bỏ qua kiểm tra thành viên, lời mời, khu vực hoặc ao/bể đang vận hành.
- API xóa trại hiện thực hiện lưu trữ, không xóa vật lý toàn bộ dữ liệu trại.
- Kỹ thuật viên không truy cập API danh sách khu vực, nhưng vẫn được xem thông tin khu vực liên quan qua các dữ liệu được cấp quyền như ao/bể.

## 5. Nhà cung cấp, lô giống và kiểm tra AI

| Thao tác | Chủ trại | Quản lý trại | Quản lý khu vực | Kỹ thuật viên | Nhân viên kho |
| --- | --- | --- | --- | --- | --- |
| Xem nhà cung cấp giống | Trại | Trại | Trại | Không | Không |
| Thêm/sửa nhà cung cấp giống | Trại | Trại | Không | Không | Không |
| Xem lô của nhà cung cấp | Trại | Trại | Chỉ lô trong khu | Không | Không |
| Xem danh sách/chi tiết lô giống | Trại | Trại | Khu | Khu | Không |
| Tiếp nhận/tạo lô giống | Trại | Trại | Khu | Không | Không |
| Sửa thông tin quản lý lô, số lượng hiện tại | Trại | Trại | Khu | Không | Không |
| Sửa dữ liệu kỹ thuật lô | Trại | Trại | Khu | Khu, chỉ trường cho phép | Không |
| Đổi trạng thái lô qua API trạng thái | Trại | Trại | Khu | Không | Không |
| Tạo kiểm tra AI, xin chữ ký upload, phân tích ảnh | Trại | Trại | Khu | Khu | Không |
| Xem kiểm tra AI/lịch sử kiểm tra | Trại | Trại | Khu | Khu | Không |

- Kỹ thuật viên chỉ được sửa `species`, `developmentStage`, `notes`; không sửa mã lô, nhà cung cấp, số lượng hoặc ngày quản lý lô.
- API sửa thông tin lô không dùng để chuyển lô sang ao/bể khác.
- Lô đã kết thúc không được chỉnh sửa thông tin; chuyển trạng thái phải đúng vòng đời. Trạng thái đã bán chịu quy trình bán hàng, không chuyển tùy ý.
- Chọn nhà cung cấp khi tạo/sửa lô phải thuộc cùng trại. Ao/bể tiếp nhận lô phải thuộc phạm vi người thao tác.
- Kiểm tra AI phải thuộc đúng lô trong phạm vi được cấp quyền; ảnh upload được kiểm tra theo thư mục trại/lô.

## 6. Nhật ký chăm sóc và báo cáo

| Thao tác | Chủ trại | Quản lý trại | Quản lý khu vực | Kỹ thuật viên | Nhân viên kho |
| --- | --- | --- | --- | --- | --- |
| Xem/ghi nhật ký cho ăn | Trại | Trại | Khu | Khu | Không |
| Xem/ghi nhật ký thay nước | Trại | Trại | Khu | Khu | Không |
| Xem/ghi nhật ký thuốc/chế phẩm | Trại | Trại | Khu | Khu | Không |
| Xem/ghi nhật ký thông số nước | Trại | Trại | Khu | Khu | Không |
| Xem báo cáo cho ăn | Trại | Trại | Khu | Khu | Không |

- API nhật ký hiện có thao tác tạo và xem; không có API sửa/xóa nhật ký để suy diễn thêm quyền.
- Cho ăn yêu cầu ao/bể hiện đang `active`. Không tự áp điều kiện này cho ba loại nhật ký khác khi code không quy định.
- Nếu chọn vật tư có sẵn, vật tư phải thuộc đúng trại, đúng nhóm và đơn vị phù hợp với bản ghi.
- Bốn luồng ghi nhật ký dùng chung `lockCareLogTank` trong service ao/bể: khóa hàng trại, ao/bể và membership, kiểm tra lại trạng thái/vai trò/khu vực hiện tại trong cùng transaction với thao tác ghi.
- Khi thay đổi khu vực, đình chỉ thành viên hoặc ngừng trại đã hoàn tất trước bước kiểm tra trong transaction, request cũ bị từ chối. Khi nhật ký đang giữ khóa, thay đổi liên quan phải chờ transaction hoàn tất.
- Ghi nhật ký thông số nước và sinh cảnh báo nằm trong cùng transaction.
- Dashboard/báo cáo không tự cấp thêm quyền đọc dữ liệu ngoài các API và phạm vi được phép. Không coi các báo cáo chi phí/doanh thu chỉ xuất hiện trong đặc tả là chức năng đã triển khai.

## 7. Kho và yêu cầu vật tư

| Thao tác | Chủ trại | Quản lý trại | Quản lý khu vực | Kỹ thuật viên | Nhân viên kho |
| --- | --- | --- | --- | --- | --- |
| Xem danh mục/chi tiết vật tư | Trại | Trại | Trại | Trại | Trại |
| Tạo/sửa/xóa danh mục vật tư | Trại | Trại | Không | Không | Trại |
| Ghi/xem nhập kho | Trại | Trại | Không | Không | Trại |
| Ghi/xem điều chỉnh tồn | Trại | Trại | Không | Không | Trại |
| Xem lịch sử sử dụng/cấp vật tư | Trại | Trại | Khu | Khu | Trại |
| Xem danh sách yêu cầu vật tư | Trại | Trại | Khu | Không | Trại |
| Tạo yêu cầu vật tư | Không | Không | Khu | Không | Không |
| Duyệt cấp/từ chối yêu cầu | Trại | Trại | Không | Không | Trại |

- Chỉ Quản lý khu vực tạo yêu cầu, cho đúng khu vực và ao/bể được giao. Chủ trại/admin, Quản lý trại và Nhân viên kho không dùng quyền cao hơn để tạo yêu cầu thay ở API này.
- Người tạo yêu cầu không được tự duyệt bằng vai trò Quản lý khu vực.
- Vật tư, khu vực và ao/bể trong yêu cầu phải thuộc cùng trại; ao/bể phải thuộc khu vực nhận vật tư.
- Duyệt yêu cầu trừ tồn kho, ghi giao dịch cấp và đổi trạng thái trong cùng transaction; không duyệt lại yêu cầu đã xử lý.
- Danh mục vật tư là danh mục dùng chung trong trại nên Quản lý khu vực/Kỹ thuật viên được xem toàn danh mục. Điều này không cấp quyền nhập kho hoặc điều chỉnh tồn.
- Lịch sử sử dụng của Quản lý khu vực/Kỹ thuật viên được lọc theo khu vực của yêu cầu hoặc quan hệ lô → ao/bể đối với bản ghi cũ.

## 8. Ngưỡng môi trường, cảnh báo và thông báo

| Thao tác | Chủ trại | Quản lý trại | Quản lý khu vực | Kỹ thuật viên | Nhân viên kho |
| --- | --- | --- | --- | --- | --- |
| Xem ngưỡng môi trường | Trại | Trại | Trại | Trại | Không |
| Tạo/sửa/duyệt/kích hoạt ngưỡng | Trại | Trại | Không | Không | Không |
| Xem cảnh báo/đánh dấu đã đọc | Trại | Trại | Khu | Khu | Không |
| Xem người có thể được giao/giao lại cảnh báo | Trại | Trại | Khu | Không | Không |
| Nhận cảnh báo chưa giao hoặc giao cho mình | Không | Không | Khu | Khu | Không |
| Ghi kết quả/đóng cảnh báo | Không | Không | Đúng người đã nhận việc | Đúng người đã nhận việc | Không |
| Xem/đánh dấu thông báo giao việc cá nhân | Không có thông báo dành cho vai trò này | Không có thông báo dành cho vai trò này | Chỉ của mình, còn đúng phạm vi | Chỉ của mình, còn đúng phạm vi | Không |

- Ngưỡng là cấu hình cấp trại nên Quản lý khu vực/Kỹ thuật viên được xem toàn bộ ngưỡng của trại, không được sửa.
- Chỉ giao cảnh báo cho Quản lý khu vực hoặc Kỹ thuật viên đang hoạt động, cùng trại và khu vực của ao/bể.
- Không giao cho chính người giao, Chủ trại hoặc Quản lý trại. Admin toàn hệ thống được giao việc như Chủ trại, không cần membership riêng.
- Không nhận thay người khác hoặc giành cảnh báo đã giao cho người khác.
- Chỉ người phụ trách đã bấm nhận mới cập nhật xử lý; phải có ghi chú. Đổi người phụ trách ao/bể không tự chuyển các cảnh báo cũ.
- Giao/nhận/xử lý có kiểm tra phiên bản để tránh ghi đè; cảnh báo đã `resolved` không tiếp tục xử lý.
- Chuông thông báo giao việc là dữ liệu cá nhân, không phải danh sách tất cả cảnh báo của trại. Chủ trại/Quản lý trại xem cảnh báo qua danh sách quản lý.

## 9. Khách hàng và bán giống

| Thao tác | Chủ trại | Quản lý trại | Quản lý khu vực | Kỹ thuật viên | Nhân viên kho |
| --- | --- | --- | --- | --- | --- |
| Xem/thêm/sửa khách hàng | Trại | Trại | Trại | Không | Không |
| Xem lô sẵn sàng bán | Trại | Trại | Khu | Không | Không |
| Xem danh sách/chi tiết đơn bán | Trại | Trại | Toàn bộ lô trong đơn phải thuộc khu | Không | Không |
| Lập/sửa đơn nháp | Trại | Trại | Toàn bộ lô trong đơn phải thuộc khu | Không | Không |
| Xác nhận đơn/giữ số lượng | Trại | Trại | Không | Không | Không |
| Ghi giao hàng | Trại | Trại | Đơn thuộc khu | Không | Không |
| Ghi tiền cọc/thanh toán | Trại | Trại | Không | Không | Không |
| Hủy đơn nháp | Trại | Trại | Đơn thuộc khu | Không | Không |
| Hủy đơn đã xác nhận | Trại, chưa giao và chưa thu | Trại, chưa giao và chưa thu | Không | Không | Không |

- Khách hàng là danh mục dùng chung cấp trại, không gắn khu vực riêng. Đây là ngoại lệ có chủ đích đối với phạm vi của Quản lý khu vực.
- Một đơn có lô thuộc nhiều khu vực chỉ người có quyền toàn trại được xem/quản lý; không trả riêng một phần đơn cho Quản lý khu vực.
- Quản lý khu vực có thể xem giá trị/thanh toán của đơn được phép xem, nhưng không được tạo khoản thu hoặc xác nhận đơn. Không đồng nghĩa được xem doanh thu toàn trại.
- Đơn phải đúng trạng thái trước khi sửa, giao, thu hoặc hủy; có quyền không bỏ qua điều kiện số lượng khả dụng, lượng giữ, lượng đã giao và số tiền còn nợ.
- Chi tiết quy trình: [ALERTS-AND-SALES.md](../05-business-domain/ALERTS-AND-SALES.md).

## 10. Điểm thực thi và kiểm chứng

| Phần kiểm tra | Nơi thực thi chính |
| --- | --- |
| Phiên đăng nhập, nhóm vai trò được vào API | [auth.middleware.js](../../BE/src/middlewares/auth.middleware.js) |
| Membership, đình chỉ, trạng thái trại | [membership.service.js](../../BE/src/services/users/membership.service.js) |
| Admin toàn hệ thống, quyền tạo trại | [account-access.service.js](../../BE/src/services/auth/account-access.service.js) |
| Quản lý thành viên/lời mời | [user.service.js](../../BE/src/services/users/user.service.js) |
| Ao/bể, người phụ trách, khóa phạm vi khi ghi nhật ký | [pond-tank.service.js](../../BE/src/services/farms/pond-tank.service.js) |
| Lô giống và trường Kỹ thuật viên được sửa | [seed-batch.service.js](../../BE/src/services/seed/seed-batch.service.js) |
| Giới hạn lô và ảnh AI | [ai-inspection.service.js](../../BE/src/services/seed/ai-inspection.service.js) |
| Yêu cầu, duyệt cấp vật tư | [inventory-request.service.js](../../BE/src/services/inventory/inventory-request.service.js) |
| Giao/nhận/xử lý cảnh báo | [environment-threshold.service.js](../../BE/src/services/environment/environment-threshold.service.js) |
| Thông báo giao việc cá nhân | [alert-notification.service.js](../../BE/src/services/environment/alert-notification.service.js) |
| Khách hàng, phạm vi đơn, duyệt/giao/thu/hủy | [sales.service.js](../../BE/src/services/sales/sales.service.js) |
| Nút sửa thành viên/thu hồi lời mời trên giao diện | [users/index.vue](../../FE/src/pages/users/index.vue) |

Trước khi xóa các file kiểm thử theo yêu cầu, kết quả kiểm tra ghi nhận **249 kiểm tra backend và 14 test frontend đạt; build frontend thành công**. Các file kiểm thử và dịch vụ giả lập đã được xóa khỏi workspace; số liệu này là kết quả lịch sử, không phải bộ test hiện còn trong dự án.

Lần kiểm thử trên dùng dữ liệu/dịch vụ giả lập; chưa xác nhận cạnh tranh khóa trên PostgreSQL thật, cấu hình Neon Auth thật hoặc trạng thái migration của môi trường triển khai. Khi thay đổi quyền, cập nhật tài liệu này cùng middleware/service và giao diện tương ứng.
