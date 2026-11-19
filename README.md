# Hoàng Kim Huệ · Business Intelligence & AI Data Analytics Portal

Nền tảng phân tích dữ liệu kinh doanh thông minh và bảng điều khiển trực quan hóa điều hành doanh nghiệp, được thiết kế theo phong cách giao diện hiện đại Paynext với quy trình 5 bước tự động hóa và trợ lý phân tích AI Gemini.

---

## 👤 Thông Tin Tác Giả & Dự Án

- **Tác giả:** Hoàng Kim Huệ
- **Chuyên môn:** Lead Data Analyst & Business Intelligence Specialist
- **Đồ án:** Nền tảng AI Agent Phân tích & Trực quan hóa Dữ liệu Doanh nghiệp
- **Công nghệ chính:** Vanilla JavaScript (ES6+), HTML5, CSS3, Google Gemini API, SheetJS

---

## 🌟 Tính Năng Nổi Bật

1. **Cổng Đăng Nhập Độc Lập (`login.html`)**
   - Kiểm soát quyền truy cập trước khi vào hệ thống phân tích.
   - Hỗ trợ đăng nhập, đăng ký tài khoản mới và lưu phiên làm việc an toàn trên `localStorage`.
   - Có nút **"Điền nhanh tài khoản dùng thử"** tiện lợi.

2. **Quy Trình Phân Tích Dữ Liệu 5 Bước Chuẩn Quốc Tế**
   - **Bước 1: Tiếp nhận dữ liệu & Yêu cầu:** Tải lên tệp CSV, Excel (`.xlsx`, `.xls`) hoặc JSON, kèm theo ô nhập yêu cầu phân tích kinh doanh.
   - **Bước 2: Khử trùng & Làm sạch dữ liệu theo yêu cầu:** Tự động chuẩn hóa khoảng trắng, loại bỏ dòng trống, lọc trùng lặp và hỗ trợ xóa dòng dữ liệu theo yêu cầu bằng ngôn ngữ tự nhiên hoặc thao tác trực tiếp.
   - **Bước 3: Tinh chỉnh & Chuẩn hóa:** Bảng điều khiển màu sáng, hiển thị các chỉ số kiểm toán dữ liệu và tình trạng dữ liệu sau khi làm sạch.
   - **Bước 4: Dashboard KPI & Trực quan hóa đa chiều:** 4 khối biểu đồ trực quan (Biểu đồ cột, Biểu đồ Donut, Bảng xếp hạng Top thực thể, Biểu đồ phân bổ) kèm nhận định kinh doanh.
   - **Bước 5: Bảng Dữ Liệu Tương Tác:** Phân trang, tìm kiếm toàn văn, lọc theo phân khúc/trạng thái và xem chi tiết từng bản ghi.

3. **Báo Cáo Điều Hành Cuối Cùng (Executive BI Report)**
   - Thẻ doanh thu tổng Navy sang trọng `$14,042` với nhãn tăng trưởng xanh lá.
   - Hệ thống 4 thẻ chỉ số KPI trọng yếu.
   - Biểu đồ xu hướng và trạng thái đơn hàng.
   - Bảng xếp hạng Top sản phẩm/khách hàng chủ lực.
   - 3 đề xuất hành động kinh doanh thực tiễn.
   - Thanh điều hướng nổi dạng viên thuốc (Floating Bottom Pill Navigation).

4. **Trợ Lý AI Phân Tích (Gemini Copilot)**
   - Tích hợp mô hình Gemini 1.5 Flash trả lời tức thì các câu hỏi về dữ liệu kinh doanh, xu hướng doanh thu và khuyến nghị chiến lược.

5. **Hệ Thống Đánh Giá Trải Nghiệm Khách Hàng (Customer Feedback)**
   - Chấm điểm 5 sao trực quan, gắn thẻ nhận xét và lưu trữ lịch sử đánh giá thực tế.

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
├── login.html                 # Cổng đăng nhập & đăng ký người dùng
├── index.html                 # Ứng dụng phân tích dữ liệu & Dashboard chính
├── app.js                     # Động cơ xử lý dữ liệu, biểu đồ & AI Copilot
├── data.js                    # Bộ dữ liệu mẫu ban đầu & cấu trúc mẫu
├── config.js                  # Cấu hình tác giả & Google Gemini API Key
├── start_server.bat           # File khởi chạy nhanh máy chủ cục bộ trên Windows
├── http_server.ps1            # Máy chủ HTTP viết bằng PowerShell thuần
├── datasets/                  # Thư mục chứa các tệp dữ liệu mẫu để thử nghiệm
│   ├── mau_leads_template.csv
│   ├── mau_stores_template.csv
│   └── mau_transactions_phucan.csv
├── docs/                      # Tài liệu kỹ thuật & từ điển dữ liệu
│   ├── DATA_DICTIONARY.md
│   ├── sales_outreach_playbook.md
│   └── schema_dwh_bi.sql
├── .gitignore                 # Cấu hình bỏ qua tệp tạm khi commit git
└── README.md                  # Hướng dẫn chi tiết dự án
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ

### Cách 1: Chạy bằng file `start_server.bat` (Khuyên dùng trên Windows)
1. Nhấp đúp chuột vào file `start_server.bat`.
2. Trình duyệt web sẽ tự động mở trang: `http://localhost:8080/`.
3. Hệ thống sẽ điều hướng bạn đến trang đăng nhập `login.html`.

### Cách 2: Mở trực tiếp bằng trình duyệt
- Nhấp đúp trực tiếp vào file `login.html` trên máy tính để bắt đầu trải nghiệm ngay mà không cần cài đặt thêm bất kỳ phần mềm nào.

---

## 🔐 Tài Khoản Trải Nghiệm Mẫu (Demo Credentials)

| Thông Tin | Giá Trị Mặc Định |
| :--- | :--- |
| **Email đăng nhập** | `admin@hoangkimhue.vn` |
| **Mật khẩu** | `123456` |
| **Họ tên hiển thị** | Hoàng Kim Huệ |

*(Bạn cũng có thể nhấp vào dòng chữ **"⚡ Điền nhanh tài khoản dùng thử"** trên màn hình đăng nhập để tự động điền thông tin).*

---

## 📤 Hướng Dẫn Tải Lên GitHub

### Cách 1: Tải lên trực tiếp trên giao diện web GitHub
1. Tạo một repository mới trên GitHub (ví dụ: `hoang-kim-hue-bi-analytics`).
2. Nhấn vào nút **Add file** -> **Upload files**.
3. Kéo toàn bộ các file trong thư mục dự án (trừ thư mục `_archive`) vào và nhấn **Commit changes**.

### Cách 2: Đẩy lên bằng Git CLI
Mở terminal tại thư mục này và thực hiện các lệnh sau:

```bash
git init
git add .
git commit -m "feat: Nền tảng phân tích dữ liệu & BI Portal - Hoàng Kim Huệ"
git branch -M main
git remote add origin https://github.com/<tai-khoan-cua-ban>/<ten-repository>.git
git push -u origin main
```

### Bật GitHub Pages để chạy trực tuyến miễn phí
1. Vào repository trên GitHub -> chọn tab **Settings**.
2. Chọn mục **Pages** ở cột menu bên trái.
3. Ở phần **Branch**, chọn `main` và thư mục `/(root)`, sau đó nhấn **Save**.
4. Sau 1-2 phút, bạn sẽ nhận được đường dẫn trực tuyến (ví dụ: `https://<ten-user>.github.io/<ten-repo>/login.html`).
