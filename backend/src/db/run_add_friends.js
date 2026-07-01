const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Neon Database successfully!');

    const sqlPath = path.join(__dirname, 'add_friends.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing add_friends.sql...');
    await client.query(sql);
    
    console.log('Friends & DM tables added successfully!');
  } catch (err) {
    console.error('Error executing migration:', err);
  } finally {
    await client.end();
  }
}

runMigration();
