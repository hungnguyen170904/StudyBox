<div align="center">

<img src="./frontend/public/Logo.png" alt="StudyBox Logo" width="120" />

# StudyBox

**Nền tảng học tập nhóm thời gian thực — Cộng tác, kết nối và học hiệu quả hơn.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101?logo=socket.io)](https://socket.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

</div>

---

## 📖 Giới thiệu

**StudyBox** là ứng dụng web học tập nhóm toàn diện, cho phép người dùng tạo **phòng học riêng**, **giao tiếp thời gian thực** qua văn bản và giọng nói, **cộng tác trực tiếp** trên bảng trắng và tài liệu, cùng hàng loạt tính năng hỗ trợ học nhóm khác.

Giao diện được xây dựng theo phong cách **Glassmorphism** hiện đại với animation mượt mà, đảm bảo trải nghiệm người dùng cao cấp.

---

## ✨ Tính năng

### 💬 Nhắn tin thời gian thực
- Cuộn vô hạn tải thêm tin nhắn cũ (Infinite Scroll)
- Hiển thị người đang gõ (Typing Indicator)
- Thả cảm xúc cho từng tin nhắn (Reactions: 👍 ❤️ 😂 😮 😢 😡)
- Gửi file, ảnh, video tối đa 10MB
- **Trả lời tin nhắn** (Reply) với preview bar
- **Phân nhóm theo ngày** (Day Divider) và dấu phân cách tin nhắn mới (Unread Divider)

### 🎙️ Kênh thoại (Voice Channel)
- Kết nối nhóm qua **WebRTC** (Simple-peer)
- Chỉ báo âm lượng — khung sáng khi đang nói
- Bật/tắt Microphone, Camera, Chia sẻ màn hình
- Hỗ trợ nhiều người kết nối đồng thời

### 🎨 Bảng trắng cộng tác (Whiteboard)
- Vẽ tự do theo thời gian thực (nhiều người cùng vẽ)
- **Undo/Redo** (lưu 30 bước, phím tắt Ctrl+Z / Ctrl+Y)
- Chọn màu, kích thước nét, bút xóa
- **Xuất PNG** trực tiếp

### 🎧 Nghe nhạc chung (Music Player)
- Phát nhạc từ **YouTube** & **SoundCloud** đồng bộ toàn phòng
- Hàng đợi bài hát (Queue) — thêm, bỏ phiếu
- Điều khiển Play/Pause, chuyển bài tập trung

### 📋 Quản lý nhiệm vụ — Kanban Board
- Giao diện **Kanban 3 cột**: Cần làm / Đang làm / Hoàn thành
- Thiết lập **độ ưu tiên** (Cao / Vừa / Thấp) với badge màu
- **Deadline countdown** — cảnh báo quá hạn theo màu sắc
- Kéo task qua các cột, cập nhật real-time qua Socket.io

### 🔍 Tìm kiếm toàn cục (Ctrl+K)
- **Command Palette** mở bằng `Ctrl+K` từ bất kỳ đâu
- Tìm kiếm đồng thời **tin nhắn**, **nhiệm vụ**, **phòng học**
- Điều hướng bàn phím (↑ ↓ Enter Esc) và highlight từ khóa
- Kết quả phân quyền — chỉ hiện nội dung phòng bạn tham gia

### 📁 Tài liệu & Drive
- Upload và chia sẻ file (PDF, Word, ảnh, zip…)
- Xem tài liệu trực tiếp trong kênh tài liệu

### 👥 Xã hội & Bạn bè
- Gửi/chấp nhận lời mời kết bạn
- Nhắn tin riêng (Direct Message)
- Trạng thái Online/Offline thời gian thực

### 🏠 Quản lý Phòng & Kênh
- Tạo kênh con: Text / Voice / Whiteboard / Music / Document
- Phân quyền: Owner → Admin → Member
- **Mã mời** (Invite Code) chia sẻ qua link

### 🔔 Thông báo
- Thông báo real-time qua Socket.io
- Đánh dấu đã đọc từng thông báo hoặc tất cả

---

## 🛠️ Công nghệ sử dụng

| Tầng | Công nghệ |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Zustand, Framer Motion |
| **Realtime** | Socket.io-client, WebRTC (Simple-peer) |
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL 14+ |
| **Cache / Queue** | Redis (hàng đợi nhạc) |
| **Auth** | JWT (jsonwebtoken), bcrypt |
| **Security** | helmet, cors, express-rate-limit, SSRF URL allow-list |
| **Media** | Multer (file upload) |

---

## 🗂️ Cấu trúc dự án

```
StudyBox/
├── backend/
│   ├── server.js               # Entry point — Express + Socket.io
│   ├── uploads/                # File upload storage
│   └── src/
│       ├── controllers/        # Logic xử lý API
│       │   ├── authController.js
│       │   ├── chatController.js
│       │   ├── taskController.js
│       │   ├── searchController.js
│       │   └── ...
│       ├── middlewares/
│       │   ├── authMiddleware.js
│       │   └── roomMiddleware.js   # Phân quyền phòng/task
│       ├── routes/             # Định tuyến API
│       │   ├── authRoutes.js
│       │   ├── roomRoutes.js
│       │   ├── taskRoutes.js
│       │   ├── searchRoutes.js
│       │   └── ...
│       ├── sockets/            # Socket.io handlers
│       │   ├── index.js
│       │   ├── chatHandler.js
│       │   ├── voiceHandler.js
│       │   ├── whiteboardHandler.js
│       │   └── musicHandler.js
│       └── db/                 # SQL schema & migrations
│           ├── alter_tasks.sql
│           └── migrate_tasks_v2.sql
│
└── frontend/
    ├── index.html
    └── src/
        ├── App.jsx             # Root — router, socket init, Ctrl+K
        ├── pages/
        │   ├── Home.jsx        # Dashboard + phòng học
        │   ├── Room.jsx        # Giao diện phòng học chính
        │   ├── Login.jsx
        │   └── Register.jsx
        ├── components/
        │   ├── Chat/           # MessageList, MessageInput (Reply mode)
        │   ├── VoiceChannel/   # WebRTC video/audio
        │   ├── Whiteboard/     # Canvas + Undo/Redo
        │   ├── MusicPlayer/    # Sync music player
        │   ├── Room/           # RoomTasksModal (Kanban), Modals
        │   ├── Search/         # SearchDialog (Ctrl+K)
        │   ├── Notifications/
        │   └── Friends/
        └── store/              # Zustand global state
            ├── authStore.js
            ├── chatStore.js
            ├── taskStore.js
            └── ...
```

---

## 🚀 Cài đặt & Chạy dự án

### Yêu cầu hệ thống
- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14
- **Redis** (dùng cho tính năng Music Player)

---

### Bước 1 — Clone mã nguồn

```bash
git clone https://github.com/hungnguyen170904/StudyBox.git
cd StudyBox
```

---

### Bước 2 — Cấu hình & chạy Backend

```bash
cd backend
npm install
```

Tạo file `.env` trong thư mục `backend/` (tham khảo `.env.example`):

```env
# Server
PORT=5000

# Database
DATABASE_URL=postgres://user:password@localhost:5432/studybox
# Hoặc cấu hình từng biến riêng:
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=studybox

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your_super_secret_key_at_least_32_chars

# CORS — origin của frontend (nhiều origin phân cách bằng dấu phẩy)
CLIENT_URL=http://localhost:5173
```

Tạo schema cơ sở dữ liệu (chạy lần đầu):

```bash
# Tạo database trong PostgreSQL trước, sau đó chạy:
node src/db/run_alter_tasks.js
node src/db/run_migrate_tasks_v2.js
```

Khởi động Backend:

```bash
npm run dev
# Server chạy tại http://localhost:5000
# Health check: GET http://localhost:5000/health
```

---

### Bước 3 — Cấu hình & chạy Frontend

```bash
cd ../frontend
npm install
```

Tạo file `.env` trong thư mục `frontend/`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Khởi động Frontend:

```bash
npm run dev
# Ứng dụng chạy tại http://localhost:5173
```

---

## 🔑 Tính năng bảo mật

| Cơ chế | Mô tả |
|---|---|
| **JWT Authentication** | Xác thực stateless, token gắn vào mọi request và socket |
| **CORS whitelist** | Chỉ chấp nhận origin cấu hình trong `CLIENT_URL` |
| **Rate Limiting** | Auth: 10 req/phút · API chung: 200 req/phút |
| **Room Middleware** | Kiểm tra membership trước mọi thao tác trong phòng |
| **Task Ownership** | Chỉ người tạo hoặc Admin/Owner mới được sửa/xoá task |
| **SSRF Protection** | Music Player chỉ chấp nhận URL từ youtube.com và soundcloud.com |
| **Helmet** | HTTP security headers chuẩn |

---

## 📡 API Reference

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/auth/register` | Đăng ký tài khoản |
| `POST` | `/api/auth/login` | Đăng nhập |
| `GET` | `/api/rooms` | Danh sách phòng công khai |
| `POST` | `/api/rooms` | Tạo phòng mới |
| `GET` | `/api/rooms/:roomId/tasks` | Lấy danh sách nhiệm vụ |
| `POST` | `/api/rooms/:roomId/tasks` | Tạo nhiệm vụ |
| `PATCH` | `/api/rooms/tasks/:taskId` | Cập nhật nhiệm vụ |
| `DELETE` | `/api/rooms/tasks/:taskId` | Xoá nhiệm vụ |
| `GET` | `/api/search?q=<query>` | Tìm kiếm toàn cục |
| `GET` | `/api/notifications` | Danh sách thông báo |
| `GET` | `/health` | Health check endpoint |

---

## ⌨️ Phím tắt

| Phím | Chức năng |
|---|---|
| `Ctrl + K` | Mở hộp tìm kiếm toàn cục |
| `Ctrl + Z` | Hoàn tác (Whiteboard) |
| `Ctrl + Y` | Làm lại (Whiteboard) |
| `Escape` | Đóng dialog / Huỷ reply |
| `↑ ↓` | Điều hướng kết quả tìm kiếm |
| `Enter` | Chọn kết quả tìm kiếm |

---

## 👨‍💻 Tác giả

**Nguyễn Thái Hùng**  
📧 hungnguyen170904@gmail.com  
🔗 [github.com/hungnguyen170904](https://github.com/hungnguyen170904)

---

## 📜 Giấy phép

Dự án phân phối theo giấy phép **MIT License**.  
Xem chi tiết tại file [LICENSE](LICENSE).
