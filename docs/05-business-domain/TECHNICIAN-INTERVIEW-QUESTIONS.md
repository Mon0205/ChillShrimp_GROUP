# Gợi ý trò chuyện với kỹ thuật viên trại tôm giống

Nguồn: [Checklist cần làm rõ dự án](../Warning/06-PROJECT-CLARIFICATION-CHECKLIST.md). Tài liệu bổ sung cho [bộ câu hỏi kế toán](./ACCOUNTANT-INTERVIEW-QUESTIONS.md), tập trung vào UC05, UC06 và phần kỹ thuật liên quan kho/xuất bán.

## 1. Mục tiêu và cách trao đổi

Làm rõ cách trại ghi nhật ký, chuyển giai đoạn, kiểm đếm, xử lý hao hụt và xác nhận giống đủ điều kiện bán. Hỏi cách đang làm, xin mẫu sổ và lần theo một lô thật trước khi đề xuất cách nhập trên phần mềm.

Mỗi câu gồm một câu chính và gợi mở. Chỉ hỏi gợi mở nếu chưa được giải thích. Không mặc định trại có AI, cảm biến, một loại định mức hay một tiêu chuẩn chất lượng chung. Chưa theo dõi thì ghi rõ; nội dung ngoài thẩm quyền kỹ thuật viên cần chủ trại/quản lý xác nhận.

Có thể mở đầu như sau (đổi anh/chị thành cô/chú/bác theo cách xưng hô quen):

> Em đang làm phần mềm quản lý trại tôm cho đồ án, muốn hiểu cách bên mình làm hằng ngày để làm cho sát. Anh/chị kể giúp em một lứa gần đây, từ lúc nhận giống đến khi bán được không? Mình cứ nói chuyện theo cách đang làm thôi, chỗ nào em chưa hiểu em hỏi thêm nhé.

Hỏi thêm để biết bối cảnh: “Anh/chị thường lo công đoạn nào?”, “Bên mình tự cho bố mẹ đẻ hay mua giống về ương?”, “Một ngày làm việc của anh/chị thường bắt đầu từ việc gì?”. Không cần đi theo thứ tự câu nếu câu chuyện đã chuyển sang chủ đề khác.

Các gạch đầu dòng dưới đây là ghi chú cho người hỏi. Sau khi nghe kể, chọn một ý để hỏi tiếp, chẳng hạn: “Lúc đó mình ghi lại ở đâu?”, “Anh/chị nhớ một lần cụ thể không?”, “Nếu tiện, cho em xem một trang sổ để dễ hình dung nhé”. Không đọc cả danh sách như kiểm tra quy trình.

| Nhóm | Câu | ID checklist |
| --- | --- | --- |
| Định nghĩa lô và nguồn giống | KT01–KT04 | SCOPE-01–02, BROOD-03, TRACE-01–02, BATCH-01–02 |
| Nhật ký và chăm sóc | KT05–KT13 | BATCH-08–09, FEED-01–03, ENV-01–02, STOCK-04–05 |
| Giai đoạn và chuyển bể | KT14–KT17 | BATCH-02–03, POND-02–04 |
| Kiểm đếm và lấy mẫu | KT18–KT23 | BATCH-04–05, AI-01–04 |
| Hao hụt, xác định bệnh và xử lý bất thường | KT24–KT27, gồm KT26a | BATCH-05–07, QUALITY-02, ALERT-01–02 |
| Điều kiện bán và giao giống | KT28–KT32 | QUALITY-01–02, SALE-01, SALE-05–06 |
| Bàn giao dữ liệu và nghiệm thu | KT33–KT35 | SCOPE-04, DASH-01–03, OPS-02, TEST-02 |

Nếu thời gian hạn chế, ưu tiên KT01, KT05–KT07, KT14, KT18–KT20, KT24–KT25, KT28–KT30 và KT33. Bỏ qua câu điều kiện không có tại trại, nhưng ghi rõ lý do.

