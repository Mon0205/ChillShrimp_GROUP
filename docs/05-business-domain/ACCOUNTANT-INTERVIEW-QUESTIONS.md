# Gợi ý trò chuyện với người phụ trách kế toán trại tôm giống

Nguồn: [Checklist cần làm rõ dự án](../Warning/06-PROJECT-CLARIFICATION-CHECKLIST.md).

## Mục tiêu và cách hỏi

Tìm hiểu cách trại đang ghi chi phí, tính giá vốn, bán giống, thu–chi tiền và theo dõi công nợ để thiết kế UC08 sát thực tế. “Người phụ trách kế toán” có thể là kế toán, chủ trại hoặc người giữ sổ thu–chi.

Hỏi cách đang làm trước, nhu cầu phần mềm sau. Mỗi câu chính dùng để mở một chủ đề; chỉ hỏi tiếp các gợi mở khi người trả lời chưa đề cập. Với công thức tính tiền hoặc phân bổ chi phí, xin cùng xem một ví dụ từ sổ trại. Nếu chưa theo dõi, ghi rõ “chưa theo dõi”. Những thông tin sinh sản, định mức và kiểm đếm ngoài trách nhiệm kế toán cần chuyển cho người kỹ thuật xác nhận.

## A. Mở đầu và lộ trình hỏi nhanh

Có thể mở đầu như sau (đổi cách xưng hô theo quan hệ quen biết):

> Em đang làm đồ án quản lý trại tôm, muốn hiểu cách bên mình ghi tiền vào, tiền ra và tính lãi để làm phần mềm cho sát. Anh/chị kể giúp em một lứa gần đây, từ lúc mua đầu vào đến lúc bán và nhận tiền nhé? Chỗ nào em chưa hiểu em hỏi thêm, không cần chuẩn bị câu trả lời đâu.

Hỏi thêm vài ý để biết bối cảnh:

- Anh/chị đang phụ trách việc gì và ai kiểm tra/chốt số liệu?
- Trại tự sinh sản từ bố mẹ, mua Nauplius/PL hay kết hợp; bán loài và giai đoạn nào?
- Trại đang dùng sổ, Excel hay phần mềm; có thể cùng xem một chu kỳ thực tế không?

Sau đó đi theo các mã câu chi tiết dưới đây. Không hỏi lại nội dung đã được giải thích ở phần mở đầu.

Các gợi mở là ghi chú cho người hỏi, không cần đọc hết. Có thể hỏi tiếp bằng “Lúc đó mình ghi ở đâu?”, “Anh/chị lấy một lần gần đây làm ví dụ nhé?”, “Nếu tiện, cho em xem cách mình tính trong sổ được không?”. Người trả lời kể sang chủ đề khác thì theo câu chuyện, rồi quay lại những ý còn thiếu.

| Chủ đề | Câu chi tiết |
| --- | --- |
| Chi phí bố mẹ và đầu vào | Q01–Q05 |
| Số lượng, giai đoạn và thức ăn | Q06–Q10 |
| Kho và giá vật tư | Q11–Q15 |
| Chi phí chung và giá vốn | Q16–Q21 |
| Khách hàng và xuất bán | Q22–Q27 |
| Thu–chi và công nợ | Q28–Q34 |
| Báo cáo, quyền và nhu cầu phần mềm | Q35–Q38 |

Nếu thời gian hạn chế, ưu tiên Q03, Q06, Q12, Q17–Q19, Q24, Q26, Q28–Q31 và Q35. Phần bố mẹ chỉ hỏi sâu nếu trại có tự nuôi bố mẹ và sản xuất giống.

## B. Chi phí bố mẹ và đầu vào

Tham chiếu: BROOD-01–05, TRACE-01–02, COST-01.

**Q01. Một lần mua tôm bố mẹ về, bên mình thường tính và ghi những khoản tiền nào vậy anh/chị?**

**Mục đích hỏi:** Xác định các khoản tạo thành chi phí nhập bố mẹ và dữ liệu cần lưu trên phiếu mua, tránh bỏ sót hoặc cộng trùng chi phí.

Gợi mở nếu chưa được trả lời:

- Ngoài giá mua, còn khoản vận chuyển, kiểm dịch, xét nghiệm hoặc phí nào? Các khoản đó được ghi riêng hay cộng vào giá nhập?
- Mua theo con, cặp, đàn hay trọng lượng? Giá đực/cái có khác nhau không; phiếu mua ghi thông tin gì?

**Q02. Chi phí nuôi bố mẹ trước khi sinh sản được theo dõi ra sao?**

