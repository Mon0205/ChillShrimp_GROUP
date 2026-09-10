# SRS — SOFTWARE REQUIREMENTS SPECIFICATION

## Hệ thống quản lý trại tôm giống ứng dụng xử lý ảnh và AI

**Phiên bản:** 1.0  
**Phạm vi:** Đồ án 2 thành viên — 15 tuần  
**Mô hình vận hành:** Multi-farm; mỗi trang trại là một phạm vi dữ liệu độc lập, chia theo khu vực quản lý  
**Nền tảng:** Web Vue.js 3, Vite, Vuetify và phiên bản mobile được đóng gói/chuyển đổi từ Web App  
**Backend:** Node.js  
**Cơ sở dữ liệu:** PostgreSQL  
**AI Prototype:** Roboflow / Computer Vision API  

---

# 1. GIỚI THIỆU

## 1.1. Mục đích tài liệu

Tài liệu Software Requirements Specification (SRS) mô tả các yêu cầu chức năng, yêu cầu phi chức năng, actor, phân quyền, dữ liệu và các quy trình nghiệp vụ chính của hệ thống quản lý trại tôm giống.

Tài liệu được xây dựng theo phạm vi đã chốt cho đồ án: hệ thống quản lý **nhiều trang trại sản xuất con giống** trong cùng một tài khoản, theo dõi lô tôm giống từ lúc đưa vào ao/bể ương, quá trình chăm sóc, theo dõi môi trường, kiểm tra bằng AI, sử dụng vật tư, chi phí cho đến khi xuất bán con giống cho khách hàng. Mỗi truy vấn phải được giới hạn theo trang trại mà người dùng đang có membership hoạt động.

> Mô hình multi-farm là yêu cầu chuẩn của hệ thống. Code và migration hiện tại mới hỗ trợ một phần: farm context và membership đã có, nhưng tài khoản hiện hữu chưa thể nhận lời mời vào farm thứ hai qua API và migration legacy còn giới hạn non-Owner ở một farm. Đây là khoảng cách triển khai, không phải thay đổi yêu cầu SRS.

Hệ thống không hướng đến quản lý tôm thương phẩm để xuất khẩu theo khối lượng. Đầu ra chính của quy trình là **con giống được xuất bán cho trại nuôi, hộ nuôi hoặc hợp tác xã**.

Trong phạm vi hiện tại, hệ thống quản lý hoạt động tiếp nhận/ương và xuất bán lô tôm giống. Quy trình hatchery đầy đủ từ tôm bố mẹ, sinh sản, trứng, nauplius đến hậu ấu trùng không thuộc MVP; các dữ liệu chuyên sâu của hatchery chỉ là hướng mở rộng.

---

## 1.2. Bối cảnh và cơ sở nghiệp vụ

Phần cơ sở nghiệp vụ của SRS được tổng hợp từ [Tổng hợp quy chuẩn kỹ thuật và công thức quản lý trại tôm giống — v2](./tong_hop_quy_chuan_va_quan_ly_trai_tom-v2.md). Tài liệu này cung cấp dữ liệu tham khảo về nhận diện lô giống, kiểm tra chất lượng, môi trường ao/bể, công thức quản lý và quy trình vận hành. Khi chuyển hóa thành yêu cầu phần mềm, ChillShrimp chỉ tiếp nhận những nội dung phù hợp với phạm vi **tiếp nhận, ương, chăm sóc và xuất bán tôm giống**; không mặc nhiên coi mọi con số trong tài liệu tham khảo là ngưỡng pháp lý hoặc ngưỡng áp dụng chung.

### 1.2.1. Bài toán nghiệp vụ cần giải quyết

Hoạt động của trại tôm giống tạo ra nhiều nhóm dữ liệu liên tục và có quan hệ chặt chẽ: nguồn gốc lô, kết quả kiểm tra đầu vào, ao/bể tiếp nhận, môi trường nước, thức ăn, thay nước, thuốc/chế phẩm, vật tư, biến động số lượng, ảnh kiểm tra, chi phí và xuất bán. Nếu các dữ liệu này được ghi bằng sổ tay hoặc bảng tính riêng lẻ thì khó bảo đảm:

- Truy xuất được một lô giống từ nhà cung cấp, giấy chứng nhận và kiểm tra đầu vào đến ao/bể, quá trình chăm sóc và giao dịch bán.
- Xác định số lượng hiện tại sau hao hụt, điều chuyển, điều chỉnh và xuất bán.
- Đối chiếu thay đổi môi trường với sự kiện chăm sóc hoặc dấu hiệu bất thường của lô.
- Tính lại tỷ lệ sống, mật độ, sinh khối, giá vốn, doanh thu và lợi nhuận từ dữ liệu nguồn.
- Phát hiện sớm giá trị vượt ngưỡng mà không phụ thuộc vào việc kiểm tra thủ công từng sổ ghi chép.
- Chứng minh ai đã nhập dữ liệu, nhập tại thời điểm nào và thuộc farm/khu vực nào.

ChillShrimp giải quyết bài toán trên bằng cách tổ chức dữ liệu theo chuỗi **farm → khu vực → ao/bể → lô giống → nhật ký/sự kiện → kết quả đầu ra**, đồng thời áp dụng phân quyền theo `farm_members`, lưu lịch sử và hạn chế ghi đè dữ liệu gốc.

### 1.2.2. Nhóm thông tin chuyên môn cần số hóa

| Nhóm thông tin | Nội dung tổng hợp cần quản lý trong hệ thống |
|---|---|
| Nhận diện và truy xuất lô | Loài, giai đoạn PL, mã lô nội bộ, mã lô nhà cung cấp, nguồn giống, ngày sản xuất/tiếp nhận/thả, số lượng chứng từ, số lượng kiểm đếm thực tế, phương thức vận chuyển và ao/bể tiếp nhận. |
| Nguồn gốc và chứng nhận | Nhà cung cấp, giấy phép/chứng nhận, thông tin SPF/SPR khi có, hồ sơ kiểm dịch, kết quả PCR, đơn vị/phương pháp xét nghiệm và tệp bằng chứng. |
| Kiểm tra chất lượng đầu vào | Số lượng mẫu, chiều dài/kích thước, độ đồng đều, tỷ lệ sống sau vận chuyển hoặc stress test, cảm quan màu sắc, dị hình, hoạt động bơi, phản xạ, tình trạng phụ bộ, vỏ, cơ và đường ruột. |
| Môi trường ao/bể | Nhiệt độ, pH, độ mặn, oxy hòa tan, ammonia/TAN hoặc NH3, nitrite, nitrate, độ kiềm, độ trong, mực nước, độ đục và H2S; kèm thời gian, đơn vị, phương pháp đo và người ghi nhận. |
| Chuẩn bị và thả giống | Vệ sinh/cải tạo ao-bể, cấp nước, kết quả đo nước vận chuyển và nước ao-bể, quá trình cân bằng nhiệt độ/độ mặn, thời điểm và người thực hiện thả giống. |
| Chăm sóc hằng ngày | Lượng và loại thức ăn, số cữ, tỷ lệ/khối lượng nước thay, thuốc/chế phẩm, vật tư sử dụng, thời gian thực hiện và ghi chú kỹ thuật. |
| Lấy mẫu và biến động số lượng | Mẫu tăng trưởng, khối lượng/kích thước trung bình, số lượng chết, bán, chuyển vào, chuyển ra và điều chỉnh sau kiểm đếm thủ công hoặc AI. |
| AI Inspection | Ảnh nguồn, phương pháp và thể tích mẫu, detections, số lượng phát hiện, confidence, ảnh annotate, phiên bản model, số đếm thủ công và hệ số hiệu chỉnh. |
| Tài chính và đầu ra | Chi phí trực tiếp, chi phí chung, phương pháp phân bổ, khách hàng, bảng giá, số lượng bán, thành phần giá, doanh thu, giá vốn, lợi nhuận và trạng thái đóng lô. |

Các thông tin chất lượng không được rút gọn thành một trường `quality_status` duy nhất. Hệ thống phải giữ chỉ số quan sát, phương pháp kiểm tra, kết quả, thời gian và bằng chứng để có thể truy xuất lý do một lô được chấp nhận hoặc cần kiểm tra lại.

### 1.2.3. Quy trình nghiệp vụ tham chiếu

Quy trình trong tài liệu nghiệp vụ được tổng hợp thành ba giai đoạn để định hướng các module của hệ thống:

| Giai đoạn | Các bước nghiệp vụ chính | Kết quả dữ liệu |
|---|---|---|
| Tiền vận hành và tiếp nhận | Quản lý nhà cung cấp; tạo hồ sơ lô; lưu chứng nhận/PCR; kiểm tra chất lượng mẫu; chuẩn bị ao-bể; đo và cân bằng môi trường trước khi thả. | Lô có nguồn gốc, bằng chứng chất lượng, số lượng ban đầu và ao/bể tiếp nhận rõ ràng. |
| Vận hành và giám sát | Theo dõi số lượng/tỷ lệ sống; ghi môi trường; cho ăn; thay nước; dùng thuốc/chế phẩm; lấy mẫu tăng trưởng; AI Inspection; sinh cảnh báo; ghi hao hụt và điều chuyển. | Dòng thời gian chăm sóc, biến động số lượng, chỉ số tính toán, lịch sử AI, giao dịch vật tư và cảnh báo. |
| Tài chính và kết thúc lô | Tập hợp/phân bổ chi phí; lập giao dịch bán; giảm số lượng; đóng lô; tổng hợp tỷ lệ sống, doanh thu, giá vốn và lợi nhuận. | Hồ sơ xuất bán và báo cáo hiệu quả có thể tái lập từ dữ liệu nguồn. |

Luồng trên là quy trình tham chiếu, không bắt buộc mọi trại phải thực hiện hoàn toàn giống nhau. Phần mềm phải cho phép cấu hình và ghi nhận dữ liệu thực tế, nhưng vẫn duy trì các điều kiện toàn vẹn như một ao/bể chỉ có tối đa một lô đang hoạt động, số lượng lô không âm và mọi giao dịch bán hoặc điều chỉnh đều có sự kiện truy vết.

### 1.2.4. Cơ sở tính toán và hỗ trợ quyết định

Các phép tính được tổng hợp từ tài liệu v2 và được đặc tả chi tiết tại mục **4.20 — Yêu cầu công thức và tính toán**. Những nhóm tính toán chính gồm:

1. Cân đối số lượng hiện tại từ số lượng ban đầu, chết/hao hụt, bán, chuyển vào, chuyển ra và điều chỉnh.
2. Tỷ lệ sống trên cơ sở số lượng thực tế sau tiếp nhận/thả, không mặc định lấy số lượng trên chứng từ.
3. Sinh khối từ số lượng ước tính và khối lượng trung bình của mẫu gần nhất.
4. Mật độ theo thể tích bể hoặc diện tích ao khi có dữ liệu hình học phù hợp.
5. Lượng thức ăn tham khảo theo sinh khối và định mức theo loài/giai đoạn; lượng thực tế vẫn do kỹ thuật viên ghi nhận và điều chỉnh theo tình trạng đàn.
6. Thể tích nước thay từ thể tích ao/bể và tỷ lệ thay nước thực tế.
7. Giá vốn lô từ chi phí trực tiếp và chi phí chung được phân bổ theo phương pháp đã lưu.
8. Giá bán, giá sàn, doanh thu và lợi nhuận từ số lượng bán, giá theo nghìn con, phụ phí, vận chuyển, chiết khấu và phần giá vốn tương ứng.

Backend phải kiểm tra đơn vị, mẫu số, miền giá trị, nguồn dữ liệu và thời điểm trước khi tính. Kết quả ước tính phải được phân biệt với số đo hoặc số đếm thực tế; công thức, phiên bản cấu hình và dữ liệu đầu vào cần đủ để tái lập kết quả.

### 1.2.5. Nguyên tắc áp dụng quy chuẩn và dữ liệu tham khảo

