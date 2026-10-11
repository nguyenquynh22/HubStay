# Đặc tả Use Case Mobile — HubStay

## 1. Thông tin tổng quan

- **Hệ thống:** HubStay Mobile
- **Phiên bản:** 1.0
- **Ngôn ngữ đặc tả:** Tiếng Việt
- **Tác nhân chính:** Sinh viên, Người đi làm, Chủ trọ, Quản trị viên
- **Tác nhân hệ thống:** Hệ thống thông báo, Hệ thống dịch vụ vị trí, Hệ thống Cloudinary, Hệ thống giao dịch
- **Người dùng phải đăng nhập:** Có, với các use case nghiệp vụ ngoại trừ Đăng ký và Đăng nhập
- **OTP:** Tùy chọn mở rộng, không bắt buộc ở phiên bản hiện tại

## 2. Danh sách use case tổng quát

| Mã    | Tên use case              | Actor chính                      | Tình trạng                       |
| ----- | ------------------------- | -------------------------------- | -------------------------------- |
| UC_01 | Xác thực và truy cập      | Sinh viên, Người đi làm, Chủ trọ | Có thể triển khai tiếp           |
| UC_02 | Hồ sơ, KYC và tài khoản   | Sinh viên, Người đi làm, Chủ trọ | Có                               |
| UC_03 | Tìm kiếm và khám phá      | Sinh viên, Người đi làm, Chủ trọ | Có                               |
| UC_04 | Quản lý bài đăng          | Sinh viên, Người đi làm, Chủ trọ | Bộ phân quyền mới được tích hợp  |
| UC_05 | Tương tác và kết nối      | Sinh viên, Người đi làm, Chủ trọ | Có phần                          |
| UC_06 | Ví, giao dịch và VIP      | Sinh viên, Người đi làm, Chủ trọ | Ví cho mọi role; VIP cho Chủ trọ |
| UC_07 | Nhận và quản lý thông báo | Sinh viên, Người đi làm, Chủ trọ | Có                               |
| UC_08 | Quản trị hệ thống         | Quản trị viên                    | Phiên bản web/admin              |

### 2.1. Use case con của UC_07

- **UC_07.1:** Xem danh sách thông báo
- **UC_07.2:** Đánh dấu một thông báo đã đọc
- **UC_07.3:** Đánh dấu tất cả thông báo đã đọc
- **UC_07.4:** Xóa tất cả thông báo

UC_07.2, UC_07.3 và UC_07.4 là các thao tác tùy chọn được mở rộng từ UC_07.1. Xóa tất cả phải có bước xác nhận và không thể khôi phục.

## 3. Bản đồ actor và use case con

### 3.1. Sinh viên / Người đi làm

- Đăng ký, đăng nhập và đặt lại mật khẩu
- Xem và cập nhật hồ sơ
- Gửi KYC
- Xem trạng thái KYC
- Tìm bài đăng theo khu vực, địa điểm và kỹ thuật lọc
- Đăng SHARE, PASS hoặc FIND
- Chỉnh sửa, ẩn/hiện hoặc xem bài đăng của mình
- Lưu bài đăng, chat, báo cáo và đặt lịch xem phòng
- Nạp tiền và xem lịch sử giao dịch
- Nhận thông báo

### 3.2. Chủ trọ

- Thực hiện toàn bộ các use case của Sinh viên/Người đi làm với quy tắc riêng
- Chỉ có quyền đăng RENTAL
- Có thể chỉnh sửa, ẩn/hiện và xem bài đăng RENTAL
- Có quyền xem, mua và gia hạn VIP
- Nhận thông báo về bài đăng VIP hoặc tin phù hợp trong khu vực

### 3.3. Quản trị viên

- Duyệt hoặc từ chối hồ sơ KYC
- Khóa hoặc kích hoạt lại tài khoản
- Xóa hoặc quản lý nội dung bài đăng, báo cáo và hành vi vi phạm
- Không phải là actor của flow đăng bài từ mobile

## 4. Quy tắc nghiệp vụ dùng trong use case

### 4.1. Phân quyền loại bài đăng