**Mục đích hỏi:** Biết chi phí chăm sóc được gắn với cá thể, đàn, bể hay trại; xác định nguồn nhật ký và người bàn giao dữ liệu cho kế toán.

- Thức ăn, thuốc ghi theo cá thể, đàn, bể hay cả trại? Ai gửi số liệu, vào lúc nào?

**Q03. Bố mẹ đẻ ra nhiều đợt con thì mình chia tiền mua và tiền nuôi bố mẹ cho từng đợt thế nào?**

**Mục đích hỏi:** Chốt cách phân bổ giá mua và chi phí nuôi bố mẹ qua nhiều lần sinh sản, cùng quan hệ đàn nguồn–đợt sinh sản–lô con.

Gợi mở nếu chưa được trả lời:

- Khi một đàn sinh sản nhiều lần, chi phí mua và chăm sóc được chia cho từng lần thế nào? Phần chưa phân bổ được theo dõi ở đâu?
- Có sổ nối từng lần sinh sản, đàn nguồn và số con đầu ra không? Ai xác nhận sản lượng?

**Q04. Nếu bố mẹ không tạo được sản lượng hoặc bị loại, trại xử lý chi phí thế nào?**

**Mục đích hỏi:** Chốt cách ghi chi phí không tạo ra sản lượng, khoản thanh lý và người xác nhận; tránh đưa chi phí sang lô khác khi chưa có quy tắc.

- Trường hợp chết, không đẻ và bán thanh lý có được ghi khác nhau không?

**Q05. Nếu mua Nauplius hoặc PL bên ngoài, trại xác nhận số lượng và giá nhập ra sao?**

- Dùng số chứng từ hay số nhận thực tế? Thiếu hàng, hao hụt hoặc bù hàng được điều chỉnh thế nào?

**Giải thích thuật ngữ:**

- **Nauplius:** tôm ở giai đoạn ấu trùng rất sớm.
- **PL (Postlarvae):** tôm ở giai đoạn hậu ấu trùng.

Ví dụ, bên bán ghi giao **1 triệu con**, nhưng trại kiểm đếm/ước tính chỉ nhận **950.000 con**. Cần biết trại sẽ trả theo 1 triệu con, theo 950.000 con, hay yêu cầu bên bán bù thêm.

**Mục đích hỏi là làm rõ ba việc:**

1. **Số lượng đầu vào:** phần mềm lưu số bên bán ghi, số thực nhận và số thực thả có khác nhau không.
2. **Chi phí đầu vào:** giá tính theo con hay 1.000 con; có cộng vận chuyển hoặc khoản khác không.
3. **Xử lý chênh lệch:** thiếu hoặc hao hụt thì bù giống, giảm tiền hay trại tự chịu — ảnh hưởng đến tồn giống, khoản phải trả và giá vốn.

**Mẫu cần xin:** phiếu mua bố mẹ/giống, sổ nuôi bố mẹ, sổ sinh sản và bảng phân bổ chi phí nếu có.

## C. Số lượng, giai đoạn và thức ăn

Tham chiếu: BATCH-01–09, FEED-01–03, AI-02–03.

**Q06. Khi tính tiền nuôi một lứa, mình lấy số con ở đâu và biết đó là số của lứa nào?**

**Mục đích hỏi:** Xác định mã lô, số lượng và nguồn xác nhận dùng tính giá thành; phân biệt số thả, số sống, số bán, số loại và sai lệch kiểm đếm.

Gợi mở nếu chưa được trả lời:

- Khi lấy mẫu hoặc AI cho số lượng ước tính khác số đang ghi, kế toán có thay đổi giá vốn không? Ai duyệt và dùng số mới từ ngày nào?
- Giống chết, loại do chất lượng và giống đem bán được ghi tách thế nào? Trại có dùng tỷ lệ sống để tính giá thành không?
- Trại nhận biết một lô bằng mã, ngày thả, bể hay đợt sinh sản? Chi phí đang theo lô hay theo cả trại/khu vực/bể?
- Số thả, số sống và số bán lấy từ sổ nào? Khi số liệu kỹ thuật và phiếu giao khác nhau, ai xác nhận?

**Q07. Khi chia hoặc gộp lô, chi phí đã phát sinh được chuyển như thế nào?**

**Mục đích hỏi:** Chốt cách giữ nguồn gốc và phân chia chi phí khi chuyển, chia hoặc gộp lô; xác định có cần mô hình lô cha–con hay nhiều bể không.

- Có tình huống một lô ở nhiều bể hoặc nhiều nguồn cùng một bể không? Xin một ví dụ.

