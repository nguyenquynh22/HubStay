# HubStay Mobile

## 1. Giới thiệu
HubStay Mobile là ứng dụng hỗ trợ tìm kiếm phòng trọ, tìm người ở ghép và đăng tin cho thuê phòng. Hệ thống hỗ trợ các vai trò Sinh viên, Người đi làm, Chủ trọ và Quản trị viên, cùng các chức năng quản lý bài đăng, hình ảnh, lịch hẹn xem phòng, thông báo và gói VIP.

## 2. Công nghệ sử dụng
- **Cơ sở dữ liệu:** MySQL
- **Lưu trữ hình ảnh:** Cloudinary
- **Giao diện ứng dụng:** [Bổ sung công nghệ thực tế của dự án]
- **Backend/API:** [Bổ sung công nghệ thực tế của dự án]

## 3. Cài đặt và chạy dự án

### Bước 1: Clone source code
```bash
git clone <GITHUB_REPOSITORY_URL>
cd <PROJECT_FOLDER>
```

### Bước 2: Cài đặt môi trường
Cài đặt các công cụ và phiên bản môi trường cần thiết theo công nghệ được sử dụng trong dự án.

### Bước 3: Cấu hình cơ sở dữ liệu
1. Khởi động MySQL Server.
2. Tạo cơ sở dữ liệu `hubstay_db`.
3. Import file SQL của dự án để tạo các bảng và dữ liệu khởi tạo (nếu có).
4. Cập nhật thông tin kết nối cơ sở dữ liệu trong file cấu hình của backend.

### Bước 4: Cấu hình Cloudinary
Thiết lập các thông tin kết nối Cloudinary trong file cấu hình hoặc biến môi trường theo hướng dẫn của dự án. Không đưa mật khẩu, API Secret hoặc thông tin nhạy cảm lên GitHub.

### Bước 5: Cài đặt thư viện
Chạy lệnh cài đặt thư viện tương ứng với công nghệ frontend và backend của dự án.

### Bước 6: Khởi chạy ứng dụng
Khởi chạy backend/API và ứng dụng frontend theo cấu hình của dự án. Sau khi các thành phần khởi động thành công, mở ứng dụng để sử dụng các chức năng của HubStay Mobile.

## 4. Các chức năng chính
- Đăng ký, đăng nhập và quản lý tài khoản.
- Đăng tin cho thuê phòng, tìm phòng, tìm người ở ghép và sang nhượng phòng.
- Quản lý hình ảnh bài đăng.
- Tìm kiếm, lưu và tương tác với bài đăng.
- Đặt lịch hẹn xem phòng.
- Báo cáo bài đăng vi phạm.
- Quản lý giao dịch, gói VIP và thông báo.
- Quản lý người dùng và xác thực tài khoản theo quyền hạn.

## 5. Lưu ý
- Cần cấu hình đúng thông tin kết nối MySQL trước khi chạy ứng dụng.
- Cần thiết lập Cloudinary nếu sử dụng chức năng tải và hiển thị hình ảnh.
- Không commit các file chứa mật khẩu, API Secret, access token hoặc thông tin cấu hình riêng tư.
- Các lệnh chạy cụ thể cần được cập nhật theo cấu trúc source code và công nghệ thực tế của dự án.
