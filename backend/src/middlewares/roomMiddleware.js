const db = require('../db');

/**
 * Middleware xác minh người dùng là thành viên của room.
 * Đọc roomId từ req.params[paramName] (mặc định: 'roomId').
 */
const requireRoomMembership = (paramName = 'roomId') => async (req, res, next) => {
  try {
    const roomId = req.params[paramName];
    const userId = req.user.id;

    const result = await db.query(
      'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập phòng này.' });
    }

    next();
  } catch (error) {
    console.error('Lỗi requireRoomMembership:', error);
    res.status(500).json({ message: 'Lỗi server khi kiểm tra quyền truy cập.' });
  }
};

/**
 * Middleware xác minh người dùng là chủ sở hữu task HOẶC là admin/owner của room.
 * Dùng cho toggle và delete task.
 * Đọc taskId từ req.params.taskId.
 */
const requireTaskOwnerOrAdmin = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    // Lấy thông tin task để biết creator và room_id
    const taskResult = await db.query(
      'SELECT created_by, room_id FROM room_tasks WHERE id = $1',
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy task.' });
    }

    const { created_by, room_id } = taskResult.rows[0];

    // Nếu là creator thì cho phép
    if (created_by === userId) {
      return next();
    }

    // Nếu là admin hoặc owner của room thì cho phép
    const memberResult = await db.query(
      "SELECT role FROM room_members WHERE room_id = $1 AND user_id = $2 AND role IN ('owner', 'admin')",
      [room_id, userId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này.' });
    }

    next();
  } catch (error) {
    console.error('Lỗi requireTaskOwnerOrAdmin:', error);
    res.status(500).json({ message: 'Lỗi server khi kiểm tra quyền.' });
  }
};

module.exports = { requireRoomMembership, requireTaskOwnerOrAdmin };
