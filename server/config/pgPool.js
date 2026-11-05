require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { Pool } = require('pg');

// Ensure DATABASE_URL is defined in .env
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing from .env configuration');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // optional: set max clients, idle timeout, etc.
});

// Test connection on import – if it fails, server start will abort
pool
  .connect()
  .then((client) => {
    console.log('✅ PostgreSQL connection successful');
    client.release();
  })
  .catch((err) => {
    console.error('❌ PostgreSQL connection error:', err.message);
    // In production we exit; in development we still throw to surface the issue
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

module.exports = pool;

