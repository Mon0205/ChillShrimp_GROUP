# TỔNG HỢP QUY CHUẨN KỸ THUẬT VÀ CÔNG THỨC QUẢN LÝ TRẠI TÔM GIỐNG
*Tài liệu tổng hợp hệ thống quy chuẩn kỹ thuật, tiêu chuẩn chất lượng, quản lý môi trường và công thức vận hành trang trại nuôi tôm dựa trên nguồn tài liệu chuẩn.*

---

## PHẦN I: QUẢN LÝ GIỐNG VÀ MÔI TRƯỜNG TRẠI TÔM

### 1.1. Thông tin nhận diện lô giống (Seed Lot Identification)
Để đảm bảo khả năng truy xuất nguồn gốc và quản lý biến động chất lượng đàn tôm, hệ thống quản lý cần lưu trữ đầy đủ các nhóm thông tin sau:

*   **Loài & Tên khoa học**:
    *   **Tôm thẻ chân trắng**: *Litopenaeus vannamei* (còn gọi là tôm vẹt, tôm bạc).
    *   **Tôm sú**: *Penaeus monodon*.
    *   *(Các loài phụ trợ khác: Tôm càng xanh - Macrobrachium rosenbergii; Tôm rảo - Metapenaeus sp.; Tôm đất)*.
*   **Giai đoạn phát triển**: 
    *   Giai đoạn Postlarvae (PL) như **PL10, PL12, PL15, PL20...**.
    *   Tài liệu quy định chiều dài thân chuẩn đối với tôm sú giống phải đạt **≥ 12 mm** và tôm thẻ chân trắng đạt **≥ 10 mm**.
*   **Nguồn giống, Trại sản xuất & Mã lô nhà cung cấp**:
    *   Nên chọn trại giống uy tín, có giấy phép đăng ký hành nghề.
    *   Nên ưu tiên thu mua lô giống **có cùng một tôm mẹ** (hoặc đẻ chung một lứa từ cùng một tôm mẹ) để đảm bảo đàn tôm con phát triển đồng đều, tránh mua tôm giống bị trộn từ nhiều tôm mẹ đẻ chung bể.
*   **Nguồn tôm bố mẹ & Đặc tính di truyền (SPF/SPR)**:
    *   Ghi nhận nguồn tôm bố mẹ chất lượng cao, sạch bệnh (SPF - Specific Pathogen Free) hoặc có khả năng đề kháng cao (SPR). 
    *   *Ví dụ thực tế*: Giống tôm thẻ chân trắng **SIS Hawaii (Mỹ)** đảm bảo sạch bệnh, tăng trưởng nhanh; hoặc giống tôm sú **3K+ Super** dòng Mỹ có tốc độ lớn nhanh và đề kháng tốt.
*   **Hồ sơ kiểm dịch & Giấy chứng nhận chất lượng**:
    *   Lưu vết hồ sơ kiểm định y tế, chứng nhận cơ sở sản xuất đạt chuẩn và **kết quả xét nghiệm bệnh thủy sản (PCR)** trước khi xuất/nhập trại.
*   **Ngày sản xuất, Ngày nhập, Ngày thả & Quản lý số lượng**:
    *   Lưu trữ đầy đủ các mốc thời gian: **Ngày đẻ/sản xuất, ngày xuất/nhập trại, ngày thả vào ao/bể**.
    *   Quản lý song song hai chỉ số số lượng: **Số lượng nhập theo chứng từ hóa đơn** và **Số lượng thực tế sau kiểm đếm** (thông qua đếm mẫu thủ công hoặc qua hệ thống xử lý hình ảnh AI).
*   **Phương thức & Thời gian vận chuyển**:
    *   Đảm bảo điều kiện vận chuyển an toàn, **không để nước đựng tôm quá nóng, quá lạnh, quá bí hay quá đục**.
    *   Thời gian vận chuyển cần giữ nhiệt độ nước trong bọc/thùng vận chuyển **cân bằng với nhiệt độ nước ao nuôi** để tôm không bị sốc nhiệt khi đến nơi.