| Vai trò                | Loại bài đăng được phép |
| ---------------------- | ----------------------- |
| LANDLORD               | RENTAL                  |
| STUDENT                | SHARE, PASS, FIND       |
| WORKER                 | SHARE, PASS, FIND       |
| Khách / chưa đăng nhập | Không có                |

Quy tắc kiểm tra phải được áp dụng ở **mobile UI và backend**. UI chỉ ẩn nút không hợp lệ, còn backend vẫn kiểm tra để tránh bypass.

### 4.2. KYC và VIP

- Người dùng cần KYC APPROVED trước khi mua/gia hạn VIP.
- Chỉ LANDLORD được đăng ký hoặc gia hạn VIP.
- STUDENT và WORKER vẫn có thể sử dụng ví cho các chức năng tài chính khả dụng, nhưng không được mua VIP.
- Khi đã có VIP còn hiệu lực, thời hạn mới được tính từ thời điểm hết hạn hiện tại.
- Nếu chưa có VIP, thời hạn bắt đầu từ thời điểm giao dịch thành công.
- Không xem thời hạn VIP của người khác.

### 4.3. Trang Home

- Home gọi API có phân trang.
- Mỗi trang tối đa 5 bài đăng.
- Thứ tự đề xuất:
  1. Bài VIP trong khu vực phù hợp
  2. Bài thường trong khu vực phù hợp
  3. Bài mới nhất
- Nếu không có bài trong khu vực phù hợp, hệ thống fallback về 5 bài mới nhất.
- Nếu danh sách còn nhiều hơn 5 bài, hiển thị nút Xem thêm.
- Không được client tự cắt dữ liệu; backend phải trả về `page`, `limit`, `total` và `hasMore`.

### 4.4. Ảnh

- Ảnh bài đăng được tải lên Cloudinary trước khi lưu vào database.
- Ảnh KYC được tải lên Cloudinary trước khi lưu trong bản KYC.
- Nếu upload thất bại, hồ sơ phải không được ghi vào database.
- Tối đa 6 ảnh cho một bài đăng, mỗi ảnh tối đa 8 MB, tổng không quá 30 MB.
- KYC tối đa 5 MB cho mỗi ảnh, hỗ trợ JPEG, PNG và WebP.

### 4.5. Thông báo khu vực

- Khi một bài RENTAL được tạo, hệ thống tìm FIND trong cùng tỉnh, huyện hoặc xã.
- Thông báo chỉ được gửi cho người dùng đủ điều kiện và có khu vực phù hợp.
- Thông báo VIP có ảnh hưởng đến bài RENTAL được gửi cho người dùng ưu tiên trong khu vực của họ.

## 5. Quan hệ include và extend

### 5.1. Include

- UC_01 include các chức năng đăng ký, đăng nhập, quên mật khẩu và xác thực.
- UC_02 include xem hồ sơ, cập nhật hồ sơ, gửi KYC và xem trạng thái KYC.
- UC_03 include tìm khu vực, tìm địa điểm, xem bài đăng và xem thêm kết quả.
- UC_04 include đăng bài, chỉnh sửa, ẩn/hiện và xem bài đăng của tôi.
- UC_05 include lưu bài, chat, báo cáo, đặt lịch và xác nhận lịch.
- UC_06 gồm ví/giao dịch dành cho mọi người dùng và đăng ký VIP chỉ dành cho LANDLORD.
- UC_07.1 hiển thị danh sách tối đa 50 thông báo mới nhất.
- UC_07.2 extend UC_07.1 khi người dùng chạm vào một thông báo chưa đọc.
- UC_07.3 extend UC_07.1 khi người dùng chọn `Đọc tất cả`.
- UC_07.4 extend UC_07.1 khi người dùng chọn `Xóa tất cả` và xác nhận thao tác.
- Mọi thao tác thông báo chỉ áp dụng cho tài khoản đang đăng nhập; backend xác định user từ JWT.
- UC_08 include duyệt KYC, quản lý tài khoản và quản lý bài đăng/báo cáo.

### 5.2. Extend