## 2. Định nghĩa lô và nguồn giống

**KT01. Bên mình thường gọi một lứa hay một lô giống là thế nào vậy anh/chị?**

**Mục đích hỏi:** Chốt định nghĩa lô, cách đặt mã và quan hệ lô–bể để phần mềm theo dõi đúng đối tượng sản xuất.

- Theo nguồn, ngày thả, lần sinh sản hay bể? Dùng mã gì; ai đặt mã?
- Một lô ở nhiều bể hoặc nhiều lô trong cùng bể có xảy ra không?

**KT02. Anh/chị kể giúp em một lần nhận giống về trại thường làm những gì nhé?**

**Mục đích hỏi:** Xác định các bước tiếp nhận, thông tin nguồn, số thực nhận và người xác nhận thiếu hoặc không đạt chất lượng.

- Loài, giai đoạn, nguồn, ngày, số chứng từ, số nhận, tình trạng vận chuyển và hồ sơ chất lượng.
- Ai xác nhận thiếu/hao hụt; giống không đạt được từ chối hay xử lý thế nào?

**KT03. Nếu bên mình tự cho bố mẹ đẻ, mình nhớ và ghi lại con giống từ đợt bố mẹ nào bằng cách nào?**

**Mục đích hỏi:** Chốt dữ liệu truy nguồn từ bố mẹ, lần sinh sản đến lô con; cung cấp sản lượng xác nhận để kế toán phân bổ chi phí.

- Ghi ngày, mẹ/đàn nguồn, số trứng, số nở và số con thu bằng cách nào?
- Một lần tạo nhiều lô hoặc một lô nhận nhiều nguồn không? Xin mẫu sổ và người xác nhận.

**KT04. Trước khi thả một lứa mới, anh/chị thường chuẩn bị và xem những gì?**

**Mục đích hỏi:** Xác định điều kiện bể được phép thả, thể tích nước thực tế và số lượng bắt đầu của lô.

- Bể đã vệ sinh, nguồn nước, thể tích thực tế, thuần hóa và mật độ được ghi ở đâu?
- Ai cho phép thả, và số lượng ban đầu là số nhận hay số thực thả?

**Mẫu cần xin:** hồ sơ một lô, phiếu tiếp nhận, sổ sinh sản nếu có và phiếu chuẩn bị/thả bể.

## 3. Nhật ký và chăm sóc

**KT05. Những việc chăm sóc trong ngày, anh/chị thường ghi lại như thế nào?**

**Mục đích hỏi:** Biết những loại nhật ký đang dùng và các trường bắt buộc để thiết kế biểu mẫu sát công việc hằng ngày.

- Cho ăn, môi trường, thay nước, thuốc/chế phẩm, hao hụt, lấy mẫu, sinh sản hoặc vệ sinh.
- Xin xem một trang ghi thực tế; thông tin nào bắt buộc và thông tin nào chỉ ghi khi bất thường?

**KT06. Nhìn lại sổ, mình biết việc đó làm cho bể hay lứa nào bằng cách nào?**

**Mục đích hỏi:** Chốt cách liên kết nhật ký với đúng lô, bể, giai đoạn và thời điểm, giữ lịch sử khi bể đổi lô hoặc lô chuyển bể.

- Ghi thời điểm thực hiện, người làm, giai đoạn và ca thế nào?
- Bể đổi lô hoặc lô chuyển bể thì làm sao biết nhật ký thuộc đúng lô tại thời điểm đó?

**KT07. Sổ hằng ngày thường do ai ghi, rồi mọi người xem lại và bàn giao cho nhau ra sao?**

**Mục đích hỏi:** Xác định người ghi, kiểm tra, bàn giao và quyền sửa/nhập bù; lưu lịch sử để tránh mất dấu thay đổi số liệu.

- Ghi ngay, cuối ca hay nhập bù; ai nhận bàn giao?
- Sai hoặc thiếu dữ liệu: có giữ bản cũ, lý do sửa và người duyệt không? Có sửa lô đã kết thúc không?