*   **Nhiệt độ và Độ mặn trước/sau khi thả (Thuần hóa độ mặn)**:
    *   Tôm giống giai đoạn Postlarvae có khả năng chịu đựng sự biến động độ mặn rộng.
    *   **Trường hợp lệch độ mặn < 5%**: Thả ngâm bọc tôm trên mặt ao từ **10 - 15 phút** để cân bằng nhiệt độ rồi mới mở bọc cho tôm tự bơi ra.
    *   **Trường hợp lệch độ mặn > 5%**: Cần thuần hóa ngay tại ao bằng cách đổ tôm vào thau lớn (20 lít, sục khí, mật độ 10.000 con/thau), chêm từ từ nước ao vào thau trong **10 - 15 phút** cho tôm thích nghi dần rồi mới nghiêng thau cho tôm bơi ra.
    *   **Đo điều tiết độ mặn nước ngọt**: Nếu nuôi tôm nước mặn trong ao nước ngọt, cần điều chỉnh tỷ trọng nước đạt **1,001** (pha 11g nước biển 17‰ cho 1 m³ nước).

---

### 1.2. Tiêu chí đánh giá chất lượng tôm giống (Quality Assessment Criteria)
Tài liệu kỹ thuật nhấn mạnh **không nên chỉ lưu một trường `quality_status` chung chung**, mà cần lưu trữ chi tiết các chỉ số sinh học, hình ảnh và bằng chứng kiểm tra để dễ dàng truy xuất:

*   **Tỷ lệ sống sau vận chuyển & Các bài thử nghiệm gây sốc (Stress Test)**:
    *   **Gây sốc bằng độ mặn**: Thử nghiệm trên 100 - 200 con mẫu trong 2 giờ (pha tỷ lệ 1:1 nước mặn/nước ngọt nếu độ mặn bể >20‰, hoặc thả thẳng nước ngọt nếu <20‰). Lô giống đạt tiêu chuẩn nếu **tỷ lệ sống đạt >95%** (tỷ lệ chết <5%).
    *   **Gây sốc bằng Formol**: Pha dung dịch Formol nồng độ 200 ppm (2cc/10 lít nước), thả 100 con giống mẫu trong 2 giờ. Đạt tiêu chuẩn nếu **tỷ lệ sống đạt >95%** (tỷ lệ chết <5%).
*   **Dị hình, Kích thước & Độ đồng đều**:
    *   **Độ đồng đều**: Tỷ lệ chênh lệch kích thước giữa các con giống trong cùng một lô **không được vượt quá 5%**.
    *   **Dấu hiệu dị hình & Cấu trúc thân**: Tôm khỏe có **đốt bụng dài, đuôi hình chữ V** và đuôi xòe rộng.
*   **Màu sắc, Hoạt động bơi & Phản xạ**:
    *   **Màu sắc cảm quan**: Vỏ tôm tươi sáng, vỏ mỏng, phần thân và đầu cân đối.
    *   **Hoạt động bơi**: Bơi lội linh hoạt, phân bố đồng đều trong bể.
    *   **Phản xạ bơi ngược dòng (Xoáy nước)**: Khi khuấy tròn nước trong thau, tôm khỏe sẽ **bơi ngược dòng hoặc bám xung quanh thành thau**; tôm yếu sẽ bị cuốn tích tụ vào tâm xoáy ở giữa.
    *   **Phản xạ búng**: Vớt tôm lên dụng cụ chứa và búng nhẹ, đàn tôm khỏe sẽ **phản ứng búng ngay lập tức**.
*   **Mức độ bắt mồi & Tình trạng phụ bộ, vỏ, cơ, đường ruột**:
    *   **Đường ruột**: Quan sát đường ruột tôm phải **chứa đầy thức ăn** (chứng tỏ tôm khỏe, khả năng bắt mồi tốt).
    *   **Tế bào sắc tố (Soi kính hiển vi)**: Tế bào sắc tố vùng bụng xuất hiện dưới dạng **các đốm nhỏ hình sao** là tôm khỏe; nếu lan rộng thành các vạch nối tiếp nhau dưới bụng là tôm có sức khỏe yếu.
    *   **Phụ bộ & Vỏ**: Không bị hoại tử, không sứt sát. Đặc biệt **không bám nấm hoặc ký sinh trùng** trên chân, bụng, đuôi, mang và vỏ tôm (vì ký sinh trùng làm cản trở quá trình hô hấp và lột xác).
