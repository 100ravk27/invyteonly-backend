const knex = require('knex');
require('dotenv').config();

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    timezone: '+05:30' // Use IST timezone
  },
  pool: { min: 0, max: 10 }
});

// Set session timezone to IST for all timestamps (created_at, updated_at, etc.)
db.raw("SET time_zone = '+05:30'").then(() => {
  console.log('✅ Database timezone set to IST (+05:30)');
}).catch(err => {
  console.error('⚠️  Could not set database timezone:', err.message);
});

module.exports = db;
