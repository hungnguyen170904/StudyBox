const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/:id/messages', verifyToken, chatController.getMessages);
router.post('/messages/:messageId/reactions', verifyToken, chatController.toggleReaction);

module.exports = router;
