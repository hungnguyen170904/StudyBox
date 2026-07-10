const db = require('../db');

// Lấy lịch sử tin nhắn của một channel (Phân trang với cursor)
const getMessages = async (req, res) => {
  try {
    const { id } = req.params; // channel_id
    const { cursor, limit = 50 } = req.query;
    
    let query = `
       SELECT m.*, u.username, u.display_name, u.avatar_url,
       (
         SELECT COALESCE(json_agg(json_build_object('emoji', r.emoji, 'user_id', r.user_id)), '[]'::json)
         FROM message_reactions r WHERE r.message_id = m.id
       ) as reactions
       FROM messages m 
       JOIN users u ON m.user_id = u.id 
       WHERE m.channel_id = $1 
    `;
    const params = [id];

    if (cursor) {
      query += ` AND m.created_at < $2 `;
      params.push(cursor);
    }

    query += ` ORDER BY m.created_at DESC LIMIT ${cursor ? '$3' : '$2'}`;
    params.push(limit);

    const result = await db.query(query, params);
    
    // Đảo ngược mảng để trả về thứ tự thời gian tăng dần cho UI (cũ trên, mới dưới)
    res.status(200).json({ messages: result.rows.reverse() });
  } catch (error) {
    console.error('Lỗi getMessages:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Thêm/Huỷ reaction cho tin nhắn
const toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    // Kiểm tra xem user đã thả reaction này chưa
    const check = await db.query(
      'SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
      [messageId, userId, emoji]
    );

    let isAdded = false;

    if (check.rows.length > 0) {
      // Nếu đã có thì huỷ
      await db.query('DELETE FROM message_reactions WHERE id = $1', [check.rows[0].id]);
      isAdded = false;
    } else {
      // Nếu chưa có thì thêm
      await db.query(
        'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)',
        [messageId, userId, emoji]
      );
      isAdded = true;
    }

    // Lấy channel_id để phát socket đúng phòng
    const msgRes = await db.query('SELECT channel_id FROM messages WHERE id = $1', [messageId]);
    if (msgRes.rows.length > 0) {
      const channelId = msgRes.rows[0].channel_id;
      const io = require('../sockets').getIo();
      if (io) {
        io.to(`channel_${channelId}`).emit('message_reaction_update', {
          messageId,
          userId,
          emoji,
          isAdded
        });
      }
    }

    res.status(200).json({ success: true, isAdded });
  } catch (error) {
    console.error('Lỗi toggleReaction:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = {
  getMessages,
  toggleReaction
};