- UC_01.4 xác thực OTP được gọi khi đăng ký hoặc đặt lại mật khẩu.
- UC_03.2 tìm theo bán kính mở rộng từ tìm theo khu vực.
- UC_04.1 Đăng bài có thể chọn một trong các type phụ thuộc vào role.
- UC_05.4 đặt lịch xem phòng extend UC_05.5 xác nhận hoặc từ chối lịch hẹn.
- UC_05.2 chat extend UC_05.6 gửi yêu cầu thuê phòng.
- UC_06.4 đăng ký VIP include UC_06.2 nạp tiền.

## 6. Đặc tả use case chi tiết — UC_04: Quản lý bài đăng

### 6.1. UC_04 — Quản lý bài đăng

**Actor chính:** Sinh viên, Người đi làm, Chủ trọ

**Mô tả:** Cho phép người dùng quản lý bài đăng của mình theo các loại phù hợp với role.

**Điều kiện tiên quyết:**

1. Người dùng đã đăng nhập.
2. User ID hợp lệ.
3. Người dùng có quyền truy cập bài đăng của chính mình.

**Luồng chính:**

1. Người dùng mở màn hình quản lý bài đăng.
2. Hệ thống xác định role và tải danh sách bài đăng của người dùng.
3. Người dùng chọn chức năng Thêm, Chỉnh sửa, Ẩn/Hiện hoặc Xem bài đăng.
4. Hệ thống thực hiện luồng tương ứng.

**Luồng thay thế:**

- Nếu không có bài đăng, hệ thống hiển thị trạng thái rỗng.
- Nếu người dùng chọn loại không hợp lệ, hệ thống không mở form và gửi thông báo lỗi.

**Ngoại lệ:**

- E_04.1: Người dùng không tồn tại.
- E_04.2: Role không hợp lệ.
- E_04.3: Bài đăng không thuộc quyền quản lý của người dùng.
- E_04.4: Dữ liệu địa chỉ hoặc tọa độ không hợp lệ.

### 6.2. UC_04.1 — Đăng bài

**Actor chính:** Sinh viên, Người đi làm, Chủ trọ

**Mô tả:** Cho phép người dùng tạo bài đăng thuộc một loại được phép.

**Quan hệ:**

- `UC_04.1` **include** `UC_04.1.1 Chọn loại bài đăng`
- `UC_04.1` **include** `UC_04.1.2 Tải ảnh`
- `UC_04.1` **include** `UC_04.1.3 Chọn vị trí`
- `UC_04.1` **include** `UC_04.1.4 Kiểm tra nội dung`
- `UC_04.1` **include** `UC_04.1.5 Đăng bài`
- `UC_04.1` **extend** `UC_04.1.6 Gửi thông báo khu vực` khi bài là RENTAL và có thành viên FIND phù hợp

**Điều kiện tiên quyết:**

1. Người dùng đã đăng nhập.
2. Role được nhận từ API hoặc session.
3. Tài khoản có trạng thái hoạt động.
4. Loại bài đăng thuộc role.

**Luồng chính:**

1. Người dùng chọn chức năng Đăng bài.
2. Hệ thống xác định role và loại bài đăng được phép.
3. Người dùng chọn một loại bài đăng.
4. Người dùng nhập tiêu đề, mô tả, giá, địa chỉ và vị trí.
5. Hệ thống kiểm tra ảnh, nội dung bị cấm và dữ liệu khu vực.
6. Ảnh được upload lên Cloudinary.
7. Backend kiểm tra lại quyền role.
8. Backend lưu bài đăng và các ảnh.
9. Hệ thống tạo thông báo cho người dùng.
10. Nếu là RENTAL VIP, hệ thống gửi thông báo cho người tìm phòng phù hợp.
11. Hệ thống trả về kết quả thành công và mở bài đăng của người dùng.

**Luồng thay thế:**

- Nếu không chọn loại bài đăng hợp lệ, hệ thống hiển thị các loại khả dụng và khóa loại không hợp lệ.
- Nếu thiếu ảnh, hệ thống yêu cầu thêm ảnh cho loại không phải FIND.
- Nếu quá hạn hoặc thiếu vị trí, hệ thống yêu cầu bổ sung lại.

