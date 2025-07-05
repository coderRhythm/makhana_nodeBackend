const { Pool } = require('pg');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
};

const pool = new Pool(dbConfig);

// Test connection
pool.connect()
  .then(() => {
    console.log('✅ Connected to PostgreSQL database successfully!');
  })
  .catch((err) => {
    console.error('❌ Error connecting to PostgreSQL database:', err);
  });

module.exports = pool;
