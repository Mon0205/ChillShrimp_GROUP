# Tổng hợp các điểm cần làm rõ — ChillShrimp

Ngày tổng hợp: **10/10/2026**.

## 1. Mục đích và cách sử dụng

Tài liệu phục vụ trao đổi với chủ trại, kỹ thuật viên, người quản lý kho và nhóm phát triển để chốt phạm vi, nghiệp vụ, dữ liệu và tiêu chí nghiệm thu. Nội dung tổng hợp từ tài liệu dự án, workflow hiện hành và các trao đổi về chi phí bố mẹ, sản xuất giống, thu–chi và doanh thu.

Đây là danh sách câu hỏi và khoảng trống cần xác nhận, không phải business rule đã được phê duyệt. Không mặc định một quy trình hoặc định mức áp dụng cho mọi trại; chưa có bộ chứng từ của trại để xác nhận các giả định. Các bảng mới được nêu dưới đây là nhu cầu thiết kế, chưa phải migration được duyệt.

Phân biệt ba loại vấn đề:

- **Cần khảo sát:** chưa có dữ liệu hoặc quyết định từ trại.
- **Cần thống nhất:** tài liệu, công thức hoặc phạm vi quyền còn mâu thuẫn/chưa rõ.
- **Khoảng cách triển khai:** đã mô tả yêu cầu nhưng code chưa hoàn tất; cần xác nhận phạm vi và tiêu chí trước khi triển khai.

Mức ưu tiên:

| Mức | Ý nghĩa |
| --- | --- |
| P0 | Phải chốt trước khi thiết kế chuỗi sản xuất, giá vốn và UC08; có thể làm thay đổi mô hình dữ liệu |
| P1 | Phải chốt trước khi dùng dữ liệu thật hoặc nghiệm thu workflow liên quan |
| P2 | Hoàn thiện vận hành, giao diện, báo cáo và khả năng mở rộng |

## 2. Hiện trạng và ranh giới dự án

Workflow đã mô tả trong code chủ yếu là: **tạo trại/khu vực → tiếp nhận lô vào bể → chăm sóc, lấy mẫu, kiểm định/AI → theo dõi kho và cảnh báo → kết thúc lô**. Theo [WORKFLOWS.md](../05-business-domain/WORKFLOWS.md), UC08 chưa có workflow đầy đủ; chuyển trạng thái lô sang `sold` chưa tạo giao dịch bán, doanh thu hay khoản thu tiền.

Schema hiện có thông tin dòng/tình trạng bố mẹ trên lô, nhưng chưa có đối tượng đàn bố mẹ và lần sinh sản riêng. Các bảng `expense_records`, `customers`, `price_lists`, `seed_sales` thuộc thiết kế tài liệu, chưa có model tương ứng trong Prisma ở lần đối chiếu này. Cần giữ rõ sự khác biệt giữa schema đích và schema đã triển khai.

| ID | Ưu tiên | Điểm cần làm rõ | Câu hỏi cần xác nhận / đầu ra cần chốt |
| --- | --- | --- | --- |
| SCOPE-01 | P0 | Mô hình trại | Trại tự nuôi bố mẹ và cho sinh sản, mua Nauplius về ương, mua PL để dưỡng, hay kết hợp? Chốt các điểm bắt đầu sản xuất được hỗ trợ. |
| SCOPE-02 | P0 | Phạm vi sản phẩm | Chỉ tôm thẻ/tôm sú hay gồm cua giống? Chốt loài, đơn vị bán và giai đoạn sản phẩm; code hiện tập trung hai loài tôm. |
| SCOPE-03 | P0 | Phạm vi đồ án | Quản lý vận hành và giá vốn hay cả thu–chi, công nợ, hóa đơn, kế toán? Chốt MVP và phần để giai đoạn sau. |
| SCOPE-04 | P1 | Người ghi dữ liệu | Ai ghi tại trại, ghi lúc phát sinh hay cuối ngày? Có nhân sự kế toán riêng không; nếu có thì ánh xạ quyền thế nào với bốn role hiện tại? |
| SCOPE-05 | P1 | Chuyển đổi dữ liệu cũ | Trại đang dùng sổ/Excel nào? Khi bắt đầu dùng hệ thống có nhập tồn giống, tồn kho, chi phí dở dang và công nợ đầu kỳ không? |

