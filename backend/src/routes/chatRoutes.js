const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/:id/messages', verifyToken, chatController.getMessages);

module.exports = router;
