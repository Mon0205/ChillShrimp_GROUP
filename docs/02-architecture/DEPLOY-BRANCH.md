# Nhánh `deploy`: những gì đã thêm so với `master`

Tài liệu này dành cho người duyệt pull request `deploy` → `master`. Nó liệt kê mọi file nhánh `deploy` thêm hoặc sửa, lý do của từng thay đổi, những gì đã kiểm tra, và những việc phải làm trước khi merge hoặc deploy.

## Tóm tắt

- **Gốc nhánh:** `master` tại commit `27952f4` (đã có YOLO26s, cảnh báo ảnh, số đếm xác nhận).
- **Nguồn thay đổi:** repo deploy v2 (`noat04/chillshrimp-deploy-v2`, nhánh `main`, commit `bde754e`). Bản v2 được tạo từ commit `d6aacb5` của repo nhóm, nên phần nghiệp vụ hai bên giống hệt; nhánh `deploy` chỉ nhận các file v2 đã thêm hoặc sửa.
- **Cách lấy:** `git checkout <commit v2> -- <đường dẫn>`, chép nội dung file mà không trộn lịch sử hai repo.
- **Quy mô:** 86 file: 69 file mới (53 file trong `FE/android/`), 17 file sửa; chưa tính tài liệu này.
- **Kết quả:** sau khi chép, nhánh `deploy` trùng với v2 ở mọi file được git theo dõi.

Có 4 nhóm thay đổi:

| Nhóm | Mục đích | Cần ở mọi môi trường? |
|---|---|---|
| 1. AI chạy bằng ONNX Runtime | Vừa 512 MB RAM của Render Free | Không bắt buộc; có lợi vì image nhẹ hơn nhiều |
| 2. BE chịu được AI ngủ và BE khởi động lại | Không còn lần kiểm tra kẹt mãi ở `processing` | **Có** |
| 3. FE: chụp ảnh, chờ kết quả, app Android, PWA | Dùng trên điện thoại | Chụp ảnh và chờ kết quả: **có**. Android: chỉ khi làm app |
| 4. Cấu hình deploy và tài liệu | Render, Vercel, Docker | `openssl`, `.gitignore`: **có**. `vercel.json`: chỉ khi dùng Vercel |

## 1. AI_SERVICE: ONNX Runtime thay PyTorch

| File | Thay đổi |
|---|---|
| `app/detector.py` (mới) | Lớp `OnnxYoloDetector` chạy `best.onnx` bằng ONNX Runtime: letterbox kiểu `rect`, lọc theo `conf`, NMS theo lớp (IoU 0,7), giới hạn `max_det`, đổi tọa độ về ảnh gốc, vẽ khung cho ảnh annotate. Làm lại đúng các bước `predict` của Ultralytics 8.4.198 |
| `app/main.py` | Bỏ `torch`, `ultralytics`; `get_model()` trả `OnnxYoloDetector`. Bỏ `plot_detections` (dùng `detector.annotate`), ảnh annotate là RGB thay vì BGR. `DEFAULT_MODEL_PATH` = `models/best.onnx`, `DEFAULT_MODEL_VERSION` = `v8_yolo26s_seed0_onnx`. Tiling, `photo_check`, upload Cloudinary giữ nguyên |
| `models/best.onnx` (mới, 38,4 MB) | Model YOLO26s xuất từ `best.pt` (20,4 MB, vẫn giữ trong repo để xuất lại) |
| `scripts/export_onnx.py` (mới) | Xuất `best.pt` → `best.onnx` (`dynamic=True` để `imgsz` và tiling vẫn dùng được), in shape và metadata để đối chiếu |
| `requirements.txt` | Bỏ `ultralytics`; thêm `onnxruntime==1.20.1`, `opencv-python-headless==4.10.0.84`, `numpy==2.1.3` |
| `Dockerfile` | Không cài PyTorch, không cài gói apt (OpenCV headless không cần libGL). `MODEL_PATH=/app/models/best.onnx`, `ORT_NUM_THREADS=1`, nghe cổng `${PORT:-8001}` vì Render cấp cổng qua `$PORT` |
| `.dockerignore` (mới) | Không đưa `.env`, `docs/`, `scripts/`, `models/*.pt` vào image |
| `README.md` | Thêm mục ONNX Runtime, bảng biến `ORT_NUM_THREADS`, `PORT`, cách xuất lại model |