- Không hard-code một bộ ngưỡng môi trường cho mọi lô. Ngưỡng phải được cấu hình theo tối thiểu **loài + giai đoạn phát triển + loại ao/bể/hệ thống + thông số**, có đơn vị, mức cảnh báo/nguy cấp, nguồn, phiên bản và thời gian hiệu lực.
- Các khoảng tham khảo như nhiệt độ, pH, độ mặn, độ kiềm, DO, NH3/TAN hoặc H2S chỉ trở thành rule sinh cảnh báo sau khi được người có chuyên môn thẩm định cho điều kiện nuôi cụ thể.
- Kết quả cảm quan, stress test và PCR phải lưu phương pháp, mẫu, đơn vị thực hiện, ngày kiểm tra và tệp bằng chứng; phần mềm không tự suy diễn kết luận bệnh từ dữ liệu chưa đủ.
- AI chỉ hỗ trợ đếm, đo và phát hiện dấu hiệu cần chú ý. Kết quả AI phải đi kèm confidence/model version và có cơ chế xác nhận thủ công; không tự quyết định dùng thuốc hoặc thay thế PCR/đánh giá chuyên môn.
- Dữ liệu IoT, cảnh báo SMS/còi, đo kích thước/độ đồng đều nâng cao và FCR chỉ được kích hoạt khi có thiết bị, phương pháp đo và dữ liệu đủ tin cậy.
- Mọi giá trị kỹ thuật chưa có nguồn được phê duyệt phải được đánh dấu là tham khảo hoặc cấu hình nháp, không dùng làm căn cứ tự động chặn nghiệp vụ.

### 1.2.6. Mức độ tiếp nhận vào phạm vi ChillShrimp

| Mức độ | Nội dung |
|---|---|
| Áp dụng trong schema/kiến trúc đích | Truy xuất lô; chất lượng đầu vào; môi trường; chăm sóc; biến động số lượng; kho; chi phí; bán giống; cảnh báo; dashboard; lưu kết quả AI và xác nhận thủ công. |
| Ưu tiên MVP | Tôm thẻ chân trắng ở giai đoạn PL; quản lý farm/khu vực/ao-bể/lô; bốn nhật ký kỹ thuật; số lượng; AI đếm mẫu; vật tư cơ bản; chi phí và xuất bán. |
| Áp dụng có điều kiện | Tôm sú; PCR/chứng nhận nâng cao; IoT; cảnh báo ngoài ứng dụng; AI đo kích thước/độ đồng đều; FCR và phương pháp phân bổ chi phí nâng cao. |
| Ngoài phạm vi hiện tại | Toàn bộ chu trình hatchery từ tôm bố mẹ, sinh sản, trứng và nauplius; quản lý tôm thương phẩm để xuất khẩu theo khối lượng; tự động chẩn đoán bệnh hoặc tự động kê thuốc. |

---

## 1.3. Mục tiêu hệ thống

Hệ thống nhằm:

- Số hóa hoạt động quản lý trại tôm giống.
- Quản lý ao/bể và các lô giống đang được ương.
- Theo dõi lịch sử chăm sóc của từng lô giống.
- Theo dõi các thông số môi trường nước.
- Lưu trữ và quản lý dữ liệu kiểm tra mẫu bằng hình ảnh.
- Tích hợp AI để hỗ trợ nhận dạng và đếm tôm giống từ ảnh.
- Hỗ trợ đánh giá sơ bộ mật độ mẫu và một số chỉ số AI khi mô hình đáp ứng được.
- Quản lý thức ăn, thuốc, hóa chất, vi sinh và các vật tư sử dụng trong trại.
- Theo dõi chi phí phát sinh trong quá trình ương.
- Quản lý khách hàng và quá trình xuất bán con giống.
- Tạo cảnh báo khi phát hiện dữ liệu môi trường, AI hoặc tồn kho có vấn đề.
- Phân quyền nhân viên theo vai trò và phạm vi khu vực.

---

## 1.4. Phạm vi hệ thống

### 1.4.1. Phạm vi tổ chức

Một tài khoản có thể tạo hoặc tham gia nhiều trang trại. Mỗi trang trại là một tenant độc lập; quyền của tài khoản được xác định theo bản ghi `farm_members (farm_id, user_id)`, không xác định bằng một role toàn cục trong `users`.

Trang trại có thể được tổ chức thành nhiều khu vực. Mỗi khu vực có thể có nhiều ao/bể và nhân viên phụ trách.

Hệ thống sử dụng bốn role chính:

1. `owner`
2. `area_manager`
3. `technician`
4. `warehouse_staff`

Hai role `sales_staff` và `viewer` **không thuộc phạm vi phiên bản hiện tại**.

### 1.4.2. Phạm vi sản xuất

Quy trình tổng quát:

```text
INPUT
Con giống / lô giống đầu vào
        ↓
Tạo seed_batch
        ↓
Phân vào ao/bể
        ↓
PROCESS
Theo dõi môi trường
Cho ăn
Thay nước
Thuốc/chế phẩm
Kiểm tra mẫu bằng AI
Theo dõi vật tư và chi phí
        ↓
Lô đạt điều kiện bán
        ↓
OUTPUT
Xuất bán con giống cho khách hàng
```

### 1.4.3. Đối tượng giống và giới hạn áp dụng

- MVP ưu tiên `white_leg_shrimp` (tôm thẻ chân trắng) ở các giai đoạn PL.
- Có thể mở rộng `black_tiger_shrimp` (tôm sú) sau khi hoàn thiện cấu hình riêng theo loài.
- `development_stage`, ngưỡng môi trường, định mức thức ăn và bảng giá phải được cấu hình theo loài/giai đoạn; không mặc định một bộ giá trị cho mọi lô.

### 1.4.4. Phạm vi AI

AI là chức năng **hỗ trợ kỹ thuật**, không thay thế hoàn toàn đánh giá của kỹ thuật viên.

Trong prototype, mẫu tôm giống được lấy từ ao/bể và đặt vào khay/đĩa kiểm tra có điều kiện chụp tương đối chuẩn hóa.

Đầu vào AI:

- Ảnh mẫu tôm giống.
- Thông tin lô giống.
- Ao/bể lấy mẫu.
- Thể tích mẫu nếu cần tính mật độ.
- Phương pháp lấy mẫu và điều kiện chụp nếu có.

Đầu ra AI ưu tiên:

- Số cá thể phát hiện (`detected_count`).
- Bounding box/detection.
- Confidence.
- Ảnh đã annotate.
- Mật độ mẫu (`density_per_ml`) khi có thể tích mẫu.

Các chỉ số:

- `average_size_mm`
- `uniformity_score`

được xem là **mở rộng/nullable**, chỉ sử dụng khi pipeline AI có phương pháp đo và hiệu chuẩn đủ phù hợp.

AI không tự kết luận bệnh và không tự quyết định dùng thuốc. Mọi kết quả bất thường chỉ tạo dữ liệu hỗ trợ/cảnh báo để kỹ thuật viên kiểm tra thực tế.

---

# 2. MÔ TẢ TỔNG QUAN HỆ THỐNG

## 2.1. Các actor

### 2.1.1. Owner — Chủ trang trại

Owner là người có quyền cao nhất **trong một trang trại cụ thể** và quản lý toàn bộ dữ liệu của trang trại đó. Một người dùng có thể là Owner ở một trang trại nhưng giữ role khác ở trang trại khác.

Owner có thể quản lý thông tin trang trại, nhân viên, ao/bể, lô giống, dữ liệu chăm sóc, AI, kho, chi phí, khách hàng, xuất bán, cảnh báo và dashboard.

Owner là role duy nhất quản lý nghiệp vụ khách hàng và xuất bán trong phạm vi hiện tại.

### 2.1.2. Area Manager — Trưởng khu vực

Area Manager chịu trách nhiệm quản lý toàn bộ dữ liệu thuộc khu vực được phân công.

Area Manager theo dõi nhân viên, ao/bể, lô giống, môi trường, hoạt động chăm sóc, AI, cảnh báo và các dữ liệu vận hành liên quan trong khu vực của mình.

Area Manager không được truy cập dữ liệu quản lý của khu vực khác nếu không được Owner cấp quyền.

### 2.1.3. Technician — Kỹ thuật viên

Technician thực hiện các nghiệp vụ kỹ thuật tại khu vực được phân công.

Các nghiệp vụ chính gồm:

- Ghi thông số môi trường.
- Ghi nhật ký cho ăn.
- Ghi nhật ký thay nước.
- Ghi việc sử dụng thuốc/chế phẩm.
- Theo dõi lô giống.
- Chụp/tải ảnh mẫu.
- Thực hiện kiểm tra AI.
- Xem kết quả AI.
- Theo dõi cảnh báo kỹ thuật.

Technician không có quyền quản trị toàn trang trại.

### 2.1.4. Warehouse Staff — Nhân viên kho

Warehouse Staff phụ trách nghiệp vụ kho:

- Danh mục vật tư.
- Nhập kho.
- Xuất/sử dụng vật tư.
- Điều chỉnh tồn.
- Lịch sử giao dịch kho.
- Theo dõi tồn kho.
- Theo dõi cảnh báo tồn thấp.

### 2.1.5. AI Service — Hệ thống ngoài

AI Service là actor hệ thống bên ngoài nhận ảnh từ backend và trả về kết quả nhận dạng.

Prototype dự kiến có thể sử dụng Roboflow.

---

# 3. PHÂN QUYỀN

| Chức năng | Owner | Area Manager | Technician | Warehouse Staff |
|---|:---:|:---:|:---:|:---:|
| Đăng nhập / hồ sơ cá nhân | ✓ | ✓ | ✓ | ✓ |
| Quản lý thông tin trang trại | ✓ | Xem | Xem | Xem |
| Mời thành viên | ✓ | - | - | - |
| Quản lý tài khoản nhân viên | ✓ | - | - | - |
| Xem nhân viên | Toàn trại | Khu vực | - | - |
| Quản lý ao/bể | ✓ | Khu vực | Xem khu vực | - |
| Quản lý lô giống | ✓ | Khu vực | Nghiệp vụ kỹ thuật | - |
| Ghi thông số môi trường | ✓ | Khu vực | Khu vực | - |
| Nhật ký cho ăn | ✓ | Khu vực | Khu vực | - |
| Nhật ký thay nước | ✓ | Khu vực | Khu vực | - |
| Thuốc/chế phẩm | ✓ | Khu vực | Khu vực | - |
| Thực hiện AI Inspection | ✓ | Khu vực | Khu vực | - |
| Xem kết quả AI | Toàn trại | Khu vực | Khu vực | - |
| Quản lý vật tư | ✓ | Xem | Xem | ✓ |
| Nhập kho | ✓ | - | - | ✓ |
| Xuất/sử dụng vật tư | ✓ | Theo dõi | Ghi sử dụng | ✓ |
| Điều chỉnh tồn kho | ✓ | - | - | ✓ |
| Quản lý chi phí | ✓ | Theo dõi khu vực | Ghi phát sinh | - |
| Quản lý khách hàng | ✓ | - | - | - |
| Xuất bán con giống | ✓ | - | - | - |
| Xem doanh thu | ✓ | - | - | - |
| Xem cảnh báo | Toàn trại | Khu vực | Khu vực | Cảnh báo kho |
| Dashboard | Toàn trại | Khu vực | Kỹ thuật | Kho |

---

# 4. YÊU CẦU CHỨC NĂNG

## 4.1. UC01 — Xác thực người dùng

### Mô tả

Cho phép người dùng truy cập hệ thống bằng tài khoản hợp lệ.

### Actor

- Owner
- Area Manager
- Technician
- Warehouse Staff

### Chức năng

- Đăng nhập bằng email và mật khẩu.
- Đăng xuất.
- Xem thông tin tài khoản.
- Cập nhật thông tin cá nhân cơ bản.
- Hệ thống xác thực danh tính qua Neon Auth và kiểm tra phiên ứng dụng trong `access_sessions`.
- Khi truy cập dữ liệu của một trang trại, hệ thống kiểm tra `farm_members.status = 'active'`.
- Sau đăng nhập, hệ thống xác định role và phạm vi dữ liệu theo `farm_id` đang được chọn.

---

## 4.2. UC02 — Quản lý trang trại

### Actor chính

Owner.

### Chức năng

- Xem hồ sơ trang trại.
- Cập nhật tên trang trại.
- Cập nhật địa chỉ.
- Cập nhật diện tích.
- Cập nhật số điện thoại.
- Cập nhật mô tả.

Area Manager, Technician và Warehouse Staff chỉ được xem các thông tin cần thiết của trang trại.

---

## 4.3. UC03 — Quản lý thành viên và lời mời

### Actor chính

Owner.

### Chức năng

- Xem danh sách nhân viên.
- Gửi lời mời qua email.
- Chọn role cho người được mời.
- Chọn khu vực dự kiến phân công nếu có.
- Theo dõi trạng thái lời mời.
- Hủy lời mời chưa được chấp nhận.
- Kiểm tra thời hạn invitation.
- Kích hoạt/vô hiệu hóa tài khoản nhân viên.

### Role có thể mời

```text
area_manager
technician
warehouse_staff
```

Owner không được tạo thông qua invitation.

### Trạng thái invitation

```text
pending
accepted
cancelled
```

