const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Kiểm tra kết nối khi khởi động
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('PostgreSQL database connected via Pool');
  release();
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
