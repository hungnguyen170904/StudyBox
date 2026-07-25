const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Đọc danh sách CLIENT_URL từ biến môi trường
// Hỗ trợ nhiều origin phân tách bằng dấu phẩy, ví dụ: "http://localhost:5173,https://studybox.app"
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Cho phép request không có origin (ví dụ: Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: origin ${origin} không được phép.`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
};

// Cấu hình Socket.io với CORS chặt chẽ
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

const path = require('path');

// Áp dụng bảo mật Header
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

// Nén dữ liệu
app.use(compression());

app.use(cors(corsOptions));
app.use(express.json());

// ─── Rate Limiting ───────────────────────────────────────────────────────────
// Auth endpoints: giới hạn nghiêm hơn để chống brute-force
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 phút
  max: 10,                   // Tối đa 10 lần đăng nhập/đăng ký mỗi phút
  message: 'Quá nhiều yêu cầu xác thực, vui lòng thử lại sau 1 phút.',
  standardHeaders: true,
  legacyHeaders: false,
});

// API chung: giới hạn thoải mái hơn
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 phút
  max: 200,
  message: 'Quá nhiều yêu cầu từ IP của bạn, vui lòng thử lại sau 1 phút.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);
// ─────────────────────────────────────────────────────────────────────────────

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
const taskRoutes = require('./src/routes/taskRoutes');
const searchRoutes = require('./src/routes/searchRoutes');

// Định tuyến API
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/channels', chatRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/rooms', taskRoutes); // route là /api/rooms/:roomId/tasks
app.use('/api/search', searchRoutes);


// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
// ─────────────────────────────────────────────────────────────────────────────

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
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});

