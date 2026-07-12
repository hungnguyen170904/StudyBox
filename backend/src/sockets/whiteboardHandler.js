module.exports = (io, socket) => {
  // Broadcast nét vẽ cho những người khác trong phòng
  socket.on('whiteboard:draw', (data) => {
    // data gồm: { channel_id, x0, y0, x1, y1, color, size }
    socket.to(`channel_${data.channel_id}`).emit('whiteboard:draw', data);
  });

  // Xóa bảng
  socket.on('whiteboard:clear', (data) => {
    const { channel_id } = data;
    socket.to(`channel_${channel_id}`).emit('whiteboard:clear');
  });
};
