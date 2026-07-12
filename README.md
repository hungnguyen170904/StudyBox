# 🚀 StudyBox - Không gian Học tập Trực tuyến Đỉnh cao

**StudyBox** là một nền tảng học tập nhóm trực tuyến (Real-time Collaborative Platform) được thiết kế để mang đến trải nghiệm học tập, làm việc nhóm mượt mà và trực quan nhất. Với giao diện **Glassmorphism** cực kỳ hiện đại, ứng dụng tích hợp hoàn hảo công nghệ **WebRTC** và **Socket.io**.

![StudyBox Banner](./frontend/public/Logo.png)

## ✨ Tính năng Nổi bật

- 💬 **Nhắn tin Thời gian thực (Real-time Chat):** 
  - Cuộn vô hạn (Infinite Scroll).
  - Trạng thái Online/Offline chính xác.
  - Hiển thị người dùng đang gõ (Typing Indicator).
  - Thả cảm xúc (Message Reactions).
- 🎙️ **Đàm thoại Nhóm (Voice Channel):** Kết nối siêu tốc bằng công nghệ WebRTC, mang lại chất lượng âm thanh ổn định.
- 🎨 **Bảng Trắng Trực tuyến (Whiteboard):** Vẽ, ghi chú, lên ý tưởng (Brainstorming) cùng nhau trực tiếp.
- 🎧 **Nghe Nhạc Chung (Music Player):** Tích hợp phát nhạc Youtube/SoundCloud đồng bộ cho cả phòng học.
- 📁 **Chia sẻ Tài liệu (Drive):** Kéo thả mượt mà, lưu trữ an toàn các file PDF, Docx, Hình ảnh.
- 🛡️ **Quản lý Phòng & Kênh (Room & Channel Management):** Tạo các kênh con tương tự Discord. Phân quyền Owner/Admin mạnh mẽ, tích hợp mã mời (Invite Code).
- 👥 **Hệ thống Bạn bè:** Kết bạn, quản lý danh sách bạn bè và nhắn tin riêng (Direct Messages).

## 🛠️ Công nghệ Sử dụng

### 💻 Frontend
- **Framework:** React.js + Vite
- **Thiết kế UI:** Tailwind CSS (Hiệu ứng Glassmorphism)
- **Quản lý Trạng thái:** Zustand
- **Thời gian thực:** Socket.io-client, WebRTC (Simple-peer)

### ⚙️ Backend
- **Core:** Node.js & Express.js
- **Cơ sở Dữ liệu:** PostgreSQL 
- **Quản lý hàng đợi (Queue):** Redis (Cho Music Player)
- **Websocket Server:** Socket.io
- **Bảo mật:** JWT (Jsonwebtoken), Bcrypt

## 🚀 Hướng dẫn Cài đặt (Getting Started)

### Yêu cầu hệ thống
- **Node.js** (Phiên bản 18+)
- **PostgreSQL** (Phiên bản 14+)
- **Redis Server** (Cần thiết cho tính năng Nghe nhạc chung)

### Bước 1: Clone mã nguồn
```bash
git clone https://github.com/hungnguyen170904/StudyBox.git
cd StudyBox
```

### Bước 2: Cài đặt Backend
```bash
cd backend
npm install
```
Tạo file `.env` trong thư mục `backend`:
```env
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=studybox
JWT_SECRET=your_secret_key
PORT=5000
```
Khởi động Backend:
```bash
npm run dev
```

### Bước 3: Cài đặt Frontend
```bash
cd ../frontend
npm install
```
Tạo file `.env` trong thư mục `frontend`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```
Khởi động Frontend:
```bash
npm run dev
```

## 📜 Giấy phép (License)
Dự án nguồn mở được phân phối dưới giấy phép MIT License.