**Q08. Trại có theo dõi chi phí riêng cho từng giai đoạn nuôi không?**

**Mục đích hỏi:** Xác định nhu cầu lưu lịch sử giai đoạn và tập hợp chi phí theo giai đoạn, thay vì chỉ lưu giai đoạn hiện tại của lô.

- Với Nauplius, Zoea, Mysis và PL, ngày chuyển và số lượng được ghi ở đâu?

**Q09. Định mức thức ăn được sử dụng như thế nào trong việc tính chi phí?**

**Mục đích hỏi:** Phân biệt định mức dự toán với tiêu hao thực tế; chốt cơ sở tính, đơn vị, người duyệt và nhu cầu báo cáo chênh lệch.

Gợi mở nếu chưa được trả lời:

- Lượng dùng thực tế khác định mức thì ghi thế nào? Có cần báo cáo chênh lệch và người giải thích nguyên nhân không?
- Định mức dùng để dự toán hay ghi chi phí? Ai cung cấp, theo giai đoạn nào, đơn vị nào; có tính trên 1.000 con không?

**Q10. Thức ăn sống hoặc tự sản xuất tại trại được tính chi phí ra sao?**

**Mục đích hỏi:** Xác định cách ghi lượng và chi phí thức ăn sống/tự sản xuất, bao gồm nguyên liệu và công làm nếu trại có theo dõi.

- Có theo dõi nguyên liệu và công làm tảo/Artemia không? Nếu mua sẵn thì ghi lượng và giá bằng đơn vị nào?

**Mẫu cần xin:** một nhật ký theo giai đoạn, phiếu xác nhận số lượng, nhật ký thức ăn và một lần chia/chuyển lô nếu có.

## D. Kho, mua hàng và chi phí vật tư

Tham chiếu: STOCK-01–06, COST-03, CASH-02.

**Q11. Anh/chị kể giúp em một lần mua thức ăn hoặc thuốc, từ lúc nhận hàng đến lúc ghi sổ nhé?**

**Mục đích hỏi:** Nối phiếu mua, nhận hàng, nhập kho và khoản phải trả; xác định trách nhiệm, số thực nhận và thành phần giá nhập.

Gợi mở nếu chưa được trả lời:

- Vận chuyển mua vật tư và chiết khấu từ nhà cung cấp có làm thay đổi giá vật tư không? Trại đang tính thế nào?
- Ai nhận hàng, ghi kho và ghi khoản phải trả? Một hóa đơn có nhiều vật tư không?

**Q12. Cùng loại thức ăn mà đợt mua trước và sau khác giá, lúc dùng mình tính tiền thế nào?**

**Mục đích hỏi:** Chốt phương pháp tính giá xuất khi có nhiều giá nhập để chi phí sử dụng không mặc định bằng giá mua gần nhất.

- Ví dụ minh họa, không phải dữ liệu trại: nhập 10 kg giá 100.000 đồng/kg và 10 kg giá 120.000 đồng/kg; xuất dùng 5 kg thì tính bao nhiêu? Xin đối chiếu với cách trại đang làm.

**Q13. Đơn vị mua và đơn vị sử dụng vật tư được quy đổi thế nào?**

**Mục đích hỏi:** Chốt đơn vị gốc, hệ số quy đổi và người xác nhận để lượng tồn, tiêu hao và thành tiền khớp nhau.

- Một bao/hộp/chai tương ứng bao nhiêu kg/g/ml? Ai xác nhận hệ số?

**Q14. Khi cấp vật tư cho khu vực, lúc nào trại ghi nhận đã sử dụng và tính chi phí?**

**Mục đích hỏi:** Phân biệt cấp phát với tiêu hao; nối phiếu kho với nhật ký chăm sóc để không trừ tồn hoặc tính chi phí hai lần.

Gợi mở nếu chưa được trả lời:

- Nhật ký cho ăn/thuốc và phiếu xuất có ghi cùng một lần dùng không? Anh/chị kiểm tra thế nào để không cộng trùng chi phí?
- Có theo dõi lượng khu vực còn giữ không? Vật tư chưa dùng hoặc trả lại được ghi thế nào?

**Q15. Khi tồn thực tế khác sổ kho hoặc vật tư bị hỏng, trại xử lý thế nào?**

**Mục đích hỏi:** Chốt cách ghi tổn thất, chênh lệch kiểm kê, người phê duyệt và khoản chi phí liên quan; không tự coi lệch tồn là đã sử dụng.

- Ai xác nhận mất, hết hạn hoặc chênh lệch? Khoản đó được ghi vào chi phí nào?

