const db = require('../db');

// Lấy lịch sử tin nhắn của một channel
const getMessages = async (req, res) => {
  try {
    const { id } = req.params; // channel_id
    // Lấy 50 tin nhắn gần nhất
    const result = await db.query(
      `SELECT m.*, u.username, u.display_name, u.avatar_url 
       FROM messages m 
       JOIN users u ON m.user_id = u.id 
       WHERE m.channel_id = $1 
       ORDER BY m.created_at ASC 
       LIMIT 50`,
      [id]
    );
    res.status(200).json({ messages: result.rows });
  } catch (error) {
    console.error('Lỗi getMessages:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = {
  getMessages
};