**KT08. Anh/chị thường dựa vào đâu để biết hôm nay cho ăn loại gì và bao nhiêu?**

**Mục đích hỏi:** Chốt cơ sở chọn thức ăn và lượng khuyến nghị theo loài/giai đoạn, đơn vị và người xác nhận định mức.

- Theo số con, sinh khối, thể tích nước, quan sát hay định mức nào? Đơn vị/cữ/ngày?
- Ai cung cấp/duyệt định mức; khi chuyển giai đoạn hoặc thời tiết thay đổi thì điều chỉnh ra sao?

**KT09. Sau một lần cho ăn, mình thường ghi lại những gì để hôm sau còn theo dõi?**

**Mục đích hỏi:** Xác định dữ liệu mỗi lần cho ăn, phân biệt lượng khuyến nghị với lượng thực dùng để theo dõi tiêu hao và chi phí.

- Loại sản phẩm, lượng thực tế, đơn vị, thời gian, bể/lô, lượng khuyến nghị và quan sát sau ăn.
- Lượng thực dùng khác lượng nhận từ kho hoặc định mức được giải thích thế nào?

**KT10. Với tảo, Artemia hay thức ăn mình tự làm, anh/chị theo dõi lượng dùng ra sao?**

**Mục đích hỏi:** Chốt cách đo và ghi thức ăn sống/tự sản xuất, nguồn đợt sản xuất và dữ liệu cần bàn giao kế toán.

- Đơn vị, mật độ/nồng độ nếu có, nguồn hoặc đợt sản xuất; dữ liệu nào gửi kế toán?

**KT11. Anh/chị kể em nghe cách mình kiểm tra nước mỗi ngày nhé?**

**Mục đích hỏi:** Xác định thông số, đơn vị, lịch đo, thiết bị và ngưỡng cảnh báo theo bối cảnh; lưu lần đo lại và hành động xử lý.

- Đo gì, lúc nào, vị trí nào, bằng thiết bị nào và đơn vị nào? Có kiểm tra/hiệu chuẩn không?
- Ngưỡng theo loài/giai đoạn/bể do ai xác nhận? Số đo bất thường có đo lại và ghi hành động không?

**Hỏi sâu về ngưỡng cảnh báo:**

- Với từng chỉ số và từng giai đoạn, mức nào bên mình bắt đầu chú ý, mức nào phải xử lý ngay? Anh/chị lấy một chỉ số thường gặp làm ví dụ nhé?
- Các mức đó lấy từ kinh nghiệm, tài liệu hay người phụ trách kỹ thuật? Ai đồng ý trước khi đưa vào dùng?
- Chạm đúng mức giới hạn đã coi là vượt chưa? Cần duy trì bao lâu hoặc bao nhiêu lần đo thì báo, hay một lần là đủ?
- Mức áp dụng có đổi theo loài, giai đoạn, bể hoặc mùa không? Khi đổi, mình ghi ngày bắt đầu/ngừng và giữ mức cũ ra sao?
- Nếu chưa có mức riêng phù hợp, mình làm gì? Có dùng mức chung được người phụ trách xác nhận hay chỉ ghi số đo để xem lại?
- Khi đo bất thường, mình đo lại lúc nào, bằng thiết bị nào; số cũ và số mới có cùng giữ lại không? Trong lúc chờ kiểm tra, ai nhận thông tin?
- Nếu phần mềm nhắc, anh/chị muốn ai nhận, qua đâu và sau bao lâu nhắc lại? Cùng vấn đề kéo dài thì gộp một cảnh báo hay nhắc từng lần?
- Khi số đo trở lại ổn, ai xác nhận đã khắc phục? Nếu vừa ổn rồi vượt lại, mình theo dõi như lần mới hay tiếp tục vấn đề cũ?

