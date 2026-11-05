require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
console.log('DATABASE_URL:', process.env.DATABASE_URL);
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users','transactions','budgets')",
  (err, res) => {
    if (err) {
      console.error('Error querying tables:', err.message);
      process.exit(1);
    }
    console.log('Existing tables:', res.rows.map(r => r.table_name));
    pool.end();
  }
);

