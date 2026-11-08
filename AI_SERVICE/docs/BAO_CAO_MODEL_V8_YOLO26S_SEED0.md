# Báo cáo model `v8_yolo26s_seed0`

Đối tượng: model YOLO26s train trên `dataset_v8`, seed 0. Mọi số liệu trong báo cáo do tôi đo trực tiếp, trừ chỗ ghi rõ là ước lượng hoặc lấy từ TECHSPEC. Chỗ nào số liệu chưa đáng tin được ghi rõ.

## 1. Tóm tắt
- **Model tốt về phát hiện trên dữ liệu cùng kiểu với lúc học** (valid: mAP50 0,962), nhưng **trên ảnh test nguyên bản chỉ còn mAP50 0,528**. Con số valid cao không nên dùng để nói về chất lượng thực.
- **Số đếm ở ngưỡng mặc định (`conf=0,25`) hay đếm dư**: loại A sai khoảng 22%, loại C khoảng 18% trên ảnh test cũ; đếm dư là xu hướng chung (bias dương).
- **Ngưỡng `conf=0,35` cho sai số đếm thấp nhất** trên các tập đã đo (A và C đều khoảng 11% trên test cũ), nhưng ngưỡng này được chọn bằng chính các ảnh test nên **con số lạc quan**.
- Trên ảnh ngoài chưa train (H4, H8): phát hiện được khoảng 85% số con (recall 85%) với precision 79%.
- Trên 22 ảnh mlpro giữ riêng (số đếm **tạm**, chưa phải số đếm tay độc lập): loại A sai khoảng 8%, loại C đếm dư khoảng 1,7 con mỗi ảnh. Kết quả này lạc quan vì cùng nơi chụp với dữ liệu train.
- 88% dữ liệu loại A là mảnh cắt từ khoảng 85 ảnh điện thoại ở **một nơi, hai ngày**, nên khả năng tổng quát hóa sang nơi khác **chưa được chứng minh**.
- Chưa đủ tin cậy để thay model mặc định của dịch vụ.

## 2. Nhận dạng model
| Mục | Giá trị |
|---|---|
| Tệp trọng số | `runs/detect/v8_yolo26s_seed0/weights/best.pt` (20,4 MB) |
| Kiến trúc | YOLO26s (Ultralytics 8.4.198), phát hiện vật thể, không dùng NMS (đầu một-một) |
| Số tham số | 9,95 triệu |
| Số lớp | 1: `shrimp-seed` |
| Khởi tạo | Trọng số tiền huấn luyện `yolo26s.pt` (fine-tune) |
| Môi trường chạy | `.venv26` (YOLO26 cần ultralytics từ 8.4.0; `.venv` dùng 8.3.184 không nạp được) |
| Tốc độ suy luận | Lần đo này: CPU khoảng 297 ms mỗi ảnh, GPU (RTX 3050 Laptop) khoảng 39 ms. Lần đo trước với model cùng kiến trúc cho CPU 113 ms và GPU 24 ms; chênh lệch có thể do tải máy, mỗi lần chỉ đo một lượt trên 15 ảnh |
| Có thay model mặc định của dịch vụ chưa | **Chưa**. Mặc định vẫn là `shrimp_seed_yolov8n` |

## 3. Mục tiêu và phạm vi
- **Mục tiêu:** đếm tôm giống trong ảnh. Số đếm = số khung sau khi lọc theo ngưỡng tin cậy `conf`.
- **Thước đo chính:** sai số số đếm (không chỉ mAP).
- **Phạm vi:** loại A (tôm nhỏ, thân sẫm, trên 100 con) và loại C (cận cảnh, thưa). **Loại B đã bỏ khỏi phạm vi** vì chỉ có 2 ảnh nguồn và không thu thêm được.
- **Ngoài phạm vi:** tôm con kích thước lớn (như ảnh H8), ảnh quay lại màn hình, tôm xếp nhiều lớp, video. Dịch vụ không tự từ chối các ảnh này.
- Giai đoạn và loài tôm là **giả định của đồ án**, không xác nhận được với trại giống.