**Mục đích phần hỏi sâu:** Chốt giới hạn, điều kiện kích hoạt, thời hạn/phiên bản cấu hình, kiểm tra số đo và vòng đời nhắc–xử lý; không tự điền mức sinh học trước khi trại xác nhận.

**KT12. Khi thay nước hoặc dùng thuốc, chế phẩm, anh/chị làm và ghi lại như thế nào?**

**Mục đích hỏi:** Chốt thông tin thay nước và dùng thuốc/chế phẩm, gồm thể tích, lượng thực dùng, mục đích và kết quả theo dõi.

- Thay nước: phần trăm/thể tích, thể tích trước/sau, thời gian và nguồn nước.
- Thuốc/chế phẩm: sản phẩm, lượng thực dùng, liều/nồng độ, mục đích, người cho phép và kết quả.

**KT13. Lấy thức ăn, thuốc từ kho rồi dùng, bên mình trao đổi và ghi lại với người giữ kho ra sao?**

**Mục đích hỏi:** Nối nhật ký chăm sóc với cấp phát và sử dụng kho, tránh trừ tồn hoặc cộng chi phí cùng một lần dùng hai lần.

- Cấp về khu vực đã coi là sử dụng chưa; còn thừa/hoàn trả ghi ở đâu?
- Cùng một lần dùng đã có phiếu xuất và nhật ký thì ai tránh ghi trùng, ai xác nhận đơn vị quy đổi?

**Mẫu cần xin:** nhật ký một ngày bình thường và một ngày bất thường, định mức, phiếu cấp/xuất vật tư và ví dụ sửa/nhập bù.

## 4. Giai đoạn và chuyển bể

**KT14. Anh/chị nhìn vào đâu để biết tôm đã sang giai đoạn tiếp theo?**

**Mục đích hỏi:** Chốt tiêu chí xác định giai đoạn và người xác nhận, kể cả bể có tôm phát triển không đều.

- Danh sách giai đoạn thực dùng, cách gọi ngày PL; quan sát hay số ngày nuôi?
- Nếu trong bể phát triển không đều, chọn giai đoạn đại diện thế nào, ai xác nhận?

**KT15. Khi tôm sang giai đoạn mới, có những việc gì mình đổi hoặc ghi lại?**

**Mục đích hỏi:** Xác định lịch sử cần lưu khi chuyển giai đoạn để xem lại thời gian, số lượng và thay đổi chăm sóc.

- Ngày, số lượng, tình trạng, thức ăn mới và người xác nhận.
- Có cần xem lại lịch sử từng giai đoạn, thời gian và lượng vật tư tiêu hao không?

**KT16. Bên mình có lúc chia giống qua nhiều bể hoặc gom lại không? Anh/chị kể em một lần như vậy nhé?**

**Mục đích hỏi:** Chốt quy trình chuyển/chia/gộp, số lượng nguồn–đích và hao hụt; xác định nhu cầu lô cha–con và bảo toàn truy nguồn.

- Chuyển toàn bộ hay một phần; số nguồn/đích, hao hụt, ngày và người bàn giao.
- Gộp nguồn có được phép không; giữ mã lô/truy nguồn và dữ liệu chăm sóc thế nào?

**KT17. Một bể vừa hết giống thì mình làm gì để chuẩn bị cho lứa sau?**

**Mục đích hỏi:** Chốt vòng đời kết thúc lô, vệ sinh và tái sử dụng bể, cùng cách dừng khẩn cấp khi còn giống.

- Trình tự kết thúc lô, vệ sinh, kiểm tra và xác nhận bể trống; ai duyệt?
- Dừng khi còn giống: chuyển, loại hoặc giữ lại thế nào; trạng thái và nhật ký cần lưu gì?

**Mẫu cần xin:** lịch sử chuyển giai đoạn, phiếu chuyển/chia bể và quy trình kết thúc/vệ sinh.

## 5. Kiểm đếm, lấy mẫu và AI