**Lý do.** Bản PyTorch dùng khoảng 482–549 MB RAM, vượt 512 MB của Render Free. Bản ONNX dùng khoảng 340 MB (ảnh 640 px), 360 MB (ảnh 2048 px), 450 MB (ảnh 12 MP).

**Độ khớp với `best.pt`.** Theo README của v2: 47 ảnh × 3 cấu hình (conf 0,35 và 0,25; không tiling và `tile_size=320`), 138/138 lần chạy cùng số con, khung lệch dưới 0,01 px. Trên nhánh này đã chạy lại một ảnh (xem mục Kiểm tra).

**Ảnh hưởng đến dữ liệu.** `model_version` lưu trong mỗi lần kiểm tra đổi từ `v8_yolo26s_seed0` thành `v8_yolo26s_seed0_onnx`. Số đếm như nhau, nhưng khi lọc hoặc thống kê theo phiên bản model, hai giá trị này phải được coi là cùng một model.

## 2. BE: chịu được AI ngủ và BE khởi động lại

| File | Thay đổi |
|---|---|
| `src/services/seed/ai-service-client.js` (mới) | `aiServiceUrl()`; `waitForAiService()` gọi `/health` lặp lại (mỗi lần tối đa 60 giây, cách nhau 5 giây, tổng tối đa `AI_WAKE_TIMEOUT_MS`, mặc định 150 giây) đến khi AI trả 2xx; `wakeAiServiceEarly()` gửi một lần gọi `/health` không chờ kết quả, tối đa mỗi phút một lần |
| `src/services/seed/ai-inspection.service.js` | (a) Khi xin chữ ký upload thì đánh thức AI sớm. (b) Khi phân tích: tải ảnh gốc và chờ AI thức chạy song song; một bên lỗi thì bên kia dừng. (c) `recoverInterruptedAiInspections()`: chuyển mọi bản ghi `processing` sang `failed`. (d) `STALE_PROCESSING_MS` = 10 phút: bản ghi `processing` tạo cách đây hơn 10 phút được phép phân tích lại |
| `src/server.js` | Sau khi server lắng nghe, gọi `recoverInterruptedAiInspections()` (không chờ, để database chậm không làm trễ health check) |
| `Dockerfile` | `RUN apk add --no-cache openssl`; thiếu gói này Prisma trên Alpine không nạp được engine ("libssl not found") |
| `test/ai-inspection-recovery.test.js` (mới) | Khôi phục khi khởi động chỉ đổi bản ghi `processing`; bản ghi kẹt không xóa được cho đến khi khôi phục |
| `test/ai-inspection-stale-claim.test.js` (mới) | Kẹt hơn 10 phút thì phân tích lại được; mới vào `processing` thì vẫn chặn lần phân tích thứ hai |
| `test/ai-service-client.test.js` (mới) | Chờ qua các lần `/health` lỗi; bỏ cuộc với lỗi cuối khi hết thời gian |

**Lý do.** Trước đây, nếu BE dừng giữa lúc phân tích (crash, deploy lại, Render khởi động lại), bản ghi nằm mãi ở `processing`: không phân tích lại được, không xóa được. Việc chờ AI thức là cần khi AI chạy trên host có chế độ ngủ (Render Free ngủ sau 15 phút không dùng, lần đầu mất khoảng 20–76 giây). Với AI luôn chạy, `/health` trả ngay nên không tốn thêm thời gian.