**Mẫu cần xin:** phiếu nhập/xuất, sổ tồn, hóa đơn hai đợt nhập khác giá, phiếu trả hoặc điều chỉnh tồn.

## E. Chi phí chung và giá vốn

Tham chiếu: COST-01–06, REPORT-01.

**Q16. Những khoản nào được đưa vào giá thành sản xuất giống?**

**Mục đích hỏi:** Chốt danh mục khoản được tính vào giá thành, khoản theo kỳ/quản lý/bán hàng và cách xử lý chi phí giữa hai lô.

Gợi mở nếu chưa được trả lời:

- Chi phí vệ sinh bể giữa hai lô, xét nghiệm, sửa chữa và trang thiết bị được ghi vào lô nào hoặc kỳ nào?
- Khoản nào được ghi riêng cho quản lý hoặc bán hàng?

**Q17. Tiền điện, nước và công làm chung cho cả trại, mình chia cho từng lứa thế nào vậy?**

**Mục đích hỏi:** Chốt cơ sở, kỳ và đối tượng phân bổ chi phí chung, kể cả lô vào/ra giữa kỳ; lưu đủ số liệu để tính lại báo cáo.

Gợi mở nếu chưa được trả lời:

- Khi hai lô nuôi chồng thời gian, chi phí chung trong tháng được chia thế nào? Lô mới vào hoặc kết thúc giữa tháng được tính ra sao?
- Có số đo riêng theo bể/khu vực không? Nếu không, cơ sở chia là ngày nuôi, thể tích, số lượng hay cách khác? Ai duyệt?

**Q18. Anh/chị lấy một lứa đã bán, chỉ em cách tính nuôi ra một con hoặc 1.000 con hết bao nhiêu tiền nhé?**

**Mục đích hỏi:** Lấy công thức giá vốn thực tế, số lượng mẫu số, thời điểm chốt và ví dụ đối soát làm căn cứ thiết kế và nghiệm thu.

- Cộng những khoản nào, chia cho số lượng nào? Kết quả là tạm tính hay đã chốt, ai xác nhận?

**Q19. Khi một lô bán nhiều lần, giá vốn từng lần và phần còn lại được tính thế nào?**

**Mục đích hỏi:** Chốt giá vốn phần đã bán, chi phí còn trong phần chưa bán và cách xử lý chi phí phát sinh sau mỗi lần bán.

Gợi mở nếu chưa được trả lời:

- Nếu bán lần đầu rồi tiếp tục phát sinh thức ăn/điện cho phần còn lại, có tính lại giá vốn lần bán trước không?

**Q20. Chi phí của lô thất bại hoặc không đạt để bán được xử lý ra sao?**

**Mục đích hỏi:** Xác định cách ghi tổn thất của lô thất bại và quyền quyết định phân bổ, tránh tạo giá vốn/con khi không có sản lượng bán được.

- Ghi tổn thất riêng hay chuyển sang lô khác? Ai quyết định?

**Q21. Cuối kỳ, trại chốt chi phí của các lô chưa bán hoặc chưa bán hết như thế nào?**

**Mục đích hỏi:** Chốt chi phí dở dang, kỳ khóa sổ, quyền sửa/mở lại và cách xử lý chứng từ muộn để báo cáo lịch sử có thể giải thích.

Gợi mở nếu chưa được trả lời:

- Dữ liệu thường được ghi ngay hay nhập bù? Chứng từ đến muộn sau chốt tháng xử lý thế nào?
- Chi phí còn nằm trong lô được theo dõi ở đâu? Ai chốt và ai được mở lại/sửa?

**Hỏi sâu về đóng lô và ngừng hoạt động trại — nhờ chủ trại xác nhận cùng:**

- Bên mình nói “xong một lứa” là bán hết, hết giống trong bể hay đã chốt đủ tiền và chi phí? Có tách kết thúc nuôi với chốt sổ lứa không?
- Nếu đã giao hết nhưng khách còn nợ, mình có đóng lứa không? Khoản nợ tiếp tục theo dõi và thu sau ở đâu?
- Nếu hóa đơn điện, thức ăn hoặc xét nghiệm chưa về, mình ghi tạm hay chờ? Khi số thật khác số tạm, có tính lại giá vốn và giữ báo cáo cũ không?
- Nếu vẫn còn giống, vật tư ở khu vực, hàng chờ trả hoặc yêu cầu cấp chưa xong, ai xác nhận xử lý trước khi đóng?
- Ai đồng ý đóng lứa, cần xem sổ/phiếu nào? Sau đóng, còn cho nhập chứng từ, thu nợ hoặc sửa sai không; ai được mở lại?
- Nếu trại tạm ngừng hoặc lưu trữ, khoản phải thu/phải trả và tồn giống/vật tư được bàn giao cho ai? Có tiếp tục thu/chi và xem báo cáo lịch sử không?
- Ngừng trại có khác xóa hồ sơ trại không? Khi hoạt động lại, ai xác nhận số dư và các việc còn treo?

