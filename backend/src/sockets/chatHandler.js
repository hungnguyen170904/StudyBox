const db = require('../db');

module.exports = (io, socket, { getUserSockets }) => {
  // 1. Xử lý gửi tin nhắn Chat trong Kênh (Channel)
  socket.on('chat:send', async (data) => {
    try {
      const { channel_id, content, type = 'text' } = data;
      
      // Lưu tin nhắn vào DB
      const result = await db.query(
        'INSERT INTO messages (channel_id, user_id, content, type) VALUES ($1, $2, $3, $4::message_type) RETURNING *',
        [channel_id, socket.user.id, content, type]
      );
      const newMessage = result.rows[0];

      // Đính kèm thông tin user để gửi về client
      const userResult = await db.query('SELECT username, display_name, avatar_url FROM users WHERE id = $1', [socket.user.id]);
      const userInfo = userResult.rows[0];

      const fullMessage = {
        ...newMessage,
        username: userInfo.username,
        display_name: userInfo.display_name,
        avatar_url: userInfo.avatar_url
      };

      // Broadcast tin nhắn cho tất cả người trong channel
      io.to(`channel_${channel_id}`).emit('chat:new', fullMessage);
    } catch (err) {
      console.error('Lỗi khi gửi tin nhắn:', err);
    }
  });

  // 2. Gửi tin nhắn trực tiếp (Direct Message)
  socket.on('dm:send', async (data) => {
    try {
      const { toUserId, content, type = 'text' } = data;
      const fromUserId = socket.user.id;

      // Lưu vào DB
      const result = await db.query(
        'INSERT INTO direct_messages (sender_id, receiver_id, content, type) VALUES ($1, $2, $3, $4::message_type) RETURNING *',
        [fromUserId, toUserId, content, type]
      );
      const msg = result.rows[0];

      const userResult = await db.query('SELECT username, display_name, avatar_url FROM users WHERE id = $1', [fromUserId]);
      const userInfo = userResult.rows[0];
      
      const fullMessage = {
        ...msg,
        username: userInfo.username,
        display_name: userInfo.display_name,
        avatar_url: userInfo.avatar_url
      };

      // Trả về cho chính người gửi
      socket.emit('dm:receive', fullMessage);

      // Gửi cho người nhận nếu họ đang online (có thể có nhiều tab)
      const toSockets = getUserSockets(toUserId);
      if (toSockets) {
        toSockets.forEach(socketId => {
          io.to(socketId).emit('dm:receive', fullMessage);
        });
      }
    } catch (err) {
      console.error('Lỗi khi gửi DM:', err);
    }
  });

  // 3. Tính năng Đang gõ... (Typing Indicator)
  socket.on('chat:typing', (channelId) => {
    socket.to(`channel_${channelId}`).emit('chat:typing', {
      channelId,
      username: socket.user.display_name || socket.user.username
    });
  });

  socket.on('chat:stop_typing', (channelId) => {
    socket.to(`channel_${channelId}`).emit('chat:stop_typing', {
      channelId,
      username: socket.user.display_name || socket.user.username
    });
  });
};