## 3. Tài khoản, phân quyền và nhiều trại — UC01–UC03

Tham chiếu các vấn đề AUTH-01–03 trong [01-AUTH-MULTI-FARM-INVITATION.md](./01-AUTH-MULTI-FARM-INVITATION.md).

| ID | Ưu tiên | Điểm cần làm rõ | Câu hỏi / dữ liệu cần chốt |
| --- | --- | --- | --- |
| AUTH-01 | P1 | Multi-farm | Yêu cầu cho phép role khác nhau theo farm nhưng migration legacy giới hạn non-Owner. Xác nhận phạm vi cần triển khai; không coi đây là mô hình đã hoạt động đầy đủ. |
| AUTH-02 | P1 | Lời mời user hiện hữu | Chốt cách đăng nhập đúng tài khoản để nhận thêm membership; xử lý trùng lời mời, hết hạn, thu hồi và thử lại. |
| AUTH-03 | P1 | Quyền quản lý nhân viên | USECASE giao quyền mời cho Owner, code còn cho Area Manager mời/sửa Technician. Chốt ma trận tạo, sửa, đình chỉ và gán khu vực. |
| AUTH-04 | P1 | Ownership | Một farm có nhiều Owner không? Ai chuyển quyền khi người tạo rời trại? Không dùng người tạo làm căn cứ thay thế membership. |
| AUTH-05 | P1 | Danh tính và dữ liệu lịch sử | Xóa user vật lý hay đình chỉ? Bảo toàn người ghi nhật ký và chứng từ thế nào? Cần xử lý quan hệ cascade từ người tạo tới farm. |
| AUTH-06 | P1 | Provisioning thất bại | Neon Auth thành công nhưng Prisma thất bại thì ai khôi phục? Chốt thử lại an toàn, đối soát và log hỗ trợ. |
| AUTH-07 | P2 | Phiên và thay đổi quyền | Chốt hết hạn phiên, thu hồi sau đổi mật khẩu/đình chỉ; hành vi khi user đang thao tác và bị đổi khu vực/quyền. |

## 4. Trang trại, khu vực và bể — UC04

| ID | Ưu tiên | Điểm cần làm rõ | Câu hỏi / dữ liệu cần chốt |
| --- | --- | --- | --- |
| FARM-01 | P1 | Đóng/lưu trữ trại | Ngoài nhân sự và bể, có phải chặn khi còn giống, kho, yêu cầu cấp, khoản nợ hoặc giao dịch chưa hoàn tất? Chốt checklist đóng và khôi phục. |
| AREA-01 | P1 | Khu vực bắt buộc | Mọi bể có thuộc một khu vực không? Bể không có khu vực ai chăm sóc và chi phí được báo cáo ở đâu? |
| AREA-02 | P1 | Lịch sử khu vực | Có được xóa khu vực từng vận hành hoặc đổi khu vực của bể đang nuôi? Báo cáo cũ theo khu vực tại thời điểm phát sinh hay theo vị trí hiện tại? |
| POND-01 | P1 | Vai trò bể | Cần phân loại bể bố mẹ, sinh sản, ấp, ương, dưỡng, xử lý nước không? Chốt loại bể và điều kiện tiếp nhận lô. |
| POND-02 | P1 | Thể tích | Phân biệt dung tích thiết kế với thể tích nước thực tế theo ngày; chốt nguồn số đo phục vụ mật độ, thuốc và lấy mẫu. |
| POND-03 | P1 | Vòng đời | Chốt luồng sau bán hết/thất bại: cleaning hay empty? Ai xác nhận vệ sinh và được thả lô mới? |
| POND-04 | P1 | Dừng/xóa bể đang nuôi | Chốt trường hợp dừng khẩn cấp và xử lý giống còn lại. Phải chặn việc làm mất khả năng truy cập lô đang nuôi khi chuyển inactive/xóa mềm. |
| POND-05 | P2 | Mã và khôi phục | Mã bể xóa mềm có tái sử dụng không? Khôi phục khi khu vực đã inactive hoặc mã trùng thế nào? |

## 5. Bố mẹ, sinh sản và nguồn gốc lô — phần cần khảo sát bổ sung

Đây là phần thiếu để trả lời câu hỏi: **“10 tôm mẹ tạo ra bao nhiêu con, tiêu bao nhiêu thức ăn và giá vốn đầu ra là bao nhiêu?”** Không suy số con chỉ từ số mẹ; cần kết quả sinh sản thực tế.