**Mục đích phần hỏi sâu:** Chốt riêng kết thúc sản xuất, khóa sổ và ngừng trại; bảo toàn công nợ, chi phí muộn, tồn và quyền thao tác sau đóng. Không mặc định lô hết giống là mọi nghĩa vụ đã hoàn tất.

**Mẫu cần xin:** bảng giá thành một lô, hóa đơn chi phí chung và bảng chia chi phí cùng kỳ; ưu tiên ví dụ bán từng phần.

## F. Khách hàng, giá và xuất bán

Tham chiếu: CUSTOMER-01, SALE-01–06, QUALITY-01.

**Q22. Với một khách mua giống, bên mình thường nhớ và lưu những thông tin gì?**

**Mục đích hỏi:** Xác định trường hồ sơ khách, nơi lưu lịch sử mua, cách tránh trùng và quyền xem/sửa; bảo toàn giao dịch và khoản nợ.

- Một khách có nhiều địa điểm giao hoặc người thanh toán khác không? Xử lý khách trùng thông tin/không còn giao dịch thế nào?
- Hồ sơ khách và lịch sử mua hiện lưu ở sổ, Excel, Zalo hay phần mềm?
- Ai được xem, sửa thông tin khách và lịch sử giao dịch?
- Tên, số điện thoại và địa chỉ đã đủ để nhận biết khách chưa? Có thông tin nào bắt buộc phải có?
- Bên mình có chia khách thành trại, hộ nuôi, hợp tác xã hay nhóm khác không?
- Một khách mua ở nhiều trại của mình thì dùng chung hồ sơ hay mỗi trại ghi riêng?
- Có cần lưu email, mã số thuế, người liên hệ và nhiều địa chỉ giao không?
- Có ghi chú riêng cho khách như yêu cầu giao hàng hoặc cách thanh toán không?
- Khách ngừng mua nhưng còn lịch sử hoặc còn nợ thì mình giữ hồ sơ thế nào?
- Khi mở hồ sơ khách, anh/chị muốn xem lại những gì: lần mua, lô giống, giá, tiền đã trả và khoản còn nợ?

**Q23. Khi khách hỏi mua, bên mình báo giá rồi tính tổng tiền cho khách thế nào?**

**Mục đích hỏi:** Chốt đơn vị giá, điều kiện áp dụng, phụ phí, chiết khấu, làm tròn và quyền duyệt; xác định giá cần lưu snapshot khi bán.

Gợi mở nếu chưa được trả lời:

- Ai quyết định bảng giá và cho phép đổi giá/giảm giá? Có giá sàn; nếu bán dưới giá sàn thì ai duyệt?
- Tiền giống, phí vận chuyển, phụ phí chứng nhận và chiết khấu được ghi riêng thế nào? Làm tròn tiền và số lượng theo quy tắc nào?
- Giá theo con/1.000 con/túi; thay đổi theo loài, giai đoạn, chất lượng, số lượng hoặc từng khách không?

**Hỏi sâu về chọn bảng giá:**

- Nếu giá theo khách, theo số lượng và chương trình giảm giá cùng áp dụng, bên mình chọn giá nào trước? Có cộng dồn ưu đãi không?
- Hai bảng giá cùng phù hợp hoặc trùng ngày hiệu lực thì ai chọn? Có quy tắc ưu tiên hay phải hỏi người phụ trách?
- Mình lấy giá theo ngày báo, ngày khách chốt, ngày giao hay ngày lập phiếu? Báo giá cũ còn giữ được trong bao lâu?
- Một đơn giao nhiều lần, giá mới có làm đổi giá phần chưa giao không? Ai đồng ý và ghi thỏa thuận với khách ở đâu?
- Mức số lượng để chọn giá tính trên cả đơn, từng lô hay từng lần giao? Số con bù có tính vào mức đó không?
- Nếu không có giá phù hợp hoặc muốn nhập giá riêng, ai được làm, có cần lý do không? Sau này xem lại làm sao biết đã dùng bảng nào và phiên bản nào?

