const { Pool } = require('pg');
require('dotenv').config();

// Database connection configuration using environment variables
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false // Required for cloud databases like Aiven
  }
};

// Create a connection pool for better performance
const pool = new Pool(dbConfig);

// Test the connection
pool.connect()
  .then(() => {
    console.log('Connected to PostgreSQL database successfully!');
  })
  .catch((err) => {
    console.error('Error connecting to PostgreSQL database:', err);
  });

module.exports = pool;