| ID | Ưu tiên | Điểm cần làm rõ | Dữ liệu thực tế / quyết định cần có |
| --- | --- | --- | --- |
| BROOD-01 | P0 | Đối tượng bố mẹ | Quản lý từng cá thể hay cả đàn? Mã, số đực/cái, nguồn, ngày nhập, trọng lượng, dòng, chứng nhận, giá mua và vận chuyển. |
| BROOD-02 | P0 | Nuôi bố mẹ | Ngày chăm sóc, thức ăn, lượng thực dùng, thuốc, chết/loại thải, thời gian nuôi tới sinh sản; đối tượng nhận chi phí. |
| BROOD-03 | P0 | Lần sinh sản | Mã đợt, ngày, mẹ/đàn nguồn, số trứng, số nở/Nauplius thu, cách đếm, người xác nhận và lô con đầu ra. |
| BROOD-04 | P0 | Phân bổ qua nhiều đợt | Giá nhập và chi phí nuôi bố mẹ tính cho một đợt hay nhiều đợt? Theo sản lượng, số đợt, thời gian hay cách trại đang dùng? |
| BROOD-05 | P1 | Đợt không có sản lượng | Bố mẹ không đẻ, tỷ lệ nở thấp, chết hoặc loại thải: giữ chi phí ở đâu, ghi nhận tổn thất hay phân bổ tiếp? |
| TRACE-01 | P0 | Lô con và nguồn | Một đợt sinh sản tạo nhiều lô? Một lô có nhận từ nhiều mẹ/đợt/nhà cung cấp? Chốt quan hệ và cách truy nguồn. |
| TRACE-02 | P1 | Mua giống đầu vào | Với Nauplius/PL mua ngoài: ngày, giai đoạn, số chứng từ, số nhận thực tế, đơn giá, phí và hao hụt vận chuyển. |

## 6. Lô giống, số lượng và giai đoạn — UC05

| ID | Ưu tiên | Điểm cần làm rõ | Câu hỏi / dữ liệu cần chốt |
| --- | --- | --- | --- |
| BATCH-01 | P0 | Định nghĩa một lô | Lô theo đợt sinh sản, nguồn, ngày thả hay bể? Mã duy nhất toàn hệ thống hay trong farm? |
| BATCH-02 | P0 | Chia/gộp | Trại có chia một lô sang nhiều bể, gộp nhiều nguồn hoặc nuôi nhiều lô chung bể không? Hiện chỉ chuyển toàn bộ lô; cần xác nhận có mở rộng không. |
| BATCH-03 | P0 | Lịch sử giai đoạn | Chốt Nauplius/Zoea/Mysis/PL và cách xác nhận chuyển giai đoạn; lưu ngày, số đầu/cuối, người xác nhận. Một trường developmentStage hiện tại không đủ cho báo cáo lịch sử. |
| BATCH-04 | P0 | Số lượng chuẩn | Tách số chứng từ, số nhận/thả, số đang sống ước tính, số đạt chất lượng, số bán, số loại và tồn cuối; nguồn nào là số chính thức? |
| BATCH-05 | P1 | Kiểm kê và hao hụt | Chết đếm trực tiếp hay suy từ lấy mẫu? Sai lệch đếm là adjustment hay mortality? Ai duyệt và có được ghi hồi tố? |
| BATCH-06 | P1 | Tỷ lệ sống | Bán/chuyển/loại không phải chết. Chốt công thức theo toàn lô/giai đoạn và cách tránh tính giống đã bán thành hao hụt. |
| BATCH-07 | P1 | Kết thúc | Điều kiện ready_for_sale, sold, failed, cancelled; chốt lượng cuối, lý do, hồ sơ bán và trạng thái bể. Không coi sold thủ công là doanh thu. |
| BATCH-08 | P1 | Nhật ký và vị trí lịch sử | Cho ăn/thuốc hiện gắn bể; khi đổi lô trong cùng bể hoặc chuyển lô, cần liên kết/snapshot gì để quy chi phí đúng lô? |
| BATCH-09 | P1 | Sửa và hồi tố | Có sửa/xóa nhật ký, nhập bù ngày trước hoặc sửa lô đã kết thúc không? Chốt phê duyệt, audit và ảnh hưởng báo cáo đã chốt. |