**Mục đích phần hỏi sâu:** Chốt thứ tự chọn giá, ngày hiệu lực, điều kiện ưu đãi và nguồn giá snapshot; tránh tự lấy bảng mới nhất hoặc giá thấp nhất khi trại chưa có quy tắc.

**Q24. Anh/chị kể giúp em một lần khách đặt giống, từ lúc nhận lời đặt đến lúc giao nhé?**

**Mục đích hỏi:** Làm rõ chuỗi báo giá–giữ giống–đặt hàng–giao, quan hệ đơn với lô và các lần giao, cùng chứng từ cần lưu.

- Một đơn có nhiều lô hoặc nhiều đợt giao không? Dùng giấy đặt hàng, phiếu giao và hóa đơn riêng hay chung?
- Có báo giá, giữ giống cho khách và xác nhận đơn trước khi giao không?
- Trước khi chốt mua, khách thường tới trại xem tôm hay bên mình gửi ảnh, video hoặc mẫu cho khách? Anh/chị kể một lần gần đây nhé?

**Q25. Số lượng giao và số lượng tính tiền được xác nhận ra sao?**

**Mục đích hỏi:** Tách số xuất khỏi lô, số giao khách và số tính tiền, gồm lượng bù; xác định bằng chứng đóng túi/giao nhận và người xác nhận.

- Ai xác nhận chất lượng được bán? Có bù miễn phí và số trừ lô khác số tính tiền không?
- Khi đóng túi và vận chuyển, trại xác định số con, bàn giao và xác nhận khách đã nhận thế nào?

**Q26. Anh/chị ghi doanh thu vào thời điểm nào?**

**Mục đích hỏi:** Chốt ngày ghi doanh thu theo quy trình trại, phân biệt với ngày thu tiền để báo cáo doanh thu và công nợ đúng kỳ.

- Khi đặt hàng, giao, khách xác nhận hay thu tiền? Xin ví dụ có ngày giao và ngày thu khác nhau.

**Q27. Nếu giao dịch bán bị hủy, trả hàng hoặc cần điều chỉnh, trại xử lý thế nào?**

**Mục đích hỏi:** Chốt các bước hủy, trả, bù và điều chỉnh giá/số lượng; bảo toàn lịch sử và đồng bộ tồn giống, doanh thu, công nợ.

Gợi mở nếu chưa được trả lời:

- Giao dịch sai giá/sai số lượng đã ghi sổ được sửa trực tiếp hay lập phiếu điều chỉnh? Lịch sử cũ được giữ ra sao?
- Khách báo thiếu/chết khi vận chuyển: bù giống, giảm tiền hay hoàn tiền? Ai duyệt và điều chỉnh số lượng thế nào?

**Mẫu cần xin:** hồ sơ khách, bảng giá, đơn/phiếu giao và một trường hợp bù, hủy hoặc điều chỉnh nếu có.

## G. Thu–chi tiền và công nợ

Tham chiếu: CASH-01–03, SCOPE-05, REPORT-01.

**Q28. Khách cọc trước rồi trả thêm từng lần, mình ghi thế nào để biết họ đã trả bao nhiêu?**

**Mục đích hỏi:** Xác định cách liên kết tiền cọc và từng lần thu với đơn/lần giao, kể cả một khoản trả nhiều đơn và hoàn cọc.

Gợi mở nếu chưa được trả lời:

- Một khoản thu có trả cho nhiều đơn không? Một đơn trả nhiều lần thì anh/chị liên kết các lần thu thế nào?
- Cọc theo tiền hay tỷ lệ, trừ vào lần giao nào; hủy đơn thì hoàn hay giữ lại theo thỏa thuận nào?

**Q29. Khách còn nợ thì anh/chị thường nhớ, kiểm tra và nhắc bằng cách nào?**

**Mục đích hỏi:** Chốt thông tin công nợ khách, hạn mức, hạn thanh toán, trách nhiệm thu và đối soát; xác định nhu cầu nhắc nợ.

- Có hạn mức, ngày đến hạn, người thu và nhắc quá hạn không?

**Q30. Khoản phải trả nhà cung cấp và tiền ứng trước được theo dõi như thế nào?**

**Mục đích hỏi:** Phân biệt hàng nhận, chi phí, ứng trước và tiền thực trả; chốt theo dõi nợ nhà cung cấp qua nhiều lần thanh toán.

- Khi mua chịu hoặc trả nhiều lần, hàng đã nhận, chi phí và tiền đã trả được ghi riêng ra sao?

**Q31. Trại quản lý tiền mặt, ngân hàng và đối chiếu số dư như thế nào?**

