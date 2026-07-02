const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, roomController.getRooms);
router.post('/', verifyToken, roomController.createRoom);
router.get('/:id', verifyToken, roomController.getRoomById);

// Cần để API :code lên trước :id để không bị nhầm pattern nếu ta dùng /invite/:code
router.get('/invite/:code', verifyToken, roomController.getRoomByInviteCode);
router.post('/join/:code', verifyToken, roomController.joinRoomByInvite);

router.post('/:id/invite', verifyToken, roomController.generateInviteCode);
router.delete('/:id/members/:userId', verifyToken, roomController.kickMember);
router.put('/:id/members/:userId/role', verifyToken, roomController.changeMemberRole);
router.delete('/:id/leave', verifyToken, roomController.leaveRoom);

router.put('/:id/settings', verifyToken, roomController.updateRoomSettings);
router.delete('/:id', verifyToken, roomController.deleteRoom);

router.post('/:id/channels', verifyToken, roomController.createChannel);
router.delete('/:id/channels/:channelId', verifyToken, roomController.deleteChannel);

module.exports = router;
