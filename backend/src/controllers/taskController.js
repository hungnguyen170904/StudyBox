const db = require('../db');

// Lấy danh sách task của phòng
const getTasks = async (req, res) => {
  try {
    const { roomId } = req.params;
    const result = await db.query(
      `SELECT t.*, 
              u.display_name, u.username, u.avatar_url,
              a.display_name AS assigned_display_name, a.username AS assigned_username, a.avatar_url AS assigned_avatar_url
       FROM room_tasks t 
       LEFT JOIN users u ON t.created_by = u.id
       LEFT JOIN users a ON t.assigned_to = a.id
       WHERE t.room_id = $1 
       ORDER BY 
         CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
         t.deadline ASC NULLS LAST,
         t.created_at DESC`,
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
    const { content, priority = 'medium', deadline, assigned_to } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) return res.status(400).json({ message: 'Nội dung không được rỗng' });

    const result = await db.query(
      `INSERT INTO room_tasks (room_id, content, created_by, priority, deadline, assigned_to, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'todo') RETURNING *`,
      [roomId, content.trim(), userId, priority, deadline || null, assigned_to || null]
    );

    const newTask = result.rows[0];

    const userResult = await db.query(
      `SELECT u.username, u.display_name, u.avatar_url,
              a.display_name AS assigned_display_name, a.username AS assigned_username, a.avatar_url AS assigned_avatar_url
       FROM users u
       LEFT JOIN users a ON a.id = $2
       WHERE u.id = $1`,
      [userId, assigned_to || userId]
    );
    const userInfo = userResult.rows[0] || {};

    const fullTask = {
      ...newTask,
      username: userInfo.username,
      display_name: userInfo.display_name,
      avatar_url: userInfo.avatar_url,
      assigned_display_name: userInfo.assigned_display_name,
      assigned_username: userInfo.assigned_username,
      assigned_avatar_url: userInfo.assigned_avatar_url,
    };

    const io = require('../sockets').getIo();
    if (io) io.to(`room_${roomId}`).emit('task:new', fullTask);

    res.status(201).json({ success: true, task: fullTask });
  } catch (error) {
    console.error('Lỗi createTask:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Toggle hoàn thành / chưa hoàn thành (backward compatibility)
const toggleTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const current = await db.query('SELECT is_completed, status, room_id FROM room_tasks WHERE id = $1', [taskId]);
    if (current.rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy task' });

    const roomId = current.rows[0].room_id;
    const currentStatus = current.rows[0].status || (current.rows[0].is_completed ? 'done' : 'todo');
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';

    const result = await db.query(
      'UPDATE room_tasks SET is_completed = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [newStatus === 'done', newStatus, taskId]
    );

    const io = require('../sockets').getIo();
    if (io) io.to(`room_${roomId}`).emit('task:update', result.rows[0]);

    res.status(200).json({ success: true, task: result.rows[0] });
  } catch (error) {
    console.error('Lỗi toggleTask:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Cập nhật chi tiết task (status, priority, deadline, assigned_to, content)
const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, priority, deadline, assigned_to, content } = req.body;

    const current = await db.query('SELECT room_id FROM room_tasks WHERE id = $1', [taskId]);
    if (current.rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy task' });
    const roomId = current.rows[0].room_id;

    const updates = [];
    const values = [];
    let idx = 1;

    if (content !== undefined) { updates.push(`content = $${idx++}`); values.push(content); }
    if (status !== undefined) {
      updates.push(`status = $${idx++}`); values.push(status);
      updates.push(`is_completed = $${idx++}`); values.push(status === 'done');
    }
    if (priority !== undefined) { updates.push(`priority = $${idx++}`); values.push(priority); }
    if (deadline !== undefined) { updates.push(`deadline = $${idx++}`); values.push(deadline || null); }
    if (assigned_to !== undefined) { updates.push(`assigned_to = $${idx++}`); values.push(assigned_to || null); }

    if (updates.length === 0) return res.status(400).json({ message: 'Không có trường nào để cập nhật' });

    updates.push('updated_at = NOW()');
    values.push(taskId);

    const result = await db.query(
      `UPDATE room_tasks SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    const io = require('../sockets').getIo();
    if (io) io.to(`room_${roomId}`).emit('task:update', result.rows[0]);

    res.status(200).json({ success: true, task: result.rows[0] });
  } catch (error) {
    console.error('Lỗi updateTask:', error);
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

    const io = require('../sockets').getIo();
    if (io) io.to(`room_${roomId}`).emit('task:delete', { id: taskId });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Lỗi deleteTask:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = { getTasks, createTask, toggleTask, updateTask, deleteTask };