Trạng thái hết hạn được suy ra từ `expires_at`; không cần thêm giá trị `expired` vào enum hiện tại.

---

## 4.4. UC04 — Quản lý ao/bể

### Actor

- Owner
- Area Manager

Technician được xem ao/bể trong khu vực phụ trách.

### Chức năng

- Thêm ao/bể.
- Xem danh sách ao/bể.
- Xem chi tiết ao/bể.
- Cập nhật thông tin ao/bể.
- Cập nhật trạng thái ao/bể.
- Tìm kiếm/lọc ao/bể.

### Loại ao/bể

```text
nursery_tank
pond
other
```

### Trạng thái

```text
empty
active
cleaning
inactive
```

Luồng phổ biến:

```text
empty → active → cleaning → empty
```

---

## 4.5. UC05 — Quản lý lô giống

### Actor

- Owner
- Area Manager
- Technician (phạm vi nghiệp vụ kỹ thuật)

### Chức năng

- Tạo lô giống.
- Gán lô vào ao/bể.
- Lưu loài tôm và tên khoa học/quy ước loài.
- Lưu giai đoạn phát triển PL.
- Lưu cơ sở cung cấp, mã lô nhà cung cấp và nguồn tôm bố mẹ nếu có.
- Lưu trạng thái SPF/SPR/standard/unknown nếu nhà cung cấp cung cấp thông tin.
- Lưu ngày sản xuất, ngày tiếp nhận, thời gian vận chuyển và hồ sơ kiểm dịch.
- Lưu số lượng theo chứng từ và số lượng thực tế sau kiểm đếm.
- Theo dõi số lượng ước tính hiện tại.
- Lưu ngày bắt đầu thả/ương.
- Lưu ngày dự kiến xuất bán.
- Ghi nhận kết quả kiểm tra chất lượng lô giống trước và trong quá trình ương.
- Ghi nhận các biến động số lượng như chết, bán, chuyển bể và điều chỉnh.
- Ghi nhận lấy mẫu tăng trưởng, kích thước, khối lượng trung bình và sinh khối.
- Cập nhật trạng thái lô.
- Xem lịch sử dữ liệu liên quan đến lô.

### Trạng thái

```text
active
ready_for_sale
sold
failed
cancelled
```

Luồng bình thường:

```text
active → ready_for_sale → sold
```

Luồng bất thường:

```text
active → failed
active → cancelled
```

### Dữ liệu chất lượng và truy xuất lô

Hệ thống phải hỗ trợ ghi nhận các lần kiểm tra chất lượng trong `seed_quality_checks`, bao gồm kiểm tra cảm quan, tỷ lệ dị hình, stress test, soi kính hiển vi và xét nghiệm bệnh. Mỗi lần kiểm tra phải lưu người kiểm tra, thời gian, cỡ mẫu, phương pháp, kết quả và tệp bằng chứng nếu có.

Các mã bệnh ưu tiên quản lý trong prototype gồm `WSSV`, `TSV`, `YHV`, `IMNV`, `IHHNV`, `AHPND` và `EHP`. Việc kết luận đạt/không đạt phải tham chiếu quy chuẩn hoặc quyết định chuyên môn; không tự suy diễn chỉ từ kết quả AI.

Số lượng lô phải có lịch sử biến động trong `batch_quantity_events`. `current_estimated_quantity` là giá trị tổng hợp nhanh, còn lịch sử sự kiện là nguồn truy xuất khi cần đối soát.

Việc lấy mẫu tăng trưởng được lưu ở `growth_sampling_logs`, dùng cho khối lượng trung bình, kích thước, sinh khối và độ đồng đều. Các chỉ số không đo được phải để rỗng, không ghi giá trị 0 thay thế.

---

## 4.6. UC06 — Quản lý thông số môi trường

### Actor

- Technician
- Area Manager
- Owner

### Chức năng

Người dùng được quyền có thể ghi:

- Nhiệt độ.
- pH.
- Độ mặn.
- DO.
- NH3.
- TAN (tổng ammonia nitrogen).
- NO2.
- NO3.
- Độ kiềm.
- H2S.
- Độ đục/độ trong.
- Mực nước.
- Phương pháp đo và thiết bị đo nếu có.
- Thời điểm đo.
- Ghi chú.

Mỗi bản ghi phải liên kết với ao/bể và người ghi nhận. Vì thông số môi trường là dữ liệu cấp ao/bể, `water_parameter_logs` chỉ lưu `tank_id`, không lưu thêm `batch_id` độc lập. Lô/giống đang được nuôi có thể được hiển thị từ quan hệ ao/bể tại thời điểm ghi; nếu cần truy vết lịch sử chính xác sau khi ao/bể được tái sử dụng, hệ thống cần bổ sung lịch sử phân bổ ao/bể-lô.

Hệ thống lưu lịch sử để phục vụ theo dõi và cảnh báo.

Ngưỡng được lấy từ `environment_thresholds` theo loài, giai đoạn, loại ao/bể và thông số. Mỗi ngưỡng có mức tối ưu, cảnh báo, nguy cấp, nguồn tham chiếu và thời gian hiệu lực. Các giá trị trong tài liệu kỹ thuật chỉ là giá trị khởi tạo cần được kỹ thuật viên/Owner phê duyệt.

---

## 4.7. UC07 — Quản lý nhật ký cho ăn

### Actor

- Technician
- Area Manager
- Owner

### Chức năng

- Ghi nhận thức ăn.
- Số lượng sử dụng.
- Đơn vị.
- Thời gian cho ăn.
- Người thực hiện.
- Ao/bể.
- Liên kết vật tư kho nếu thức ăn đã có trong kho.
- Xem lịch sử cho ăn theo ao/bể và khoảng thời gian.

Hệ thống có thể lấy định mức từ `feed_guidelines` và hiển thị lượng khuyến nghị. Công thức mặc định:

```text
recommended_amount_kg = biomass_kg * feeding_rate_percent / 100
```

Đối với PL nhỏ chưa có khối lượng đáng tin cậy, sử dụng `feed_per_1000_seed_g`. Lượng thực tế do kỹ thuật viên xác nhận dựa trên lượng ăn thừa, nhiệt độ, chất lượng nước, sức khỏe và hoạt động bắt mồi; không tự động áp dụng một tỷ lệ cố định cho mọi lô.

---

## 4.8. UC08 — Quản lý nhật ký thay nước

### Actor

- Technician
- Area Manager
- Owner

### Chức năng

- Ghi tỷ lệ nước được thay.
- Ghi thời gian thực hiện.
- Ghi người thực hiện.
- Liên kết với ao/bể.
- Tính hoặc ghi thể tích nước thay thực tế nếu có `volume_m3`.
- Ghi chú.
- Xem lịch sử thay nước theo ao/bể và khoảng thời gian.

```text
water_changed_volume_m3 = tank.volume_m3 * water_change_percentage / 100
```

Tỷ lệ và lịch thay nước là tham số vận hành theo loài, giai đoạn và mô hình nuôi; không khóa cứng một tỷ lệ duy nhất trong hệ thống.

---

## 4.9. UC09 — Quản lý thuốc/chế phẩm

### Actor

- Technician
- Area Manager
- Owner

### Chức năng

- Ghi tên thuốc/chế phẩm.
- Số lượng.
- Đơn vị.
- Mục đích sử dụng.
- Thời gian sử dụng.
- Người thực hiện.
- Liên kết vật tư trong kho nếu có.
- Xem lịch sử sử dụng theo lô.

---

## 4.10. UC10 — Kiểm tra tôm giống bằng AI

### Actor

- Technician
- Area Manager
- Owner
- AI Service

### Tiền điều kiện

- Lô giống tồn tại.
- Ao/bể tồn tại.
- Người dùng có quyền trên lô/khu vực.
- Có ảnh mẫu hợp lệ.

### Luồng chính

```text
Technician
    ↓
Lấy mẫu từ ao/bể
    ↓
Đặt mẫu vào khay/đĩa kiểm tra
    ↓
Chụp hoặc tải ảnh
    ↓
Backend tạo AI Inspection
status = pending
    ↓
Gửi ảnh đến AI Service
    ↓
status = processing
    ↓
AI Detect
    ↓
Trả detections + confidence
    ↓
Backend xử lý kết quả
    ↓
Lưu kết quả vào ai_inspections
    ↓
status = completed
```

### Kết quả

- `detected_count`
- `density_per_ml`
- `average_confidence`
- `detections`
- `annotated_image_url`
- `model_version`
- `manual_count` nếu kỹ thuật viên xác nhận lại
- `correction_factor` nếu có hiệu chỉnh sau đối chiếu

Nếu AI lỗi:

```text
status = failed
```

### Yêu cầu

- Ảnh gốc phải được lưu lại.
- Kết quả AI phải liên kết với lô; ao/bể được suy ra qua `seed_batches.tank_id`, không lưu thêm `tank_id` trong `ai_inspections`.
- Có thể lưu `manual_count` và `correction_factor` sau khi kỹ thuật viên đối chiếu kết quả.
- Lưu phiên bản model để có thể truy vết.
- Không bắt buộc `average_size_mm` và `uniformity_score` trong prototype.

---

## 4.11. UC11 — Xem kết quả và lịch sử AI

### Actor

- Owner
- Area Manager
- Technician

### Chức năng

- Xem ảnh gốc.
- Xem ảnh annotated.
- Xem số cá thể phát hiện.
- Xem mật độ mẫu.
- Xem confidence.
- Xem detection.
- Xem phiên bản model.
- Xem trạng thái xử lý.
- Xem lịch sử kiểm tra theo lô.

Area Manager và Technician chỉ xem dữ liệu thuộc phạm vi khu vực của mình.

---

## 4.12. UC12 — Quản lý vật tư

### Actor chính

- Warehouse Staff
- Owner

### Chức năng

- Thêm vật tư.
- Cập nhật vật tư.
- Xem danh sách vật tư.
- Tìm kiếm vật tư.
- Phân loại vật tư.
- Theo dõi số lượng tồn.
- Theo dõi đơn giá.
- Thiết lập ngưỡng tồn tối thiểu.

### Category

```text
feed
medicine
chemical
probiotic
other
```

---

## 4.13. UC13 — Quản lý nhập/xuất/sử dụng kho

### Actor chính

- Warehouse Staff
- Owner

Technician có thể phát sinh thông tin sử dụng vật tư thông qua nghiệp vụ chăm sóc.

### Loại giao dịch

```text
import
usage
adjustment
```

### Chức năng

- Ghi nhận nhập kho.
- Ghi nhận sử dụng/xuất kho.
- Điều chỉnh tồn.
- Lưu người thực hiện.
- Lưu số lượng.
- Lưu đơn giá tại thời điểm giao dịch.
- Liên kết lô giống khi giao dịch liên quan đến một lô.
- Xem lịch sử giao dịch.

### Quy tắc

```text
import     → tăng tồn
usage      → giảm tồn
adjustment → điều chỉnh tồn theo nghiệp vụ
```

---

## 4.14. UC14 — Quản lý chi phí

### Actor

- Owner
- Area Manager (theo dõi phạm vi khu vực)
- Technician (ghi chi phí kỹ thuật phát sinh nếu được cấp quyền)

### Chức năng

- Ghi nhận chi phí.
- Liên kết chi phí với lô giống khi phù hợp.
- Chọn loại chi phí.
- Ghi số tiền.
- Ghi ngày phát sinh.
- Xem chi phí theo lô.

### Loại chi phí

```text
seed_purchase
feed
medicine
chemical
electricity
water
labor
transport
other
```

Chi phí chung có thể để `batch_id = NULL` và chọn phương pháp phân bổ `days`, `volume`, `quantity`, `biomass` hoặc `actual_usage` khi lập báo cáo giá vốn.

---

## 4.15. UC15 — Quản lý khách hàng

### Actor chính

Owner.

### Chức năng

- Thêm khách hàng.
- Cập nhật khách hàng.
- Xem danh sách.
- Xem chi tiết.
- Tìm kiếm khách hàng.
- Xem lịch sử mua giống.

### Loại khách hàng

```text
farm
household
cooperative
other
```

---

## 4.16. UC16 — Quản lý xuất bán con giống

### Actor chính

Owner.

### Tiền điều kiện

- Khách hàng tồn tại.
- Lô giống tồn tại.
- Lô có đủ số lượng để xuất.

### Chức năng

