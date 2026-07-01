const db = require('../db');

// Gửi lời mời kết bạn (dựa trên username)
const sendFriendRequest = async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user.id;

    if (!username) {
      return res.status(400).json({ message: 'Vui lòng nhập tên người dùng' });
    }

    // Tìm người dùng được yêu cầu
    const targetUser = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng này' });
    }
    const targetId = targetUser.rows[0].id;

    if (userId === targetId) {
      return res.status(400).json({ message: 'Không thể tự kết bạn với chính mình' });
    }

    // Kiểm tra xem đã kết bạn hoặc gửi yêu cầu chưa
    const checkQuery = `
      SELECT * FROM friendships 
      WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)
    `;
    const exist = await db.query(checkQuery, [userId, targetId]);

    if (exist.rows.length > 0) {
      const relationship = exist.rows[0];
      if (relationship.status === 'accepted') {
        return res.status(400).json({ message: 'Đã là bạn bè' });
      } else if (relationship.status === 'pending') {
        return res.status(400).json({ message: 'Đã gửi hoặc đang chờ lời mời kết bạn' });
      }
    }

    // Luôn lưu id nhỏ hơn là user_id_1 để tránh duplicate row logic, HOẶC
    // Lưu theo logic người gửi là user_id_1 để dễ biết ai gửi
    await db.query(
      'INSERT INTO friendships (user_id_1, user_id_2, status) VALUES ($1, $2, $3)',
      [userId, targetId, 'pending']
    );

    // Tạo notification
    const notifRes = await db.query(
      `INSERT INTO notifications (user_id, sender_id, type, content) 
       VALUES ($1, $2, 'friend_request', 'Đã gửi cho bạn một lời mời kết bạn') 
       RETURNING *`,
      [targetId, userId]
    );

    const { getIo, getUserSocketId } = require('../sockets');
    const targetSocketId = getUserSocketId(targetId);
    if (targetSocketId) {
      const io = getIo();
      if (io) {
        const senderRes = await db.query('SELECT username, display_name, avatar_url FROM users WHERE id = $1', [userId]);
        const notifObj = {
          ...notifRes.rows[0],
          sender_username: senderRes.rows[0].username,
          sender_display_name: senderRes.rows[0].display_name,
          sender_avatar: senderRes.rows[0].avatar_url
        };
        io.to(targetSocketId).emit('notification:new', notifObj);
      }
    }

    res.status(200).json({ message: 'Đã gửi lời mời kết bạn' });
  } catch (error) {
    console.error('Lỗi sendFriendRequest:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Chấp nhận hoặc Từ chối lời mời
const respondFriendRequest = async (req, res) => {
  try {
    const { friendId, action } = req.body; // action: 'accept' hoặc 'reject'
    const userId = req.user.id;

    if (action === 'accept') {
      await db.query(
        'UPDATE friendships SET status = $1 WHERE user_id_1 = $2 AND user_id_2 = $3',
        ['accepted', friendId, userId]
      );
      
      // Tạo thông báo gửi cho người đã gửi lời mời (friendId)
      const notifRes = await db.query(
        `INSERT INTO notifications (user_id, sender_id, type, content) 
         VALUES ($1, $2, 'friend_accept', 'Đã chấp nhận lời mời kết bạn của bạn') 
         RETURNING *`,
        [friendId, userId]
      );

      const { getIo, getUserSocketId } = require('../sockets');
      const targetSocketId = getUserSocketId(friendId);
      if (targetSocketId) {
        const io = getIo();
        if (io) {
          const senderRes = await db.query('SELECT username, display_name, avatar_url FROM users WHERE id = $1', [userId]);
          const notifObj = {
            ...notifRes.rows[0],
            sender_username: senderRes.rows[0].username,
            sender_display_name: senderRes.rows[0].display_name,
            sender_avatar: senderRes.rows[0].avatar_url
          };
          io.to(targetSocketId).emit('notification:new', notifObj);
        }
      }
      
      res.status(200).json({ message: 'Đã chấp nhận kết bạn' });
    } else {
      // Sửa lại:
      await db.query(
        'DELETE FROM friendships WHERE user_id_1 = $1 AND user_id_2 = $2',
        [friendId, userId]
      );
      res.status(200).json({ message: 'Đã xóa lời mời' });
    }
  } catch (error) {
    console.error('Lỗi respondFriendRequest:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Lấy danh sách bạn bè và lời mời
const getFriends = async (req, res) => {
  try {
    const userId = req.user.id;

    // Lấy bạn bè đã chấp nhận
    const friendsResult = await db.query(`
      SELECT f.id as friendship_id, u.id, u.username, u.display_name, u.avatar_url, f.status 
      FROM friendships f
      JOIN users u ON (u.id = f.user_id_1 OR u.id = f.user_id_2) AND u.id != $1
      WHERE (f.user_id_1 = $1 OR f.user_id_2 = $1) AND f.status = 'accepted'
    `, [userId]);

    // Lấy lời mời đang chờ (chỉ lấy những lời mời người khác gửi cho mình)
    const pendingResult = await db.query(`
      SELECT f.id as friendship_id, u.id, u.username, u.display_name, u.avatar_url 
      FROM friendships f
      JOIN users u ON u.id = f.user_id_1
      WHERE f.user_id_2 = $1 AND f.status = 'pending'
    `, [userId]);

    // Lấy lời mời mình đã gửi
    const sentResult = await db.query(`
      SELECT f.id as friendship_id, u.id, u.username, u.display_name, u.avatar_url 
      FROM friendships f
      JOIN users u ON u.id = f.user_id_2
      WHERE f.user_id_1 = $1 AND f.status = 'pending'
    `, [userId]);

    res.status(200).json({
      friends: friendsResult.rows,
      pending: pendingResult.rows,
      sent: sentResult.rows
    });
  } catch (error) {
    console.error('Lỗi getFriends:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = {
  sendFriendRequest,
  respondFriendRequest,
  getFriends
};
