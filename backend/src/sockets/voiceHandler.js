const db = require('../db');
const { isChannelOfType } = require('../middlewares/channelMiddleware');

module.exports = (io, socket) => {
  if (socket.voiceChannelId === undefined) {
    socket.voiceChannelId = null;
  }

  socket.on('voice:join', async (channel_id) => {
    // Kiểm tra membership VÀ channel type phải là 'voice'
    const valid = await isChannelOfType(channel_id, socket.user.id, 'voice');
    if (!valid) {
      console.warn(`[Security] ${socket.user.username} cố join voice channel ${channel_id} — không hợp lệ.`);
      return;
    }


    // Nếu đang ở kênh khác thì rời kênh cũ trước
    if (socket.voiceChannelId && socket.voiceChannelId !== channel_id) {
      socket.leave(`voice_${socket.voiceChannelId}`);
      io.to(`voice_${socket.voiceChannelId}`).emit('voice:user_left', { userId: socket.user.id });
    }

    socket.voiceChannelId = channel_id;
    socket.join(`voice_${channel_id}`);

    // Lấy thông tin user hiện tại
    const userInfo = {
      id: socket.user.id,
      username: socket.user.username,
      socketId: socket.id
    };

    // Báo cho những người đang ở TRONG kênh biết có người mới vào
    socket.to(`voice_${channel_id}`).emit('voice:user_joined', userInfo);
  });

  socket.on('voice:signal', (data) => {
    // data gồm: { toSocketId, signalData, fromUserId, fromUsername }
    // Chỉ relay nếu target socket cũng đang trong cùng voice room (tránh signal tới socket ngoài)
    const targetSocket = io.sockets.sockets.get(data.toSocketId);
    if (!targetSocket || !socket.voiceChannelId || targetSocket.voiceChannelId !== socket.voiceChannelId) {
      console.warn(`[Security] ${socket.user.username} cố relay signal tới socket ${data.toSocketId} không trong cùng voice channel.`);
      return;
    }

    io.to(data.toSocketId).emit('voice:signal', {
      fromSocketId: socket.id,
      fromUserId: socket.user.id,
      fromUsername: socket.user.username,
      signalData: data.signalData
    });
  });

  socket.on('voice:leave', () => {
    if (socket.voiceChannelId) {
      socket.leave(`voice_${socket.voiceChannelId}`);
      io.to(`voice_${socket.voiceChannelId}`).emit('voice:user_left', { userId: socket.user.id });
      socket.voiceChannelId = null;
    }
  });
};

