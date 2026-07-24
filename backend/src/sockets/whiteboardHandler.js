const { isChannelMember } = require('../middlewares/channelMiddleware');

module.exports = (io, socket) => {
  // Broadcast nét vẽ cho những người khác trong phòng (chỉ khi đã join channel)
  socket.on('whiteboard:draw', async (data) => {
    // data gồm: { channel_id, x0, y0, x1, y1, color, size }
    const isMember = await isChannelMember(data.channel_id, socket.user.id);
    if (!isMember) {
      console.warn(`[Security] ${socket.user.username} cố vẽ trên whiteboard channel ${data.channel_id} không hợp lệ.`);
      return;
    }
    socket.to(`channel_${data.channel_id}`).emit('whiteboard:draw', data);
  });

  // Xóa bảng (chỉ khi đã join channel)
  socket.on('whiteboard:clear', async (data) => {
    const { channel_id } = data;
    const isMember = await isChannelMember(channel_id, socket.user.id);
    if (!isMember) {
      console.warn(`[Security] ${socket.user.username} cố xóa whiteboard channel ${channel_id} không hợp lệ.`);
      return;
    }
    socket.to(`channel_${channel_id}`).emit('whiteboard:clear');
  });
};

