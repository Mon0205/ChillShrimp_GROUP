# Product backlog / Issues

Quy ước ưu tiên: **P0** bắt buộc cho MVP, **P1** quan trọng, **P2** mở rộng. Mỗi issue chỉ chuyển sang Done khi có kiểm thử, xử lý lỗi và cập nhật tài liệu API tương ứng.

## Epic 0 — Nền tảng

- [ ] **INFRA-01 · P0** Chuẩn hóa môi trường dev/prod, `.env`, Docker Compose và health check FE/BE.
- [ ] **INFRA-02 · P0** Thiết lập lint, format, unit test và CI cho React/Express.
- [ ] **INFRA-03 · P0** Quy ước migration, seed, backup và rollback Supabase.
- [ ] **INFRA-04 · P1** Logging có request ID, audit log và theo dõi lỗi.
- [ ] **DOC-01 · P0** Chốt ERD, REST API convention, error format và OpenAPI.

## Epic 1 — Tài khoản và phân quyền

- [ ] **AUTH-01 · P0** Đăng ký, đăng nhập, đăng xuất và quên mật khẩu bằng Supabase Auth.
- [ ] **AUTH-02 · P0** Hồ sơ người dùng và cập nhật thông tin cá nhân.
- [ ] **AUTH-03 · P0** Thành viên trại và vai trò Owner/Manager/Staff/Viewer.
- [ ] **AUTH-04 · P0** RLS policy và kiểm thử chống truy cập chéo giữa các trại.
- [ ] **AUTH-05 · P1** Mời thành viên bằng email/link có hạn sử dụng.

## Epic 2 — Trại, ao/bể và đàn giống

- [ ] **FARM-01 · P0** CRUD trại giống, địa chỉ và thông tin liên hệ.
- [ ] **FARM-02 · P0** CRUD ao/bể: mã, loại, diện tích/thể tích, trạng thái.
- [ ] **BATCH-01 · P0** Quản lý đàn giống: loài, nguồn, ngày nhập, số lượng, giai đoạn.
- [ ] **BATCH-02 · P0** Ghi nhận thả/chuyển đàn giữa ao bể và lịch sử số lượng.
- [ ] **BATCH-03 · P1** Kết thúc vụ nuôi, lưu nguyên nhân và tổng kết.
- [ ] **SEARCH-01 · P1** Tìm kiếm/lọc trại, ao bể và đàn giống.

## Epic 3 — Chăm sóc và môi trường

- [ ] **CARE-01 · P0** Nhật ký cho ăn: loại thức ăn, lượng, thời điểm và người thực hiện.
- [ ] **CARE-02 · P0** Nhật ký thay nước: lượng/tỷ lệ, thời điểm và ghi chú.
- [ ] **CARE-03 · P0** Nhật ký thuốc/chế phẩm: liều lượng, đơn vị, mục đích và chi phí.
- [ ] **CARE-04 · P1** Lập lịch, nhắc việc và đánh dấu hoàn thành.
- [ ] **ENV-01 · P0** Nhập thông số môi trường và hiển thị lịch sử theo ao/bể.
- [ ] **ENV-02 · P0** Cấu hình ngưỡng theo chỉ số, loài và giai đoạn nuôi.
- [ ] **ALERT-01 · P0** Sinh cảnh báo vượt ngưỡng, chống trùng và quản lý vòng đời.
- [ ] **ALERT-02 · P1** Thông báo in-app; thiết kế điểm mở rộng email/push.

## Epic 4 — Hình ảnh và AI

- [ ] **MEDIA-01 · P0** Upload ảnh vào private Supabase Storage, validate định dạng/dung lượng.
- [ ] **MEDIA-02 · P1** Upload video ngắn, thumbnail và metadata.
- [ ] **AI-01 · P0** Khảo sát dữ liệu, chọn ngôn ngữ/framework và chốt contract microservice.
- [ ] **AI-02 · P0** Xây dựng bộ dữ liệu, quy tắc gán nhãn, consent và version dataset.
- [ ] **AI-03 · P1** Pipeline analysis job bất đồng bộ, retry, timeout và idempotency.
- [ ] **AI-04 · P1** Baseline nhận dạng loài và ước tính số lượng/mật độ.
- [ ] **AI-05 · P1** Baseline kích thước, độ đồng đều và màu sắc bất thường.
- [ ] **AI-06 · P1** Đánh giá model bằng tập test thực tế, định nghĩa ngưỡng confidence.
- [ ] **AI-07 · P1** Màn hình kết quả, overlay, cảnh báo và người dùng xác nhận/sửa nhãn.
- [ ] **AI-08 · P2** Theo dõi model drift và dùng feedback để cải thiện dữ liệu.

## Epic 5 — Chi phí, xuất bán và báo cáo

- [ ] **COST-01 · P0** Quản lý chi phí thức ăn, thuốc, con giống và chi phí khác.
- [ ] **SALE-01 · P0** Ghi nhận xuất bán: khách hàng, số lượng, trọng lượng và đơn giá.
- [ ] **DASH-01 · P0** Dashboard tình trạng ao/bể, cảnh báo và công việc hôm nay.
- [ ] **REPORT-01 · P0** Báo cáo chăm sóc, môi trường, chi phí, sản lượng và doanh thu.
- [ ] **REPORT-02 · P1** Bộ lọc ngày/tuần/tháng và xuất CSV/PDF.

## Epic 6 — Chất lượng và triển khai

- [ ] **QA-01 · P0** Test API, phân quyền, validation và luồng nghiệp vụ quan trọng.
- [ ] **QA-02 · P1** E2E web cho luồng trại → ao/bể → nhật ký → cảnh báo → báo cáo.
- [ ] **SEC-01 · P0** Security review: secret, RLS, upload, rate limit và dependency scan.
- [ ] **DEPLOY-01 · P1** Môi trường staging, production, monitoring và hướng dẫn vận hành.

## Thứ tự MVP đề xuất

1. Sprint 0: INFRA-01..03, DOC-01.
2. Sprint 1: AUTH-01..04, FARM-01..02.
3. Sprint 2: BATCH-01..02, CARE-01..03.
4. Sprint 3: ENV-01..02, ALERT-01, MEDIA-01.
5. Sprint 4: COST-01, SALE-01, DASH-01, REPORT-01, QA-01, SEC-01.
6. Nhánh AI chạy song song từ AI-01/AI-02; chỉ tích hợp AI-03 sau khi contract và dữ liệu được chốt.
