const db = require('../db');

// Lấy danh sách thông báo của user (Giới hạn 50)
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      `SELECT n.*, u.username as sender_username, u.display_name as sender_display_name, u.avatar_url as sender_avatar
       FROM notifications n
       LEFT JOIN users u ON n.sender_id = u.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [userId]
    );
    res.status(200).json({ notifications: result.rows });
  } catch (error) {
    console.error('Lỗi getNotifications:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Đánh dấu 1 thông báo đã đọc
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    await db.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [id, userId]);
    res.status(200).json({ message: 'Đã đọc thông báo' });
  } catch (error) {
    console.error('Lỗi markAsRead:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Đánh dấu toàn bộ đã đọc
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [userId]);
    res.status(200).json({ message: 'Đã đọc tất cả thông báo' });
  } catch (error) {
    console.error('Lỗi markAllAsRead:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