*   **Kết quả xét nghiệm bệnh sinh học molecular (PCR) & Thông tin kiểm tra**:
    *   Sử dụng phương pháp phản ứng khuếch đại gen **PCR (Polymerase Chain Reaction)** bằng máy di động (Pockit Xpress, Pockit Micro) hoặc phòng lab để phát hiện các mầm bệnh nguy hiểm như **bệnh đốm trắng (WSSV), virus đầu vàng (YHV)...**.
    *   **Trường dữ liệu bắt buộc lưu trữ**: Số lượng mẫu kiểm tra, Đơn vị xét nghiệm, Phương pháp xét nghiệm (PCR, soi kính hiển vi, cảm quan), Ngày xét nghiệm và Tập tin bằng chứng (ảnh chụp kính hiển vi, phiếu kết quả PCR).

---

### 1.3. Quản lý Môi trường Ao/Bể (Pond/Tank Environment)

#### Các thông số môi trường cần theo dõi định kỳ:
1.  **Nhiệt độ (Temperature)**: Tối ưu từ **25 - 30°C**. Tốc độ phản ứng hóa sinh tăng gấp đôi sau mỗi 10°C tăng lên, dẫn đến nhu cầu Oxy hòa tan trong nước ấm tăng cao hơn hẳn nước lạnh.
2.  **Độ pH**: Khoảng thích hợp nhất là **7.5 - 8.5** (hoặc 7.5 - 9.0). pH < 5.0 làm tôm chậm lớn; pH > 9.5 vào buổi chiều muộn (do tảo nở hoa) gây hại cho tôm.
3.  **Độ mặn (Salinity)**: 
    *   Môi trường lợ/mặn: 5 - 35‰ (5 - 35 ppt) đối với tôm sú và tôm thẻ. 
    *   Môi trường thích nghi nước ngọt: 0.5 - 5‰. 
    *   Độ mặn >40 ppt do bốc hơi mùa hè làm kìm hãm tăng trưởng.
4.  **Oxy hòa tan (DO - Dissolved Oxygen)**: Yếu tố sống còn. Thiếu oxy làm giảm sức đề kháng, gây ngạt và chết hàng loạt (anoxia).
5.  **Khí độc Ammonia (NH₃ / TAN)**: Khí tự do không ion hóa NH₃ cực độc. Tiếp xúc nồng độ **0.45 mg NH₃-N/l làm giảm 50% tốc độ tăng trưởng** của tôm. NH₃ đạt đỉnh sau khi tảo tàn.
6.  **Khí độc Nitrite (NO₂) & Nitrate (NO₃)**: Dạng nitơ hòa tan trong chu trình nitơ của ao nuôi.
7.  **Độ kiềm (KH)**: Duy trì **100 - 150 mg/l CaCO₃** để giữ ổn định hệ đệm pH.
8.  **Độ trong (Secchi Depth)**: Duy trì độ trong khoảng **40 cm** tính từ mặt nước (bằng đĩa Secchi) thông qua gây màu nước vi sinh/phân bón.
9.  **Mực nước & Độ đục**: Mực nước ao nuôi đạt từ **1.5 - 2m**, ao lắng/bể sâu 2 - 3m.
10. **Khí độc Hydro Sulfide (H₂S)**: Sinh ra từ bùn yếm khí đáy ao. Nồng độ **0.1 - 0.2 ppm làm tôm mất thăng bằng**, và chết ngay lập tức ở mức **4 ppm**.

#### Khuyến nghị kiểm tra theo hướng dẫn kỹ thuật FAO:
*   FAO nhấn mạnh việc kiểm tra thường xuyên **DO, pH, Ammonia, Nitrate, Nhiệt độ và Độ trong**.
*   **Thời điểm sáng sớm (Daybreak / Rạng đông)**: Là mốc thời gian đặc biệt quan trọng nhất để kiểm tra DO, vì sau một đêm cả thực vật phù du và tôm đều hô hấp tiêu thụ oxy, nồng độ DO sẽ tụt dốc xuống mức thấp nhất trong ngày.
*   **Phương pháp đo chuẩn từ FAO**:
    *   *Oxy hòa tan (DO)*: Chuẩn độ Winkler (lab) hoặc Đo điện cực cực phổ Polarographic (máy đo DO di động).
    *   *Độ pH*: Electrometric (pH meter chuẩn hóa bằng dung dịch đệm), Colorimetric (comparator Lovibond), hoặc giấy thử pH.
    *   *Ammonia (TAN)*: Phương pháp Phenate (nhanh, chính xác) hoặc Nesslerization.
    *   *Nitrate (NO₃)*: Phương pháp khử Cadmium (Cadmium reduction).