**KT18. Bình thường mình biết trong bể còn khoảng bao nhiêu con bằng cách nào, và lúc nào thì đếm lại?**

**Mục đích hỏi:** Xác định thời điểm và phương pháp kiểm đếm thực tế để biết số nào là đếm trực tiếp, số nào là ước tính.

- Tiếp nhận, thả, chuyển giai đoạn/bể, định kỳ và xuất bán; phương pháp có thay đổi theo giai đoạn không?

**KT19. Anh/chị kể từng bước một lần lấy mẫu để đếm cho em dễ hình dung được không?**

**Mục đích hỏi:** Chốt quy trình lấy mẫu, số/vị trí mẫu và thể tích nước thực tế để đánh giá mẫu có đại diện cho bể không.

- Số/vị trí/lần mẫu, dụng cụ, thể tích mẫu, thao tác chuẩn bị và xử lý mẫu sau đếm.
- Thể tích nước bể lấy từ thiết kế hay đo thực tế; làm sao tránh mẫu không đại diện?

**KT20. Đếm được mẫu rồi, mình tính ra số con cả bể thế nào? Anh/chị lấy một lần gần đây làm ví dụ nhé?**

**Mục đích hỏi:** Lấy công thức ngoại suy, đơn vị và ví dụ thực tế; chốt cách tổng hợp, làm tròn, sai số và người kiểm tra.

- Xin diễn giải công thức bằng số liệu thật, gồm đơn vị, các mẫu và cách tổng hợp/làm tròn.
- Ai kiểm tra kết quả, sai số chấp nhận bao nhiêu; khi hai cách đếm lệch nhau thì làm gì?

**KT21. Nếu đếm lại thấy khác số đang ghi, bên mình thường làm gì tiếp?**

**Mục đích hỏi:** Chốt cách cập nhật số lượng từ kết quả đếm mới, lý do và quyền duyệt; phân biệt hiệu chỉnh với hao hụt do chết.

- Giữ số ước tính cũ hay thay thế; ai duyệt, lý do và thời điểm hiệu lực?
- Có phân biệt sai lệch kiểm đếm với giống chết không?

**KT22. Muốn biết tôm lớn tới đâu và có đều không, anh/chị thường xem hoặc đo thế nào?**

**Mục đích hỏi:** Xác định phương pháp đo tăng trưởng, dữ liệu gốc và cách tính kích thước, khối lượng, độ đồng đều.

- Cỡ mẫu, dụng cụ, đơn vị, phương pháp, số đo gốc và cách tính chỉ số; ai xác nhận?

**KT23. Nếu có phần mềm hỗ trợ đếm tôm từ ảnh, anh/chị thấy nó có thể giúp ở bước nào?**

**Mục đích hỏi:** Chốt phạm vi AI hỗ trợ, cách kiểm chứng và hiệu chỉnh, dữ liệu ảnh chuẩn và cách làm thay thế khi AI không dùng được.

- Trại có dùng hiện nay hay đây là nhu cầu mới? Ảnh chụp theo điều kiện nào; có số đếm người làm chuẩn không?
- Kết quả chỉ là số mẫu hay được ngoại suy toàn bể? Ai hiệu chỉnh/xác nhận; mức sai số và thời gian chờ chấp nhận được?
- Khi ảnh không đếm được, cách làm thủ công thay thế và lưu bằng chứng là gì?

**Mẫu cần xin:** phiếu lấy mẫu có công thức, số đo thể tích, ảnh mẫu có số đếm xác nhận và số liệu tăng trưởng. Không dùng số đếm ảnh trực tiếp làm tổng số con toàn bể.

## 6. Hao hụt và bất thường

**KT24. Khi thấy tôm hao hụt hoặc chết, anh/chị thường biết và ghi lại bằng cách nào?**

**Mục đích hỏi:** Xác định cách ghi số chết/hao hụt, nguyên nhân và bằng chứng; tách khỏi bán, chuyển, loại chất lượng và sai lệch đếm.

