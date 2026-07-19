const fs = require('fs');
const path = require('path');
const db = require('./index');

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'alter_custom_status.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await db.query(sql);
    console.log('Thêm trường custom_status thành công!');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi thêm trường custom_status:', error);
    process.exit(1);
  }
}

run();
