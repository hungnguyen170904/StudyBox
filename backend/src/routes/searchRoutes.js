const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const { globalSearch } = require('../controllers/searchController');

router.use(verifyToken);

// GET /api/search?q=<query>&types=messages,tasks,rooms
router.get('/', globalSearch);

module.exports = router;