- Đếm trực tiếp hay ước tính từ mẫu; ghi theo ngày/giai đoạn, số lượng, nguyên nhân và người xác nhận?
- Phân biệt chết với loại chất lượng, thiếu khi nhận, chuyển, bán và sai lệch đếm thế nào?

**KT25. Khi nói lứa này sống được bao nhiêu phần trăm, bên mình đang tính như thế nào?**

**Mục đích hỏi:** Chốt công thức tỷ lệ sống có xét bán/chuyển và phân biệt tỷ lệ sống sản xuất với tỷ lệ sống của mẫu kiểm tra.

- Số đầu/cuối lấy ở đâu; nếu đã bán/chuyển một phần thì xử lý thế nào để không tính thành chết?
- Phân biệt tỷ lệ sống sản xuất với tỷ lệ sống của mẫu kiểm tra chất lượng.

**KT26. Anh/chị nhớ một lần nước hoặc tôm có vấn đề không? Lúc đó mọi người phát hiện và xử lý ra sao?**

**Mục đích hỏi:** Chốt luồng phát hiện bất thường, người xử lý, hành động và kiểm tra lại; không coi dấu hiệu quan sát là bệnh đã xác nhận.

- Ngưỡng báo động, người nhận, hành động, thời hạn, kết quả đo/kiểm tra lại.
- Khi nào coi đã khắc phục; có lưu trách nhiệm và bằng chứng ngoài đánh dấu đã đọc không?

**KT26a. Khi thấy tôm không khỏe, anh/chị thường nhìn những gì để nghi là bệnh? Kể em một lần gần đây nhé?**

**Mục đích hỏi:** Tách dấu hiệu quan sát, nghi ngờ và kết luận đã xác nhận; chốt người kết luận, dữ liệu xét nghiệm và theo dõi xử lý. Câu bổ sung giữ mã KT26a để không đổi tham chiếu KT27–KT35.

- Dấu hiệu đầu tiên thường là gì; xuất hiện ở mẫu hay cả bể, lúc nào và trên bao nhiêu con? Mình ghi hoặc chụp lại ở đâu?
- Anh/chị kiểm tra nước, thức ăn hoặc thời điểm chuyển giai đoạn ra sao để xem có nguyên nhân khác? Khi chưa rõ thì ghi thế nào?
- Ai kiểm tra tiếp và ai được kết luận? Khi nào mình soi mẫu, làm test tại trại hoặc gửi phòng xét nghiệm?
- Mẫu lấy từ bể/lô nào, ai lấy, ngày gửi/nhận kết quả và đơn vị xét nghiệm được ghi lại ra sao? Kết quả nối với lần nghi ngờ bằng cách nào?
- Kết quả chưa có, không rõ hoặc khác nhận định ban đầu thì mình theo dõi và trao đổi với ai? Có cần kiểm tra thêm không?
- Trong lúc chờ kết luận, bên mình chăm sóc, theo dõi, chuyển bể hoặc tạm dừng bán thế nào? Ai quyết định các thao tác đó?
- Sổ có tách “nghi bệnh”, “đang chờ kiểm tra” và “đã xác nhận” không? Nếu loại trừ nghi ngờ, mình giữ lịch sử như thế nào?
- Ai quyết định cách xử lý, người nào thực hiện và ghi sản phẩm/lượng dùng/thời gian vào đâu?
- Sau xử lý mình xem lại vào lúc nào, dựa vào số đo, dấu hiệu và hao hụt nào để biết tiến triển? Ai xác nhận được nuôi tiếp hoặc bán lại?
- Có lần tái phát không; mình nối với lần trước hay ghi mới? Có thể xem một hồ sơ đã ẩn thông tin nhạy cảm không?

Đây là câu hỏi về cách ghi nhận và trách nhiệm tại trại, không đặt ra hướng dẫn chẩn đoán, điều trị hoặc cho phép AI tự kết luận bệnh.

