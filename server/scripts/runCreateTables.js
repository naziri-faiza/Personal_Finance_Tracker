require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sqlFile = path.resolve(__dirname, 'createTables.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

// Split by semicolon, ignore empty lines/comments
const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

(async () => {
  try {
    for (const stmt of statements) {
      await pool.query(stmt);
      console.log('Executed:', stmt.split('\n')[0].substring(0, 60) + '...');
    }
    console.log('All tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err.message);
  } finally {
    await pool.end();
  }
})();