#### Thiết lập Ngưỡng Môi trường Linh hoạt (Dynamic Thresholds Schema):
Hệ thống **không viết cứng (hard-code) ngưỡng trong mã nguồn**, mà lưu trữ theo cấu hình 4 chiều:
$$\text{Loài tôm} + \text{Giai đoạn phát triển} + \text{Loại hệ thống nuôi (Ao/Bể)} + \text{Thông số môi trường}$$

**Bảng mẫu cấu hình ngưỡng môi trường sinh học trong phần mềm:**

| Loài tôm | Giai đoạn phát triển | Loại hệ thống | Thông số | Ngưỡng tối ưu (Optimal) | Ngưỡng cảnh báo (Warning) | Ngưỡng nguy cấp (Danger) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Tôm thẻ chân trắng** | POST_LARVAE (PL12-PL20) | Bể ương công nghệ cao | **DO** | 5.0 - 8.0 mg/l | < 4.0 mg/l | ≤ 3.0 mg/l (Khí ngạt) |
| **Tôm thẻ chân trắng** | JUVENILE (PL20-PL30) | Ao nuôi lót bạt | **DO** | 4.5 - 7.5 mg/l | < 3.5 mg/l | ≤ 2.5 mg/l |
| **Tôm thẻ chân trắng** | ALL | Ao/Bể lợ-mặn | **pH** | 7.5 - 8.5 | < 7.0 hoặc > 9.0 | ≤ 5.0 hoặc ≥ 9.5 |
| **Tôm sú** | POST_LARVAE | Bể lợ | **Độ mặn** | 15 - 25‰ | < 10‰ hoặc > 30‰ | > 40‰ (Chậm lớn) |
| **Tôm thẻ thích nghi** | ADULT | Ao nước ngọt | **Độ mặn** | 0.5 - 5.0‰ | < 0.2‰ | > 10.0‰ |
| **Tất cả các loài** | ALL | Tất cả hệ thống | **NH₃** | < 0.1 mg/l | ≥ 0.3 mg/l | ≥ 0.45 mg/l (Giảm 50% lớn) |
| **Tất cả các loài** | ALL | Ao đất/lót bạt | **H₂S** | 0.00 ppm | ≥ 0.05 ppm | ≥ 0.1 ppm (Mất thăng bằng) |

---

## PHẦN II: CÔNG THỨC QUẢN LÝ VÀ TOÁN HỌC NÔNG NGHIỆP

### 2.1. Cân đối biến động Số lượng hiện tại (Current Quantity Tracking)
Phương pháp **cân đối biến động (Inventory Balance Equation)** tự động cập nhật số lượng con giống tồn thực tế trong ao/bể:

$$\text{Số lượng hiện tại} = \text{Số lượng nhập} - \text{Số lượng chết} - \text{Số lượng đã bán} - \text{Số lượng chuyển ra} + \text{Số lượng chuyển vào} + \text{Số lượng điều chỉnh}$$

*   **Số lượng nhập**: Tổng số lượng con giống kiểm đếm ban đầu khi nhập lô (số lượng thực tế sau kiểm đếm bằng AI hoặc đếm mẫu).
*   **Số lượng chết**: Khai báo hao hụt / tôm chết gom vớt hàng ngày.
*   **Số lượng đã bán / Chuyển ra**: Số lượng xuất bán bớt hoặc điều chuyển sang bể/ao khác.
*   **Số lượng chuyển vào**: Số lượng nhận từ bể/ao khác trong cùng trại.
*   **Số lượng điều chỉnh**: Giá trị cân chỉnh sau các kỳ kiểm kê lại bằng xử lý hình ảnh AI hoặc đếm mẫu thực tế.

---

### 2.2. Tỷ lệ sống (Survival Rate - $S_t$)
Tỷ lệ sống phản ánh sức khỏe đàn tôm và hiệu quả quản lý môi trường:

$$\text{Tỷ lệ sống (\%)} = \left( \frac{\text{Số lượng hiện tại}}{\text{Số lượng ban đầu}} \right) \times 100$$

