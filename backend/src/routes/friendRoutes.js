const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, friendController.getFriends);
router.post('/request', verifyToken, friendController.sendFriendRequest);
router.put('/accept', verifyToken, friendController.respondFriendRequest);

module.exports = router;
