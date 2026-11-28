# Kiểm thử cảnh báo realtime trên Chromium

Chạy từ thư mục gốc repository sau khi cài dependencies của cả `BE` và `FE`.
Fixture dùng API giả và thay Neon/database bằng dữ liệu trong bộ nhớ; không đọc `.env`, không ghi dữ liệu thật. Giao diện Vue, Socket.IO, proxy Vite, lifecycle đăng nhập và các request frontend vẫn chạy thật. Cổng test: 43173 và 43273.

Terminal 1:

```bash
node BE/test-support/realtime-browser-server.mjs
```

Đợi `REALTIME_BROWSER_FIXTURE_READY`. Terminal 2 (Linux/WSL với Docker):

```bash
npm install --prefix /tmp/chillshrimp-browser-runtime playwright-core@1.61.1 --ignore-scripts --no-audit --no-fund

docker run --rm --network host \
  --mount type=bind,src=/tmp/chillshrimp-browser-runtime,dst=/runtime,readonly \
  --mount "type=bind,src=$PWD/FE/e2e,dst=/tests,readonly" \
  mcr.microsoft.com/playwright:v1.61.1-noble \
  node /tests/alerts-realtime.cjs
```

Trên Windows có thể dùng Edge đã cài sẵn: đặt `PLAYWRIGHT_CHANNEL=msedge` cùng `PLAYWRIGHT_MODULE`.

Nếu đã có Playwright và Chromium tương thích trên máy, có thể dùng `PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core node FE/e2e/alerts-realtime.cjs` thay container.

Dừng fixture bằng Ctrl+C sau khi chạy xong. Suite kiểm tra burst sự kiện, cập nhật chi tiết và giữ nháp, sự kiện khi đang lưu, đồng bộ nhiều tab, offline/reconnect, lỗi truy vấn sau commit, đổi trại và response cũ, lọc sự kiện trại khác, unmount, logout, hết phiên và không polling sau 31 giây.

Các test service/socket backend và hàng đợi frontend chạy riêng bằng `npm test` trong từng thư mục. Kiểm thử đăng nhập bằng tài khoản Neon thật và thao tác ghi database thật cần môi trường nghiệm thu riêng.
