const db = require('../db');
const { isChannelMember } = require('../middlewares/channelMiddleware');

// Lấy lịch sử tin nhắn của một channel (Phân trang với cursor)
const getMessages = async (req, res) => {
  try {
    const { id } = req.params; // channel_id
    const { cursor, limit = 50 } = req.query;
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100);
    
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
    params.push(safeLimit);

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

    const message = await db.query('SELECT channel_id FROM messages WHERE id = $1', [messageId]);
    if (message.rows.length === 0) {
      return res.status(404).json({ message: 'Message not found' });
    }
    if (!await isChannelMember(message.rows[0].channel_id, userId)) {
      return res.status(403).json({ message: 'Access denied for this message' });
    }
    if (typeof emoji !== 'string' || emoji.length === 0 || emoji.length > 16) {
      return res.status(400).json({ message: 'Invalid reaction' });
    }

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

// Upload ảnh/file trong chat
const uploadFile = async (req, res) => {
  try {
    const { id } = req.params; // channelId
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Không có file được tải lên' });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/chat/${req.file.filename}`;
    
    // Kiểm tra loại file để set message_type
    const mimeType = req.file.mimetype;
    let messageType = 'file'; // Note: Cần cẩn thận với enum message_type của DB hiện có là 'text', 'image', 'video', 'system'. 
    // Chúng ta sẽ dùng 'image' cho hình ảnh, hoặc 'text' chứa URL nếu ko có 'file' type.
    if (mimeType.startsWith('image/')) {
      messageType = 'image';
    } else if (mimeType.startsWith('video/')) {
      messageType = 'video';
    } else {
      // Vì DB chưa có kiểu 'file' trong enum message_type, tạm lưu type là text và chèn URL vào content
      // Hoặc ta có thể dùng bảng attachments, nhưng để nhanh ta lưu vào content: "[FILE]" + URL
      messageType = 'text';
    }

    const content = messageType === 'text' ? `[FILE]: ${req.file.originalname}|${fileUrl}` : fileUrl;

    const result = await db.query(
      'INSERT INTO messages (channel_id, user_id, content, type) VALUES ($1, $2, $3, $4::message_type) RETURNING *',
      [id, userId, content, messageType]
    );
    const newMessage = result.rows[0];

    const userResult = await db.query('SELECT username, display_name, avatar_url FROM users WHERE id = $1', [userId]);
    const userInfo = userResult.rows[0];

    const fullMessage = {
      ...newMessage,
      username: userInfo.username,
      display_name: userInfo.display_name,
      avatar_url: userInfo.avatar_url,
      reactions: []
    };

    // Broadcast tin nhắn qua Socket
    const io = require('../sockets').getIo();
    if (io) {
      io.to(`channel_${id}`).emit('chat:new', fullMessage);
    }

    res.status(201).json({ success: true, message: fullMessage });
  } catch (error) {
    console.error('Lỗi uploadFile chat:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = {
  getMessages,
  toggleReaction,
  uploadFile
};
