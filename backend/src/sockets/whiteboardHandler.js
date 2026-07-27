const { isChannelOfType } = require('../middlewares/channelMiddleware');

module.exports = (io, socket) => {
  // Broadcast nét vẽ — chỉ chấp nhận khi channel type là 'whiteboard' và user là thành viên
  socket.on('whiteboard:draw', async (data) => {
    // data: { channel_id, x0, y0, x1, y1, color, size, tool }
    const valid = await isChannelOfType(data.channel_id, socket.user.id, 'whiteboard');
    if (!valid) {
      console.warn(`[Security] ${socket.user.username} cố vẽ trên channel ${data.channel_id} — không phải whiteboard channel hoặc không có quyền.`);
      return;
    }
    socket.to(`channel_${data.channel_id}`).emit('whiteboard:draw', data);
  });

  // Xóa bảng — chỉ chấp nhận khi channel type là 'whiteboard' và user là thành viên
  socket.on('whiteboard:clear', async (data) => {
    const { channel_id } = data;
    const valid = await isChannelOfType(channel_id, socket.user.id, 'whiteboard');
    if (!valid) {
      console.warn(`[Security] ${socket.user.username} cố xóa whiteboard channel ${channel_id} — không hợp lệ.`);
      return;
    }
    socket.to(`channel_${channel_id}`).emit('whiteboard:clear');
  });
};
