// Script chạy migration nâng cấp task v2
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function runMigration() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrate_tasks_v2.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('✅ Migration tasks v2 thành công!');
  } catch (err) {
    console.error('❌ Lỗi migration:', err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