## 7. Cho ăn, môi trường và chất lượng — UC05

| ID | Ưu tiên | Điểm cần làm rõ | Câu hỏi / dữ liệu cần chốt |
| --- | --- | --- | --- |
| FEED-01 | P0 | Định mức từng giai đoạn | Loài, giai đoạn, thức ăn, cữ/ngày, cơ sở tính theo 1.000 con/sinh khối/thể tích; đơn vị và người duyệt. Không dùng một định mức chung cho cả chu kỳ. |
| FEED-02 | P1 | Thức ăn sống và tự sản xuất | Trại dùng tảo, Artemia, thức ăn tươi không? Mua hay tự nuôi; cách quy lượng và tính chi phí sản xuất nội bộ. |
| FEED-03 | P1 | Khuyến nghị và thực tế | Lấy số lượng/sinh khối nào tại thời điểm cho ăn? Khi thiếu định mức có nhập tay không? Giá vốn dùng thực tế, định mức dùng đối chiếu. |
| ENV-01 | P1 | Ngưỡng vận hành | Nguồn tham chiếu, loài/giai đoạn/loại bể, đơn vị, warning/critical, ngày hiệu lực, người duyệt; không mặc định tham khảo là quy chuẩn bắt buộc. |
| ENV-02 | P1 | Đo và thay nước | Lịch đo, thiết bị/hiệu chuẩn, độ chính xác, thể tích trước/sau, nước đầu vào, phần trăm thay và người ghi. IoT thuộc MVP hay tương lai? |
| QUALITY-01 | P1 | Điều kiện xuất bán | Bộ kiểm tra bắt buộc, PCR/chứng nhận có hạn không, người duyệt, xử lý lô không đạt và quyền ngoại lệ. |
| QUALITY-02 | P1 | Test và phương pháp | Phân biệt tỷ lệ sống của mẫu stress test với tỷ lệ sống sản xuất; lưu protocol, cỡ mẫu, kết quả, ngày và bằng chứng. |

## 8. Lấy mẫu và AI — UC06

| ID | Ưu tiên | Điểm cần làm rõ | Câu hỏi / dữ liệu cần chốt |
| --- | --- | --- | --- |
| AI-01 | P0 | Mục tiêu AI | Chỉ đếm mẫu hay cả kích thước/đồng đều/ước lượng toàn bể? Hiện lưu số đếm và ảnh; không mặc định các trường schema đều có thuật toán hoạt động. |
| AI-02 | P0 | Ngoại suy toàn bể | Thể tích mẫu, thể tích nước thật, vị trí/số mẫu, độ đại diện, cách tổng hợp và sai số; số đếm ảnh không tự động là tổng giống trong bể. |
| AI-03 | P1 | Hiệu chỉnh | Ai xác nhận manualCount, correctionFactor? Kết quả AI được cập nhật số lượng lô tự động hay chỉ làm bằng chứng cho adjustment được duyệt? |
| AI-04 | P1 | Dữ liệu và nghiệm thu model | Loài/giai đoạn, ảnh điều kiện trại, nhãn chuẩn, ảnh kiểm thử tách biệt, chỉ số sai số đếm và ngưỡng chấp nhận do trại xác nhận. |
| AI-05 | P1 | Phục hồi tác vụ | Chốt timeout, tác vụ processing sau restart, thử lại, chống tạo bản ghi/kết quả trùng, quyền xem lỗi. |
| AI-06 | P1 | Công suất và ảnh | Số yêu cầu đồng thời, thời gian đáp ứng, CPU/GPU, giới hạn ảnh, thời gian lưu và quyền truy cập ảnh Cloudinary. |

## 9. Kho vật tư — UC07