*   **Quy chuẩn mẫu số (Số lượng ban đầu)**: Cần thống nhất trong toàn hệ thống sử dụng **Số lượng thực tế sau khi thả** (đã qua kiểm đếm ráo nước/xử lý ảnh) thay vì số lượng trên hóa đơn chứng từ của nhà cung cấp.
*   **Ứng dụng**: Là tham số đầu vào bắt buộc để ước tính sinh khối và tính toán khẩu phần ăn hàng ngày.

---

### 2.3. Sinh khối (Biomass - $B_t$)
Sinh khối thể hiện tổng khối lượng thịt tôm hiện có trong ao/bể tại thời điểm lấy mẫu:

$$\text{Sinh khối (kg)} = \frac{\text{Số lượng ước tính} \times \text{Khối lượng trung bình (g)}}{1000}$$

*   **Số lượng ước tính**: Lấy từ *Số lượng hiện tại* (Công thức 2.1).
*   **Khối lượng trung bình (g/con)**: Trọng lượng tôm đo được từ kỳ lấy mẫu tăng trưởng gần nhất (thủ công hoặc ước lượng qua mô hình AI).

---

### 2.4. Mật độ thả nuôi (Stocking Density)
Tính toán mật độ giúp kiểm soát không gian sống, tránh tình trạng mật độ quá dày gây cạnh tranh oxy, thức ăn và phát sinh dịch bệnh:

*   **Đối với Bể ương công nghệ cao (Tank)**:
    $$\text{Mật độ (con/m³)} = \frac{\text{Số lượng ước tính}}{\text{Thể tích bể (m³)}}$$
*   **Đối với Ao nuôi (Pond)**:
    $$\text{Mật độ (con/m²)} = \frac{\text{Số lượng ước tính}}{\text{Diện tích ao (m²)}}$$
*   **Ngưỡng khuyến nghị**: Tôm càng xanh (5 - 10 con/m²), Tôm sú (20 - 30 con/m²), Tôm rảo (5 - 40 con/m²).

---

### 2.5. Lượng thức ăn hàng ngày (Daily Feeding Allowance)
Khẩu phần ăn dự kiến được xác định dựa trên sinh khối và định mức phần trăm sinh khối:

$$\text{Lượng thức ăn dự kiến (kg/ngày)} = \text{Sinh khối (kg)} \times \text{Tỷ lệ cho ăn (\%)} $$

*   **Nguyên tắc FAO**: FAO nhấn mạnh việc tính toán khẩu phần bắt buộc phải linh hoạt điều chỉnh theo **tỷ lệ sống, tổng số lượng, sinh khối, kích thước tôm, nhiệt độ nước, sức khỏe đàn tôm và kiểm tra thực tế tại sàng/vó ăn**.
*   **Quy chuẩn Tỷ lệ cho ăn**: Dao động từ **5% - 10% sinh khối/ngày**. Nhiệt độ nước ấm (30°C) làm tăng tốc độ phản ứng hóa sinh gấp đôi so với 20°C, khiến tôm ăn nhiều hơn và tiêu thụ oxy gấp đôi.
*   **Chỉ số bổ sung cho Postlarvae (PL rất nhỏ)**: Đối với tôm giống nhỏ chưa thể cân trọng lượng chính xác, áp dụng định mức:
    $$\text{Định mức PL} = \frac{\text{Lượng thức ăn (g)}}{1.000 \text{ con / ngày}}$$
*   **Lưu ý về FCR**: Không bắt buộc dùng chỉ số Hệ số chuyển đổi thức ăn (FCR) nếu chưa có dữ liệu cân tổng trọng lượng tôm đáng tin cậy ở giai đoạn tôm giống.

---

### 2.6. Thể tích nước thay (Water Exchange Volume)
Thay nước định kỳ giúp giảm khí độc (NH₃, H₂S), kiểm soát tảo nở hoa và hạ pH vào cuối chiều:

$$\text{Thể tích nước thay (m³)} = \text{Thể tích ao/bể (m³)} \times \frac{\text{Tỷ lệ thay nước (\%)}}{100}$$

*   **Quy chuẩn thay nước**: Thay nước định kỳ **30%/lần/tuần** giúp kích thích tôm lột xác nhanh lớn và pha loãng khí độc H₂S đáy ao.

---

### 2.7. Chi phí trên một con giống & Phân bổ Chi phí chung (Cost Allocation)
Để quản lý chính xác giá vốn con giống xuất xưởng, cần tập hợp chi phí trực tiếp và phân bổ chi phí chung:

