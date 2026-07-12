module.exports = (io, socket) => {
  // Lưu trạng thái kênh thoại của socket hiện tại để dễ dọn dẹp
  if (socket.voiceChannelId === undefined) {
    socket.voiceChannelId = null;
  }

  socket.on('voice:join', async (channel_id) => {
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