| ID | Ưu tiên | Điểm cần làm rõ | Câu hỏi / dữ liệu cần chốt |
| --- | --- | --- | --- |
| STOCK-01 | P0 | Giá xuất kho | Khi nhập nhiều giá, dùng bình quân, FIFO hay phương pháp trại đang áp dụng? Hiện đơn giá danh mục được cập nhật khi nhập; không mặc định đó là giá vốn đã được chốt. |
| STOCK-02 | P1 | Đơn vị và lô vật tư | Bao/kg/g/ml, hệ số quy đổi, hạn dùng, lô nhập, nhà cung cấp, chứng từ và tồn đầu kỳ. |
| STOCK-03 | P1 | Request tới cấp phát | Ai duyệt, cho phép cấp một phần/từ chối/hủy không? Request fulfilled khi cấp hay khi sử dụng? Code hiện mới tạo/xem pending. |
| STOCK-04 | P1 | Cấp và tiêu hao | Cấp khỏi kho trung tâm là chuyển vào kho khu vực hay tiêu hao ngay? Nếu cấp và sử dụng đều trừ cùng kho sẽ bị tính hai lần. |
| STOCK-05 | P1 | Đối soát tiêu hao | Ghi usage riêng và nhật ký cho ăn/thuốc có cùng một lần dùng không? Chốt liên kết, chống trừ kho/tính chi phí hai lần. |
| STOCK-06 | P1 | Trả và kiểm kê | Vật tư thừa, hỏng, hết hạn, mất và lệch kiểm kê xử lý thế nào? Ai duyệt adjustment, lý do/chứng từ nào bắt buộc? |

## 10. Chi phí, giá vốn, bán giống và thu–chi — UC08

UC08 hiện có sáu use case về chi phí, khách hàng, xuất bán và doanh thu. Thu–chi tiền/công nợ và quản lý bố mẹ chưa được đặc tả đầy đủ. Các nội dung sau cần chốt trước khi mở rộng schema.

| ID | Ưu tiên | Điểm cần làm rõ | Câu hỏi / dữ liệu cần chốt |
| --- | --- | --- | --- |
| COST-01 | P0 | Phạm vi chi phí | Bố mẹ/giống mua, thức ăn, thuốc, điện, nước, nhân công, xét nghiệm, vận chuyển, khấu hao có thuộc giá vốn không? Ai xác nhận khoản nào là chi phí lô/kỳ? |
| COST-02 | P0 | Phân bổ chi phí chung | Kỳ phân bổ, lô tham gia, cơ sở days/volume/quantity/biomass/actual_usage, tử/mẫu số và người duyệt; lưu kết quả để tái lập. |
| COST-03 | P0 | Chống cộng trùng | Chi phí lấy từ inventory_transactions không được cộng lại cùng khoản ở expense_records. Chốt nguồn duy nhất và liên kết chứng từ. |
| COST-04 | P0 | Giá vốn/con | Mẫu số là số đạt điều kiện bán nào, tại thời điểm nào? Giá vốn tạm tính và cuối kỳ khác nhau thế nào; xử lý chia cho 0 và lô thất bại. |
| COST-05 | P0 | Bán từng phần | Phân bổ giá vốn cho lượng bán và tồn còn lại; chi phí phát sinh sau lần bán đầu xử lý ra sao? Không trừ toàn bộ chi phí lô vào lần bán đầu. |
| COST-06 | P1 | Khóa sổ và thay đổi | Chốt kỳ/ngày đóng, quyền mở lại, sửa khoản đã phân bổ, bổ sung chứng từ muộn và lưu phiên bản báo cáo. |
| SALE-01 | P0 | Điều kiện giao dịch | Lô bắt buộc ready_for_sale như đặc tả chi tiết hay active cũng được bán? Cùng farm, chất lượng, số lượng và người xác nhận. |
| SALE-02 | P0 | Cấu trúc đơn bán | Một lần giao có nhiều lô, một lô giao nhiều lần không? Thiết kế seed_sales hiện một dòng gắn một lô và một khách; có cần đơn và dòng chi tiết? |
| SALE-03 | P1 | Bảng giá | Ai tạo/sửa/duyệt; trùng thời hạn thì chọn giá nào; cho nhập tay và bán dưới giá sàn không? Cần use case quản lý price_lists. |
| SALE-04 | P1 | Snapshot và làm tròn | Tiền tệ, đơn giá/1.000 con, phụ phí đơn vị/giao dịch, chiết khấu, số lẻ và làm tròn; lưu giá thực dùng tại thời điểm bán. |
| SALE-05 | P1 | Số giao thực tế | Cách kiểm đếm khi đóng túi, lượng bù giống, hao hụt giao hàng, khách nhận thiếu; số trừ lô có khớp số tính tiền không? |
| SALE-06 | P1 | Hủy/đổi/trả | Hủy trước/sau giao, trả giống, hoàn tiền, sửa giá và phục hồi số lượng thế nào? Chốt chứng từ điều chỉnh và audit. |
| CUSTOMER-01 | P1 | Hồ sơ khách | Loại khách, liên hệ, trùng số điện thoại, tìm kiếm; xóa khách đã có lịch sử hay vô hiệu hóa? |
| CASH-01 | P0 | Thu tiền | Đặt cọc, trả đủ, trả nhiều lần, công nợ; liên kết khoản thu với đơn/giao dịch nào, ngày và phương thức. |
| CASH-02 | P0 | Chi tiền | Mua chịu, trả nhiều lần, ứng tiền; phân biệt nhập hàng/ghi chi phí với thực trả tiền. Cần đối tượng nhận và liên kết chứng từ. |
| CASH-03 | P1 | Phạm vi thuế/hóa đơn | Trại có yêu cầu thuế, hóa đơn hoặc tích hợp kế toán không? Chốt phạm vi với người phụ trách kế toán, không tự suy quy tắc pháp lý. |
| REPORT-01 | P0 | Chỉ tiêu tài chính | Tách doanh thu, giá vốn, lợi nhuận gộp, chi phí kỳ, thực thu, thực chi, công nợ và tồn dở dang; mỗi chỉ tiêu có công thức/nguồn/ngày ghi nhận. |

