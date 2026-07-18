const db = require('../db');

// Lấy danh sách task của phòng
const getTasks = async (req, res) => {
  try {
    const { roomId } = req.params;
    const result = await db.query(
      `SELECT t.*, u.display_name, u.username, u.avatar_url 
       FROM room_tasks t 
       LEFT JOIN users u ON t.created_by = u.id 
       WHERE t.room_id = $1 
       ORDER BY t.created_at DESC`,
      [roomId]
    );
    res.status(200).json({ tasks: result.rows });
  } catch (error) {
    console.error('Lỗi getTasks:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Tạo task mới
const createTask = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) return res.status(400).json({ message: 'Nội dung không được rỗng' });

    const result = await db.query(
      'INSERT INTO room_tasks (room_id, content, created_by) VALUES ($1, $2, $3) RETURNING *',
      [roomId, content, userId]
    );

    const newTask = result.rows[0];

    const userResult = await db.query('SELECT username, display_name, avatar_url FROM users WHERE id = $1', [userId]);
    const userInfo = userResult.rows[0];

    const fullTask = {
      ...newTask,
      username: userInfo.username,
      display_name: userInfo.display_name,
      avatar_url: userInfo.avatar_url
    };

    // Phát sự kiện
    const io = require('../sockets').getIo();
    if (io) {
      io.to(`room_${roomId}`).emit('task:new', fullTask);
    }

    res.status(201).json({ success: true, task: fullTask });
  } catch (error) {
    console.error('Lỗi createTask:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Đánh dấu hoàn thành / chưa hoàn thành
const toggleTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    
    // Lấy state hiện tại
    const current = await db.query('SELECT is_completed, room_id FROM room_tasks WHERE id = $1', [taskId]);
    if (current.rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy task' });
    
    const roomId = current.rows[0].room_id;
    const newStatus = !current.rows[0].is_completed;

    const result = await db.query(
      'UPDATE room_tasks SET is_completed = $1 WHERE id = $2 RETURNING *',
      [newStatus, taskId]
    );

    // Phát sự kiện
    const io = require('../sockets').getIo();
    if (io) {
      io.to(`room_${roomId}`).emit('task:update', result.rows[0]);
    }

    res.status(200).json({ success: true, task: result.rows[0] });
  } catch (error) {
    console.error('Lỗi toggleTask:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Xoá task
const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const current = await db.query('SELECT room_id FROM room_tasks WHERE id = $1', [taskId]);
    if (current.rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy task' });
    const roomId = current.rows[0].room_id;

    await db.query('DELETE FROM room_tasks WHERE id = $1', [taskId]);

    // Phát sự kiện
    const io = require('../sockets').getIo();
    if (io) {
      io.to(`room_${roomId}`).emit('task:delete', { id: taskId });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Lỗi deleteTask:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = {
  getTasks,
  createTask,
  toggleTask,
  deleteTask
};
