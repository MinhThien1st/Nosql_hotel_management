# 🏨 HỆ THỐNG QUẢN LÝ KHÁCH SẠN & ĐẶT PHÒNG (SƯƠNG MAI HOTEL PMS)
> **Dự án Mini Fullstack Web - Cơ Sở Dữ Liệu NoSQL Apache Cassandra trên DataStax Astra DB**  
> **Công nghệ**: Spring Boot 3 (Java 17/21) + DataStax Java Driver for Cassandra 4.17.0 + Frontend SPA Modern Light SaaS PMS.

---

## 📌 1. TỔNG QUAN DỰ ÁN & KIẾN TRÚC

Dự án **Sương Mai Hotel PMS** là ứng dụng Web quản lý chuỗi chi nhánh khách sạn, đặt phòng và thanh toán hóa đơn. Ứng dụng được thiết kế theo tư duy mô hình hóa dữ liệu NoSQL hướng truy vấn (**Query-Driven Data Modeling**) của **Apache Cassandra**, kết nối thực tế lên Cloud Database **DataStax Astra DB**.

### 🌟 Tính Năng Nổi Bật:
- **Kết nối Cloud NoSQL thực tế**: Sử dụng DataStax Java Driver kết nối Astra DB qua Secure Connect Bundle (`.zip`) và Astra Token, truy vấn CQL thuần với `PreparedStatement` an toàn, tối ưu hiệu năng.
- **Dashboard Phân Tích Thông Minh**: KPI thời gian thực, tỷ lệ lấp đầy phòng (Occupancy Rate), biểu đồ doanh thu theo chi nhánh và biểu đồ cơ cấu phòng bằng **Chart.js**.
- **Sơ Đồ Phòng Khách Sạn (PMS Color Grid)**: Hiển thị trực quan theo trạng thái (`🟢 Trống - AVAILABLE`, `🔴 Đang ở - OCCUPIED`, `🟡 Đã đặt - RESERVED`, `⚪ Bảo trì - MAINTENANCE`), hỗ trợ thao tác nhanh đổi trạng thái 1-click, lọc theo chi nhánh và thêm/sửa thông tin phòng.
- **Giao Diện Light SaaS PMS**: Giao diện sáng thanh lịch, tối ưu trải nghiệm người dùng, hỗ trợ Custom Floating Dropdown mượt mà, hệ thống Toast Notifications tức thì.
- **Cơ chế Fallback thông minh**: Hỗ trợ In-Memory Mock Mode giúp chạy thử nghiệm và thuyết trình ngay cả khi ngoại tuyến.

---

## 👥 2. PHÂN CHIA NHIỆM VỤ NHÓM 3 THÀNH VIÊN (TASKS BREAKDOWN)

| Thành viên | Trọng trách phân chia | Bảng Cassandra phụ trách | Trạng thái thực hiện |
| :--- | :--- | :--- | :--- |
| **Dev 1 (Trưởng nhóm)** | **Core Architecture, Quản lý Khách Sạn, Phòng & Dashboard Analytics** | `hotels` (Q1)<br>`rooms_by_hotel` (Q2) | **✅ ĐÃ HOÀN THÀNH 100%** |
| **Dev 2** | **Module Quản lý Đặt Phòng & Check-in / Check-out (Bookings)** | `bookings_by_hotel_date` (Q4)<br>`bookings_by_guest` (Q3) | **⏳ Đang phát triển / Cần hoàn thiện** |
| **Dev 3** | **Module Hóa Đơn & Thu Ngân Thanh Toán (Invoices)** | `invoices_by_booking` (Q5) | **⏳ Đang phát triển / Cần hoàn thiện** |

---

### 👑 Chi Tiết Phần Dev 1 (Đã hoàn thành 100%):
- [x] **Hạ tầng & Kết nối CSDL (`com.qlks.config.CassandraConfig`)**:
  - Thiết lập `CqlSession` kết nối Astra DB bằng Secure Connect Bundle và Application Token.
  - Tự động nhận diện đường dẫn Bundle, cơ chế nạp Keyspace chuẩn và Fallback Mock dữ liệu khi cần.