## 4. Dataset (`dataset_v8`)
### 4.1 Thành phần dữ liệu train
| Loại | Nguồn | Số file train | Ghi chú |
|---|---|---:|---|
| A | Mảnh cắt từ mlpro | 837 (88%) | Ảnh điện thoại, một nơi, 2 ngày (07 và 09/01/2024) |
| A | Bộ PL Detection (MIT) và ảnh thật cũ | 68 | Gồm `real_001`, `real_004` và phần train của 13 ảnh PL dày (một số ảnh PL nằm ở valid và test) |
| A | 4 ảnh internet do bạn gán nhãn (R1, R7, R9, R10) | 42 | Nguồn và giấy phép chưa xác minh |
| C | Dataset gốc Roboflow | 257 | Ảnh 640×640 cận cảnh |
| C | Mảnh cắt từ mlpro | 291 | Nhiều ảnh nền có đốm, ít tôm |
| **Tổng** | | **1.495 ảnh, 36.937 khung** | A: 33.689 khung; C: 3.248 khung |

Loại A được cắt thành ô 320 px khi dựng dữ liệu; loại C giữ nguyên. Không lặp ảnh (`--no-balance`).

### 4.2 Chia tập
| Tập | Số ảnh | Số khung | Vai trò |
|---|---:|---:|---|
| Train | 1.495 | 36.937 | Dạy model |
| Valid | 21 | 521 | Theo dõi lúc train, chọn `best.pt` |
| Test | 15 (5 loại A, 10 loại C) | 707 | Ảnh nguyên bản, đo số đếm. **Giống hệt `dataset_v5` và `dataset_v6`** nên so sánh được |
| Ảnh giữ riêng | H4, H8 (2 ảnh), 22 mảnh mlpro | 72 và 22 ảnh | **Không nằm trong dataset nào**, không bao giờ train |

**Nguyên tắc chia:** theo ảnh gốc, nghĩa là mọi mảnh của một ảnh gốc luôn cùng một tập. Đã kiểm tra: không có ảnh gốc nào của bộ mlpro lọc bị tách giữa các tập.

### 4.3 Giấy phép và nguồn
Bộ mlpro: CC BY 4.0 (phải ghi nguồn), ghi trong `external_mlpro/SOURCE.json`. Bộ PL Detection: MIT. 5 ảnh internet: giấy phép chưa xác minh (`to_label/SOURCES.json`). Ảnh dùng để phát hành hay đưa vào báo cáo cần được kiểm tra bản quyền.

### 4.4 Hạn chế của dữ liệu
- Loại A gần như chỉ đến từ **một nơi chụp**; khả năng tổng quát hóa sang nơi khác chưa được đo.
- Nhãn của mlpro và PL Detection là nhãn của bên thứ ba, **chưa được duyệt tay**; một số con chưa có nhãn, nhất là ở loại C (khoảng 39% khung model tin cậy cao ở mảnh test C không có nhãn bên dưới, một phần có thể là khung thừa của model).
- Ảnh mlpro bị kéo giãn về 640×640.
- Không có ảnh nền chụp riêng có rác; các mảnh C của mlpro đóng vai trò gần đúng.

## 5. Quy tắc gán nhãn
Theo TECHSPEC mục 2.4:
1. **Một khung cho mỗi con** phân biệt được.
2. Khung bao **vùng đầu và thân sẫm** (quy ước "vòng đầu"), **không** bao đuôi và râu mảnh.
3. Con bị che một phần: chỉ bao phần nhìn thấy được. Con bị che kín: không gán.
4. Khi cắt ảnh thành ô để train, khung được giữ nếu còn ít nhất **50% diện tích** nằm trong ô.
5. Định dạng YOLO: `class_id x_center y_center width height`, chuẩn hóa 0 đến 1; lớp duy nhất là `0`.

