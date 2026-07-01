require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const run = async () => {
  try {
    console.log('Đang thêm cột display_name vào bảng users...');
    
    // Thêm cột nếu chưa có
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
    `);
    
    // Khởi tạo display_name = username cho những user cũ
    await pool.query(`
      UPDATE users 
      SET display_name = username 
      WHERE display_name IS NULL;
    `);

    console.log('Migration thêm display_name thành công!');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi migration:', error);
    process.exit(1);
  }
};

run();