### Công thức cần thống nhất

```text
Tổng giá vốn lô = Chi phí trực tiếp + Chi phí bố mẹ phân bổ + Chi phí chung phân bổ
Giá vốn/con = Tổng giá vốn lô / Số con có thể bán theo quy tắc đã chốt

Đơn giá/1.000 con = Giá cơ sở + Phụ phí chất lượng + Phụ phí chứng nhận
Doanh thu giao dịch = Số con tính tiền / 1.000 × Đơn giá/1.000 con
                    + Phí vận chuyển − Chiết khấu

Lợi nhuận gộp = Doanh thu − Giá vốn phần đã bán
Tiền thực thu/chi = Tổng phiếu thu/chi hợp lệ theo kỳ
```

Đây là khung quản trị đề xuất, chưa phải chính sách kế toán đã chốt. Phải tránh tính hai lần điện/nước/nhân công vừa ở chi phí trực tiếp vừa ở chi phí chung phân bổ. Không dùng `chi phí − giá bán` làm công thức lợi nhuận. Doanh thu không đồng nghĩa đã thu tiền; mua vật tư không đồng nghĩa đã trả tiền hoặc đã tiêu hao toàn bộ vật tư.

## 11. Báo cáo và cảnh báo — UC09

| ID | Ưu tiên | Điểm cần làm rõ | Câu hỏi / dữ liệu cần chốt |
| --- | --- | --- | --- |
| ALERT-01 | P1 | Cách sinh cảnh báo | USECASE nói cron/job, workflow hiện sinh môi trường khi ghi log. Chốt đồng bộ khi nhập, định kỳ hay cả hai; cảnh báo dữ liệu cũ/thiếu log có cần không? |
| ALERT-02 | P1 | Khắc phục | Đã đọc không phải đã xử lý. Ai nhận, hạn xử lý, ghi hành động, xác nhận resolved và nhắc lại? |
| ALERT-03 | P1 | Kho và AI | Chốt điều kiện tạo notification, chống lặp, lịch sử và kênh gửi; hiện cảnh báo kho là flag/filter, chưa phải workflow notification đầy đủ. |
| DASH-01 | P1 | Phạm vi báo cáo | Owner toàn trại; nhân viên theo khu vực; có xem đơn giá/chi phí/doanh thu nhạy cảm không? |
| DASH-02 | P1 | Lịch sử và thời gian | Múi giờ, ngày vận hành, lọc ngày cuối, dữ liệu hồi tố và chuyển khu vực/lô; tránh dùng vị trí hiện tại thay lịch sử. |
| DASH-03 | P2 | Đầu ra | Chốt mẫu báo cáo ngày/lô/tháng, Excel/PDF, đơn vị và đối soát với sổ trại; ROI/lợi nhuận chỉ hiển thị khi đủ dữ liệu. |
| DASH-04 | P1 | Công thức và mức tổng hợp | Với từng KPI, chốt dữ liệu nguồn, tổng/trung bình/min/max, đơn vị/làm tròn, truy về bản ghi và xử lý chưa đủ dữ liệu; không biến thiếu số đo thành 0. |
| DASH-05 | P1 | Mốc báo cáo | Tồn hiện tại hay tại ngày chọn; theo ngày phát sinh/giao/thu; giữ snapshot báo cáo đã chốt hay tính lại khi nhập bù; phân biệt số liệu tạm tính và đã xác nhận. |