**Chưa nhất quán, cần lưu ý khi đọc kết quả:** nhãn `real_007` (ảnh test loại A), `real_003`, H4 và H8 dùng khung to hơn quy ước vòng đầu (bao cả thân hoặc cả vùng đầu-ngực). Điều này làm các chỉ số theo IoU (mAP) trên ảnh test và H4, H8 bị kéo xuống, nhưng **không ảnh hưởng** đến số đếm.

## 6. Cách train
### 6.1 Cấu hình
| Tham số | Giá trị | Lý do |
|---|---|---|
| Epoch | 60 | Epoch tốt nhất thường nằm giữa lần chạy |
| Batch | 4 | Batch 8 từng hết bộ nhớ GPU 4 GB |
| imgsz | 640 | Khớp với lúc suy luận |
| Seed | 0 | Một trong 3 seed (0, 1, 2) |
| Thiết bị | GPU, `workers=2` | |
| Tối ưu | `auto` (Ultralytics tự chọn) | `lr0` bị bỏ qua khi `auto` |
| Lật ngang và dọc | 0,5 và 0,5 | Ảnh nhìn từ trên xuống, không có hướng cố định |
| Xoay | **0 (tắt)** | Xoay làm khung quanh tôm mảnh bị lỏng |
| Đổi màu (hsv h, s, v) | 0,015, 0,5, 0,4 | Chịu được ánh sáng khác nhau |
| Phóng thu (scale) | 0,5 | |
| Ghép 4 ảnh (mosaic) | 1,0, tắt ở 10 epoch cuối | Epoch cuối học ảnh nguyên bản |
| `max_det` | 1000 | Trần số khung (ảnh dày) |

### 6.2 Diễn biến
- Thời gian: **48,4 phút**.
- Epoch tốt nhất theo chỉ số tổng hợp của Ultralytics (0,1×mAP50 + 0,9×mAP50–95): **epoch 46** (P 0,920, R 0,919, mAP50 0,962, mAP50–95 0,430).
- Epoch cuối (60): P 0,916, R 0,891, mAP50 0,955, mAP50–95 0,409.
- Loss train giảm từ khung 1,90 xuống 1,28, phân loại 1,30 xuống 0,48. Loss khung trên valid giảm ít hơn (2,24 xuống 2,04): model khớp ảnh train nhiều hơn ảnh valid, dấu hiệu bình thường của việc học trên ít ảnh valid.

### 6.3 Lệnh tái tạo (chạy ở thư mục gốc dự án)
```powershell
# dựng dữ liệu
.\.venv\Scripts\python.exe dataset_expansion\build_domain_dataset.py --spec dataset_expansion\domains_spec_v8.json --out dataset_v8 --holdout 5 --valid 2 --no-balance --lenient --reviewed
# train
.\.venv26\Scripts\python.exe dataset_expansion\train_reviewed.py --data dataset_v8\data.yaml --reviewed --model yolo26s.pt --name v8_yolo26s_seed0 --epochs 60 --seed 0
```

## 7. Kết quả trả về của dịch vụ
Khi chạy `uvicorn ai_service.main:app` với `MODEL_PATH=runs/detect/v8_yolo26s_seed0/weights/best.pt`, `POST /predict` nhận ảnh JPG hoặc PNG và trả JSON:

| Trường | Ý nghĩa |
|---|---|
| `count` | Số con đếm được (= số khung) |
| `detections` | Danh sách khung: `box` (`x1,y1,x2,y2` pixel ảnh gốc), `confidence`, `class` |
| `max_det`, `max_det_reached` | Trần số khung và cờ báo bị cắt |
| `mean_confidence`, `low_confidence_ratio` | Điểm tin cậy trung bình và tỉ lệ khung dưới 0,4. **Chỉ để tham khảo, không phải cờ báo đếm sai** |
| `image_url`, `annotated_image_url` | Ảnh gốc và ảnh có khung trên Cloudinary |