$$\text{Tổng chi phí lô} = \text{CP giống} + \text{CP thức ăn} + \text{CP thuốc/chế phẩm} + \text{CP điện/nước} + \text{CP nhân công} + \text{CP vật tư} + \text{CP phân bổ chung}$$

$$\text{Giá vốn / con} = \frac{\text{Tổng chi phí lô}}{\text{Số lượng con giống có thể bán}}$$

#### Phương pháp phân bổ chi phí chung (Điện, Nước, Nhân công, Khấu hao):
1.  **Theo số ngày nuôi (Nuôi bao lâu chịu bấy nhiêu)**:
    $$\text{Chi phí phân bổ} = \text{Tổng CP chung} \times \frac{\text{Số ngày nuôi của lô}}{\text{Tổng số ngày nuôi tất cả các lô}}$$
2.  **Theo thể tích bể / Diện tích ao**:
    $$\text{Chi phí phân bổ} = \text{Tổng CP chung} \times \frac{\text{Thể tích bể của lô (m³)}}{\text{Tổng thể tích bể trại đang sử dụng (m³)}}$$
3.  **Theo số lượng giống (Số lượng thả/ương)**:
    $$\text{Chi phí phân bổ} = \text{Tổng CP chung} \times \frac{\text{Số lượng giống của lô}}{\text{Tổng số lượng giống toàn trại}}$$
4.  **Theo sinh khối hiện tại**: Phân bổ tỷ lệ thuận với sinh khối tôm trong ao.
5.  **Theo tỷ lệ sử dụng thực tế**: Áp dụng cho vật tư/hóa chất xuất kho có ghi nhận phiếu xuất kho chính xác cho từng ao.

---

### 2.8. Cấu trúc Giá bán, Giá sàn & Lợi nhuận gộp (Pricing & Gross Profit)
Giá bán con giống thương phẩm không nên chỉ dựa trên giá vốn mà cần xây dựng cấu trúc giá linh hoạt:

1.  **Cấu trúc Giá bán**:
    $$\text{Giá bán} = \text{Giá cơ sở} + \text{Phụ phí chất lượng (kích cỡ, PCR sạch bệnh)} + \text{Phụ phí chứng nhận (SPF/SPR)} + \text{Phí vận chuyển} - \text{Chiết khấu số lượng}$$
2.  **Giá sàn tối thiểu theo Biên lợi nhuận mục tiêu**:
    $$\text{Giá sàn / con} = \frac{\text{Giá vốn / con}}{1 - \text{Biên lợi nhuận mục tiêu (\%)}}$$
    *(Ví dụ: Giá vốn = 10 đ/con, mong muốn biên lợi nhuận 30% $\rightarrow$ Giá sàn = 10 / (1 - 0.3) = 14.28 đ/con)*.
3.  **Doanh thu**:
    $$\text{Doanh thu} = \text{Số lượng bán} \times \text{Đơn giá bán}$$
4.  **Lợi nhuận gộp**:
    $$\text{Lợi nhuận gộp} = \text{Doanh thu} - \text{Chi phí phân bổ cho số lượng đã bán}$$
    *(FAO xác định hiệu quả kinh tế nuôi tôm phụ thuộc trực tiếp vào **sản lượng, vốn đầu tư, giá thị trường và chi phí sản xuất**).*


---

## PHẦN III: QUY TRÌNH NGHIỆP VỤ CHUẨN TRONG HỆ THỐNG PHẦN MỀM QUẢN LÝ

Dưới đây là 16 bước quy trình nghiệp vụ tiêu chuẩn được thiết kế tích hợp vào hệ thống phần mềm quản lý trại tôm giống, liên kết chặt chẽ dữ liệu sinh học, dữ liệu môi trường IoT, thuật toán thị giác máy tính AI và kế toán quản trị trang trại:

### 3.1. Quy trình Tiền vận hành & Tiếp nhận Giống (Bước 1 - 5)

1. **Tạo hồ sơ nhà cung cấp và tiếp nhận lô giống**:
   * Khởi tạo thông tin nhà cung cấp (tên cơ sở, mã số phép hành nghề, thông tin tôm bố mẹ SPF/SPR, dòng giống như SIS Hawaii, 3K+ Super...).
   * Khai báo thông tin nhập lô: Thời gian nhập, mã lô nhà cung cấp, phương thức vận chuyển và số lượng theo hóa đơn chứng từ.