**KT27. Nếu một lứa không nuôi tiếp được, bên mình thường làm gì với số giống và các ghi chép còn lại?**

**Mục đích hỏi:** Xác định điều kiện đóng lô thất bại, số lượng cuối, lý do và dữ liệu gửi kho/kế toán để tổng kết đúng.

- Số còn lại, số loại/tiêu hủy/chuyển, nguyên nhân, vật tư còn thừa và ngày kết thúc.
- Ai duyệt, báo cho kế toán/kho thế nào; có được sửa kết quả sau chốt không?

**Mẫu cần xin:** nhật ký hao hụt, ví dụ tính tỷ lệ sống sau chuyển/bán và hồ sơ một lần xử lý bất thường/thất bại.

## 7. Điều kiện bán và giao giống

**KT28. Anh/chị thường nhìn vào những điểm nào để nói lứa này bán được rồi?**

**Mục đích hỏi:** Chốt tiêu chí kỹ thuật và người cho phép bán, kể cả bán từng phần và kiểm tra lại trước mỗi lần giao.

- Giai đoạn, kích cỡ, đồng đều, sức khỏe và các phép kiểm tra theo quy trình trại.
- Ai xác nhận sẵn sàng bán; được bán một phần không, có phải kiểm tra lại trước từng lần giao không?

**KT29. Trước khi bán, bên mình thường làm những kiểm tra gì và giữ kết quả ở đâu?**

**Mục đích hỏi:** Xác định loại kiểm định, phương pháp, hồ sơ, hiệu lực và cách xử lý không đạt; phân biệt kết quả xét nghiệm với nhận định ban đầu.

- Loại test/PCR/stress test nếu trại có làm: cỡ mẫu, phương pháp, ngày, đơn vị làm, kết quả và bằng chứng.
- Hiệu lực do ai quy định; lô không đạt được xử lý/kiểm tra lại thế nào? Có ngoại lệ, ai được cho phép?

**KT30. Anh/chị kể giúp em từ lúc bắt giống ra đến lúc đóng túi, mình tính số con giao khách thế nào nhé?**

**Mục đích hỏi:** Chốt cách kiểm đếm khi đóng túi, lượng bù và số thực xuất/giao/tính tiền để đối chiếu tồn giống với bán hàng.

- Cách đếm/ước lượng, số túi, số mỗi túi, tổng giao, lượng bù miễn phí và người kiểm tra.
- Số đặt, số xuất bể, số tính tiền khác nhau thì ghi và gửi bộ phận bán hàng ra sao?

**KT31. Giống đóng xong thì giao cho khách ra sao, rồi mình biết khách nhận đủ bằng cách nào?**

**Mục đích hỏi:** Xác định bằng chứng giao nhận, thời điểm, người bàn giao và cách ghi hao hụt trong đóng túi/vận chuyển.

- Bể/lô nguồn, thời điểm, người vận chuyển, người nhận, tình trạng và phiếu/ảnh xác nhận.
- Giống hao hụt khi đóng túi hoặc vận chuyển được ghi vào đâu, ai xác nhận trách nhiệm?

**KT32. Nếu khách gọi báo thiếu hoặc tôm có vấn đề, bên mình thường trao đổi và giải quyết thế nào?**

**Mục đích hỏi:** Chốt luồng tiếp nhận phản hồi, kiểm tra bằng chứng và quyết định bù/đổi/nhận lại; bàn giao dữ liệu điều chỉnh cho bán hàng/kế toán.

- Bằng chứng, thời điểm phản hồi, người kiểm tra và cách quyết định bù/đổi/loại.
- Nếu nhận lại giống, có đưa về bể không và cần điều kiện gì? Thông tin nào gửi bán hàng/kế toán để điều chỉnh?

**Mẫu cần xin:** checklist đủ điều kiện bán, phiếu test, phiếu đóng túi/giao nhận và trường hợp bù/đổi nếu có. Bộ câu hỏi không đặt ra ngưỡng sinh học hoặc quy định pháp lý mới.