Tham số khuyến nghị: `imgsz=640`, `max_det=1000`, `tile_size=0`; `conf` xem mục 9.3. Để thử nhanh không qua dịch vụ: `predict_folder.py`.

## 8. Kết quả đánh giá
### 8.1 Chỉ số phát hiện
| Tập | P | R | mAP50 | mAP50–95 |
|---|---:|---:|---:|---:|
| Valid (21 ảnh) | 0,918 | 0,917 | 0,962 | 0,430 |
| Test (15 ảnh nguyên bản) | 0,674 | 0,710 | **0,528** | **0,173** |

**Valid cao hơn test rất nhiều.** Valid gồm chủ yếu các ô cắt cùng kiểu với ảnh train; test là ảnh nguyên bản, dày hơn, và một phần có nhãn khung to hơn quy ước (`real_007`). Vì vậy mAP trên valid **đánh giá quá cao** chất lượng thực tế.

### 8.2 Số đếm trên 15 ảnh test (`conf=0,25`, cả ảnh)
| Loại | Ảnh | Số thật | Model đếm |
|---|---|---:|---:|
| A | `real_007` | 124 | 193 |
| A | APL_1002… | 109 | 110 |
| A | APL_940… | 150 | 192 |
| A | APL_930… | 146 | 154 |
| A | APL_928… | 121 | 143 |
| C | 10 ảnh | 0 đến 12 | Chênh 0 đến 4 con mỗi ảnh |

| Chỉ số | Loại A (5 ảnh) | Loại C (10 ảnh) |
|---|---|---|
| Sai số tương đối | **21,6%** | **18,1%** |
| Xu hướng | **Đếm dư ở cả 5 ảnh** (bias +28 con) | Đếm dư nhẹ (bias +0,8 con) |

### 8.3 Ảnh ngoài chưa train: H4 và H8 (72 con, `conf=0,25`)
| Ảnh | Thật | Đếm | Recall | Precision |
|---|---:|---:|---:|---:|
| H4 | 42 | 55 | 88% | 71% |
| H8 | 30 | 25 | 80% | 96% |
| **Gộp** | 72 | 80 | **85%** | **79%** |

Recall và precision tính theo tiêu chí **tâm khung dự đoán nằm trong khung thật**, vì khung gán tay to hơn khung model. Chỉ 2 ảnh, nên chỉ là dấu hiệu.

### 8.4 22 ảnh mlpro giữ riêng (**tạm**)
Số thật lấy từ `agreed_count`, trong đó 20 trên 22 số bằng nhãn nháp của bên thứ ba và chưa có người đếm thứ hai, nên **chưa phải số đếm tay độc lập**.

| Loại | Sai số tương đối | MAE | Bias |
|---|---:|---:|---:|
| A (10 ảnh, 101 đến 254 con) | khoảng 8% | 9,3 con | +8,5 |
| C (12 ảnh, 1 đến 8 con) | không nên dùng % (mẫu số rất nhỏ) | 1,7 con | +1,7 |

Kết quả tốt, nhưng **lạc quan** vì ảnh cùng nơi chụp với dữ liệu train.

### 8.5 Ba seed (đo cùng cách)
| Chỉ số | seed 0 | seed 1 | seed 2 | Trung bình, dao động |
|---|---:|---:|---:|---|
| Test cũ, A cả ảnh | 22% | 24% | 10% | 18,7%, từ 10 đến 24 |
| Test cũ, C cả ảnh | 18% | 13% | 8% | 13,0%, từ 8 đến 18 |
| H4 và H8, recall | 85% | 63% | 68% | 72%, từ 63 đến 85 |
| H4 và H8, precision | 79% | 77% | 81% | 79%, từ 77 đến 81 |
| mlpro, A cả ảnh | 8% | 8% | 10% | 8,7%, từ 8 đến 10 |
| mlpro, C MAE (con) | 1,7 | 1,8 | 1,3 | 1,6 |