- Chọn lô giống.
- Chọn khách hàng.
- Nhập số lượng bán.
- Nhập giá trên 1.000 con.
- Áp dụng bảng giá theo loài, giai đoạn, chất lượng và khoảng số lượng.
- Ghi phụ phí chất lượng/chứng nhận, phí vận chuyển và chiết khấu nếu có.
- Tính tổng doanh thu.
- Lưu tỷ lệ sống của lô nếu cần.
- Ghi ngày xuất bán.
- Xem lịch sử xuất bán.
- Cập nhật số lượng còn lại của lô.
- Chuyển lô sang `sold` khi chu kỳ xuất bán hoàn tất.

### Công thức

```text
total_revenue
=
gross_revenue + transport_fee - discount_amount

gross_revenue
= (quantity_sold / 1000) × price_per_thousand
```

Một khách hàng có thể mua nhiều lần và một lô có thể xuất bán nhiều lần.

Đơn giá và các thành phần giá phải được lưu snapshot tại `seed_sales` để lịch sử giao dịch không thay đổi khi `price_lists` được cập nhật.

---

## 4.17. UC17 — Theo dõi cảnh báo

### Actor

- Owner
- Area Manager
- Technician
- Warehouse Staff

### Phạm vi

- Owner: toàn trại.
- Area Manager: cảnh báo khu vực.
- Technician: cảnh báo kỹ thuật trong khu vực.
- Warehouse Staff: cảnh báo kho.

### Loại cảnh báo

```text
water_quality
ai_abnormality
inventory_low
```

### Mức độ

```text
info
warning
critical
```

### Chức năng

- Xem danh sách cảnh báo.
- Xem chi tiết cảnh báo.
- Phân biệt cảnh báo đã đọc/chưa đọc.
- Đánh dấu cảnh báo đã đọc.

Trong phạm vi MVP, hệ thống **không bắt buộc** workflow xử lý cảnh báo phức tạp như `acknowledged`, `in_progress`, `resolved`.

---

## 4.18. UC18 — Dashboard và thống kê

### Owner

Dashboard toàn trại có thể hiển thị:

- Tổng số ao/bể.
- Số ao/bể đang hoạt động.
- Số lô đang ương.
- Số lô sẵn sàng bán.
- Cảnh báo chưa đọc.
- Thông số môi trường gần nhất.
- Kết quả AI gần nhất.
- Tình trạng tồn kho.
- Chi phí.
- Số lượng xuất bán.
- Doanh thu.

### Area Manager

Dashboard giới hạn theo khu vực:

- Ao/bể trong khu vực.
- Lô đang ương.
- Thông số môi trường.
- Nhật ký chăm sóc.
- AI Inspection.
- Cảnh báo khu vực.

### Technician

Dashboard kỹ thuật:

- Lô đang phụ trách.
- Thông số môi trường gần nhất.
- Hoạt động chăm sóc.
- AI Inspection gần nhất.
- Cảnh báo kỹ thuật.

### Warehouse Staff

Dashboard kho:

- Tổng vật tư.
- Tồn kho.
- Vật tư dưới ngưỡng.
- Nhập/xuất gần đây.
- Cảnh báo kho.

---

## 4.19. Yêu cầu nghiệp vụ đặc thù cho tôm giống

### FR19.1 — Tiếp nhận và truy xuất lô giống

Khi tiếp nhận lô giống, hệ thống phải cho phép lưu cơ sở cung cấp, mã lô nhà cung cấp, loài, giai đoạn PL, thông tin tôm bố mẹ/SPF/SPR nếu có, ngày sản xuất, ngày tiếp nhận, thời gian vận chuyển, số lượng theo chứng từ, số lượng thực tế sau kiểm đếm và hồ sơ kiểm dịch.

`initial_quantity` là số lượng thực tế sau kiểm đếm và thả, được dùng cho tỷ lệ sống. `documented_quantity` chỉ dùng để đối chiếu chứng từ.

### FR19.2 — Kiểm tra chất lượng lô giống

Hệ thống phải lưu từng lần kiểm tra trong `seed_quality_checks`. Các loại kiểm tra gồm cảm quan, tỷ lệ dị hình, stress test, soi kính hiển vi và xét nghiệm bệnh. Kết quả phải có cỡ mẫu, phương pháp, người kiểm tra, thời gian, kết luận và bằng chứng nếu có.

Mã bệnh ưu tiên gồm `WSSV`, `TSV`, `YHV`, `IMNV`, `IHHNV`, `AHPND`, `EHP`. Các tiêu chí đạt/không đạt phải tham chiếu quy chuẩn hoặc quyết định chuyên môn hiện hành, không mặc định tất cả protocol stress test là bắt buộc.

### FR19.3 — Theo dõi môi trường

Hệ thống phải hỗ trợ ghi thủ công hoặc nhận dữ liệu tự động cho nhiệt độ, pH, độ mặn, DO, NH3, TAN, NO2, NO3, độ kiềm, H2S, độ đục/độ trong và mực nước. Mỗi bản ghi phải lưu đơn vị, thời điểm, phương pháp đo và thiết bị nếu có.

Ngưỡng được tra từ `environment_thresholds` theo loài, giai đoạn, loại ao/bể và thông số. Mỗi cấu hình phải có mức tối ưu, cảnh báo, nguy cấp, nguồn tham chiếu và thời gian hiệu lực.

### FR19.4 — Lấy mẫu tăng trưởng và AI

Hệ thống phải hỗ trợ lấy mẫu định kỳ, lưu cỡ mẫu, chiều dài, khối lượng trung bình, độ đồng đều, số lượng ước tính và sinh khối trong `growth_sampling_logs`. Khoảng lấy mẫu 7–10 ngày chỉ là giá trị khởi tạo có thể cấu hình.

AI chỉ là công cụ hỗ trợ. Ảnh phải được chụp trong điều kiện tương đối chuẩn hóa; kết quả phải lưu số lượng phát hiện, thể tích mẫu, mật độ, confidence, phiên bản model và số lượng được kỹ thuật viên hiệu chỉnh nếu có. AI không được tự kết luận bệnh hoặc tự quyết định dùng thuốc.

### FR19.5 — Truy vết biến động số lượng

Mọi nhập, chết, bán, chuyển bể và điều chỉnh số lượng phải tạo bản ghi `batch_quantity_events`. Việc cập nhật `current_estimated_quantity` và tạo sự kiện phải thực hiện trong cùng transaction.

---

## 4.20. Yêu cầu công thức và tính toán

Các công thức dưới đây là công thức nghiệp vụ mặc định. Backend phải kiểm tra mẫu số khác 0, miền giá trị hợp lệ và đơn vị trước khi tính.

```text
current_quantity = initial_quantity
                 - mortality
                 - sold
                 - transfer_out
                 + transfer_in
                 + adjustment

survival_rate_percent = current_quantity / initial_quantity * 100

biomass_kg = estimated_quantity * average_weight_g / 1000

tank_density_con_per_m3 = estimated_quantity / tank.volume_m3
pond_density_con_per_m2 = estimated_quantity / pond.area_m2

recommended_feed_kg = biomass_kg * feeding_rate_percent / 100

feed_for_1000_seed_g = actual_feed_g / estimated_quantity * 1000

water_changed_volume_m3 = tank.volume_m3
                         * water_change_percentage / 100

revenue = quantity_sold / 1000 * price_per_thousand

gross_profit = revenue - allocated_cost_for_sold_quantity

roi_percent = gross_profit / total_batch_cost * 100
```

Với lô PL chưa thể cân chính xác, có thể ước lượng số lượng bằng mẫu trọng lượng:

```text
estimated_quantity = sample_count
                   * lot_weight_kg
                   * 1000
                   / sample_weight_g
```

FCR chỉ hiển thị khi có dữ liệu sinh khối đầu kỳ và cuối kỳ đáng tin cậy:

```text
fcr = cumulative_feed_kg
    / (ending_biomass_kg - starting_biomass_kg)
```

Giá vốn lô:

```text
total_batch_cost = seed_cost + feed_cost + treatment_cost
                 + electricity_cost + water_cost + labor_cost
                 + material_cost + allocated_shared_cost

cost_per_saleable_seed = total_batch_cost / saleable_quantity
```

Giá bán:

```text
price_per_thousand = base_price_per_thousand
                   + quality_surcharge_per_thousand
                   + certificate_surcharge_per_thousand

gross_revenue = quantity_sold / 1000 * price_per_thousand
total_revenue = gross_revenue + transport_fee - discount_amount

minimum_price_per_seed = cost_per_saleable_seed
                       / (1 - target_margin_percent / 100)
minimum_price_per_thousand = minimum_price_per_seed * 1000
```

`seed_sales` phải lưu đơn giá và thành phần giá tại thời điểm bán để lịch sử không thay đổi khi `price_lists` được cập nhật.

---

# 5. DANH SÁCH USE CASE TỔNG HỢP

