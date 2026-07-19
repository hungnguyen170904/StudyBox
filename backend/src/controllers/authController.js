const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đủ thông tin.' });
    }

    // Kiểm tra user tồn tại chưa
    const userExists = await db.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Email hoặc username đã tồn tại.' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Lưu user vào DB, gán display_name = username
    const result = await db.query(
      'INSERT INTO users (username, display_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, username, display_name, email, avatar_url, custom_status, created_at',
      [username, username, email, passwordHash]
    );

    const newUser = result.rows[0];

    // Tạo token
    const token = jwt.sign({ id: newUser.id, username: newUser.username }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      message: 'Đăng ký thành công',
      user: newUser,
      token,
    });
  } catch (error) {
    console.error('Lỗi register:', error);
    res.status(500).json({ message: 'Lỗi server cục bộ' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đủ email và mật khẩu.' });
    }

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không chính xác.' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không chính xác.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(200).json({
      message: 'Đăng nhập thành công',
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        avatar_url: user.avatar_url,
        custom_status: user.custom_status,
        created_at: user.created_at
      },
      token,
    });
  } catch (error) {
    console.error('Lỗi login:', error);
    res.status(500).json({ message: 'Lỗi server cục bộ' });
  }
};

const getMe = async (req, res) => {
  try {
    // req.user được lấy từ middleware xác thực
    const result = await db.query('SELECT id, username, display_name, email, avatar_url, custom_status, created_at FROM users WHERE id = $1', [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error('Lỗi getMe:', error);
    res.status(500).json({ message: 'Lỗi server cục bộ' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, display_name, custom_status } = req.body;
    let avatarUrl = undefined;

    // Nếu có file upload
    if (req.file) {
      // Trong môi trường dev, ta fix cứng localhost:5000. 
      // Trên production sẽ cấu hình qua biến môi trường.
      const baseUrl = process.env.API_URL || 'http://localhost:5000';
      avatarUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;
    }

    // Nếu có truyền username mới
    if (username) {
      // Kiểm tra username trùng
      const exist = await db.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, userId]);
      if (exist.rows.length > 0) {
        return res.status(400).json({ message: 'Username (Tên định danh) này đã được người khác sử dụng.' });
      }
    }

    // Build câu lệnh query linh hoạt
    let queryArgs = [];
    let setClauses = [];
    let idx = 1;

    if (username) {
      setClauses.push(`username = $${idx++}`);
      queryArgs.push(username);
    }
    
    if (display_name) {
      setClauses.push(`display_name = $${idx++}`);
      queryArgs.push(display_name);
    }

    if (avatarUrl) {
      setClauses.push(`avatar_url = $${idx++}`);
      queryArgs.push(avatarUrl);
    }

    if (custom_status !== undefined) {
      setClauses.push(`custom_status = $${idx++}`);
      queryArgs.push(custom_status);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ message: 'Không có dữ liệu gì để cập nhật' });
    }

    queryArgs.push(userId);
    const updateQuery = `
      UPDATE users 
      SET ${setClauses.join(', ')} 
      WHERE id = $${idx} 
      RETURNING id, username, display_name, email, avatar_url, custom_status, created_at
    `;

    const result = await db.query(updateQuery, queryArgs);
    const updatedUser = result.rows[0];

    // Phát sự kiện cập nhật status cho toàn mạng (nếu có đổi custom_status)
    if (custom_status !== undefined) {
      const io = require('../sockets').getIo();
      if (io) {
        io.emit('user_status_change', {
          userId: userId,
          custom_status: custom_status
        });
      }
    }

    res.status(200).json({
      message: 'Cập nhật thành công',
      user: updatedUser
    });
  } catch (error) {
    console.error('Lỗi updateProfile:', error);
    res.status(500).json({ message: 'Lỗi server cục bộ' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile
};