Seed 0 **không phải seed tốt nhất** ở ảnh test cũ (A 22%, C 18% đều cao hơn seed 2) nhưng có recall cao nhất ở H4 và H8. Dao động giữa các seed lớn (ví dụ A trên test cũ từ 10% đến 24%).

### 8.6 So với các lần train trước (chỉ có YOLO26s)
| Chỉ số | `v5` (3 seed) | `v6` (seed 0) | `v8` seed 0 |
|---|---|---|---|
| Test cũ, A cả ảnh | 22,7% | 16% | 22% |
| Test cũ, C cả ảnh | 17,3% | 19% | 18% |
| H4 và H8, recall | 44% | 47% | 85% |
| H4 và H8, precision | 53% | 67% | 79% |
| mlpro, A cả ảnh | 22% | 19% | 8% |
| mlpro, C đếm dư mỗi ảnh | +48 con | +86 con | +1,7 con |

- **Test cũ: không cải thiện** (trong mức nhiễu giữa các seed).
- **H4 và H8: recall tăng rõ** (từ 44% và 47% lên 85% ở seed này, và 63% đến 85% ở cả 3 seed).
- **mlpro: lỗi đếm dư ở loại C được sửa**, nhưng phép so sánh lạc quan vì mlpro cùng nơi với dữ liệu train mới.

## 9. Độ tin cậy và sai số
### 9.1 Tổng hợp theo nơi đo (seed 0, `conf=0,25`)
| Nơi đo | Độ tin cậy của phép đo | Sai số |
|---|---|---|
| Test cũ (15 ảnh, nhãn gốc) | Trung bình (ít ảnh, nhãn gốc) | A 21,6%, C 18,1% |
| H4 và H8 | Thấp (2 ảnh) nhưng độc lập | Recall 85%, precision 79% |
| 22 ảnh mlpro | **Thấp** (số thật tạm, cùng nơi chụp) | A khoảng 8%, C +1,7 con |

### 9.2 Điểm tin cậy `confidence` và ngưỡng `conf` (seed 0)
| `conf` | Test cũ A | Test cũ C | H4 và H8 recall | H4 và H8 precision | mlpro A bias | mlpro C MAE |
|---:|---:|---:|---:|---:|---:|---:|
| 0,15 | 49% | 36% | 93% | 77% | +19,2 | 2,5 |
| **0,25** (mặc định) | 22% | 18% | 85% | 79% | +8,5 | 1,7 |
| **0,35** | **11%** | **11%** | 72% | 78% | +1,4 | 1,1 |
| 0,45 | 12% | 31% | 61% | 76% | −5,7 | 1,2 |
| 0,55 | 27% | 86% | 51% | 76% | −17,9 | 1,2 |

- **Tăng `conf` làm bias đổi từ dương sang âm**: ở 0,25 model đếm dư, ở 0,45 đến 0,55 đếm thiếu.
- **Precision gần như không đổi** (khoảng 76% đến 79%) khi tăng `conf`, nhưng **recall giảm mạnh**. Nghĩa là nâng ngưỡng không loại được khung thừa trên H4 và H8 mà chỉ mất thêm tôm thật.
- **Loại C rất nhạy với `conf`** (11% ở 0,35, 31% ở 0,45, 86% ở 0,55), vì ảnh thưa có điểm tin cậy thấp (trung bình 0,41 đến 0,53).
- Điểm tin cậy **không phải xác suất đã hiệu chỉnh** và **không báo trước được ảnh đếm sai** (đã đo trước đó).

### 9.3 Khuyến nghị cấu hình
- **Ứng viên:** `conf=0,35`, cả ảnh, `imgsz=640`, `max_det=1000`, không cắt ô.
- **Cảnh báo:** `0,35` được chọn bằng chính các ảnh test đã đo, nên sai số 11% là con số **lạc quan**. Cần kiểm tra lại trên ảnh mới trước khi dùng. Nếu ưu tiên không bỏ sót tôm (recall), dùng `0,25`.
- Không dùng cắt ô 320 cho ảnh tôm to; trên mlpro và test cũ nó không có lợi ở model này.