**Hạn chế đã biết** (đã ghi trong comment code):
- Thời gian "kẹt" tính từ `createdAt`, vì bảng chưa có cột thời điểm nhận phân tích. Lần kiểm tra tạo hơn 10 phút trước, nếu được phân tích lại, thì ngay khi đang chạy đã bị coi là kẹt, nên người khác có thể bấm "Phân tích lại" cùng lúc. Cả hai lần chạy đều lưu kết quả hợp lệ, lần sau ghi đè lần trước. Muốn chặn hẳn thì cần thêm cột `processing_started_at`.
- Khôi phục khi khởi động chỉ an toàn khi có một instance BE. Nếu chạy nhiều instance dùng chung database, instance mới khởi động sẽ đổi sang `failed` cả lần phân tích đang chạy ở instance khác; lần đó vẫn ghi đè kết quả khi xong.

## 3. FE: chụp ảnh, chờ kết quả, app Android, PWA

| File | Thay đổi |
|---|---|
| `src/services/camera.js` (mới) | `capturePhoto()` mở camera gốc trong app Android (Capacitor, plugin nạp khi cần); `resizePhoto()` thu ảnh camera trình duyệt về cạnh dài 2048 px, JPEG 0,85, áp xoay EXIF; `canUseNativeCamera()`, `canCaptureOnWeb()` (màn hình cảm ứng) |
| `pages/seed-batches/components/BatchInspection.vue` | Nút **Chụp ảnh** (app Android hoặc trình duyệt điện thoại; máy tính chỉ có chọn file). Nút **Phân tích lại** cho lần `failed` hoặc kẹt `processing` quá 10 phút |
| `pages/seed-batches/composables/useBatchInspection.js` | `uploadCapturedImage`, `captureInspectionImage`; mọi ảnh (chọn hay chụp) đều qua `handleInspectionFile` để kiểm tra trước khi upload. Khi phân tích lỗi 0/409/502/503/504, hỏi lại danh sách mỗi 5 giây trong tối đa 4 phút và hiện kết quả nếu BE đã xử lý xong |
| `pages/seed-batches/composables/useSeedBatches.js` | Truyền thêm hai hàm chụp ảnh ra component |
| `capacitor.config.ts` (mới) | `appId` `com.chillshrimp.app`. App mở thẳng trang đã deploy qua `CAP_SERVER_URL` (bắt buộc `https://`), vì cookie Neon Auth có cờ `Secure` chỉ hoạt động khi trang và `/api` cùng domain |
| `android/` (mới, 53 file) | Project Android do Capacitor tạo (Gradle, manifest, icon, quyền camera). Thư mục build và file sinh ra khi `cap sync` đã nằm trong `android/.gitignore` |
| `package.json`, `package-lock.json` | Thêm `@capacitor/core`, `@capacitor/camera`; dev: `@capacitor/android`, `@capacitor/cli`, `typescript`. Script `mobile:sync`, `mobile:open` |
| `public/manifest.json`, `public/icons/` (mới) | Manifest PWA và icon (svg, 192, 512, maskable) |
| `index.html` | Thẻ `theme-color`, `manifest`, `icon`, `apple-touch-icon` |
| `vercel.json` (mới) | Chuyển `/api/*` sang BE trên Render, các đường dẫn khác về `index.html` |
| `.dockerignore` | Bỏ `android` khỏi image FE |

**Lý do chờ kết quả.** Khi AI đang ngủ, request phân tích có thể kéo dài hơn giới hạn của proxy `/api` trên Vercel, FE nhận 502/504 dù BE vẫn đang xử lý và sẽ lưu kết quả. Trước đây người dùng thấy lỗi; giờ FE chờ thêm và hiện kết quả.

## 4. Cấu hình chung và tài liệu