Danh sách dưới đây sử dụng mô hình hai cấp đã chốt tại [USECASE-SPECIFICATION.md](./USECASE-SPECIFICATION.md#2-bảng-phân-rã-tổng-hợp):

- `UC01` và `UC02` là hai use case độc lập, không thuộc nhóm chức năng nào.
- `UC03` đến `UC09` là bảy use case cấp 1, dùng để gom nhóm chức năng trên sơ đồ tổng quát và đều `<<include>>` UC01 — Đăng nhập.
- Các use case có mã `UCxx.n` là use case nghiệp vụ cấp 2, `<<extend>>` từ đúng một use case cấp 1 và là nơi mô tả luồng nghiệp vụ cụ thể.
- Trừ UC01 và phần chấp nhận lời mời thuộc UC03.1, các nghiệp vụ đều yêu cầu phiên hợp lệ và membership `active` tại farm đang chọn.

## 5.1. Bảng đầy đủ các use case

| Mã | Tên use case | Phân loại | Thuộc nhóm | Tác nhân |
|---|---|---|---|---|
| UC01 | Đăng nhập | Độc lập | — | Tất cả vai trò |
| UC02 | Quản lý hồ sơ cá nhân | Độc lập | — | Tất cả vai trò |
| UC03 | Quản lý nhân viên | Cấp 1 | — | `OWNER`; `AREA_MANAGER` đối với UC03.3 |
| UC03.1 | Mời thành viên | Cấp 2 | UC03 | `OWNER` |
| UC03.2 | Quản lý tài khoản nhân viên | Cấp 2 | UC03 | `OWNER` |
| UC03.3 | Xem danh sách nhân viên theo khu vực | Cấp 2 | UC03 | `OWNER`, `AREA_MANAGER` |
| UC04 | Quản lý trang trại | Cấp 1 | — | `OWNER`; các vai trò khác xem/thao tác theo phân công |
| UC04.1 | Xem/cập nhật thông tin trang trại | Cấp 2 | UC04 | `OWNER` cập nhật; các vai trò còn lại chỉ xem |
| UC04.2 | CRUD ao hoặc bể | Cấp 2 | UC04 | `OWNER`, `AREA_MANAGER`; `TECHNICIAN` chỉ xem |
| UC04.3 | Cập nhật trạng thái ao/bể | Cấp 2 | UC04 | `OWNER`, `AREA_MANAGER` |
| UC05 | Quản lý lô giống và chăm sóc | Cấp 1 | — | `OWNER`, `AREA_MANAGER`, `TECHNICIAN` |
| UC05.1 | CRUD lô giống | Cấp 2 | UC05 | `OWNER`, `AREA_MANAGER`; `TECHNICIAN` xem/cập nhật kỹ thuật |
| UC05.2 | Cập nhật trạng thái lô giống | Cấp 2 | UC05 | `OWNER`, `AREA_MANAGER` |
| UC05.3 | Ghi và xem thông số môi trường nước | Cấp 2 | UC05 | `OWNER`, `AREA_MANAGER`, `TECHNICIAN` |
| UC05.4 | Ghi và xem nhật ký cho ăn | Cấp 2 | UC05 | `OWNER`, `AREA_MANAGER`, `TECHNICIAN` |
| UC05.5 | Ghi và xem nhật ký thay nước | Cấp 2 | UC05 | `OWNER`, `AREA_MANAGER`, `TECHNICIAN` |
| UC05.6 | Ghi và xem nhật ký thuốc/chế phẩm | Cấp 2 | UC05 | `OWNER`, `AREA_MANAGER`, `TECHNICIAN` |
| UC06 | Kiểm tra và phân tích AI | Cấp 1 | — | `OWNER`, `AREA_MANAGER`, `TECHNICIAN`; hệ thống ngoài `AI_SERVICE` |
| UC06.1 | Thực hiện AI Inspection | Cấp 2 | UC06 | `OWNER`, `AREA_MANAGER`, `TECHNICIAN`; `AI_SERVICE` tham gia xử lý |
| UC06.2 | Xem kết quả và lịch sử AI Inspection | Cấp 2 | UC06 | `OWNER`, `AREA_MANAGER`, `TECHNICIAN` |
| UC07 | Quản lý vật tư | Cấp 1 | — | `OWNER`, `WAREHOUSE_STAFF`; `AREA_MANAGER`, `TECHNICIAN` một phần |
| UC07.1 | CRUD danh mục vật tư | Cấp 2 | UC07 | `OWNER`, `WAREHOUSE_STAFF`; vai trò khu vực chỉ xem |
| UC07.2 | Nhập kho vật tư | Cấp 2 | UC07 | `OWNER`, `WAREHOUSE_STAFF` |
| UC07.3 | Yêu cầu cấp vật tư | Cấp 2 | UC07 | `OWNER`, `AREA_MANAGER` |
| UC07.4 | Xuất/cấp vật tư khỏi kho | Cấp 2 | UC07 | `OWNER`, `WAREHOUSE_STAFF` |
| UC07.5 | Ghi nhận sử dụng vật tư | Cấp 2 | UC07 | `OWNER`, `TECHNICIAN` |
| UC07.6 | Điều chỉnh tồn kho | Cấp 2 | UC07 | `OWNER`, `WAREHOUSE_STAFF` |
| UC08 | Quản lý tài chính và bán giống | Cấp 1 | — | `OWNER`; `AREA_MANAGER`, `TECHNICIAN` một phần |
| UC08.1 | Quản lý chi phí | Cấp 2 | UC08 | `OWNER` |
| UC08.2 | Ghi nhận chi phí phát sinh | Cấp 2 | UC08 | `TECHNICIAN` |
| UC08.3 | Xem chi phí theo khu vực | Cấp 2 | UC08 | `AREA_MANAGER` |
| UC08.4 | CRUD khách hàng | Cấp 2 | UC08 | `OWNER` |
| UC08.5 | Xuất bán con giống | Cấp 2 | UC08 | `OWNER` |
| UC08.6 | Xem doanh thu | Cấp 2 | UC08 | `OWNER` |
| UC09 | Quản lý thống kê và cảnh báo | Cấp 1 | — | `OWNER`, `AREA_MANAGER`, `TECHNICIAN`, `WAREHOUSE_STAFF` |
| UC09.1 | Xem Dashboard theo phạm vi quyền | Cấp 2 | UC09 | Tất cả vai trò, theo phạm vi |
| UC09.2 | Xem cảnh báo toàn trại | Cấp 2 | UC09 | `OWNER` |
| UC09.3 | Xem cảnh báo theo khu vực | Cấp 2 | UC09 | `AREA_MANAGER`, `TECHNICIAN` |
| UC09.4 | Xem cảnh báo tồn kho | Cấp 2 | UC09 | `WAREHOUSE_STAFF` |

## 5.2. Tổng hợp số lượng

| Nhóm | Use case cấp 1 | Use case cấp 2 |
|---|---:|---:|
| Độc lập (`UC01`, `UC02`) | — | — |
| UC03 — Quản lý nhân viên | 1 | 3 |
| UC04 — Quản lý trang trại | 1 | 3 |
| UC05 — Quản lý lô giống và chăm sóc | 1 | 6 |
| UC06 — Kiểm tra và phân tích AI | 1 | 2 |
| UC07 — Quản lý vật tư | 1 | 6 |
| UC08 — Quản lý tài chính và bán giống | 1 | 6 |
| UC09 — Quản lý thống kê và cảnh báo | 1 | 4 |
| **Tổng** | **7** | **30** |

Như vậy, sơ đồ tổng quát có **39 phần tử use case**, gồm **2 use case độc lập + 7 use case nhóm cấp 1 + 30 use case cấp 2**. Nếu chỉ đếm các use case có luồng nghiệp vụ trực tiếp thì có **32 use case** gồm UC01, UC02 và 30 use case cấp 2; bảy use case cấp 1 là các nhóm tổng quát dùng để tổ chức sơ đồ.

> **Quy ước mã chính thức:** bảng trên thay thế danh sách phẳng UC01–UC18 trước đây. Các nội dung yêu cầu chức năng tại Chương 4 vẫn cung cấp chi tiết nghiệp vụ theo module và phải được đối chiếu về mã use case hai cấp trong bảng này; không tạo thêm use case mới ngoài danh sách nếu chưa cập nhật đồng bộ `USECASE-SPECIFICATION.md`.

---

# 6. YÊU CẦU DỮ LIỆU

## 6.1. Các nhóm dữ liệu chính

Hệ thống sử dụng các nhóm dữ liệu:

### Người dùng và trang trại

- `users`
- `farms`
- `areas`
- `farm_members`
- `farm_invitations`
- `access_sessions`
- `password_reset_otp_windows`

### Sản xuất

- `ponds_tanks`
- `seed_batches`

### Nhật ký kỹ thuật

- `water_parameter_logs`
- `feeding_logs`
- `water_change_logs`
- `treatment_logs`

### AI

- `ai_inspections`

### Kho

- `inventory_supplies`
- `inventory_transactions`

### Tài chính

- `expense_records`

### Khách hàng và xuất bán

- `customers`
- `seed_sales`

### Cảnh báo

- `alerts_notifications`

### Dữ liệu mở rộng nghiệp vụ tôm giống

- `seed_suppliers`: cơ sở cung cấp và thông tin nguồn giống.
- `seed_quality_checks`: kiểm tra chất lượng, stress test, soi kính hiển vi và xét nghiệm bệnh.
- `batch_quantity_events`: nhập, chết, bán, chuyển bể và điều chỉnh số lượng.
- `growth_sampling_logs`: lấy mẫu tăng trưởng, kích thước, khối lượng và sinh khối.
- `environment_thresholds`: ngưỡng môi trường theo loài, giai đoạn, loại ao/bể và thông số.
- `feed_guidelines`: định mức thức ăn theo loài/giai đoạn.
- `price_lists`: giá cơ sở, phụ phí và khoảng số lượng áp dụng.

Các bảng mở rộng được xem là schema đích cho module quy chuẩn; phải có migration và kiểm thử trước khi đưa vào môi trường chạy thật.

---

## 6.2. Yêu cầu bổ sung cho quản lý khu vực

Phân quyền mới đã chốt yêu cầu:

```text
Owner
  ↓
Toàn trại
  ↓
Khu vực
  ↓
Area Manager
  ↓
Technician
```

Schema lõi hiện tại đã có `areas`, `farm_members` và `farm_invitations.area_id`. `farm_members` là bảng trung gian giữa người dùng và trang trại, đồng thời lưu role, trạng thái membership và khu vực phụ trách.

Để triển khai phân quyền theo khu vực cho các module nghiệp vụ, database cần bổ sung hoặc cập nhật:

### `areas`

```text
id
farm_id
code
name
created_at
updated_at
```

### `farm_members`

```text
farm_id
user_id
role
status
area_id
created_at
```

Quan hệ đề xuất:

```text
farms
  └── areas
       ├── ponds_tanks
       └── farm_members
             ├── Area Manager
             └── Technician
```

`farm_invitations.area_id` đã là:

```text
FK → areas.id
```

và `ponds_tanks` nên có:

```text
area_id FK → areas.id
```

`ponds_tanks` vẫn cần bổ sung:

```text
area_id FK → areas.id
```

để yêu cầu “Area Manager quản lý toàn bộ dữ liệu trong khu vực” và “Technician làm nghiệp vụ kỹ thuật trong khu vực” có thể được thực thi nhất quán ở tầng dữ liệu.

---

# 7. BUSINESS RULES

Các business rule dưới đây là yêu cầu bắt buộc của kiến trúc đích. Backend phải kiểm tra các quy tắc này; việc ẩn nút hoặc giới hạn màn hình ở frontend không được xem là biện pháp phân quyền đầy đủ. Các quy tắc liên quan đến bảng nghiệp vụ chưa có trong Prisma hiện tại là tiêu chí cho giai đoạn triển khai tiếp theo.

Mã `BR01` đến `BR26` được giữ ổn định để bảo toàn các tham chiếu từ `USECASE-SPECIFICATION.md`. Các quy tắc mới được đánh số tiếp từ `BR27`.

## BR01 — Thành viên, vai trò và phạm vi tenant

- `farm_members` là nguồn duy nhất xác định quyền nghiệp vụ; không lấy role từ `users`, `farms.created_by`, `ADMIN_EMAIL` hoặc dữ liệu do frontend tự khai báo.
- Mỗi cặp `(farm_id, user_id)` chỉ có một membership và một role tại một thời điểm.
- Một người dùng được phép tham gia nhiều trang trại và có thể giữ role khác nhau tại từng trang trại.
- Mọi use case thuộc một trang trại chỉ được thực hiện khi membership tương ứng có `status = active`.
- Mọi bản ghi tham gia cùng một thao tác phải thuộc cùng `farm_id`. Backend phải từ chối mọi tham chiếu chéo trang trại, kể cả khi UUID được gửi trực tiếp qua API.

> Đây là quy tắc kiến trúc đã chốt. Migration `20260902_004_enforce_single_farm_non_owner` còn chứa giới hạn cũ đối với user không phải Owner và được xem là khoảng cách hiện thực cần xử lý bằng migration mới trong giai đoạn sau, không phải lý do thay đổi BR01.

## BR02 — Quyền của Owner

- Owner có quyền quản trị toàn bộ dữ liệu của trang trại mà mình có membership `role = owner`, `status = active`.
- Chỉ Owner được quản lý thông tin trại, tài khoản thành viên, khách hàng, xuất bán và doanh thu theo phạm vi đã chốt.
- `farms.created_by` chỉ phục vụ truy vết người tạo; không được dùng thay cho việc kiểm tra Owner trong `farm_members`.
- `ADMIN_EMAIL` chỉ phục vụ bootstrap tài khoản đầu tiên, không phải role toàn hệ thống và không tạo quyền trên mọi trang trại.

## BR03 — Phạm vi của Area Manager

- Area Manager phải được gán đúng một `area_id` thuộc chính trang trại của membership.
- Area Manager chỉ được xem nhân viên, quản lý ao/bể, lô giống, dữ liệu chăm sóc, AI, cảnh báo và chi phí có thể truy về khu vực được phân công.
- Area Manager không được truy cập khu vực khác, quản lý tài khoản thành viên, quản lý khách hàng, xuất bán hoặc xem doanh thu toàn trại.
- Chi phí chung có `batch_id = NULL` không được tự phân vào dashboard khu vực khi chưa có phương pháp phân bổ hợp lệ.

## BR04 — Phạm vi của Technician

- Technician phải được gán đúng một `area_id` thuộc chính trang trại của membership.
- Technician chỉ được xem ao/bể, lô giống và thực hiện nghiệp vụ kỹ thuật trong khu vực được phân công, gồm ghi môi trường, cho ăn, thay nước, thuốc/chế phẩm, lấy mẫu và AI Inspection.
- Technician được ghi nhận chi phí hoặc sử dụng vật tư phát sinh từ công việc của mình nhưng không được nhập kho, điều chỉnh kho, quản trị nhân viên, bán giống hoặc xem doanh thu.
- Technician không được tự thay đổi role, area hoặc trạng thái membership của mình.

## BR05 — Phạm vi của Warehouse Staff

- Warehouse Staff không gắn `area_id` trong mô hình hiện tại và thao tác kho trong phạm vi trang trại được phân công.
- Warehouse Staff được quản lý danh mục vật tư, nhập kho, xuất/cấp kho, điều chỉnh tồn và xem cảnh báo tồn kho.
- Warehouse Staff không được quản trị ao/bể, lô giống, nhật ký kỹ thuật, AI, khách hàng, xuất bán, chi phí hoặc doanh thu.

## BR06 — Lời mời thành viên

- Chỉ Owner có membership `active` tại trang trại đang chọn mới được tạo hoặc hủy lời mời.
- Role được phép mời là `area_manager`, `technician` và `warehouse_staff`; không tạo Owner qua luồng lời mời nhân viên.
- `area_manager` và `technician` bắt buộc có `area_id` thuộc cùng `farm_id`; `warehouse_staff` phải có `area_id = NULL`.
- Email phải được chuẩn hóa chữ thường trước khi kiểm tra. Không được mời lại người đã là thành viên của cùng trại hoặc tạo nhiều lời mời `pending` cho cùng email trong cùng trại.
- Người đã có tài khoản hoặc membership tại trang trại khác vẫn có thể được mời vào trại mới; khi chấp nhận, các membership cũ không bị thay đổi.
- Token gốc chỉ gửi cho người nhận; database chỉ lưu `token_hash`. Lời mời có hiệu lực tối đa 24 giờ và chỉ được chấp nhận một lần.
- Trạng thái lưu trữ là `pending`, `accepted`, `cancelled`; trạng thái hết hạn được suy ra từ `expires_at`, không cần thêm enum `expired`.
- Tạo user nếu cần, tạo `farm_members` và chuyển invitation sang `accepted` phải được thực hiện nhất quán; lỗi tại một bước không được để lại membership hoặc invitation ở trạng thái dở dang.

## BR07 — Ao/bể và khu vực

- Mỗi ao/bể thuộc đúng một `farm_id` và đúng một `area_id` thuộc trang trại đó khi triển khai phạm vi khu vực.
- Mã ao/bể phải duy nhất trong một trang trại; thể tích phải lớn hơn 0 nếu được khai báo.
- Trạng thái chuẩn gồm `empty`, `active`, `cleaning`, `inactive`. Chu kỳ bình thường là `empty → active → cleaning → empty`.
- Không được chuyển ao/bể sang `empty`, `cleaning` hoặc `inactive` khi vẫn có lô `active` hoặc `ready_for_sale` đang chiếm dụng.
- Không xóa ao/bể nếu việc xóa làm mất khả năng truy vết lô hoặc nhật ký đã phát sinh; ưu tiên chuyển sang `inactive`.

## BR08 — Lô giống và quy tắc chiếm dụng ao/bể

- Mỗi lô giống thuộc đúng một ao/bể qua `seed_batches.tank_id`; loài tôm được lưu tại lô, không lưu cố định tại ao/bể.
- Một ao/bể có thể chứa nhiều lô qua các chu kỳ, nhưng tại một thời điểm chỉ có tối đa một lô mang trạng thái `active` hoặc `ready_for_sale`.
- Không được tạo hoặc chuyển lô mới vào ao/bể đang có lô chiếm dụng. Kiểm tra và ghi nhận phải nằm trong cùng transaction để tránh hai yêu cầu đồng thời cùng thành công.
- Luồng trạng thái bình thường là `active → ready_for_sale → sold`; luồng kết thúc bất thường là `active → failed` hoặc `active → cancelled`.
- `sold`, `failed`, `cancelled` là trạng thái kết thúc và không được tự chuyển ngược về `active` nếu không có quy trình hiệu chỉnh được phê duyệt.
- `expected_sale_date` không được trước `stocked_date`. Khi lô kết thúc, trạng thái ao/bể phải được chuyển phù hợp với quy trình vệ sinh và tái sử dụng.

## BR09 — Nhật ký môi trường và chăm sóc

- `water_parameter_logs`, `feeding_logs`, `water_change_logs` và `treatment_logs` là nhật ký cấp ao/bể, chỉ lưu `tank_id` cùng người ghi/thực hiện; không thêm `batch_id` độc lập.
- Lô liên quan được suy ra từ lô chiếm dụng ao/bể tại thời điểm phát sinh. Nếu không xác định được duy nhất lô lịch sử thì hệ thống không được tự gán; cần dùng lịch sử phân bổ ao/bể-lô khi chức năng này được bổ sung.
- Ao/bể, người thực hiện và vật tư liên quan phải thuộc cùng trang trại; người thực hiện phải có membership và phạm vi khu vực phù hợp.
- Thông số không đo phải lưu `NULL`, không dùng giá trị `0` để biểu diễn "chưa đo". Lượng thức ăn, thuốc/chế phẩm phải lớn hơn 0; tỷ lệ thay nước phải nằm trong miền hợp lệ từ 0 đến 100%.
- Khi nhật ký cho ăn hoặc thuốc/chế phẩm liên kết `supply_id`, việc lưu nhật ký, tạo giao dịch `usage` và giảm tồn phải cùng thành công hoặc cùng rollback.

## BR10 — Khả năng truy vết AI Inspection

Mỗi AI Inspection phải truy vết được `batch_id`, người thực hiện, ảnh đầu vào, phương pháp và thể tích mẫu nếu có, thời gian kiểm tra, trạng thái xử lý, phiên bản model, detections, chỉ số kết quả và ảnh chú thích. Ao/bể được suy ra qua `seed_batches.tank_id`, không lưu thêm `tank_id` dư thừa trong `ai_inspections`.

Trạng thái xử lý hợp lệ là `pending → processing → completed` hoặc `pending/processing → failed`. Bản ghi đã `completed` hoặc `failed` không được quay lại `processing` như cùng một lần kiểm tra.

## BR11 — Giới hạn kết luận của AI

- AI chỉ cung cấp dữ liệu hỗ trợ đánh giá, không tự chẩn đoán bệnh, tự kết luận chất lượng lô hoặc tự chỉ định thuốc/chế phẩm.
- Confidence thấp hoặc dấu hiệu bất thường phải dẫn đến yêu cầu kiểm tra thủ công/cảnh báo, không tự động loại lô.
- Quyết định chuyên môn cuối cùng thuộc về người có trách nhiệm kỹ thuật và phải có dữ liệu kiểm tra thực tế khi cần.

## BR12 — Truy vết thay đổi tồn kho

- `inventory_supplies.quantity` là số tồn hiện tại; mọi thay đổi số tồn phải có một `inventory_transactions` tương ứng.
- Không được sửa trực tiếp số tồn mà không tạo giao dịch, kể cả khi điều chỉnh để khớp kiểm kê thực tế.
- Giao dịch kho đã ghi nhận phải được giữ làm lịch sử; sai sót được sửa bằng giao dịch điều chỉnh có lý do, không ghi đè giao dịch cũ.

## BR13 — Cách tính và kiểm soát tồn kho

- `import` làm tăng tồn; `usage` làm giảm tồn; `adjustment` cộng hoặc trừ đúng số lượng chênh lệch đã xác nhận.
- Số lượng nhập/xuất phải lớn hơn 0; điều chỉnh khác 0 và bắt buộc có lý do. Số tồn sau giao dịch không được âm.
- Vật tư, lô được cấp nếu có và người tạo giao dịch phải thuộc cùng trang trại. Đơn vị giao dịch phải tương thích với đơn vị của danh mục vật tư.
- Yêu cầu cấp vật tư chỉ ghi nhận nhu cầu và không làm thay đổi tồn; tồn chỉ giảm khi nghiệp vụ xuất/cấp hoặc sử dụng thực tế được xác nhận.
- Kiểm tra tồn, tạo transaction và cập nhật `inventory_supplies.quantity` phải nằm trong cùng transaction có kiểm soát cạnh tranh.

## BR14 — Điều kiện xuất bán

- Chỉ Owner được xuất bán và lô phải ở trạng thái `ready_for_sale`.
- `quantity_sold` phải là số nguyên dương và không lớn hơn `current_estimated_quantity` ngay trước giao dịch.
- Hệ thống phải khóa hoặc kiểm soát cạnh tranh để hai giao dịch đồng thời không bán vượt số lượng còn lại.
- Tạo `seed_sales`, tạo `batch_quantity_events` loại `sale` và cập nhật số lượng/trạng thái lô phải cùng thành công hoặc cùng rollback.

## BR15 — Khách hàng

- Mỗi khách hàng thuộc đúng một trang trại và chỉ Owner của trang trại đó được quản lý.
- Một khách hàng có thể có nhiều lần mua; lịch sử mua được truy qua `seed_sales.customer_id`.
- Khách hàng và lô giống trong cùng giao dịch bán phải thuộc cùng trang trại.
- Không xóa cứng khách hàng đã có giao dịch nếu việc xóa làm mất lịch sử bán hàng.

## BR16 — Quan hệ giữa lô giống và các lần bán

- Một lô có thể được bán nhiều lần. Bán một phần giữ trạng thái `ready_for_sale` khi số lượng còn lại lớn hơn 0.
- Khi số lượng còn lại bằng 0, lô chuyển sang `sold`; lô `sold`, `failed` hoặc `cancelled` không được phát sinh giao dịch bán mới.
- Mỗi lần bán phải lưu dữ liệu giá, doanh thu và tỷ lệ sống tại đúng thời điểm giao dịch; không lấy giá trị hiện tại của lô để ghi đè lịch sử cũ.

## BR17 — Cảnh báo

- Mỗi cảnh báo phải có `farm_id`, `alert_type`, `severity`, tiêu đề, nội dung, thời gian và liên kết đến lô/ao-bể nếu có.
- `severity` chỉ nhận `info`, `warning`, `critical`. Cảnh báo phải xác định được dữ liệu nguồn hoặc quy tắc đã kích hoạt nó.
- Owner xem toàn trại; Area Manager và Technician chỉ xem cảnh báo khu vực; Warehouse Staff chỉ xem cảnh báo kho.
- Cảnh báo môi trường, AI và tồn kho được sinh bởi tiến trình nền hoặc sau giao dịch, không phải use case do người dùng chủ động kích hoạt.
- Tiến trình sinh cảnh báo phải có cơ chế idempotency/chống trùng cho cùng nguồn, loại và điều kiện cảnh báo.
- `is_read` hiện là trạng thái chung của cảnh báo. Nếu cần trạng thái đọc riêng cho từng người dùng, phải bổ sung bảng theo dõi đọc riêng thay vì suy diễn từ trường này.

## BR18 — Bảo toàn dữ liệu lịch sử

- Nhật ký chăm sóc, kiểm tra chất lượng, AI Inspection, giao dịch kho, biến động số lượng, chi phí và bán hàng phải được ưu tiên lưu lịch sử thay vì ghi đè.
- Mọi bản ghi lịch sử phải truy được người thực hiện và thời gian nghiệp vụ; `created_at` không thay thế cho thời điểm thực tế như `performed_at`, `recorded_at`, `occurred_at` hoặc `sale_date`.
- Sai số nghiệp vụ phải được sửa bằng bản ghi hiệu chỉnh/sự kiện bù có lý do khi mô hình dữ liệu hỗ trợ, không xóa dấu vết gốc.
- Không xóa cứng bản ghi cha nếu còn dữ liệu lịch sử cần dùng cho truy vết, báo cáo hoặc tính toán.

## BR19 — Chuẩn hóa loài và giai đoạn phát triển

- `species` và `development_stage` phải dùng bộ mã thống nhất để tra đúng ngưỡng môi trường, định mức thức ăn và bảng giá.
- MVP ưu tiên `white_leg_shrimp` ở giai đoạn PL. `black_tiger_shrimp` chỉ sử dụng khi có cấu hình chuyên môn tương ứng; không áp dụng nguyên ngưỡng của tôm thẻ cho tôm sú.
- Giai đoạn PL phải được lưu theo định dạng chuẩn như `PL12`, `PL15`, `PL20`; không dùng nhiều cách viết cho cùng một giai đoạn.

## BR20 — Kiểm tra chất lượng lô giống

- Một lô có thể có nhiều `seed_quality_checks`; mỗi bản ghi đại diện một lần kiểm tra và không ghi đè lần trước.
- `sample_size` phải lớn hơn 0; `live_count` và `abnormal_count`, nếu có, phải nằm trong khoảng từ 0 đến `sample_size`.
- Tỷ lệ sống mẫu được tính bằng `live_count / sample_size × 100`; tỷ lệ dị hình bằng `abnormal_count / sample_size × 100`. Không tính khi thiếu dữ liệu hoặc mẫu số bằng 0.
- Stress test, soi kính hiển vi và PCR phải lưu phương pháp/protocol, thời gian, người kiểm tra và bằng chứng khi có.
- Kết luận `pass`, `warning`, `fail`, `inconclusive` phải dựa trên dữ liệu kiểm tra và nguồn chuyên môn; không được suy ra chỉ từ `average_confidence` của AI.

## BR21 — Số lượng và biến động của lô

- `documented_quantity` là số lượng theo chứng từ; `initial_quantity` là số lượng thực tế sau kiểm đếm/thả và là mẫu số chuẩn để tính tỷ lệ sống.
- Mọi thay đổi `current_estimated_quantity` phải tạo `batch_quantity_events` với loại sự kiện, số lượng, người thực hiện và thời gian.
- `quantity` của sự kiện luôn lớn hơn 0; sự kiện `mortality` và `adjustment` bắt buộc có lý do.
- Tạo sự kiện và cập nhật số lượng lô phải nằm trong cùng transaction. Số lượng sau biến động không được âm.
- Sự kiện bán phải tham chiếu được giao dịch `seed_sales`; sự kiện chuyển ao/bể phải kiểm tra ao/bể nguồn và đích thuộc cùng trang trại.

## BR22 — Ngưỡng môi trường

- Ngưỡng phải được chọn theo `farm_id`, loài, giai đoạn, loại ao/bể, mã thông số và đơn vị đo.
- Chỉ cấu hình có `is_active = true`, nằm trong thời gian hiệu lực và đã có `approved_by`, `approved_at` mới được dùng để phát cảnh báo chính thức.
- Mỗi cấu hình phải có `source_reference`; không dùng một hằng số chung cho mọi loài, giai đoạn, loại ao/bể hoặc trang trại.
- Các cận phải có thứ tự logic và cùng đơn vị với giá trị đo. Khi không có cấu hình hợp lệ, hệ thống vẫn lưu số đo nhưng chỉ thông báo thiếu cấu hình, không tự gán mức nguy hiểm.

## BR23 — Định mức và lượng thức ăn thực tế

- `feed_guidelines` phải được chọn theo trang trại, loài, giai đoạn, loại ao/bể và thời gian hiệu lực; cấu hình dùng chính thức phải có nguồn và phê duyệt.
- Lượng khuyến nghị có thể tính theo sinh khối hoặc số lượng trên 1.000 con tùy dữ liệu đầu vào, nhưng phải lưu cơ sở tính và đơn vị.
- Hệ thống chỉ đưa ra khuyến nghị. Kỹ thuật viên được điều chỉnh theo môi trường, sức khỏe, kích thước và kết quả kiểm tra thức ăn thừa.
- `recommended_amount` và lượng thực tế `amount` phải lưu riêng; không ghi đè khuyến nghị bằng lượng thực tế.
- Nếu sử dụng thức ăn từ kho, nhật ký và giao dịch `usage` phải tuân theo BR09, BR12 và BR13.

## BR24 — Kết quả AI và xác nhận thủ công

- Hệ thống phải giữ nguyên ảnh nguồn, detections, `detected_count`, confidence và `model_version` do lần chạy AI tạo ra.
- `manual_count` và `correction_factor` là dữ liệu xác nhận/hiệu chỉnh riêng, không được thay thế hoặc xóa kết quả AI gốc.
- `average_confidence = tổng confidence / số detection`; để `NULL` khi không có detection.
- `density_per_ml = detected_count / sample_volume_ml` chỉ được tính khi `sample_volume_ml > 0`; nếu không đủ dữ liệu thì để `NULL` và nêu rõ lý do.
- Detection thiếu trường bắt buộc hoặc confidence nằm ngoài khoảng 0 đến 1 phải làm lần xử lý chuyển sang `failed`, không lưu như kết quả hoàn thành.
- `average_size_mm` và `uniformity_score` chỉ được sử dụng khi pipeline có phương pháp đo/hiệu chuẩn phù hợp; nếu chưa hỗ trợ thì để `NULL`.

## BR25 — Giá vốn và phân bổ chi phí

- Chi phí trực tiếp phải gắn `batch_id` khi xác định được lô. Chi phí chung toàn trại được phép có `batch_id = NULL`.
- Khi đưa chi phí chung vào giá vốn lô, phải lưu phương pháp phân bổ như số ngày nuôi, thể tích, số lượng, sinh khối hoặc mức sử dụng thực tế.
- Không được tính trùng một chi phí vừa từ giao dịch kho vừa từ `expense_records` nếu chúng biểu diễn cùng một phát sinh.
- Tổng giá vốn lô bằng tổng chi phí trực tiếp cộng phần chi phí chung được phân bổ. Giá vốn mỗi con bán được chỉ tính khi số lượng bán được lớn hơn 0.
- Báo cáo phải chỉ rõ khoảng thời gian, dữ liệu nguồn và phương pháp phân bổ để có thể tái lập kết quả.

## BR26 — Bảng giá, giá bán và snapshot giao dịch

- Bảng giá được chọn theo cùng `farm_id`, loài, giai đoạn, mức chất lượng, khoảng số lượng và thời gian hiệu lực.
- Giá từ `price_lists` chỉ là giá gợi ý. Owner phải xác nhận các thành phần giá trước khi hoàn tất giao dịch.
- `price_per_thousand = base_price_per_thousand + quality_surcharge_per_thousand + certificate_surcharge_per_thousand`.
- `gross_revenue = quantity_sold / 1000 × price_per_thousand`.
- `total_revenue = gross_revenue + transport_fee - discount_amount`; kết quả không được âm.
- `survival_rate` của lần bán được tính từ số lượng ước tính ngay trước khi trừ giao dịch chia cho `initial_quantity`, chỉ khi `initial_quantity > 0`.
- `seed_sales` phải lưu snapshot giá cơ sở, phụ phí, phí vận chuyển, chiết khấu, đơn giá và doanh thu. Thay đổi hoặc vô hiệu hóa bảng giá không được làm thay đổi giao dịch lịch sử.

## BR27 — Xác thực, phiên và hồ sơ người dùng

- Người dùng chỉ đăng nhập thành công khi Neon Auth xác thực hợp lệ và có bản ghi tương ứng trong `users`.
- Endpoint được bảo vệ phải kiểm tra cả phiên Neon Auth và phiên ứng dụng trong `access_sessions`; cookie xác thực phải là HttpOnly và frontend gửi bằng `credentials: include`.
- Phiên ứng dụng hết hạn sau 30 phút không hoạt động theo cấu hình hiện tại. Đăng xuất hoặc phiên hết hạn phải vô hiệu hóa phiên và từ chối request tiếp theo.
- `email` là định danh đăng nhập và không được sửa qua API cập nhật hồ sơ thông thường. Người dùng chỉ được cập nhật các trường hồ sơ cho phép như tên hiển thị và số điện thoại.
- Suspend membership tại một trang trại chỉ làm mất quyền ở trang trại đó; các membership `active` tại trang trại khác vẫn giữ nguyên hiệu lực.

## BR28 — Tạo và lựa chọn trang trại

- Mã trang trại phải duy nhất và được chuẩn hóa theo quy ước hệ thống.
- Tạo `farms` và tạo membership `owner` cho người tạo phải nằm trong cùng transaction.
- Sau đăng nhập, mọi nghiệp vụ phải dùng trang trại đang chọn từ danh sách membership `active`; backend phải kiểm tra lại `farmId`, không tin giá trị lưu ở frontend.
- Quyền sửa hoặc xóa trại phải dựa trên membership Owner đang hoạt động, không dựa riêng vào `created_by`.
- Xóa trang trại là thao tác nguy hiểm, phải yêu cầu xác nhận và không được làm mất lịch sử trái với BR18.

## BR29 — Tính nguyên tử và kiểm soát cạnh tranh

Các nhóm ghi dữ liệu PostgreSQL sau phải chạy trong database transaction và rollback toàn bộ khi một bước thất bại:

- Tạo trang trại và membership Owner.
- Chấp nhận lời mời: tạo bản ghi `users` nếu cần, tạo membership và cập nhật trạng thái invitation.
- Ghi nhật ký có sử dụng vật tư, tạo inventory transaction và cập nhật tồn.
- Tạo biến động số lượng và cập nhật `current_estimated_quantity`.
- Tạo giao dịch bán, tạo sự kiện `sale`, cập nhật số lượng và trạng thái lô.

Các thao tác trừ tồn kho, trừ số lượng lô và kiểm tra một lô đang chiếm dụng ao/bể phải có khóa hoặc cơ chế kiểm soát cạnh tranh tương đương để không vượt giới hạn khi có request đồng thời.

Neon Auth là dịch vụ ngoài nên không thể tham gia cùng Prisma/PostgreSQL transaction. Nếu danh tính Neon Auth đã được tạo nhưng transaction nội bộ thất bại, backend phải có cơ chế bù hoặc luồng khôi phục an toàn để tránh tài khoản mồ côi và không được đánh dấu invitation là `accepted` khi chưa tạo membership thành công.

## BR30 — Dữ liệu số, đơn vị và giá trị dẫn xuất

- Số lượng, thể tích, khối lượng, giá, chi phí và tỷ lệ phải được kiểm tra miền giá trị trước khi tính hoặc lưu; mọi phép chia phải kiểm tra mẫu số lớn hơn 0.
- Số lượng cá thể dùng đơn vị `con`; khối lượng dùng `g` hoặc `kg`; thể tích mẫu dùng `ml`; thể tích ao/bể dùng `m3`; giá con giống dùng VND/1.000 con. Không trộn đơn vị trong cùng phép tính nếu chưa chuyển đổi rõ ràng.
- Giá trị chưa đo hoặc không đủ dữ liệu phải lưu `NULL`, không dùng 0 thay thế.
- Dữ liệu dẫn xuất như tỷ lệ sống, mật độ, sinh khối, doanh thu và giá vốn phải truy được dữ liệu nguồn, công thức và thời điểm tính; giao dịch lịch sử phải lưu snapshot khi giá trị nguồn có thể thay đổi.
- Backend phải thống nhất quy tắc làm tròn theo từng loại chỉ số; báo cáo không được cộng các giá trị đã làm tròn nếu còn dữ liệu gốc chính xác hơn.

---

# 8. YÊU CẦU PHI CHỨC NĂNG

## 8.1. Hiệu năng

- Các thao tác CRUD thông thường cần phản hồi trong thời gian phù hợp với ứng dụng web.
- Danh sách lớn phải hỗ trợ phân trang.
- Các field thường xuyên dùng để tìm kiếm/lọc và foreign key cần được đánh index phù hợp.
- Xử lý AI không được khóa toàn bộ giao diện người dùng.
- Trạng thái AI phải thể hiện được `pending`, `processing`, `completed`, `failed`.

## 8.2. Bảo mật

- Mật khẩu không được lưu plaintext.
- API yêu cầu xác thực phải kiểm tra token hợp lệ.
- Backend phải kiểm tra role và phạm vi khu vực; không chỉ ẩn nút trên frontend.
- Owner mới có quyền quản trị thành viên và xuất bán.
- Invitation token phải lưu dạng hash.
- Token lời mời phải có thời gian hết hạn.
- File upload phải kiểm tra loại và kích thước.
- Secret/API key của AI không được đưa trực tiếp vào frontend.

## 8.3. Toàn vẹn dữ liệu

- Sử dụng foreign key cho các quan hệ chính.
- Email người dùng phải unique.
- `batch_code` phải unique.
- Số lượng, chi phí, giá bán và phần trăm không được nhận giá trị không hợp lệ.
- Giao dịch kho và cập nhật tồn cần được thực hiện nhất quán.
- Xuất bán và cập nhật số lượng lô cần tránh race condition.
- Không được trộn đơn vị `con`, `g`, `kg`, `ml`, `m3` và VND/1.000 con trong cùng một phép tính.
- Các trường dẫn xuất phải lưu được nguồn dữ liệu hoặc snapshot khi dùng trong báo cáo lịch sử.
- Bản ghi kiểm tra chất lượng phải lưu cỡ mẫu, phương pháp và bằng chứng nếu có.
- Không được ghi giá trị 0 để đại diện cho một thông số môi trường chưa đo.

## 8.4. Khả dụng

- Giao diện cần đơn giản, phù hợp với người vận hành trại.
- Các form kỹ thuật phải hiển thị đơn vị đo rõ ràng.
- Cảnh báo phải dễ nhận biết.
- Giao diện phải responsive để sử dụng trên máy tính và thiết bị di động.

## 8.5. Khả năng bảo trì

- Frontend, backend và AI integration cần tách module rõ ràng.
- API sử dụng cấu trúc nhất quán.
- Database migration phải được quản lý bằng source code.
- Model AI phải lưu `model_version`.
- Các enum/trạng thái cần được định nghĩa tập trung.

## 8.6. Khả năng mở rộng

Kiến trúc nên cho phép mở rộng sau đồ án:

- Mở rộng số lượng trang trại và khu vực trong cùng một tài khoản (đã hỗ trợ ở kiến trúc hiện tại).
- Nhiều khu vực.
- IoT sensor.
- AI model nâng cao.
- Video processing.
- Push notification.
- Quản lý lịch công việc.
- Phân tích dữ liệu dài hạn.

---

# 9. YÊU CẦU AI VÀ XỬ LÝ ẢNH

## 9.1. Quy trình lấy mẫu

Để giảm sai số, prototype ưu tiên điều kiện chụp tương đối chuẩn hóa:

1. Lấy mẫu từ ao/bể.
2. Đặt mẫu vào khay/đĩa có kích thước hoặc điều kiện xác định.
3. Hạn chế vật thể gây nhiễu.
4. Chụp từ góc tương đối cố định.
5. Đảm bảo ánh sáng đủ.
6. Gửi ảnh vào hệ thống.

Nếu cần đo kích thước, ảnh phải có vật chuẩn hoặc điều kiện hiệu chuẩn tương đương. Kết quả đếm phải được đối chiếu với mẫu đếm thủ công trong giai đoạn đánh giá model.

## 9.2. Pipeline

```text
Image Upload
     ↓
Validate Image
     ↓
Store Original Image
     ↓
Create ai_inspections
status = pending
     ↓
Call AI Service
     ↓
Detection
     ↓
Parse Result
     ↓
Calculate detected_count
     ↓
Calculate density_per_ml (nếu có sample_volume_ml)
     ↓
Create/Store Annotated Image
     ↓
Save JSONB detections
     ↓
status = completed
```

```text
density_per_ml = detected_count / sample_volume_ml
```

Khi kỹ thuật viên kiểm tra lại, lưu `manual_count` và `correction_factor` như dữ liệu xác nhận; không ghi đè `detected_count` gốc. Chỉ sử dụng `average_size_mm` và `uniformity_score` khi đã có phương pháp đo và dữ liệu kiểm thử phù hợp.

## 9.3. Lưu trữ kết quả

Không tạo một row riêng cho từng detection trong MVP.

Các bounding box được lưu trong:

```text
ai_inspections.detections JSONB
```

Ví dụ:

```json
[
  {
    "class": "shrimp_seed",
    "confidence": 0.93,
    "bbox": [120, 80, 160, 190]
  }
]
```

Cách này giúp prototype đơn giản hơn và giảm số lượng record không cần thiết.

## 9.4. Xử lý lỗi

Nếu AI Service không phản hồi hoặc trả lỗi:

```text
status = failed
```

Record inspection vẫn được giữ để phục vụ truy vết và có thể thử lại.

---

# 10. CẢNH BÁO

## 10.1. Cảnh báo môi trường

Hệ thống có thể tạo cảnh báo khi thông số nước vượt ngưỡng được cấu hình trong logic hệ thống.

Ví dụ:

- pH bất thường.
- Nhiệt độ bất thường.
- DO thấp.
- NH3/NO2 vượt ngưỡng.

Mức cảnh báo phải được tra từ `environment_thresholds` theo loài, giai đoạn và loại ao/bể. Với thông số độc như NH3 hoặc H2S, điều kiện nguy cấp là giá trị **lớn hơn hoặc bằng** ngưỡng nguy cấp; không dùng dấu `≤` cho một ngưỡng độc tăng theo nồng độ.

## 10.2. Cảnh báo AI

Có thể tạo cảnh báo khi kết quả AI cho thấy dữ liệu bất thường theo rule được định nghĩa trong prototype.

Không nên tuyên bố AI chẩn đoán bệnh nếu model chưa được huấn luyện và kiểm nghiệm cho mục tiêu đó.

## 10.3. Cảnh báo kho

Khi:

```text
quantity <= min_threshold
```

hệ thống có thể tạo cảnh báo `inventory_low`.

---

# 11. DASHBOARD VÀ BÁO CÁO

Trong phạm vi 15 tuần, ưu tiên dashboard thay vì hệ thống báo cáo phức tạp.

Các thống kê chính:

- Ao/bể theo trạng thái.
- Lô giống theo trạng thái.
- Thông số môi trường theo thời gian.
- AI Inspection gần nhất.
- Tồn kho.
- Vật tư dưới ngưỡng.
- Chi phí theo lô.
- Số lượng ban đầu, số lượng hiện tại và tỷ lệ sống.
- Sinh khối, mật độ và lượng thức ăn khuyến nghị/thực tế nếu có dữ liệu mẫu.
- Số lượng xuất bán.
- Doanh thu.
- Giá vốn, lợi nhuận gộp và ROI khi đã có đủ dữ liệu chi phí.

Xuất PDF được xem là chức năng mở rộng nếu thời gian triển khai cho phép, không phải yêu cầu bắt buộc của MVP.

---

# 12. KIẾN TRÚC LOGIC

```text
┌───────────────────────────────┐
│       Vue.js 3 + Vuetify     │
│ Responsive / Mobile Wrapper   │
└───────────────┬───────────────┘
                │ HTTPS / REST API
                ▼
┌───────────────────────────────┐
│         Node.js Backend       │
│                               │
│ Auth / RBAC                   │
│ Farm & Area                   │
│ Tank & Batch                  │
│ Technical Logs                │
│ Inventory                     │
│ Expense                       │
│ Customer & Sale               │
│ Alert                         │
│ AI Integration                │
└───────┬───────────┬───────────┘
        │           │
        ▼           ▼
┌─────────────┐  ┌────────────────┐
│ PostgreSQL  │  │   AI Service   │
│             │  │   Roboflow     │
└─────────────┘  └────────────────┘
        │
        ▼
┌────────────────┐
│ Media Storage  │
│ Original / AI  │
└────────────────┘
```

---

# 13. PHẠM VI MVP CHO 2 THÀNH VIÊN / 15 TUẦN

## 13.1. Bắt buộc hoàn thành

- Authentication.
- 4 role và RBAC.
- Trang trại.
- Khu vực và phân nhân viên theo khu vực.
- Invitation.
- Ao/bể.
- Lô giống.
- Tiếp nhận lô, nguồn cung cấp và số lượng chứng từ/thực tế.
- Kiểm tra chất lượng lô giống ở mức ghi nhận kết quả và tệp bằng chứng.
- Thông số môi trường.
- Cho ăn.
- Thay nước.
- Thuốc/chế phẩm.
- Prototype AI detection.
- Lịch sử AI.
- Danh mục vật tư.
- Nhập/xuất/sử dụng kho.
- Chi phí cơ bản.
- Khách hàng.
- Xuất bán.
- Công thức số lượng, tỷ lệ sống, sinh khối, doanh thu và giá vốn cơ bản.
- Cảnh báo cơ bản.
- Dashboard cơ bản.

## 13.2. Có thể giản lược

- Không cần workflow cảnh báo nhiều trạng thái.
- Không cần chat nội bộ.
- Không cần Sales Staff.
- Không cần Viewer.
- Không cần AI video realtime.
- Không bắt buộc đo kích thước thực tế nếu chưa hiệu chuẩn.
- Không bắt buộc `uniformity_score`.
- Không cần IoT sensor realtime trong MVP.
- Không cần kế toán chuyên sâu.
- Không cần quản lý đơn hàng phức tạp.
- Không bắt buộc xuất PDF.
- Không cần phát triển React Native riêng nếu sử dụng công cụ đóng gói/chuyển đổi Web App sang mobile.

---

# 14. OUT OF SCOPE

Các chức năng sau không thuộc phạm vi bắt buộc:

- Quản lý nhiều doanh nghiệp/trang trại độc lập theo SaaS.
- Quản lý tôm thương phẩm xuất khẩu.
- Logistics giao hàng.
- Thanh toán online.
- Hóa đơn điện tử.
- Kế toán đầy đủ.
- Quản lý nhà cung cấp chuyên sâu.
- Quản lý đầy đủ tôm bố mẹ, sinh sản, trứng, nauplius và ương ấu trùng.
- AI chẩn đoán bệnh có giá trị y khoa/thú y.
- Camera AI realtime 24/7.
- IoT sensor bắt buộc.
- React Native application riêng.
- Workflow phê duyệt nhiều cấp.
- Sales Staff riêng.
- Viewer riêng.

---

# 15. TIÊU CHÍ NGHIỆM THU MỨC HỆ THỐNG

Hệ thống được xem là đáp ứng phạm vi chính khi có thể trình diễn hoàn chỉnh quy trình:

```text
Owner tạo/quản lý trang trại
        ↓
Owner mời nhân viên
        ↓
Phân Area Manager / Technician / Warehouse Staff
        ↓
Tạo khu vực và ao/bể
        ↓
Tạo lô giống
        ↓
Technician ghi nhật ký chăm sóc
        ↓
Ghi thông số môi trường
        ↓
Lấy mẫu + tải ảnh
        ↓
AI phát hiện/đếm
        ↓
Lưu kết quả AI
        ↓
Kho ghi nhận vật tư
        ↓
Theo dõi chi phí
        ↓
Lô ready_for_sale
        ↓
Owner chọn khách hàng
        ↓
Xuất bán con giống
        ↓
Cập nhật sản lượng/doanh thu
        ↓
Dashboard + cảnh báo
```

Các actor phải chỉ truy cập được dữ liệu và chức năng đúng với role/phạm vi đã quy định.

---

# 16. TRACEABILITY GIỮA CHỨC NĂNG VÀ DATABASE

| Use Case | Bảng dữ liệu chính |
|---|---|
| UC01 Xác thực | `users` |
| UC02 Trang trại | `farms` |
| UC03 Thành viên & invitation | `users`, `farm_members`, `farm_invitations`, `areas` |
| UC04 Ao/bể | `ponds_tanks` |
| UC05 Lô giống | `seed_batches` |
| UC06 Môi trường | `water_parameter_logs` |
| UC07 Cho ăn | `feeding_logs`, `inventory_supplies`, `inventory_transactions` |
| UC08 Thay nước | `water_change_logs` |
| UC09 Thuốc/chế phẩm | `treatment_logs`, `inventory_supplies`, `inventory_transactions` |
| UC10–UC11 AI | `ai_inspections` |
| UC12–UC13 Kho | `inventory_supplies`, `inventory_transactions` |
| UC14 Chi phí | `expense_records` |
| UC15 Khách hàng | `customers` |
| UC16 Xuất bán | `seed_sales`, `customers`, `seed_batches` |
| UC17 Cảnh báo | `alerts_notifications` |
| UC18 Dashboard | Tổng hợp các bảng nghiệp vụ |
| FR19.1 Tiếp nhận lô | `seed_suppliers`, `seed_batches` |
| FR19.2 Kiểm tra chất lượng | `seed_quality_checks`, `seed_batches`, `users` |
| FR19.3 Ngưỡng môi trường | `environment_thresholds`, `water_parameter_logs` |
| FR19.4 Lấy mẫu tăng trưởng | `growth_sampling_logs`, `seed_batches`, `users` |
| FR19.5 Biến động số lượng | `batch_quantity_events`, `seed_batches`, `ponds_tanks`, `users` |
| FR20 Công thức/giá bán | `feed_guidelines`, `price_lists`, `expense_records`, `seed_sales` |

> Kiến trúc phân quyền đã chốt: role và trạng thái nằm trong `farm_members`; `areas` và `farm_invitations.area_id` đã có trong schema lõi. Khi triển khai nghiệp vụ, cần bổ sung `ponds_tanks.area_id` và bảo đảm mọi bảng dữ liệu có thể truy ra `farm_id`.

---

# 17. KẾT LUẬN PHẠM VI

SRS này chốt hệ thống theo hướng **quản lý hoạt động sản xuất con giống của nhiều trang trại trong cùng một tài khoản**, thay vì mở rộng thành một hệ thống ERP thủy sản.

Trọng tâm gồm bốn mảng:

1. **Quản lý sản xuất:** ao/bể, lô giống, môi trường và chăm sóc.
2. **AI:** kiểm tra mẫu tôm giống bằng hình ảnh.
3. **Vận hành:** kho vật tư, chi phí và cảnh báo.
4. **Đầu ra:** khách hàng và xuất bán con giống.

Cấu trúc này giữ được các yêu cầu cốt lõi của đề tài đồng thời giới hạn khối lượng triển khai ở mức phù hợp hơn với nhóm 2 thành viên trong 15 tuần.

## Nguồn tham chiếu kỹ thuật

- [QCVN 02-34-1:2021/BNNPTNT — Giống tôm nước lợ, tôm biển](https://vbpl.vn/FileData/TW/Lists/vbpq/Attachments/151252/VanBanGoc_14-2021-TT-0122021-QCtom-su.pdf): giai đoạn PL, tỷ lệ dị hình và danh mục bệnh cần kiểm soát.
- [FAO — Improving Penaeus monodon hatchery practices](https://www.fao.org/4/a1152e/a1152e00.htm): an toàn sinh học, SOP, đánh giá chất lượng PL, vận chuyển và ghi chép.
- [FAO — Shrimp culture: pond design, operation and management](https://www.fao.org/4/AC210E/AC210E08.htm): theo dõi nước, lấy mẫu tăng trưởng, điều chỉnh thức ăn và quản lý nước.
- [FAO — On-farm feeding and feed management in aquaculture](https://www.fao.org/fishery/docs/CDrom/T583/root/18.pdf): cơ sở điều chỉnh khẩu phần theo sinh khối, kích thước, tỷ lệ sống và điều kiện môi trường.

Các ngưỡng, protocol stress test và tỷ lệ cho ăn trong tài liệu cần được đối chiếu thêm với cán bộ kỹ thuật/điều kiện thực tế của trại trước khi dùng cho cảnh báo tự động.