### 9.4 Điều có thể và không thể khẳng định
| Có thể nói | Không thể nói |
|---|---|
| Model phát hiện được phần lớn tôm trong ảnh cùng kiểu với dữ liệu train | Model chính xác trên ảnh từ nơi khác |
| `conf` quyết định xu hướng đếm dư hay thiếu | Có một `conf` đúng cho mọi ảnh |
| Thêm dữ liệu mlpro sửa lỗi đếm dư trên nền có đốm | Đã đủ để thay model mặc định |
| Hai model ngang nhau ở các vòng trước (YOLOv8s và YOLO26s) | YOLO26s hơn hẳn YOLOv8s (không so được trên `v8`) |

## 10. Điểm yếu đã biết
1. **Đếm dư ở ảnh dày** với `conf=0,25` (đặc biệt `real_007`: 193 trên 124).
2. **Phụ thuộc vào một nguồn dữ liệu** (mlpro chiếm 88% loại A).
3. **Nhãn bên thứ ba chưa duyệt**, quy ước khung không đồng nhất ở vài ảnh.
4. **Ngưỡng tin cậy nhạy với loại C.**
5. **Tôm to** (kiểu H8) ngoài phạm vi; kết quả có thể thấp hơn.
6. Mốc so sánh `v5`, `v6` chỉ còn một seed (hoặc ba seed cho riêng 15 ảnh test cũ).
7. Giai đoạn và loài tôm chưa xác nhận; loại B không hỗ trợ.

## 11. Quy định về ảnh chụp
Model chỉ đáng tin khi ảnh đầu vào giống ảnh nó đã học. Quy định này nhằm giữ ảnh mới trong phạm vi đó. Mỗi quy định có nhãn: **[Số liệu]** nếu có đo trong dự án, **[Đề xuất]** nếu là khuyến nghị chưa được kiểm chứng bằng thí nghiệm.

### 11.1 Yêu cầu bắt buộc (ảnh không đạt thì không dùng để đo hay train)
| # | Quy định | Vì sao | Nhãn |
|---|---|---|---|
| 1 | **Chụp trực tiếp** bằng camera, từ trên xuống. **Không chụp màn hình, không qua video mạng xã hội** | Video quay lại màn hình Facebook cho số đếm dao động từ 12 đến 86 trong 7 giây; khung mờ chỉ nhận được khoảng 12 con dù tôm vẫn dày | [Số liệu] |
| 2 | **Tôm đúng cỡ trong khung hình:** vùng đầu-ngực của một con rộng khoảng **2% cạnh dài ảnh** (13 đến 15 px khi ảnh được thu về 640) | Dữ liệu train có khung đầu rộng 2,0% đến 2,4% cạnh dài ảnh; tôm to hơn nhiều (ảnh H8) nằm ngoài kích thước đã học. Các model trước nhận H8 rất kém (YOLO26s `v5` chỉ tìm 1 trên 30 con); model seed 0 tìm 24 trên 30 nhưng chỉ có **một ảnh thử**, chưa đủ để đảm bảo | [Số liệu] |
| 3 | **Tôm giống nhỏ**, không phải tôm con kích thước lớn | Ảnh kiểu H8 (tôm to, đuôi quạt rõ) ngoài phạm vi; kết quả không được đảm bảo và không được báo cáo là độ chính xác | [Số liệu] / [Đề xuất] |
| 4 | **Ảnh nét**: nhìn rõ đầu từng con khi phóng 100%. Không rung, không mờ do chuyển động | Khung mờ làm số đếm tụt mạnh (video thử: từ khoảng 80 xuống 12) | [Số liệu] |
| 5 | **Không để thứ khác trong khung**: tay, ngón tay, nhãn, thước, logo, chữ chìm | Các model trước từng vẽ khung lên ngón tay cái; ảnh có chữ chìm bị loại khỏi dữ liệu | [Số liệu] (với model cũ) |
| 6 | **Ảnh gốc, không nén lại nhiều lần**, JPG hoặc PNG, cạnh dài từ khoảng **1600 px** trở lên với ảnh mới (ảnh cũ tối thiểu khoảng 600 px) | Ảnh nhỏ và nén nặng bị loại (đã loại ảnh 192×128, 299×168 và 363×295) | [Số liệu] / [Đề xuất] cho 1600 px |