- [x] **Quản lý Khách Sạn (`HotelController` - Bảng `hotels`)**:
  - API `GET /api/hotels`: Lấy danh sách toàn bộ chuỗi khách sạn.
  - API `GET /api/hotels/{hotelId}`: Lấy chi tiết chi nhánh khách sạn.
- [x] **Quản lý Sơ Đồ Phòng (`RoomController` - Bảng `rooms_by_hotel`)**:
  - API `GET /api/rooms`: Lấy danh sách phòng (hỗ trợ lọc theo `hotelId` và `status`).
  - API `POST /api/rooms`: Thêm phòng mới vào khách sạn.
  - API `PUT /api/rooms/{hotelId}/{roomNumber}/status`: Cập nhật nhanh trạng thái phòng (Trống / Đang ở / Đã đặt / Bảo trì).
  - API `DELETE /api/rooms/{hotelId}/{roomNumber}`: Xóa phòng khỏi hệ thống.
- [x] **Dashboard Analytics (`DashboardController`, `DashboardStatsDTO`)**:
  - API `GET /api/dashboard/stats`: Tổng hợp doanh thu, tỷ lệ phòng trống, tỷ lệ lấp đầy, số lượng khách đang lưu trú và dữ liệu biểu đồ.
- [x] **Giao diện Frontend SPA (`index.html`, `style.css`, `app.js`)**:
  - Bố cục Sidebar Navigation tiêu chuẩn, thanh Header chọn chi nhánh bằng Custom Floating Dropdown.
  - PMS Room Grid trực quan, Bộ lọc chip màu trạng thái, Modal thêm/sửa phòng, Biểu đồ thống kê Chart.js.

---

### 📝 Chi Tiết Hướng Dẫn Dành Cho Dev 2 (Module Đặt Phòng - Bookings):
* **Bảng Cassandra phụ trách**:
  - `bookings_by_hotel_date`: Partition Key `((hotel_id), check_in_date, booking_id)` -> Phục vụ lễ tân quản lý danh sách check-in theo ngày tại từng khách sạn.
  - `bookings_by_guest`: Partition Key `((guest_id), check_in_date, booking_id)` -> Phục vụ tra cứu lịch sử đặt phòng của khách hàng theo CCCD/Guest ID.
* **Nguyên tắc NoSQL cần thực hiện (Dual-Write Pattern)**:
  - Khi khách đặt phòng mới, Dev 2 cần viết logic `POST /api/bookings` thực hiện ghi đồng thời vào **cả 2 bảng** trên để đảm bảo tính nhất quán dữ liệu truy vấn.
  - Khi Check-in: Cập nhật `status = 'CHECKED_IN'` và gọi cập nhật bảng `rooms_by_hotel` sang `OCCUPIED`.
  - Khi Check-out: Cập nhật `status = 'COMPLETED'` và đưa phòng về `AVAILABLE`.
* **Các API Dev 2 cần xây dựng**:
  - `GET /api/bookings?hotelId=...&date=...`: Lấy danh sách đặt phòng theo khách sạn và ngày.
  - `POST /api/bookings`: Tạo đơn đặt phòng mới.
  - `PUT /api/bookings/{bookingId}/status`: Cập nhật trạng thái Check-in / Check-out / Hủy.
* **Frontend Dev 2 cần làm**: Thiết kế form tạo đặt phòng và bảng danh sách booking trong tab `Đặt Phòng`.

---

### 📝 Chi Tiết Hướng Dẫn Dành Cho Dev 3 (Module Hóa Đơn & Thu Ngân - Invoices):
* **Bảng Cassandra phụ trách**:
  - `invoices_by_booking`: Partition Key `((booking_id))` -> Mỗi mã đặt phòng chỉ gắn liền với 1 hóa đơn thanh toán duy nhất.
* **Nguyên tắc NoSQL cần thực hiện**:
  - Tra cứu trực tiếp theo `booking_id` để lấy toàn bộ thông tin chi phí lưu trú, tiền phòng, giảm giá và tổng tiền thanh toán.
  - Khi thanh toán thành công, cập nhật `payment_status = 'PAID'` cùng phương thức thanh toán `payment_method` (`CASH`, `CREDIT_CARD`, `MOMO`, `VNPAY`).
