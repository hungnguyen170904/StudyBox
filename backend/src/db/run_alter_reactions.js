const fs = require('fs');
const path = require('path');
const db = require('./index');

async function runAlter() {
  try {
    const sqlPath = path.join(__dirname, 'alter_reactions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('Đang chạy script alter_reactions.sql...');
    await db.query(sql);
    console.log('Chạy thành công!');
  } catch (error) {
    console.error('Lỗi khi chạy script:', error);
  } finally {
    process.exit();
  }
}

runAlter();
