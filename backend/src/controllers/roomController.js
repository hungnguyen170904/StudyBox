const db = require('../db');

// Lấy danh sách room public
const getRooms = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.id, r.name, r.is_public, r.created_at, u.username as owner_name 
       FROM rooms r 
       JOIN users u ON r.owner_id = u.id 
       WHERE r.is_public = true 
       ORDER BY r.created_at DESC`
    );
    res.status(200).json({ rooms: result.rows });
  } catch (error) {
    console.error('Lỗi getRooms:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Tạo room mới
const createRoom = async (req, res) => {
  try {
    const { name, is_public } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ message: 'Tên phòng không được để trống' });
    }

    // Dùng transaction để tạo Room -> tạo mặc định 3 Channel -> thêm Owner vào room_members
    await db.query('BEGIN');

    // 1. Tạo room
    const roomResult = await db.query(
      'INSERT INTO rooms (name, owner_id, is_public) VALUES ($1, $2, $3) RETURNING *',
      [name, userId, is_public ?? true]
    );
    const room = roomResult.rows[0];

    // 2. Thêm owner vào room_members
    await db.query(
      'INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, $3::room_role)',
      [room.id, userId, 'owner']
    );

    // 3. Tạo các channel mặc định (general-text, music, voice, whiteboard)
    await db.query(
      `INSERT INTO channels (room_id, name, type) VALUES 
       ($1, 'chung', 'text'::channel_type),
       ($1, 'nhạc', 'music'::channel_type),
       ($1, 'đàm thoại', 'voice'::channel_type),
       ($1, 'bảng trắng', 'whiteboard'::channel_type)`,
      [room.id]
    );

    await db.query('COMMIT');
    res.status(201).json({ message: 'Tạo phòng thành công', room });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Lỗi createRoom:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Lấy chi tiết một room (và các channels bên trong)
const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const roomResult = await db.query('SELECT * FROM rooms WHERE id = $1', [id]);
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy phòng' });
    }

    const channelsResult = await db.query('SELECT * FROM channels WHERE room_id = $1 ORDER BY created_at ASC', [id]);
    const membersResult = await db.query(
      `SELECT m.role, u.id, u.username, u.display_name, u.avatar_url 
       FROM room_members m 
       JOIN users u ON m.user_id = u.id 
       WHERE m.room_id = $1`, 
      [id]
    );

    res.status(200).json({
      room: roomResult.rows[0],
      channels: channelsResult.rows,
      members: membersResult.rows
    });
  } catch (error) {
    console.error('Lỗi getRoomById:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Tạo mã mời (Invite Code) - Chỉ Owner/Admin
const generateInviteCode = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Kiểm tra quyền (chỉ owner mới được tạo link trong bản này)
    const roleCheck = await db.query(
      'SELECT role FROM room_members WHERE room_id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (roleCheck.rows.length === 0 || roleCheck.rows[0].role !== 'owner') {
      return res.status(403).json({ message: 'Bạn không có quyền tạo mã mời' });
    }

    // Tạo mã ngẫu nhiên 6 ký tự
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const result = await db.query(
      'UPDATE rooms SET invite_code = $1 WHERE id = $2 RETURNING invite_code',
      [inviteCode, id]
    );

    res.status(200).json({ invite_code: result.rows[0].invite_code });
  } catch (error) {
    console.error('Lỗi generateInviteCode:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Lấy thông tin phòng qua mã mời
const getRoomByInviteCode = async (req, res) => {
  try {
    const { code } = req.params;
    
    const result = await db.query(
      'SELECT id, name, owner_id FROM rooms WHERE invite_code = $1',
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Mã mời không hợp lệ hoặc đã hết hạn' });
    }

    res.status(200).json({ room: result.rows[0] });
  } catch (error) {
    console.error('Lỗi getRoomByInviteCode:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Tham gia phòng bằng mã mời
const joinRoomByInvite = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user.id;

    // Tìm phòng bằng mã mời
    const roomRes = await db.query('SELECT id FROM rooms WHERE invite_code = $1', [code]);
    if (roomRes.rows.length === 0) {
      return res.status(404).json({ message: 'Mã mời không hợp lệ' });
    }
    const roomId = roomRes.rows[0].id;

    // Kiểm tra xem user đã ở trong phòng chưa
    const memberCheck = await db.query(
      'SELECT * FROM room_members WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );

    if (memberCheck.rows.length > 0) {
      return res.status(200).json({ message: 'Bạn đã ở trong phòng này', roomId });
    }

    // Thêm user vào phòng
    await db.query(
      'INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, $3)',
      [roomId, userId, 'member']
    );

    res.status(200).json({ message: 'Tham gia phòng thành công', roomId });
  } catch (error) {
    console.error('Lỗi joinRoomByInvite:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Đuổi thành viên (Kick) - Owner hoặc Admin
const kickMember = async (req, res) => {
  try {
    const { id, userId } = req.params; // id: roomId, userId: người bị kick
    const requestUserId = req.user.id;

    // Lấy role của người gọi
    const reqRoleCheck = await db.query(
      'SELECT role FROM room_members WHERE room_id = $1 AND user_id = $2',
      [id, requestUserId]
    );

    if (reqRoleCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Bạn không có trong phòng này' });
    }
    const myRole = reqRoleCheck.rows[0].role;

    if (myRole === 'member') {
      return res.status(403).json({ message: 'Bạn không có quyền kick thành viên' });
    }

    if (userId === requestUserId) {
      return res.status(400).json({ message: 'Không thể kick chính mình' });
    }

    // Lấy role của người bị kick
    const targetRoleCheck = await db.query(
      'SELECT role FROM room_members WHERE room_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (targetRoleCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Thành viên không tồn tại trong phòng' });
    }
    const targetRole = targetRoleCheck.rows[0].role;

    if (targetRole === 'owner') {
      return res.status(403).json({ message: 'Không thể kick Chủ phòng' });
    }

    // Admin không thể kick Admin khác
    if (myRole === 'admin' && targetRole === 'admin') {
      return res.status(403).json({ message: 'Quản trị viên không thể kick Quản trị viên khác' });
    }

    // Xóa thành viên
    await db.query('DELETE FROM room_members WHERE room_id = $1 AND user_id = $2', [id, userId]);

    res.status(200).json({ message: 'Đã đuổi thành viên khỏi phòng' });
  } catch (error) {
    console.error('Lỗi kickMember:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Phân quyền (Thay đổi role) - Chỉ Owner
const changeMemberRole = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body; // 'admin' hoặc 'member'
    const requestUserId = req.user.id;

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Quyền không hợp lệ' });
    }

    // Kiểm tra quyền Owner
    const roleCheck = await db.query(
      'SELECT role FROM room_members WHERE room_id = $1 AND user_id = $2',
      [id, requestUserId]
    );

    if (roleCheck.rows.length === 0 || roleCheck.rows[0].role !== 'owner') {
      return res.status(403).json({ message: 'Chỉ Chủ phòng mới có quyền phân quyền' });
    }

    if (userId === requestUserId) {
      return res.status(400).json({ message: 'Không thể thay đổi quyền của chính mình' });
    }

    // Cập nhật role
    const updateRes = await db.query(
      'UPDATE room_members SET role = $1::room_role WHERE room_id = $2 AND user_id = $3 RETURNING *',
      [role, id, userId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ message: 'Thành viên không tồn tại trong phòng' });
    }

    res.status(200).json({ message: 'Cập nhật quyền thành công' });
  } catch (error) {
    console.error('Lỗi changeMemberRole:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Tự rời phòng
const leaveRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Kiểm tra vai trò
    const roleCheck = await db.query(
      'SELECT role FROM room_members WHERE room_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (roleCheck.rows.length === 0) {
      return res.status(400).json({ message: 'Bạn không ở trong phòng này' });
    }

    if (roleCheck.rows[0].role === 'owner') {
      return res.status(400).json({ message: 'Owner không thể rời phòng, vui lòng xóa phòng hoặc chuyển quyền' });
    }

    await db.query('DELETE FROM room_members WHERE room_id = $1 AND user_id = $2', [id, userId]);

    res.status(200).json({ message: 'Đã rời phòng' });
  } catch (error) {
    console.error('Lỗi leaveRoom:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = {
  getRooms,
  createRoom,
  getRoomById,
  generateInviteCode,
  getRoomByInviteCode,
  joinRoomByInvite,
  kickMember,
  changeMemberRole,
  leaveRoom
};