2. **Ghi nhận thông tin lô, chứng nhận và kết quả xét nghiệm**:
   * Đăng ký mã lô nội bộ (`batch_code`). Lưu hồ sơ chứng nhận chất lượng, giấy kiểm dịch thủy sản.
   * Ghi nhận chi tiết kết quả xét nghiệm bệnh molecular (PCR) cho các vi-rút đốm trắng (WSSV), đầu vàng (YHV)... kèm thông tin đơn vị xét nghiệm, phương pháp và tệp đính kèm phiếu kết quả.

3. **Kiểm tra chất lượng mẫu trước khi thả**:
   * Đánh giá cảm quan và đo đạc sinh học: Đo chiều dài chuẩn (Sú $\ge 12\text{mm}$, Thẻ $\ge 10\text{mm}$), đánh giá độ đồng đều (lệch $<5\%$).
   * Thực hiện và ghi nhận kết quả các bài kiểm tra sức chịu đựng (Stress Test): Gây sốc độ mặn (2 giờ), gây sốc Formol 200ppm (2 giờ) với yêu cầu tỷ lệ sống $\ge 95\%$.
   * Soi kính hiển vi đánh giá phụ bộ, tế bào sắc tố dạng sao, chỉ số đầy ruột và phản xạ bơi ngược dòng / búng.

4. **Chuẩn bị và vệ sinh ao/bể**:
   * Ghi nhận nhật ký cải tạo ao/bể: Rút nước, phơi đáy, khử trùng hóa chất, tu sửa lót bạt và kiểm tra độ dốc 15% cống xi-phông.
   * Ghi nhận quá trình gây màu nước bằng phân vi sinh/chế phẩm, kiểm tra độ trong đĩa Secchi đạt chuẩn $40\text{cm}$ và cấp nước qua lưới lọc túi từ ao lắng tinh.

5. **Ghi nhận quá trình cân bằng nhiệt độ, độ mặn và thả giống**:
   * Đo và ghi nhận thông số môi trường nước bọc/thùng vận chuyển và nước ao/bể trước khi thả (Nhiệt độ, Độ mặn).
   * Thực hiện quy trình thuần hóa: Ngâm bọc $10-15$ phút (khi lệch độ mặn $<5\%$) hoặc thuần hóa trong thau sục khí $10-15$ phút chêm nước ao (khi lệch $>5\%$).
   * Ghi nhận thời điểm thả (sáng sớm/chiều mát) và vị trí thả ở đầu hướng gió.

---

### 3.2. Quy trình Vận hành, Giám sát & Chăm sóc Hàng ngày (Bước 6 - 12)

6. **Theo dõi số lượng, tỷ lệ sống và tình trạng lô giống**:
   * Khởi tạo số lượng ban đầu dựa trên số lượng thực tế kiểm đếm sau khi thả.
   * Cập nhật liên tục tỷ lệ sống ước tính ($S_t$) dựa trên mô hình suy giảm sinh học và quan sát thực địa.

7. **Ghi nhật ký môi trường hằng ngày**:
   * Ghi nhận các chỉ số môi trường qua 2 phương thức: Đo thủ công 2 lần/ngày (sáng sớm và chiều mát) hoặc thu thập tự động chuỗi thời gian từ cảm biến IoT (5-15 phút/lần).
   * Theo dõi chặt chẽ các chỉ số: DO, pH, Nhiệt độ, Độ mặn, $\text{NH}_3$, $\text{NO}_2$, Độ kiềm, Độ trong, Mực nước và $\text{H}_2\text{S}$. Đặc biệt lưu ý đo DO lúc rạng đông theo khuyến nghị FAO.

8. **Ghi nhật ký cho ăn, thay nước và sử dụng chế phẩm**:
   * Ghi nhận lượng thức ăn rải thực tế theo 5 cữ/ngày, loại cám sử dụng và đối chiếu với lượng khuyến nghị lý thuyết từ sinh khối.
   * Ghi nhận lịch thay nước định kỳ (mức chuẩn $30\%$/lần/tuần) và lượng vôi/chế phẩm vi sinh bón vào ao.

