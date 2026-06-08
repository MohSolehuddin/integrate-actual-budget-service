const { Pool } = require('pg');
const path = require('path');
const config = require('./config');

// Create connection pool
const pool = new Pool({
  host: config.POSTGRES_HOST,
  port: parseInt(config.POSTGRES_PORT) || 5432,
  database: config.POSTGRES_DB,
  user: config.POSTGRES_USER,
  password: config.POSTGRES_PASSWORD
});

// Test connection
pool.on('connect', () => {
  console.log(`Connected to PostgreSQL database at ${config.POSTGRES_HOST}:${config.POSTGRES_PORT}/${config.POSTGRES_DB}`);
});

pool.on('error', (err) => {
  console.error('Unexpected error on PostgreSQL client', err);
});

// Create tables if not exist
const createTables = async () => {
  const client = await pool.connect();
  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        sender_id TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        actual_user_id TEXT,
        budget_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Telegram chats table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        sender_id TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        budget_name TEXT,
        actual_budget_id TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(sender_id)
      )
    `);

    // Budget accounts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS budget_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        actual_account_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        on_budget BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        chat_id TEXT,
        raw_text TEXT,
        parsed_json JSONB,
        date TEXT,
        payee TEXT,
        category TEXT,
        amount BIGINT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    console.log('PostgreSQL tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error.message);
  } finally {
    client.release();
  }
};

// Initialize tables
createTables();

// Helper function to get user by sender_id
const getUserBySenderId = (senderId) => {
  return pool.query('SELECT * FROM users WHERE sender_id = $1', [senderId])
    .then(result => result.rows[0] || null)
    .catch(err => { throw err; });
};

// Helper function to create user if not exists
const getOrCreateUser = async (senderId, email, name) => {
  try {
    // Check if user exists
    const existingUser = await pool.query('SELECT * FROM users WHERE sender_id = $1', [senderId]);
    if (existingUser.rows.length > 0) {
      return existingUser.rows[0];
    }
    
    // Create new user
    const newUser = await pool.query(
      'INSERT INTO users (sender_id, email, name) VALUES ($1, $2, $3) RETURNING *',
      [senderId, email, name]
    );
    return newUser.rows[0];
  } catch (error) {
    throw error;
  }
};

// Helper function to add transaction
const addTransaction = async (userId, data) => {
  try {
    const result = await pool.query(
      'INSERT INTO transactions (user_id, chat_id, raw_text, parsed_json, date, payee, category, amount, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [
        userId,
        data.chatId || null,
        data.rawText || null,
        JSON.stringify(data.parsed || {}),
        data.date || null,
        data.payee || null,
        data.category || null,
        data.amount || 0,
        data.notes || null
      ]
    );
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

// Export pool and helpers
module.exports = {
  pool,
  getUserBySenderId,
  getOrCreateUser,
  addTransaction
};
