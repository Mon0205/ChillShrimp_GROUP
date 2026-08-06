# ChillShrimp

Khung đồ án web quản lý trại tôm/cua giống với ReactJS frontend, Node.js/Express backend và Supabase. Project hiện chỉ có cấu hình nền, kết nối Supabase và health check; chưa triển khai nghiệp vụ.

## Cấu trúc

```text
FE/                       ReactJS web
BE/                       Node.js/Express API
  src/config/             Environment và Supabase server client
  src/middleware/         Express middleware
  src/modules/            Các module nghiệp vụ sẽ triển khai
  src/routes/             API routes
supabase/
  migrations/             Schema, trigger, function và RLS policy
  seed/                   Dữ liệu mẫu
AI_SERVICE/               Placeholder, chưa chọn công nghệ/chưa cấu hình
docs/                     Kiến trúc, luồng nghiệp vụ và backlog
```

Tài liệu chính:

- [Kiến trúc](docs/ARCHITECTURE.md)
- [Luồng nghiệp vụ](docs/WORKFLOWS.md)
- [Danh sách issue và lộ trình MVP](docs/BACKLOG.md)

## Khởi tạo

Tạo Supabase project rồi sao chép file môi trường:

```powershell
Copy-Item .env.example .env
```

Điền Project URL và secret/service-role key từ Supabase Dashboard. Key này chỉ được truyền vào container backend, không xuất hiện trong React.

Build và chạy:

```powershell
docker compose up --build -d
```

- Web: http://localhost:8080
- Backend health: http://localhost:3000/api/health

Sau lần build đầu:

```powershell
docker compose up -d
docker compose down
```

## Phạm vi hiện tại

- Đã cấu hình React, Express, Supabase server client, Nginx và Docker Compose.
- React gọi Express qua `/api`; không kết nối Supabase trực tiếp.
- Chưa tạo schema, authentication, CRUD hoặc module nghiệp vụ.
- AI microservice chưa chọn ngôn ngữ và chưa nằm trong Docker Compose.
- Sản phẩm chỉ triển khai dưới dạng web ReactJS.

