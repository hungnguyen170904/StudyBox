const express = require('express');
const router = express.Router();
const dmController = require('../controllers/dmController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/:friendId', verifyToken, dmController.getDirectMessages);

module.exports = router;
