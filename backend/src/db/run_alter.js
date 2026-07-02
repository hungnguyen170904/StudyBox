require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const run = async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'alter.sql'), 'utf-8');
    await pool.query(sql);
    console.log('Chạy alter.sql thành công!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
