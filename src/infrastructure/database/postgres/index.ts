import { Pool } from 'pg';

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export function createPostgresPool(config?: Partial<PostgresConfig>): Pool {
  const pool = new Pool({
    host: config?.host || process.env.POSTGRES_HOST || 'localhost',
    port: config?.port || parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: config?.database || process.env.POSTGRES_DB || 'budget',
    user: config?.user || process.env.POSTGRES_USER || 'postgres',
    password: config?.password || process.env.POSTGRES_PASSWORD || '',
  });

  pool.on('connect', () => {
    console.log('[Postgres] Connected successfully');
  });

  pool.on('error', (err) => {
    console.error('[Postgres] Unexpected error on client', err);
  });

  return pool;
}

export async function initPostgresTables(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS telegram_users (
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS telegram_chats (
        id SERIAL PRIMARY KEY,
        sender_id TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        budget_name TEXT,
        actual_budget_id TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS budget_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        actual_account_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        on_budget BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS budget_transactions (
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('[Postgres] Tables initialized successfully');
  } catch (error) {
    console.error('[Postgres] Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
}