* **Các API Dev 3 cần xây dựng**:
  - `GET /api/invoices`: Lấy danh sách hóa đơn.
  - `GET /api/invoices/{bookingId}`: Tra cứu hóa đơn chi tiết theo mã booking.
  - `POST /api/invoices`: Xuất hóa đơn cho booking.
  - `PUT /api/invoices/{bookingId}/pay`: Xác nhận thanh toán hóa đơn.
* **Frontend Dev 3 cần làm**: Thiết kế giao diện chi tiết hóa đơn thanh toán trong tab `Hóa Đơn`.

---

## 🛠️ 3. CÔNG NGHỆ SỬ DỤNG

- **Backend**: Java 17 / 21, Spring Boot 3.2.5 (`spring-boot-starter-web`), Lombok, Jackson.
- **Database Driver**: DataStax Java Driver for Apache Cassandra 4.17.0 (`java-driver-core`, `java-driver-query-builder`).
- **Cloud Database**: DataStax Astra DB (Serverless Apache Cassandra).
- **Frontend**: HTML5 Semantic, Vanilla CSS3 (PMS Light SaaS Theme), Vanilla JavaScript ES6+ (Fetch API), Chart.js, FontAwesome 6.
- **Build Tool**: Maven 3.x.

---

## 🔑 4. HƯỚNG DẪN KẾT NỐI DATASTAX ASTRA DB