**Ngoại lệ:**

- E_04.1.1: Người dùng chưa đăng nhập.
- E_04.1.2: Role hoặc post type không hợp lệ.
- E_04.1.3: Dữ liệu khu vực không đầy đủ.
- E_04.1.4: Blog hoặc mô tả chứa từ không phù hợp.
- E_04.1.5: Ảnh không đúng định dạng hoặc vượt giới hạn.
- E_04.1.6: Backend tạo bài thất bại sau khi upload ảnh.

**Quy tắc:**

- LANDLORD không được đăng SHARE, PASS hoặc FIND.
- STUDENT và WORKER không được đăng RENTAL.
- FIND không bắt buộc ảnh.
- Các loại còn lại cần ít nhất 2 ảnh.

### 6.3. UC_04.1.1 — Chọn loại bài đăng

**Actor chính:** Sinh viên, Người đi làm, Chủ trọ

**Mô tả:** Lựa chọn loại bài đăng phù hợp với role.

**Luồng chính:**

1. Hệ thống lấy danh sách quyền từ role.
2. Hệ thống hiển thị chỉ các loại bài đăng được phép.
3. Người dùng chọn một loại.
4. Hệ thống lưu loại được chọn.

**Tiêu chí điều kiện:**

- LANDLORD chỉ nhìn thấy RENTAL.
- STUDENT và WORKER nhìn thấy SHARE, PASS và FIND.
- Không có nút không hợp lệ hiển thị.

### 6.4. UC_04.1.2 — Upload ảnh

**Actor chính:** Người dùng

**Mô tả:** Chọn hoặc chụp ảnh, kiểm tra định dạng trước khi upload lên Cloudinary.

**Điều kiện tiên quyết:**

1. Ảnh nằm trong định dạng JPEG, PNG hoặc WebP.
2. Kích thước ảnh <= giới hạn cho phép.

**Luồng chính:**

1. Người dùng chọn ảnh.
2. Hệ thống kiểm tra định dạng và dung lượng.
3. Hệ thống upload ảnh lên Cloudinary.
4. Hệ thống nhận URL an toàn.
5. URL được lưu trong database.

**Ngoại lệ:**

- E_04.1.2.1: Ảnh quá lớn.
- E_04.1.2.2: Ảnh sai định dạng.
- E_04.1.2.3: Cloudinary không khả dụng.

### 6.5. UC_04.1.3 — Chọn vị trí

**Actor chính:** Người dùng

**Mô tả:** Chọn đến đơn vị hành chính và vị trí GPS hoặc ghim trên bản đồ.

**Điều kiện tiên quyết:**

1. Đã chọn tỉnh, huyện và xã.
2. Có tọa độ hợp lệ hoặc ghim bản đồ.

**Luồng chính:**

1. Người dùng chọn tỉnh, huyện và xã.
2. Người dùng chọn địa điểm hoặc nhập tọa độ GPS.
3. Hệ thống xác minh mã khu vực và tọa độ.
4. Hệ thống lưu địa chỉ và tọa độ.

### 6.6. UC_04.1.4 — Kiểm tra nội dung

**Actor chính:** Người dùng

**Mô tả:** Kiểm tra tiêu đề, mô tả, loại bài đăng và nội dung không phù hợp trước khi publish.

**Luồng chính:**

1. Hệ thống chuẩn hóa văn bản.
2. Hệ thống kiểm tra từ bị cấm.
3. Backend kiểm tra role và dữ liệu.
4. Hệ thống trả về lỗi nếu không đạt điều kiện.

### 6.7. UC_04.1.5 — Đăng bài

**Actor chính:** Người dùng

**Mô tả:** Lưu bài đăng sau khi đã vượt qua các kiểm tra.

**Quan hệ:**

- Include: UC_04.1.2 Upload ảnh, UC_04.1.3 Chọn vị trí, UC_04.1.4 Kiểm tra nội dung.
- Extend: UC_04.1.6 Gửi thông báo khu vực.

**Điều kiện sau:**

1. Bài đăng có trạng thái AVAILABLE và IS_APPROVED = 1.
2. URL ảnh đã được lưu vào database.
3. Người dùng nhận thông báo xác nhận.