**Mục đích hỏi:** Chốt các quỹ/tài khoản và trách nhiệm đối chiếu; phân biệt chuyển nội bộ, tiền chủ trại góp/rút với doanh thu và chi phí.

Gợi mở nếu chưa được trả lời:

- Tiền chủ trại đưa vào, rút ra, chuyển giữa quỹ/ngân hàng hoặc giữa trại được ghi thế nào để không nhầm với bán giống/chi phí sản xuất?
- Có phương thức thanh toán nào khác? Ai giữ quỹ, ghi sổ và kiểm tra số dư thực tế?

**Q32. Nếu ghi nhầm hoặc hoàn lại tiền thu/chi, trại điều chỉnh sổ thế nào?**

**Mục đích hỏi:** Chốt cách sửa/đảo khoản thu–chi, chứng từ và người duyệt; tránh mất lịch sử hoặc tính hai lần tiền đã hoàn.

- Cần chứng từ gì, ai duyệt; lịch sử khoản cũ được giữ ra sao?

**Q33. Khi chuyển sang phần mềm, những số dư đầu kỳ nào cần nhập?**

**Mục đích hỏi:** Xác định dữ liệu chuyển đổi, ngày bắt đầu và số dư được xác nhận để báo cáo tồn, giá vốn, tiền và công nợ không thiếu đầu kỳ.

- Quỹ, ngân hàng, nợ khách, nợ nhà cung cấp, tồn giống/vật tư và chi phí lô đang nuôi: lấy từ ngày nào, ai xác nhận?

**Q34. Phần mềm cần hỗ trợ những chứng từ hoặc kết nối kế toán nào?**

**Mục đích hỏi:** Chốt phạm vi chứng từ, thông tin thuế và xuất/kết nối dữ liệu theo nhu cầu được xác nhận; không tự mở rộng sang toàn bộ kế toán.

- Có cần hóa đơn, thông tin thuế hoặc xuất dữ liệu sang phần mềm đang dùng không? Ai cung cấp mẫu và xác nhận yêu cầu?

**Hỏi sâu về lưu và xuất hóa đơn/chứng từ:**

- Khi bên mình nói “hóa đơn”, đó là phiếu bán hàng nội bộ, phiếu thu hay hóa đơn điện tử? Có thể cho em xem mẫu từng loại đang dùng không?
- Mình lập ở sổ, Excel, phần mềm kế toán hay hệ thống hóa đơn khác? Phần mềm đồ án cần lập phiếu, lưu bản đã lập hay kết nối hệ thống đó?
- Cần lưu số/mã phiếu, ngày, khách, đơn/lần giao, số tiền và thông tin gì khác? Một đơn nhiều lần giao có bao nhiêu chứng từ?
- File và bản giấy giữ ở đâu; đặt tên/thư mục thế nào? Khi khách xin lại, mình tìm theo khách, số phiếu, ngày hay đơn bán?
- Khi gửi khách, thường dùng PDF, bản in, ảnh qua Zalo, email hay cách khác? Có lưu bản đã gửi và xác nhận người nhận không?
- Ai được lập, kiểm tra, xuất file/in, gửi và sửa? Bản nháp khác bản đã gửi ở đâu; có tránh lập hai lần cho cùng giao dịch không?
- Nếu sai hoặc đơn bị hủy, mình xử lý trên hệ thống đang dùng thế nào? Bản cũ và bản điều chỉnh được nối lại ra sao?
- Khách thay đổi địa chỉ/thông tin sau đó, chứng từ cũ có giữ thông tin lúc lập không? Ai được tải xem những file này?
- Cần lưu trong bao lâu và ai xác nhận yêu cầu lưu? Khi mất file hoặc đổi người phụ trách, lấy lại bằng cách nào?

**Mục đích phần hỏi sâu:** Chốt loại chứng từ, dữ liệu, nơi lưu, truy tìm, cách xuất/gửi, quyền và lịch sử điều chỉnh. Việc khảo sát không tự đưa phát hành hóa đơn điện tử vào MVP; cần người phụ trách xác nhận phạm vi và quy trình đang áp dụng.

**Mẫu cần xin:** phiếu thu/chi, sổ quỹ, sổ công nợ, một đơn trả nhiều lần và một lần mua chịu. Không cần thông tin đăng nhập ngân hàng.

## H. Báo cáo, quyền và sử dụng phần mềm

Tham chiếu: SCOPE-03–04, COST-06, DASH-01–03, DB-03, OPS-02, TEST-02.

**Q35. Muốn biết một lứa hoặc tháng vừa rồi lời lỗ thế nào, anh/chị thường xem những số nào?**