### Bước 1: Tạo Database trên DataStax Astra DB
1. Truy cập và đăng nhập: [https://astra.datastax.com/](https://astra.datastax.com/)
2. Nhấn nút **Create Database**:
   - **Database Name**: `hotel_db` (hoặc tên tùy ý)
   - **Keyspace Name**: `qlks`
   - **Cloud Provider & Region**: Chọn *Google Cloud* hoặc *AWS* (khu vực Singapore hoặc gần nhất).
3. Đợi khoảng 1-2 phút đến khi trạng thái Database hiển thị **Active**.

### Bước 2: Nạp Schema và Dữ Liệu Mẫu vào Astra DB
1. Tại trang quản trị Database trên Astra DB, mở mục **CQL Console**.
2. Mở file [`schema.cql`](./schema.cql) trong dự án, copy toàn bộ và dán vào CQL Console để tạo 5 bảng.
3. Mở file [`data_seed.cql`](./data_seed.cql) trong dự án, copy toàn bộ và dán vào CQL Console để nạp dữ liệu mẫu cho các khách sạn và phòng.

### Bước 3: Tải Secure Connect Bundle (`.zip`)
1. Trên Astra DB, vào tab **Connect** -> Chọn ngôn ngữ **Java** -> Tải file **Secure Connect Bundle** (`secure-connect-hotel-db.zip` hoặc tương tự).
2. Di chuyển file vừa tải vào thư mục sau trong dự án:
   ```text
   Nhom9_UngDung_QLKS/astra-creds/secure-connect-hotel-db.zip
   ```

### Bước 4: Tạo Token Truy Cập (Application Token)
1. Trên Astra DB, vào mục **Settings** -> **Token Management**.
2. Chọn Role: **Database Administrator**.
3. Bấm **Generate Token** -> Sao chép chuỗi **Token** (bắt đầu bằng `AstraCS:...`).

### Bước 5: Cấu Hình `application.properties`
Mở file [`src/main/resources/application.properties`](./src/main/resources/application.properties) và điền thông tin:
```properties
# Cấu hình kết nối Astra DB Cassandra
astra.db.secure-connect-bundle-path=astra-creds/secure-connect-hotel-db.zip
astra.db.token=AstraCS:YOUR_ACTUAL_TOKEN_HERE
astra.db.keyspace=qlks
astra.db.enable-fallback=true
```

---

## 🚀 5. HƯỚNG DẪN KHỞI CHẠY DỰ ÁN

### Cách 1: Khởi chạy 1-Click trên Windows (Khuyên Dùng)
Nhấp đúp chuột vào file [`run.bat`](./run.bat) ở thư mục gốc dự án. Script sẽ tự động kiểm tra Java, biên dịch và chạy ứng dụng.

### Cách 2: Khởi chạy bằng lệnh Maven
Mở cửa sổ dòng lệnh (Terminal / PowerShell / CMD) tại thư mục dự án và chạy:
```bash
mvn spring-boot:run
```

### Cách 3: Chạy trực tiếp từ IDE (IntelliJ IDEA / Eclipse / VS Code)
1. Mở dự án trong IDE dưới dạng **Maven Project**.
2. Tìm đến class [`src/main/java/com/qlks/QlksApplication.java`](./src/main/java/com/qlks/QlksApplication.java).
3. Nhấp chuột phải chọn **Run 'QlksApplication'**.

### 🌐 Truy cập Giao Diện:
Sau khi màn hình Console thông báo `Started QlksApplication in ... seconds`:
👉 Mở trình duyệt truy cập: **[http://localhost:8080](http://localhost:8080)**

---

## 📁 6. CẤU TRÚC THƯ MỤC DỰ ÁN

```text
Nhom9_UngDung_QLKS/
├── pom.xml                               # Cấu hình Maven, Spring Boot 3 & DataStax Driver 4.17+
├── README.md                             # Tài liệu tổng quan dự án, kết nối & phân chia task
├── run.bat                               # File chạy nhanh ứng dụng trên Windows
├── schema.cql                            # DDL định nghĩa 5 bảng Cassandra (Q1 -> Q5)
├── data_seed.cql                         # DML dữ liệu mẫu 50 bản ghi
├── astra-creds/
│   └── secure-connect-hotel-db.zip       # Secure Connect Bundle tải từ Astra DB
└── src/
    └── main/
        ├── java/com/qlks/
        │   ├── QlksApplication.java      # Main Entry Point của ứng dụng Spring Boot
        │   ├── config/
        │   │   └── CassandraConfig.java  # Cấu hình CqlSession kết nối Astra DB (Dev 1 - Hoàn thành)
        │   ├── model/
        │   │   ├── Hotel.java            # Model Khách Sạn (Dev 1 - Hoàn thành)
        │   │   └── Room.java             # Model Phòng Khách Sạn (Dev 1 - Hoàn thành)
        │   ├── dto/
        │   │   └── DashboardStatsDTO.java# DTO Thống Kê & Phân Tích Dashboard (Dev 1 - Hoàn thành)
        │   └── controller/
        │       ├── HotelController.java     # API Quản lý Khách Sạn (Dev 1 - Hoàn thành)
        │       ├── RoomController.java      # API Quản lý Sơ Đồ Phòng (Dev 1 - Hoàn thành)
        │       └── DashboardController.java # API Phân Tích KPI Dashboard (Dev 1 - Hoàn thành)
        └── resources/
            ├── application.properties    # Cấu hình Bundle, Token, Keyspace và Port 8080
            └── static/
                ├── css/
                │   └── style.css         # CSS giao diện Light SaaS PMS hiện đại (Dùng chung)
                ├── js/
                │   ├── common.js         # Dropdown chọn khách sạn, Toast & Hàm tiện ích chung
                │   ├── dashboard.js      # Logic Dashboard KPI & Biểu đồ Chart.js (Dev 1 - Hoàn thành)
                │   ├── rooms.js          # Logic Sơ Đồ Phòng, Filter & CRUD (Dev 1 - Hoàn thành)
                │   ├── booking.js        # Skeleton JS Đặt phòng (Dành cho Dev 2)
                │   └── invoice.js        # Skeleton JS Hóa đơn & Thanh toán (Dành cho Dev 3)
                ├── index.html            # Trang Dashboard Tổng Quan (Dev 1 - Hoàn thành)
                ├── rooms.html            # Trang Sơ Đồ Phòng Khách Sạn (Dev 1 - Hoàn thành)
                ├── bookings.html         # Trang Đặt Phòng (Dành cho Dev 2)
                └── invoices.html         # Trang Hóa Đơn & Thu Ngân (Dành cho Dev 3)
```
