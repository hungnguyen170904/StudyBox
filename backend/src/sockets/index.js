const jwt = require('jsonwebtoken');
const db = require('../db');
const { isChannelMember } = require('../middlewares/channelMiddleware');

// Import handlers
const registerChatHandlers = require('./chatHandler');
const registerMusicHandlers = require('./musicHandler');
const registerVoiceHandlers = require('./voiceHandler');
const registerWhiteboardHandlers = require('./whiteboardHandler');
const pomodoroHandler = require('./pomodoroHandler');

let ioInstance;
const userSocketsMap = new Map(); // Lưu trữ userId -> Set(socketId)

module.exports = {
  getIo: () => ioInstance,
  getUserSocketId: (userId) => {
    const sockets = userSocketsMap.get(userId);
    return sockets && sockets.size > 0 ? Array.from(sockets)[0] : null;
  },
  init: (io) => {
    ioInstance = io;
    
    // Middleware xác thực socket
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
      } catch (err) {
        return next(new Error('Authentication error'));
      }
    });

    io.on('connection', (socket) => {
      console.log(`User connected to socket: ${socket.user.username} (${socket.id})`);
      
      // 1. Quản lý Connection & Presence
      if (!userSocketsMap.has(socket.user.id)) {
        userSocketsMap.set(socket.user.id, new Set());
        // Phát thông báo user online cho TẤT CẢ mọi người nếu đây là tab đầu tiên
        io.emit('user_status_change', { userId: socket.user.id, isOnline: true });
      }
      userSocketsMap.get(socket.user.id).add(socket.id);

      socket.on('get_online_users', () => {
        const onlineUsers = Array.from(userSocketsMap.keys());
        socket.emit('online_users_list', onlineUsers);
      });

      socket.on('join_channel', async (channelId) => {
        if (!await isChannelMember(channelId, socket.user.id)) return;
        socket.join(`channel_${channelId}`);
        console.log(`${socket.user.username} joined channel_${channelId}`);
      });

      socket.on('leave_channel', (channelId) => {
        socket.leave(`channel_${channelId}`);
      });

      // Hàm phụ trợ dùng chung cho các handlers
      const utils = {
        getUserSockets: (userId) => userSocketsMap.get(userId),
        checkIsOwner: async (channelId, userId) => {
          const res = await db.query(
            `SELECT rm.role FROM room_members rm 
             JOIN channels c ON rm.room_id = c.room_id 
             WHERE c.id = $1 AND rm.user_id = $2`, 
            [channelId, userId]
          );
          return res.rows.length > 0 && res.rows[0].role === 'owner';
        }
      };

      // 2. Đăng ký các Handlers
      registerChatHandlers(io, socket, utils);
      registerMusicHandlers(io, socket, utils);
      registerVoiceHandlers(io, socket, utils);
      registerWhiteboardHandlers(io, socket, utils);
      pomodoroHandler(io, socket);

      // 3. Xử lý ngắt kết nối
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user?.username}`);
        
        const userSockets = userSocketsMap.get(socket.user.id);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            userSocketsMap.delete(socket.user.id);
            // Phát thông báo user offline khi đóng toàn bộ tab
            io.emit('user_status_change', { userId: socket.user.id, isOnline: false });
          }
        }
        
        // Dọn dẹp trạng thái voice channel nếu có
        if (socket.voiceChannelId) {
          io.to(`voice_${socket.voiceChannelId}`).emit('voice:user_left', { userId: socket.user.id });
        }
      });
    });
  }
};
