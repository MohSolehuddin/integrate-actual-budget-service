import type { Pool } from 'pg';

export interface TransactionData {
  chatId?: string | null;
  rawText?: string | null;
  parsed?: Record<string, any>;
  date?: string | null;
  payee?: string | null;
  category?: string | null;
  amount?: number | null;
  notes?: string | null;
}

export interface BudgetAccount {
  id?: number;
  user_id: number;
  actual_account_id: string;
  name: string;
  type: string;
  on_budget: boolean;
}

export interface BudgetUser {
  id: number;
  sender_id: string;
  email: string;
  name: string;
  actual_user_id?: string;
  budget_id?: number;
  created_at: Date;
}

export class BudgetRepository {
  constructor(private pool: Pool) {}

  async getUserBySenderId(senderId: string): Promise<BudgetUser | null> {
    const result = await this.pool.query('SELECT * FROM telegram_users WHERE sender_id = $1', [senderId]);
    return result.rows[0] || null;
  }

  async createUser(senderId: string, email: string, name: string): Promise<BudgetUser> {
    const result = await this.pool.query(
      'INSERT INTO telegram_users (sender_id, email, name) VALUES ($1, $2, $3) RETURNING *',
      [senderId, email, name]
    );
    return result.rows[0];
  }

  async getOrCreateUser(senderId: string, email: string, name: string): Promise<BudgetUser> {
    const existing = await this.getUserBySenderId(senderId);
    if (existing) return existing;
    return this.createUser(senderId, email, name);
  }

  async getAccountsByUserId(userId: number): Promise<BudgetAccount[]> {
    const result = await this.pool.query('SELECT * FROM budget_accounts WHERE user_id = $1', [userId]);
    return result.rows;
  }

  async createAccount(userId: number, account: Omit<BudgetAccount, 'id'>): Promise<BudgetAccount> {
    const result = await this.pool.query(
      'INSERT INTO budget_accounts (user_id, actual_account_id, name, type, on_budget) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, account.actual_account_id, account.name, account.type, account.on_budget]
    );
    return result.rows[0];
  }

  async addTransaction(userId: number, data: TransactionData): Promise<any> {
    const result = await this.pool.query(
      `INSERT INTO budget_transactions 
       (user_id, chat_id, raw_text, parsed_json, date, payee, category, amount, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        userId,
        data.chatId || null,
        data.rawText || null,
        data.parsed ? JSON.stringify(data.parsed) : null,
        data.date || null,
        data.payee || null,
        data.category || null,
        data.amount || 0,
        data.notes || null,
      ]
    );
    return result.rows[0];
  }

  async getTransactionsByUserId(userId: number): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM budget_transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }
}
