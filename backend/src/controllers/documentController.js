const db = require('../db');
const fs = require('fs');
const path = require('path');

// Lấy danh sách tài liệu trong kênh
const getDocuments = async (req, res) => {
  try {
    const { channelId } = req.params;

    const result = await db.query(
      `SELECT d.*, u.username, u.display_name, u.avatar_url 
       FROM channel_documents d
       JOIN users u ON d.uploader_id = u.id
       WHERE d.channel_id = $1
       ORDER BY d.created_at DESC`,
      [channelId]
    );

    res.status(200).json({ documents: result.rows });
  } catch (error) {
    console.error('Lỗi getDocuments:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Upload tài liệu
const uploadDocument = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'Không có file nào được tải lên' });
    }

    // Tạo URL từ path (giả sử server phục vụ static ở /uploads)
    // VD: /uploads/documents/file-1234.pdf
    const fileUrl = `/uploads/documents/${file.filename}`;

    const result = await db.query(
      `INSERT INTO channel_documents (channel_id, uploader_id, file_name, file_url, file_size) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [channelId, userId, file.originalname, fileUrl, file.size]
    );

    res.status(201).json({ 
      message: 'Tải lên thành công', 
      document: result.rows[0] 
    });
  } catch (error) {
    console.error('Lỗi uploadDocument:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Xoá tài liệu
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Lấy thông tin file
    const fileRes = await db.query('SELECT * FROM channel_documents WHERE id = $1', [id]);
    if (fileRes.rows.length === 0) {
      return res.status(404).json({ message: 'Tài liệu không tồn tại' });
    }
    const document = fileRes.rows[0];

    // Kiểm tra quyền (chỉ người đăng hoặc owner mới được xoá)
    // Để đơn giản, hiện tại chỉ cho phép người đăng xoá.
    // Nếu muốn Owner xoá, ta cần JOIN với channels -> rooms -> room_members.
    if (document.uploader_id !== userId) {
      return res.status(403).json({ message: 'Bạn không có quyền xoá tài liệu này' });
    }

    // Xoá file vật lý
    const fileName = document.file_url.split('/').pop();
    const filePath = path.join(__dirname, '../../uploads/documents', fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Xoá trong DB
    await db.query('DELETE FROM channel_documents WHERE id = $1', [id]);

    res.status(200).json({ message: 'Xoá tài liệu thành công' });
  } catch (error) {
    console.error('Lỗi deleteDocument:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = {
  getDocuments,
  uploadDocument,
  deleteDocument
};
