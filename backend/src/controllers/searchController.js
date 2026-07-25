const db = require('../db');

/**
 * Tìm kiếm toàn cục: messages, tasks, documents, rooms
 * GET /api/search?q=<query>&types=messages,tasks
 */
const globalSearch = async (req, res) => {
  try {
    const { q, types } = req.query;
    const userId = req.user.id;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự.' });
    }

    const query = q.trim();
    const searchTypes = types ? types.split(',') : ['messages', 'tasks', 'rooms'];
    const results = {};

    // ─── Tìm kiếm tin nhắn (chỉ kênh thuộc phòng user đã tham gia) ───────
    if (searchTypes.includes('messages')) {
      const msgResult = await db.query(
        `SELECT m.id, m.content, m.created_at,
                m.channel_id, c.name AS channel_name, c.room_id,
                r.name AS room_name,
                u.display_name, u.username, u.avatar_url
         FROM messages m
         JOIN channels c ON m.channel_id = c.id
         JOIN rooms r ON c.room_id = r.id
         JOIN room_members rm ON r.id = rm.room_id AND rm.user_id = $2
         JOIN users u ON m.user_id = u.id
         WHERE m.type = 'text' 
           AND m.content ILIKE $1
         ORDER BY m.created_at DESC
         LIMIT 10`,
        [`%${query}%`, userId]
      );
      results.messages = msgResult.rows;
    }

    // ─── Tìm kiếm task (chỉ phòng user tham gia) ────────────────────────
    if (searchTypes.includes('tasks')) {
      const taskResult = await db.query(
        `SELECT t.id, t.content, t.status, t.priority, t.deadline,
                t.room_id, r.name AS room_name,
                u.display_name, u.username
         FROM room_tasks t
         JOIN rooms r ON t.room_id = r.id
         JOIN room_members rm ON r.id = rm.room_id AND rm.user_id = $2
         JOIN users u ON t.created_by = u.id
         WHERE t.content ILIKE $1
         ORDER BY t.created_at DESC
         LIMIT 10`,
        [`%${query}%`, userId]
      );
      results.tasks = taskResult.rows;
    }

    // ─── Tìm kiếm phòng học ─────────────────────────────────────────────
    if (searchTypes.includes('rooms')) {
      const roomResult = await db.query(
        `SELECT r.id, r.name, r.is_public, r.created_at,
                u.display_name AS owner_name,
                (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) AS member_count
         FROM rooms r
         JOIN users u ON r.owner_id = u.id
         WHERE r.is_public = TRUE AND r.name ILIKE $1
         ORDER BY r.created_at DESC
         LIMIT 8`,
        [`%${query}%`]
      );
      results.rooms = roomResult.rows;
    }

    res.status(200).json({ query, results });
  } catch (error) {
    console.error('Lỗi globalSearch:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = { globalSearch };
