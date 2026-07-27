const db = require('../db');

const isChannelMember = async (channelId, userId) => {
  const result = await db.query(
    `SELECT 1 FROM channels c JOIN room_members rm ON rm.room_id = c.room_id WHERE c.id = $1 AND rm.user_id = $2`,
    [channelId, userId]
  );
  return result.rows.length > 0;
};

/**
 * Kiểm tra user là thành viên VÀ channel có đúng type yêu cầu.
 * @param {string} channelId
 * @param {string} userId
 * @param {string} expectedType - 'text' | 'voice' | 'whiteboard' | 'music' | 'document'
 */
const isChannelOfType = async (channelId, userId, expectedType) => {
  const result = await db.query(
    `SELECT c.type FROM channels c
     JOIN room_members rm ON rm.room_id = c.room_id
     WHERE c.id = $1 AND rm.user_id = $2`,
    [channelId, userId]
  );
  if (result.rows.length === 0) return false;
  return result.rows[0].type === expectedType;
};

const requireChannelMembership = (paramName = 'channelId') => async (req, res, next) => {
  try {
    if (!await isChannelMember(req.params[paramName], req.user.id)) {
      return res.status(403).json({ message: 'Access denied for this channel' });
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { isChannelMember, isChannelOfType, requireChannelMembership };