### 11.2 Điều kiện chụp nên có
| # | Quy định | Vì sao | Nhãn |
|---|---|---|---|
| 7 | **Nền sáng, nhẵn, một màu** (tô, khay trắng hoặc xám nhạt); không hoa văn | Dữ liệu train chủ yếu là tô và khay trắng hoặc xám | [Số liệu] |
| 8 | **Nước sạch, ít đốm bẩn, bọt, vụn** | Đốm và vụn trong nước bị nhận thành tôm: loại C từng đếm dư +48 đến +86 con mỗi ảnh ở model trước; vẫn dư 1 đến 2 con ở model hiện tại | [Số liệu] |
| 9 | **Một lớp tôm, không xếp đống**; phần lớn các con thấy rõ đầu | Ảnh dày bị đếm dư ở `conf=0,25` (193 trên 124); đầu chồng nhau không phân biệt được | [Số liệu] |
| 10 | **Máy song song mặt nước** (lệch dưới khoảng 10 độ), nhìn thẳng xuống | Dữ liệu train đều chụp từ trên xuống | [Đề xuất] |
| 11 | **Nước nông** (khoảng 1 đến 2 cm) để tôm nằm một lớp | Giảm chồng lấn và mờ do độ sâu | [Đề xuất] |
| 12 | **Ánh sáng đều và mềm**, không flash, tránh phản chiếu và bóng đổ đậm | Giảm bóng và vệt sáng bị nhận nhầm | [Đề xuất] |
| 13 | **Lấy nét vào mặt nước** (chạm lấy nét trên điện thoại), **không zoom số**, giữ máy chắc hoặc dùng giá đỡ | Tránh mờ và mất chi tiết | [Đề xuất] |
| 14 | **Mỗi mẫu chụp 3 ảnh**, khuấy hoặc xoay tô giữa các lần | Có nhiều vị trí tôm khác nhau; lấy trung vị nếu cần | [Đề xuất] |
| 15 | Khung hình **có thể gồm một phần mép tô** | Ảnh test có mép tô vẫn không sinh khung thừa trên mép | [Số liệu] (1 ảnh kiểm tra) |

### 11.3 Cách chụp, từng bước
1. Đặt mẫu tôm vào tô hoặc khay sáng, nước nông, khuấy nhẹ cho tôm trải đều, chờ nước yên.
2. Đặt máy phía trên, song song mặt nước, ở độ cao để **đầu một con tôm rộng khoảng 2% cạnh dài ảnh** (quy ước ước tính: chiều rộng khung hình khoảng 50 lần chiều dài vùng đầu-ngực).
3. Lấy nét vào mặt nước, tắt flash, không zoom số.
4. Chụp 3 ảnh, khuấy nhẹ giữa các lần.
5. Xem lại ảnh: nếu mờ, có tay, có phản chiếu mạnh thì chụp lại.
6. Ghi nhanh cho mỗi ảnh: vật chứa, máy chụp, ngày, nguồn; tuổi PL, loài, thể tích nước **chỉ ghi nếu biết** (đồ án không có xác nhận từ trại giống).

### 11.4 Danh sách kiểm tra nhanh trước khi dùng một ảnh
- [ ] Chụp trực tiếp, từ trên xuống, không phải ảnh màn hình
- [ ] Nét, đầu từng con nhìn rõ
- [ ] Tôm nhỏ và đúng cỡ (đầu khoảng 2% cạnh dài ảnh)
- [ ] Nền sáng, một màu, nước sạch
- [ ] Một lớp tôm, không xếp đống
- [ ] Không có tay, nhãn, logo, chữ chìm
- [ ] Ảnh gốc, cạnh dài từ khoảng 1600 px (ảnh mới)
- [ ] Đã ghi nguồn, vật chứa, ngày chụp

