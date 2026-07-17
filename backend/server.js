const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Cấu hình Socket.io
const io = new Server(server, {
  cors: {
    origin: '*', // Trong thực tế nên giới hạn lại origin của frontend
    methods: ['GET', 'POST']
  }
});

const path = require('path');

// Áp dụng bảo mật Header
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" })); // Cho phép load ảnh từ domain khác nếu cần

app.use(cors());
app.use(express.json());

// Giới hạn request (Rate Limiting)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 200, // Giới hạn 200 request / 1 phút cho mỗi IP
  message: "Quá nhiều yêu cầu từ IP của bạn, vui lòng thử lại sau 1 phút."
});
app.use('/api', limiter); // Chỉ áp dụng cho các route bắt đầu bằng /api

// Public thư mục uploads để front-end có thể truy cập qua URL
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Nhập routes
const authRoutes = require('./src/routes/authRoutes');
const roomRoutes = require('./src/routes/roomRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const friendRoutes = require('./src/routes/friendRoutes');
const dmRoutes = require('./src/routes/dmRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const documentRoutes = require('./src/routes/documentRoutes');

// Định tuyến API
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/channels', chatRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/documents', documentRoutes);

// Routes cơ bản
app.get('/', (req, res) => {
  res.send('StudyBox API Server is running');
});

// Khởi tạo Socket.io logic
const socketHandler = require('./src/sockets');
socketHandler.init(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
