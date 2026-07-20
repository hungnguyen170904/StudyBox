const fs = require('fs');
const path = require('path');
const db = require('./index');

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'indexing.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await db.query(sql);
    console.log('Đánh chỉ mục cơ sở dữ liệu thành công!');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi khi đánh chỉ mục:', error);
    process.exit(1);
  }
}

run();