### 11.5 Kiểm tra ảnh đã chụp bằng model
```powershell
.\.venv26\Scripts\python.exe predict_folder.py --source "duong\dan\thu_muc_anh" --conf 0.35
```
Mở ảnh trong `predict_out/` và đối chiếu với số đếm tay. Dấu hiệu ảnh chụp chưa tốt: khung nằm trên đốm bẩn hoặc mép tô, nhiều con thấy rõ mà không có khung, số đếm lệch xa số tay. Với ảnh dạng này, nên chụp lại thay vì chỉnh `conf`.

### 11.5b Cảnh báo tự động về ảnh chụp
Mô-đun `ai_service/photo_check.py` kiểm tra ảnh và kết quả, rồi trả danh sách cảnh báo (`code`, `level` là `warning` hoặc `info`, `message` tiếng Việt):
- Trường **`photo_warnings`** trong kết quả `/predict` (mảng rỗng nếu không có gì đáng nói).
- Script `predict_folder.py` in cảnh báo dưới từng ảnh.

| Mã | Khi nào | Quy định liên quan |
|---|---|---|
| `low_resolution` / `resolution_below_recommended` | cạnh dài dưới 800 px / dưới 1600 px | độ phân giải |
| `blurry` | độ mờ (phương sai Laplacian) dưới 3 | ảnh nét |
| `too_dark`, `too_bright` | độ sáng trung bình dưới 60 hoặc trên 210 | ánh sáng đều |
| `shrimp_too_small`, `shrimp_too_large` | cạnh khung trung vị dưới 0,8% hoặc trên 6% cạnh dài ảnh | cỡ tôm so với ảnh |
| `no_detection`, `low_confidence`, `max_det_reached` | không tìm thấy gì; đa số khung tin cậy thấp; chạm giới hạn khung | ảnh ngoài phạm vi |

**Giới hạn:** không phát hiện được tay, logo, ảnh chụp màn hình, độ sâu nước, góc máy. Các ngưỡng là ước lượng, chỉ chỉnh thử trên khoảng 25 ảnh của dự án (ngưỡng mờ ban đầu bật nhầm trên ảnh đếm bình thường nên đã nới), **chưa kiểm chứng** là cảnh báo có đi cùng số đếm sai. Ảnh trong dataset đa số 640 px nên sẽ bị cảnh báo độ phân giải; quy định này áp dụng cho ảnh chụp mới.

### 11.6 Điều chưa kiểm chứng
- Các ngưỡng độ sâu nước, góc lệch, ánh sáng (quy định số 10, 11, 12) và cạnh dài 1600 px là **đề xuất**, chưa có thí nghiệm so sánh.
- Quy định 2 (cỡ tôm) dựa trên kích thước khung đo trong nhãn hiện có (loại A, 2,0% đến 2,4%); chưa đo cho loại C.
- Mọi quy định trên chỉ bảo đảm ảnh **thuộc phạm vi** của model; chúng **không** bảo đảm số đếm chính xác (xem mục 9).

## 12. Việc cần làm tiếp
1. Đếm lại 22 ảnh mlpro trên ảnh sạch, có **người thứ hai** đếm độc lập, rồi đo lại mục 8.4.
2. Thu ảnh thật từ **nơi và máy khác** (mục 2.6 của TECHSPEC) và đo trên đó để biết khả năng tổng quát hóa.
3. Kiểm tra lại ngưỡng `conf=0,35` trên ảnh mới trước khi dùng.
4. Duyệt tay nhãn bên thứ ba ở các ảnh test, nhất là loại C.
5. Xác minh giấy phép 5 ảnh internet trước khi công bố.
