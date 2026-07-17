const db = require('./index');

async function optimizeDatabase() {
  try {
    console.log('Bắt đầu tối ưu Database (Tạo Indexes)...');

    await db.query(`
      -- Index cho bảng messages: Giúp truy vấn cuộn tin nhắn (lấy tin cũ nhất/mới nhất) nhanh hơn
      CREATE INDEX IF NOT EXISTS idx_messages_channel_id_created_at ON messages(channel_id, created_at DESC);
      
      -- Index cho bảng room_members: Giúp tra cứu thành viên trong phòng nhanh hơn
      CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id);
      CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id);
      
      -- Index cho bảng channels: Giúp tra cứu kênh trong phòng nhanh hơn
      CREATE INDEX IF NOT EXISTS idx_channels_room_id ON channels(room_id);
      
      -- Index cho bảng friendships: Giúp tải danh sách bạn bè nhanh hơn
      CREATE INDEX IF NOT EXISTS idx_friendships_user_id_1 ON friendships(user_id_1);
      CREATE INDEX IF NOT EXISTS idx_friendships_user_id_2 ON friendships(user_id_2);
      
      -- Index cho bảng notifications: Giúp tải thông báo chưa đọc nhanh hơn
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON notifications(user_id, is_read);
    `);

    console.log('Tạo Indexes thành công!');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi khi tạo Index:', error);
    process.exit(1);
  }
}

optimizeDatabase();
