const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { requireRoomMembership, requireTaskOwnerOrAdmin } = require('../middlewares/roomMiddleware');

router.use(verifyToken);

// Yêu cầu phải là thành viên phòng để đọc/tạo task
router.get('/:roomId/tasks', requireRoomMembership('roomId'), taskController.getTasks);
router.post('/:roomId/tasks', requireRoomMembership('roomId'), taskController.createTask);

// Yêu cầu phải là creator hoặc admin/owner của phòng để sửa/xóa task
router.put('/tasks/:taskId', requireTaskOwnerOrAdmin, taskController.toggleTask);
router.patch('/tasks/:taskId', requireTaskOwnerOrAdmin, taskController.updateTask);
router.delete('/tasks/:taskId', requireTaskOwnerOrAdmin, taskController.deleteTask);

module.exports = router;