9. **Lấy mẫu định kỳ để ước lượng số lượng, kích thước và sinh khối**:
   * Định kỳ $7 - 10$ ngày/lần thực hiện vớt mẫu (50-100 con).
   * Tính toán trọng lượng trung bình ($W_t$), chiều dài ($L_t$) và cập nhật sinh khối ước tính ($B_t = N_t \times W_t / 1000$).

10. **Chụp ảnh mẫu và thực hiện AI Inspection**:
    * Đặt mẫu tôm lên khay chụp tiêu chuẩn (nước siêu nông $<1\text{cm}$, đèn LED tản sáng, thước chuẩn Chrome).
    * Kích hoạt AI Inspection (YOLOv8) để tự động đếm số lượng, đo chiều dài, độ đồng đều và chỉ số đầy ruột.
    * Cho phép kỹ thuật viên xác nhận, hiệu chỉnh số lượng thực tế ($C_{\text{manual}}$) và tính hệ số hiệu chỉnh ($C_f$) để đồng bộ lại dữ liệu.

11. **Sinh cảnh báo khi môi trường hoặc kết quả kiểm tra bất thường**:
    * Đối chiếu tự động dữ liệu IoT và lấy mẫu với bảng cấu hình ngưỡng 4 chiều (`Loài + Giai đoạn + Hệ thống + Thông số`).
    * Kích hoạt thông báo cảnh báo mức `WARNING` hoặc `DANGER` (qua App/SMS/Còi hú) khi vi phạm ngưỡng (ví dụ: $\text{DO} \le 3.0\text{mg/l}$, $\text{pH} \ge 9.5$, $\text{NH}_3 \ge 0.45\text{mg/l}$, $\text{H}_2\text{S} \le 0.1\text{ppm}$).

12. **Ghi nhận hao hụt, chết, chuyển bể hoặc điều chỉnh số lượng**:
    * Ghi nhận số lượng tôm chết gom vớt, tôm hao hụt hoặc tôm điều chuyển giữa các ao/bể.
    * Áp dụng phương thức cân đối biến động tự động cập nhật số lượng tồn hiện tại.

---

### 3.3. Quy trình Tài chính, Xuất bán & Đóng Lô (Bước 13 - 16)

13. **Tính chi phí theo lô**:
    * Tập hợp toàn bộ chi phí trực tiếp: Chi phí giống nhập, chi phí thức ăn rải (từ nhật ký ăn), chi phí thuốc/chế phẩm vi sinh.
    * Phân bổ chi phí chung (điện, nước, nhân công, khấu hao) cho lô theo 1 trong các phương pháp: Theo số ngày nuôi, theo thể tích/diện tích, theo số lượng giống hoặc theo sinh khối.

14. **Lập đơn bán, ghi nhận số lượng và giá bán**:
    * Ước lượng chính xác số lượng tôm giống xuất bán bằng phương pháp Tỷ trọng trọng lượng ($N = C_{\text{ai}} \times W_{\text{lô}} \times 1000 / W_{\text{mẫu}}$) hoặc Mật độ diện tích.
    * Tính toán giá bán dựa trên cấu hình giá: `Giá bán = Giá cơ sở + Phụ phí (kích cỡ, PCR, SPF) + Vận chuyển - Chiết khấu`. Tham chiếu Giá sàn tối thiểu theo biên lợi nhuận mục tiêu.

15. **Đóng lô sau khi bán hết hoặc kết thúc chu kỳ**:
    * Chuyển trạng thái lô giống từ `NUOI` sang `THU_HOACH` (đã bán hết) hoặc `HUY` (hao hụt vụ).
    * Cập nhật số lượng tồn về 0 và khóa các giao dịch phát sinh liên quan đến lô.

16. **Tổng kết tỷ lệ sống, chi phí, doanh thu và lợi nhuận**:
    * Tổng kết tỷ lệ sống thực tế toàn vụ ($S_{\text{cuối}} = N_{\text{bán}} / N_{\text{thả}} \times 100\%$).
    * Báo cáo chỉ số FCR lũy kế toàn vụ ($FCR = \sum \text{Feed} / (B_{\text{bán}} - B_{\text{thả}})$).
    * Tổng kết Doanh thu ròng, Tổng chi phí, Lợi nhuận gộp ($\Pi = \text{Doanh thu} - \text{Chi phí}$), Tỷ suất ROI (%) và Giá thành sản xuất trên 1 con giống hoặc 1 kg tôm thương phẩm.
