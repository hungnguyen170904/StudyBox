const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/:roomId/tasks', taskController.getTasks);
router.post('/:roomId/tasks', taskController.createTask);
router.put('/tasks/:taskId', taskController.toggleTask);
router.delete('/tasks/:taskId', taskController.deleteTask);

module.exports = router;