Câu hỏi làm rõ đã đặt tại kế toán Q18–Q21, Q26, Q35–Q38; kỹ thuật KT20–KT25, KT33–KT35; kho KHO22–KHO30. Các gợi mở về kỳ, nguồn, truy chi tiết và dữ liệu thiếu được bổ sung trong từng bộ. Mã chính thức của Dashboard là UC09.1; báo cáo chi phí/doanh thu vẫn thuộc UC08.1, UC08.3 và UC08.6. Việc bổ sung câu hỏi không đồng nghĩa các KPI/công thức đã được phê duyệt hoặc triển khai.

## 12. Toàn vẹn dữ liệu, vận hành và nghiệm thu

| ID | Ưu tiên | Điểm cần làm rõ | Quyết định / kiểm chứng cần có |
| --- | --- | --- | --- |
| DB-01 | P1 | Tenant và quan hệ | Ràng buộc area/farm, bể/lô, khách/bán cùng farm; quyết định constraint bên DB ngoài validation API. |
| DB-02 | P1 | Giao dịch đồng thời | Bán/chuyển/tiêu hao/archive có thể chạy cùng lúc; khóa và transaction phải giữ số lượng, tồn kho và phạm vi hợp lệ. |
| DB-03 | P1 | Audit và xóa | Danh mục nào xóa được, chứng từ nào chỉ đảo/điều chỉnh? Lưu người, thời gian, lý do và giá trị trước/sau. |
| OPS-01 | P1 | Triển khai và sao lưu | Môi trường demo/staging/production, người giữ secret, sao lưu Neon và ảnh, phục hồi, giám sát dịch vụ ngoài và downtime. |
| OPS-02 | P2 | Điều kiện tại trại | Điện thoại/máy tính, mạng yếu, nhập offline cần không; upload thất bại, thao tác ghi trùng và thử lại an toàn. |
| API-01 | P2 | Quy ước API/UI | Payload rỗng, validation, mã lỗi/field ổn định, lỗi tải so với rỗng, quyền và chuyển trạng thái hiển thị đúng. |
| TEST-01 | P1 | Bằng chứng nghiệm thu | Có unit/integration test trong src; cảnh báo cũ “chưa có unit test” cần cập nhật. Chốt coverage nghiệp vụ, test E2E và dữ liệu thực; test pass không chứng minh workflow trại đúng. |
| TEST-02 | P1 | Tiêu chí chấp nhận | Bộ dữ liệu hai farm/khu vực, bốn role, quyền chéo, bán một phần, nhiều giá nhập, sửa hồi tố, restart AI và đối soát số tiền/số con. |
| DOC-01 | P1 | Đồng bộ đặc tả | Chốt nguồn chuẩn giữa USECASE/SRS/DATABASE/drawio/code; cập nhật actor Technician ở UC05.2 đang khác bảng chức năng, bảng supply_requests đã có code nhưng tài liệu còn ghi chưa có. |

## 13. Bộ dữ liệu thực tế cần xin từ trại

Ưu tiên **một chu kỳ hoàn chỉnh** có ngày, mã lô và chứng từ liên kết; bổ sung một trường hợp thất bại/bán nhiều lần nếu chu kỳ mẫu không có. Có thể ẩn danh người và khách hàng nhưng phải giữ quan hệ để đối soát.

