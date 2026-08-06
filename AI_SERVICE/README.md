# Image/AI microservice — reserved

Thư mục giữ chỗ cho microservice xử lý ảnh/video. Chưa chọn ngôn ngữ, framework, model, Dockerfile hay dependency ở giai đoạn cấu hình ban đầu.

## Contract dự kiến

- Express backend tạo analysis job và cấp signed URL cho media.
- Microservice nhận job bất đồng bộ, đọc media từ Supabase Storage.
- Microservice trả tiến độ và kết quả có cấu trúc qua Express endpoint bảo mật.
- Kết quả dự kiến: loài, số lượng/mật độ ước tính, phân bố kích thước, độ đồng đều, màu sắc bất thường, dấu hiệu hao hụt, confidence và model version.

Chi tiết biên API chỉ được chốt trong issue AI-01 sau khi đã chọn công nghệ và có bộ dữ liệu mẫu.