### 6.8. UC_04.1.6 — Gửi thông báo khu vực cho bài RENTAL

**Actor phụ:** Hệ thống thông báo

**Điều kiện:**

- Bài đăng có `post_type = RENTAL`.
- Bài đăng có vị trí hợp lệ.
- Có user FIND có cùng tỉnh/huyện/xã.

**Luồng chính:**

1. Hệ thống tìm các FIND trong cùng khu vực.
2. Hệ thống lọc người dùng theo điều kiện đăng ký/địa điểm.
3. Hệ thống gửi thông báo chứa thông tin bài đăng và khoảng cách.
4. Hệ thống không gửi để người dùng ngoài khu vực.

### 6.9. UC_04.2 — Chỉnh sửa bài đăng

**Actor chính:** Người dùng

**Mô tả:** Cập nhật thông tin bài đăng của chính người dùng.

**Quan hệ:**

- Include: UC_04.1.4 Kiểm tra nội dung, UC_04.1.3 Chọn vị trí.

**Điều kiện tiên quyết:**

1. Bài đăng tồn tại.
2. Bài đăng thuộc quyền chỉnh sửa của người dùng.
3. Bài chưa bị xóa hoặc bị khóa.

**Ngoại lệ:**

- E_04.2.1: Bài đăng không tồn tại.
- E_04.2.2: Không có quyền sửa.
- E_04.2.3: Dữ liệu không hợp lệ.

### 6.10. UC_04.3 — Ẩn hoặc hiện bài đăng

**Actor chính:** Người dùng

**Mô tả:** Đổi trạng thái bài đăng ACTIVE/AVAILABLE.

**Điều kiện tiên quyết:**

1. Bài đăng thuộc người dùng.
2. Trạng thái hiện hành được xác định.

**Luồng chính:**

1. Người dùng chọn Ẩn hoặc Hiện bài đăng.
2. Hệ thống cập nhật trạng thái.
3. Hệ thống xác nhận kết quả.

### 6.11. UC_04.4 — Xem bài đăng của tôi

**Actor chính:** Người dùng

**Mô tả:** Hiển thị danh sách bài đăng được tạo bởi người dùng.

**Luồng chính:**

1. Người dùng mở màn hình bài đăng của tôi.
2. Backend tải bài đăng theo user ID.
3. Hệ thống hiển thị tiêu đề, trạng thái, loại bài đăng và ngày tạo.
4. Người dùng chọn bài để xem hoặc chỉnh sửa.

**Ngoại lệ:**

- E_04.4.1: Không tìm thấy bài đăng.
- E_04.4.2: API không phản hồi.

## 7. Toàn bộ actor tương tác với use case con

| Actor                    | Use case con chính                                                     |
| ------------------------ | ---------------------------------------------------------------------- |
| Sinh viên / Người đi làm | UC_01.1, UC_02.3, UC_03.x, UC_04.1, UC_05.1, UC_06.1, UC_06.2, UC_07.1 |
| Chủ trọ                  | UC_01.2, UC_02.3, UC_03.x, UC_04.1, UC_05.6, UC_06.1-UC_06.4, UC_07.1  |
| Quản trị viên            | UC_08.1, UC_08.2, UC_08.3                                              |
| Hệ thống thông báo       | UC_04.1.6, UC_06.x, UC_07.x                                            |

## 8. Tình trạng triển khai hiện tại

- [x] Đăng ký, đăng nhập, hồ sơ và KYC
- [x] Tìm kiếm theo khu vực, địa điểm và bán kính
- [x] Home có pagination và 5 bài đầu
- [x] Role-based permission cho đăng bài
- [x] Cloudinary cho ảnh bài đăng
- [x] Cloudinary cho ảnh KYC
- [x] VIP chỉ dành cho LANDLORD
- [ ] Duyệt KYC bởi Admin
- [ ] Quản lý bài đăng và báo cáo từ Admin
- [ ] OTP và Quên mật khẩu
- [ ] Một số luồng chat, lịch hẹn và rental request đang cần kiểm tra tính đồng nhất với use case