| Bộ dữ liệu | Tối thiểu cần thu thập | Mục đích |
| --- | --- | --- |
| Danh mục và nhân sự | Loài, khu vực/bể, vai trò, đơn vị vật tư | Chốt phạm vi và quyền |
| Bố mẹ/giống mua | Phiếu nhập, số lượng, giá, phí, ngày và nguồn | Chi phí đầu vào |
| Sinh sản | Đàn nguồn, từng lần sinh sản, số trứng/nở/con nhận | Truy nguồn và phân bổ |
| Giai đoạn và số lượng | Ngày chuyển giai đoạn, chết, chia/chuyển, lấy mẫu, số đạt bán | Sản lượng và tỷ lệ sống |
| Nhật ký chăm sóc | Thức ăn, thuốc, lượng thực tế, bể/lô, ngày | Chi phí trực tiếp và định mức |
| Kho | Tồn đầu, phiếu nhập nhiều giá, xuất, cấp, trả, kiểm kê | Giá xuất và đối soát tiêu hao |
| Chi phí chung | Điện, nước, nhân công và cách phân bổ đang dùng | Giá vốn |
| Chất lượng và AI | Phiếu test, tiêu chí bán, ảnh mẫu và số đếm người xác nhận | Điều kiện bán và nghiệm thu model |
| Bán/giao | Khách, lô, lượng giao/bù, giá, phí, chiết khấu | Doanh thu và tồn giống |
| Thu–chi | Đặt cọc, thu nhiều lần, chi trả, số dư công nợ | Dòng tiền |
| Báo cáo hiện dùng | Excel/sổ tính giá vốn và lãi lỗ cùng chu kỳ | Kiểm chứng kết quả hệ thống |

Không tự điền giá nhập, tỷ lệ nở, định mức ăn, tỷ lệ sống hoặc biên lợi nhuận bằng số giả định rồi trình bày như dữ liệu của trại.

## 14. Thứ tự làm rõ và mẫu ghi quyết định

1. **Phạm vi:** mô hình trại, loài, bắt đầu từ bố mẹ hay giống mua, phần thuộc MVP.
2. **Sản xuất:** định nghĩa lô, lần sinh sản, giai đoạn, chia/gộp, số lượng và truy nguồn.
3. **Chi phí:** giá vật tư, chi phí bố mẹ, phân bổ, giá vốn/con và bán từng phần.
4. **Bán và tiền:** điều kiện bán, đơn/giao, đặt cọc, thu/chi, công nợ và điều chỉnh.
5. **Vận hành:** quyền, đóng bể/lô/trại, chất lượng, AI và cảnh báo.
6. **Thiết kế/nghiệm thu:** cập nhật đồng bộ tài liệu, schema đích, migration mới và test với chu kỳ thực tế.

Mỗi mục chỉ đóng khi có quyết định rõ và bằng chứng/mẫu dữ liệu phù hợp. Trạng thái nghiệp vụ và triển khai cần theo dõi riêng.

| ID tham chiếu | Trạng thái nghiệp vụ | Quyết định/công thức | Bằng chứng/mẫu dữ liệu | Người xác nhận | Ngày | Tài liệu/bảng/API bị ảnh hưởng | Trạng thái triển khai |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Điền ID ở trên | Chờ khảo sát / Chờ chốt / Đã chốt / Ngoài MVP | Điền sau xác nhận | Link/chứng từ | Chưa chỉ định | — | Ghi rõ cần migration không | Chưa làm / Đang làm / Đã kiểm chứng |

## 15. Nguồn đối chiếu

- [USECASE.md](../04-use-cases/USECASE.md) và [USECASE-SPECIFICATION.md](../04-use-cases/USECASE-SPECIFICATION.md): yêu cầu và actor.
- [DATABASE.md](../03-database/DATABASE.md), [ERD.md](../03-database/ERD.md), [DATABASE-CLASS-V4.drawio](../03-database/DATABASE-CLASS-V4.drawio): thiết kế dữ liệu đích.
- [WORKFLOWS.md](../05-business-domain/WORKFLOWS.md): trạng thái workflow đã đối chiếu code.
- [Tài liệu nghiệp vụ tham khảo](../05-business-domain/tong_hop_quy_chuan_va_quan_ly_trai_tom-v2.md): công thức và hướng quy trình; không thay thế khảo sát trại.
- [Schema Prisma](../../BE/prisma/schema.prisma), [routes](../../BE/src/routes), [controllers](../../BE/src/controllers): hiện thực; chưa có xác minh dữ liệu production trong lần tổng hợp này.
- Các cảnh báo [01](./01-AUTH-MULTI-FARM-INVITATION.md), [02](./02-DATABASE-DATA-INTEGRITY.md), [03](./03-FARM-AREA-LIFECYCLE.md), [04](./04-POND-TANK-BUSINESS-RULES.md), [05](./05-TESTING-ERROR-HANDLING.md): vấn đề đã ghi nhận; một số mô tả cũ cần tái đối chiếu trước khi coi là hiện trạng.
