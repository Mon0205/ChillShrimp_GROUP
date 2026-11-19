# Triển khai thử: Render, Vercel, Neon và app Android

Bản online gồm 3 dịch vụ miễn phí và 1 app Android. Làm theo thứ tự **AI → database → BE → FE → app**, vì bước sau cần URL hoặc trạng thái của bước trước.

```
Điện thoại / trình duyệt
   └─ https://<project>.vercel.app      FE (Vercel, file tĩnh)
        └─ /api/*  ──rewrite──►  https://<be>.onrender.com/api/*      BE (Render, Docker)
                                   ├─ Neon Postgres + Neon Auth
                                   ├─ Cloudinary (ảnh)
                                   └─ https://<ai>.onrender.com/predict   AI_SERVICE (Render, Docker, ONNX)
```

Trình duyệt chỉ nói chuyện với domain Vercel. Vercel chuyển tiếp `/api` sang BE, nên cookie đăng nhập của Neon Auth (cờ `Secure`) là cookie cùng domain, không bị chặn như cookie bên thứ ba.

## 1. AI_SERVICE trên Render

AI chạy `models/best.onnx` bằng ONNX Runtime, không có PyTorch. Kết quả đếm đã đối chiếu với `best.pt`: 138/138 lần chạy trùng số con (chi tiết trong [AI_SERVICE/README.md](../../AI_SERVICE/README.md)).

- New → Web Service → repo deploy, Root Directory `AI_SERVICE`, Runtime **Docker**, gói Free.
- Biến môi trường: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `MODEL_VERSION=v8_yolo26s_seed0_onnx`. Không cần đặt `PORT`, `MODEL_PATH`, `ORT_NUM_THREADS` (Dockerfile đã đặt).
- Tùy chọn: `DETECTION_CONF`, `CROWD_OVERLAP_RATIO_MAX`, `CROWD_COVERAGE_MAX`.
- Health Check Path: `/health`. Kiểm tra: mở `/health` thấy `"model_exists": true`; thử `/docs` → `POST /predict` với `anh_dat_chuan.jpg`.

RAM đo trên máy: khoảng 340 MB với ảnh 640 px, 360 MB với ảnh 2048 px (ảnh app chụp gửi lên), 450 MB với ảnh 12 MP. Gói Free có 512 MB, nên ảnh rất lớn chọn từ thư viện là trường hợp dễ hết RAM nhất.

## 2. Database Neon

`BE/docker-entrypoint.sh` chạy `migrate deploy` mỗi lần BE khởi động. Database dùng chung của nhóm đang kẹt migration `20261107_002_add_seed_sales` (lỗi P3009, bảng `customers` của bản v1). **Nhóm phải quyết định trước khi deploy BE:**

- Khuyến nghị: Neon Console → Branches → Create branch, dùng chuỗi kết nối của branch đó cho bản online.
- Ai sửa migration và đưa bản sửa về repo nhóm, để máy các thành viên không gặp lại lỗi.

## 3. BE trên Render

- New → Web Service, Root Directory `BE`, Runtime **Docker**. `BE/Dockerfile` đã cài OpenSSL để Prisma chạy được trên Alpine.
- Health Check Path: `/api/health`.
- Biến môi trường (lấy từ `BE/.env`, **không** commit file này):

| Biến | Giá trị |
| --- | --- |
| `DATABASE_URL` | Chuỗi Neon (của branch riêng nếu đã tách) |
| `NEON_AUTH_URL` | Như `BE/.env` |
| `NEON_AUTH_COOKIE_SECRET` | Chuỗi ngẫu nhiên mới, ví dụ `openssl rand -base64 32`. Không dùng giá trị mẫu trong `.env.example` |
| `FRONTEND_URL` | `https://<project>.vercel.app` (CORS, link email mời, Origin khi gửi OTP) |
| `AI_SERVICE_URL` | `https://<ai>.onrender.com` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Như `BE/.env` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Như `BE/.env` |
| `ADMIN_EMAIL` | Email quản trị |

Không đặt `PORT` (Render tự cấp) và `ADMIN_PASSWORD` (chỉ dùng khi chạy `seed:admin` trên máy).

## 4. FE trên Vercel

- Sửa [FE/vercel.json](../../FE/vercel.json): thay `THAY-BANG-TEN-BACKEND` bằng tên service BE trên Render, push lên.
- New Project → Root Directory `FE`, Framework Vite (Build `npm run build`, Output `dist`).
- Biến môi trường: `VITE_API_URL=/api`.
- Đặt `FRONTEND_URL` của BE thành domain Vercel rồi deploy lại BE. Đăng nhập thử; nếu báo *invalid origin* thì thêm domain Vercel vào Trusted Domains của Neon Auth.

Render Free ngủ sau 15 phút không có request; lần gọi đầu mất khoảng 1 phút. Dùng cron-job.org gọi `https://<be>.onrender.com/api/health` và `https://<ai>.onrender.com/health` 10 phút một lần.

## 5. App Android (Capacitor)

App mở trang Vercel trong WebView (`server.url`), không đóng gói file `dist`, để cookie đăng nhập vẫn là cookie cùng domain. Nút **Chụp ảnh** ở trang kiểm tra AI dùng camera thật; ảnh được thu về cạnh dài 2048 px và vẫn đi qua bước kiểm tra chất lượng ảnh như ảnh chọn từ máy.

Trong PowerShell, thư mục `FE` (cần Android Studio):

```powershell
$env:CAP_SERVER_URL = "https://<project>.vercel.app"
npm run mobile:sync     # vite build + cap sync android
npm run mobile:open     # mở Android Studio → Build → Build APK(s)
```

`CAP_SERVER_URL` phải là `https://`. Quên đặt biến này thì app mở bản đóng gói và không đăng nhập được. Thư mục `FE/android` được tạo bằng `npx cap add android`, có thêm quyền `CAMERA`. Keystore ký APK (`*.jks`, `*.keystore`) không đưa lên git.

Trên trình duyệt điện thoại, nút **Chụp ảnh** cũng hiện và mở camera qua `<input capture>`. Trên máy tính, nút này ẩn.

## Kiểm tra sau khi deploy

1. `/health` của AI và `/api/health` của BE trả 200.
2. Đăng nhập trên domain Vercel, chọn trại.
3. Lô giống → Kiểm tra AI → tải ảnh mẫu → AI trả số con và ảnh có khung.
4. Trên app Android: Chụp ảnh → Lưu → Phân tích.
