const fs = require('fs');
const path = require('path');
const db = require('./index');

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'alter_tasks.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await db.query(sql);
    console.log('Tạo bảng room_tasks thành công!');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi tạo bảng room_tasks:', error);
    process.exit(1);
  }
}

run();
