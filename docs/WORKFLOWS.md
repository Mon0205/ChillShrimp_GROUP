# Luồng làm việc

## 1. Khởi tạo trại và vụ nuôi

Người dùng đăng ký/đăng nhập → tạo trại → mời thành viên và gán vai trò → tạo ao/bể → tạo đàn giống → ghi nhận lần thả giống → hệ thống mở vụ nuôi và hiển thị dashboard.

## 2. Nhật ký chăm sóc hằng ngày

Nhân viên chọn ao/bể → nhập lần cho ăn/thay nước/thuốc-chế phẩm → Express xác thực, kiểm tra quyền và dữ liệu → service lưu nhật ký vào Supabase → cập nhật tổng lượng, chi phí và lịch nhắc tiếp theo.

## 3. Theo dõi môi trường và cảnh báo

Nhân viên nhập chỉ số → Express service đối chiếu bộ ngưỡng theo loài/giai đoạn → lưu Supabase → nếu vượt ngưỡng thì mở cảnh báo → thông báo người phụ trách → người dùng xác nhận và xử lý → đóng cảnh báo khi chỉ số trở lại an toàn.

## 4. Phân tích ảnh/video

Người dùng chọn ao/bể và tải media → Express kiểm tra định dạng/dung lượng rồi lưu private Storage → tạo analysis job `queued` → microservice lấy job và xử lý → trả kết quả/confidence/model version về Express endpoint bảo mật → lưu kết quả và tạo cảnh báo nếu cần → người dùng xem, xác nhận hoặc sửa nhãn.

Trạng thái job: `queued -> processing -> succeeded | failed | cancelled`.

## 5. Xuất bán và báo cáo

Người quản lý chọn đàn/vụ nuôi → ghi nhận khách hàng, số lượng, trọng lượng, đơn giá → hệ thống tính doanh thu → tổng hợp chi phí, sản lượng và lãi gộp → lọc theo ngày/tuần/tháng → xuất báo cáo.