**Mục đích hỏi:** Chốt tên, công thức, phạm vi và kỳ báo cáo; phân biệt lãi theo doanh thu–chi phí với chênh lệch tiền thu–chi.

Gợi mở nếu chưa được trả lời:

- Cần xem doanh thu, giá vốn, lãi gộp, tiền thực thu/chi, nợ và tồn theo trại/khu vực/lô/khách như thế nào? Xin mẫu báo cáo hiện dùng.
- Khi nói “lãi”, trại đang tính doanh thu trừ chi phí hay tiền thu trừ tiền chi? Xin công thức đang dùng.
- Cần báo cáo theo ngày, tháng hay cuối lô; báo cáo nào đang mất thời gian nhất?
- Anh/chị thường lọc theo ngày bán, ngày giao hay ngày thu/chi? Cùng một khoản có các ngày khác nhau thì muốn xem ở báo cáo nào?
- Nếu chi phí chưa đủ hoặc chứng từ chưa về, mình muốn nhìn số tạm tính kèm ghi chú hay chờ chốt? Khi bổ sung sau, có cần giữ bản báo cáo đã chốt không?
- Từ một số tổng, anh/chị có muốn bấm xem từng phiếu tạo ra số đó không? Mẫu bảng/biểu đồ và cách làm tròn tiền hiện dùng là gì?

**Q36. Những ai cần được xem và thao tác với dữ liệu kế toán?**

**Mục đích hỏi:** Xây dựng ma trận quyền xem, nhập, duyệt, sửa, hủy và chốt kỳ theo trại/khu vực, dựa trên trách nhiệm thực tế.

- Tách quyền xem giá/chi phí/lãi/nợ với quyền nhập, duyệt, sửa, hủy và chốt kỳ; có giới hạn theo trại/khu vực không?

**Q37. Anh/chị muốn sử dụng và lấy dữ liệu từ phần mềm theo cách nào?**

**Mục đích hỏi:** Chốt thiết bị, cách nhập, đầu ra và nhu cầu khi mạng yếu để thiết kế giao diện và vận hành phù hợp.

- Điện thoại hay máy tính; cần Excel/PDF/in phiếu không? Khi mạng yếu có cần ghi tạm?

**Q38. Nếu phần mềm giúp được vài việc trước, anh/chị muốn nó giúp việc gì nhất?**

**Mục đích hỏi:** Chốt ưu tiên triển khai, bộ dữ liệu đối soát, người xác nhận và tiêu chí chấp nhận trước khi phát triển.

- Chọn một lô/kỳ làm mẫu; số tiền và số lượng phải khớp sổ nào, ai xác nhận sai lệch chấp nhận được?

## I. Buổi đối soát bằng một chu kỳ thật

Chọn cùng một mã lô và kỳ, cùng người phụ trách lần theo:

1. Đầu vào bố mẹ/giống và cách chia chi phí vào lô.
2. Thức ăn/vật tư thực dùng và giá tính cho từng lần.
3. Chi phí chung được phân bổ và tổng giá vốn.
4. Số giống bán được, từng lần giao, giá và doanh thu.
5. Các lần thu tiền, tiền còn phải thu và các khoản đã chi/chưa trả.
6. Số tồn giống, tồn vật tư và chi phí còn lại cuối kỳ.

Nếu thiếu bước nào, ghi nguồn cần lấy thêm và người có thể cung cấp. Không yêu cầu kế toán tự xác nhận các phép đếm hay định mức kỹ thuật khi đó không phải nhiệm vụ của họ.

## J. Mẫu ghi câu trả lời và quyết định

Thông tin buổi phỏng vấn: ngày __________; người trả lời/vai trò __________; trại/phạm vi __________; người ghi __________.

| Mã câu | Cách trại đang làm | Ví dụ/chứng từ | Nhu cầu phần mềm | Người xác nhận thêm | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| Điền Q01–Q38 | Ghi nguyên ý, gồm công thức/đơn vị nếu có | Mã/file đã ẩn danh | Ghi tách với hiện trạng | Kế toán/chủ trại/kỹ thuật/kho | Đã xác nhận / Cần kiểm chứng / Chưa theo dõi |

Sau buổi hỏi, chuyển câu trả lời đã xác nhận sang các ID trong checklist; các đề xuất mới cần chủ trại/người phụ trách duyệt trước khi trở thành quy tắc chính thức. Đây là bộ câu hỏi khảo sát quy trình, không xác lập chính sách kế toán hoặc quy định thuế cho trại.
