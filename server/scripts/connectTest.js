require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { Pool } = require('pg');
const config = {
  user: 'postgres',
  host: 'localhost',
  database: 'finora',
  password: '123456',
  port: 5432,
};
console.log('Attempting connection with config:', config);
const pool = new Pool(config);
pool.connect((err, client, release) => {
  if (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
  console.log('Connection succeeded');
  client.query('SELECT 1 AS test', (qerr, res) => {
    release();
    if (qerr) {
      console.error('Query error:', qerr.message);
    } else {
      console.log('Query result:', res.rows);
    }
    pool.end();
  });
});

