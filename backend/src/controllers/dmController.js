const db = require('../db');

// Lấy lịch sử nhắn tin 1-1 với một người bạn
const getDirectMessages = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    // Kiểm tra có phải bạn bè không
    const checkQuery = `
      SELECT * FROM friendships 
      WHERE ((user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1))
      AND status = 'accepted'
    `;
    const friendCheck = await db.query(checkQuery, [userId, friendId]);

    if (friendCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Không thể xem tin nhắn do hai người chưa là bạn bè' });
    }

    // Lấy tin nhắn
    const messages = await db.query(`
      SELECT m.*, u.username, u.display_name, u.avatar_url 
      FROM direct_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1)
      ORDER BY m.created_at ASC
      LIMIT 100
    `, [userId, friendId]);

    res.status(200).json({ messages: messages.rows });
  } catch (error) {
    console.error('Lỗi getDirectMessages:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = {
  getDirectMessages
};