## 8. Bàn giao dữ liệu và nghiệm thu

**KT33. Những số liệu anh/chị ghi hằng ngày thường gửi cho ai, gửi lúc nào và bằng cách nào?**

**Mục đích hỏi:** Chốt dữ liệu, thời điểm và kênh bàn giao giữa kỹ thuật, kho, kế toán, bán hàng; xác định người đối soát khi lệch số.

- Mã lô/bể, số lượng, lượng thức ăn/thuốc thực dùng, giai đoạn, kết quả test và lượng giao; gửi lúc nào và bằng sổ/Excel/Zalo/phần mềm?
- Khi hai bên lệch số, ai đối chiếu và xác nhận số cuối?

**KT34. Trong lúc làm, anh/chị hay cần xem lại thông tin gì và thấy ghi chép bằng cách nào tiện nhất?**

**Mục đích hỏi:** Xác định thông tin cần xem, cách nhập, thiết bị, điều kiện mạng và quyền thao tác để thiết kế phù hợp tại trại.

- Điện thoại/máy tính, nhập theo ca, mạng yếu, ảnh chứng từ; ai được xem/sửa/duyệt theo khu vực?
- Những số liệu hoặc cảnh báo nào cần nhìn trước khi chăm sóc và xuất bán?
- Nếu xem một tuần hoặc một lứa, anh/chị muốn tổng hợp theo ngày, bể, giai đoạn hay lô? Muốn xem số hiện tại hay số tại thời điểm cuối khoảng đã chọn?
- Với nhiệt độ, pH hoặc số lượng, mình muốn xem từng lần đo, trung bình, thấp/cao nhất hay xu hướng? Đơn vị và số lẻ cần hiển thị ra sao?
- Ngày chưa đo/chưa ghi nên hiện là thiếu dữ liệu hay có cách ước tính được trại chấp nhận? Khi nhập bù, cần nhìn lại bản cũ không?
- Từ biểu đồ hoặc số tổng, có muốn mở đúng nhật ký/mẫu đo để kiểm tra không? Khi đổi bể/khu vực, báo cáo cũ nên giữ theo vị trí lúc ghi hay vị trí hiện tại?

**KT35. Nếu phần mềm giúp được vài việc trước, anh/chị muốn nó giúp việc gì nhất?**

**Mục đích hỏi:** Chốt ưu tiên triển khai và cách kiểm chứng bằng lô thật, số liệu chuẩn, sai số chấp nhận và người xác nhận.

- Chọn lô mẫu, số liệu chuẩn, sai số chấp nhận và người ký xác nhận.
- Có thể thử chuỗi nhận → chăm sóc → chuyển giai đoạn → lấy mẫu/hao hụt → xác nhận bán → giao → kết thúc bể không?

## 9. Mẫu ghi kết quả

Ngày __________; kỹ thuật viên/vai trò __________; phạm vi bể/loài __________; người ghi __________; lô làm mẫu __________.

| Mã câu | Cách đang làm | Trường dữ liệu/đơn vị/công thức | Sổ/phiếu mẫu | Người xác nhận | Điểm chưa rõ/nhu cầu phần mềm |
| --- | --- | --- | --- | --- | --- |
| KT01–KT35 và KT26a | Ghi câu trả lời thực tế | Không tự điền định mức | Link hoặc mã mẫu | Ghi rõ thẩm quyền | Chưa theo dõi / Cần kiểm chứng / Đã xác nhận |

Sau buổi phỏng vấn, đối chiếu một lô thật và chuyển kết quả về các ID checklist. Số lượng và nhật ký kỹ thuật cần khớp với vật tư sử dụng, hồ sơ bán và dữ liệu kế toán; các thay đổi về quyền, công thức hoặc mô hình lô cần người phụ trách xác nhận trước khi cập nhật đặc tả.