| File | Thay đổi |
|---|---|
| `docker-compose.yml` | `MODEL_PATH=/app/models/best.onnx`, `MODEL_VERSION=v8_yolo26s_seed0_onnx`: chạy local giống bản online |
| `.gitignore` | Thêm `__pycache__/`, `.vercel/`, `*.keystore`, `*.jks` (không commit nhầm khóa ký APK) |
| `docs/02-architecture/DEPLOY.md` (mới) | Hướng dẫn deploy của v2 |
| `docs/README.md` | Thêm dòng cho `DEPLOY.md` và tài liệu này |

## Kiểm tra đã chạy trên nhánh này

| Kiểm tra | Kết quả |
|---|---|
| So nhánh `deploy` với thư mục v2 (bỏ qua CRLF) | Trùng mọi file git theo dõi; chỉ khác file sinh ra khi build Android (đã bị git bỏ qua) |
| File bí mật trong commit (`.env`, `*.keystore`, `*.jks`) | Không có |
| `BE`: `npm test` | 6/6 đạt |
| `FE`: `npm ci`, `npm test`, `npm run build` | 4/4 đạt, build thành công |
| Python: biên dịch `main.py`, `detector.py`, `photo_check.py`, `export_onnx.py` | Không lỗi cú pháp |
| `OnnxYoloDetector` trên `Demo_anh_mau/anh_dat_chuan.jpg` (conf 0,35, imgsz 640) | **108 con**, đúng như bản `best.pt` |

**Chưa kiểm tra:** chạy cả AI_SERVICE (`/predict` có upload Cloudinary), build image Docker, build APK, và luồng thật trên Render/Vercel.

## Việc phải làm trước khi merge hoặc deploy

1. **Sửa `FE/vercel.json`.** File đang trỏ tới BE của bản v2 (`https://chillshrimp-be.onrender.com`). Đổi sang BE của nhóm trước khi deploy FE.
2. **Rebuild image AI.** `docker compose up --build ai-service`; image cũ còn PyTorch và `best.pt`.
3. **Thống nhất `MODEL_VERSION`.** Dữ liệu cũ ghi `v8_yolo26s_seed0`, dữ liệu mới ghi `v8_yolo26s_seed0_onnx`.
4. **Sửa docstring `scripts/export_onnx.py`.** Docstring nói YOLO26 "end-to-end (NMS-free)", nhưng `detector.py` và README ghi model này **không** end-to-end (`end2end=False`) và NMS chạy trong `detector.py`. Code đúng, chỉ docstring sai.
5. **Chọn một tài liệu deploy.** `DEPLOY.md` (từ v2) ghi database dùng chung đang kẹt migration `20261107_002_add_seed_sales` (P3009). `DEPLOY-GUIDE.md` (chưa commit, mới hơn, ngày 18/11) ghi branch `nofication-test` đã đủ 47 migration. Nên giữ một file và kiểm tra lại trạng thái migration trước khi deploy BE.
6. **Nếu dùng lệnh "Bước 0" trong `DEPLOY-GUIDE.md`:** danh sách đường dẫn thiếu `BE/src/services/seed/ai-service-client.js`. Thiếu file này, BE không khởi động được vì `ai-inspection.service.js` import nó. Nhánh `deploy` này đã có đủ file.

## Lưu ý về dung lượng repo

Thư mục `AI_SERVICE/models/` giữ cả `best.pt` (20,4 MB) và `best.onnx` (38,4 MB). GitHub cảnh báo file trên 50 MB và chặn file trên 100 MB. Mỗi lần đổi model, lịch sử git tăng thêm khoảng 60 MB. Nếu model còn thay đổi nhiều, nên chuyển hai file này sang Git LFS.

## Khi đổi model về sau

1. Thay `models/best.pt`.
2. Trong một môi trường riêng có `ultralytics==8.4.198` (YOLO26 không chạy trên 8.3.x), chạy `python scripts/export_onnx.py` để tạo lại `best.onnx`.
3. Kiểm tra output in ra vẫn là dạng không end-to-end; `detector.py` từ chối bản end-to-end.
4. Đổi `MODEL_VERSION` trong `docker-compose.yml`, `main.py` và biến môi trường trên Render.
