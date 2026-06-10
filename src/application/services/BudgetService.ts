import type { BudgetRepository } from '../../infrastructure/database/postgres/repositories/BudgetRepository';
import type { Pool } from 'pg';

export interface ParsedTransaction {
  accountId?: string;
  senderId?: string;
  chatId?: string;
  raw?: string;
  rawText?: string;
  date?: string;
  payee?: string;
  category?: string;
  amount?: number;
  notes?: string;
  description?: string;
}

export class BudgetService {
  private pool: Pool;
  private budgetRepo: BudgetRepository;

  constructor(pool: Pool, budgetRepo: BudgetRepository) {
    this.pool = pool;
    this.budgetRepo = budgetRepo;
  }

  async getOrCreateBudget(senderId: string): Promise<{ budgetId: number; email: string; accounts: any[] }> {
    let user = await this.budgetRepo.getUserBySenderId(senderId);
    if (!user) {
      console.log(`[BudgetService] Creating new user for sender_id: ${senderId}`);
      user = await this.budgetRepo.createUser(senderId, `user_${senderId}@localhost`, `User ${senderId}`);
    }

    const accounts = await this.budgetRepo.getAccountsByUserId(user.id);
    if (accounts.length > 0) {
      return { budgetId: user.id, email: user.email, accounts };
    }

    // Create default accounts
    console.log(`[BudgetService] Creating default budget for ${senderId}`);
    const defaultAccounts = [
      { name: 'Cash', type: 'cash', on_budget: true },
      { name: 'Checking', type: 'checking', on_budget: true },
      { name: 'Savings', type: 'savings', on_budget: true },
      { name: 'Credit Card', type: 'credit_card', on_budget: false },
    ];

    for (const acc of defaultAccounts) {
      await this.budgetRepo.createAccount(user.id, {
        user_id: user.id,
        actual_account_id: `local_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: acc.name,
        type: acc.type,
        on_budget: acc.on_budget,
      });
    }

    const newAccounts = await this.budgetRepo.getAccountsByUserId(user.id);
    return { budgetId: user.id, email: user.email, accounts: newAccounts };
  }

  async getAccounts(senderId: string): Promise<any[]> {
    const user = await this.budgetRepo.getUserBySenderId(senderId);
    if (!user) throw new Error(`User not found for sender_id: ${senderId}`);
    return this.budgetRepo.getAccountsByUserId(user.id);
  }

  async getCategories(): Promise<any[]> {
    return [
      { id: 'cat_food', name: 'Food' },
      { id: 'cat_transport', name: 'Transportation' },
      { id: 'cat_utility', name: 'Utilities' },
      { id: 'cat_entertainment', name: 'Entertainment' },
      { id: 'cat_health', name: 'Health' },
      { id: 'cat_shopping', name: 'Shopping' },
    ];
  }

  async syncTransaction(senderId: string, transactionData: ParsedTransaction): Promise<any> {
    let user = await this.budgetRepo.getUserBySenderId(senderId);
    if (!user) {
      user = await this.budgetRepo.createUser(senderId, `user_${senderId}@localhost`, `User ${senderId}`);
    }

    const dbData = {
      chatId: transactionData.chatId || null,
      rawText: transactionData.raw || transactionData.rawText || JSON.stringify(transactionData),
      parsed: transactionData,
      date: transactionData.date || new Date().toISOString().split('T')[0],
      payee: transactionData.payee || transactionData.category || 'Unknown',
      category: transactionData.category || null,
      amount: transactionData.amount || 0,
      notes: transactionData.notes || transactionData.description || null,
    };

    return this.budgetRepo.addTransaction(user.id, dbData);
  }

  async processTransaction(senderId: string, parsedTransaction: ParsedTransaction): Promise<{ success: boolean; id?: number; budgetId?: number }> {
    console.log(`[BudgetService] Processing transaction for ${senderId}:`, parsedTransaction);
    const budgetInfo = await this.getOrCreateBudget(senderId);
    const dbResult = await this.syncTransaction(senderId, parsedTransaction);
    console.log(`[BudgetService] Transaction saved to PostgreSQL (ID: ${dbResult.id})`);
    return { success: true, id: dbResult.id, budgetId: budgetInfo.budgetId };
  }

  async exportTransactionsToCSV(userId: number): Promise<{ csv?: string; error?: string }> {
    const result = await this.pool.query(
      `SELECT t.date, t.amount, t.payee, t.category, t.notes
       FROM budget_transactions t
       JOIN telegram_users u ON t.user_id = u.id
       WHERE u.id = $1
       ORDER BY t.date DESC`,
      [userId]
    );

    const rows = result.rows;
    if (rows.length === 0) return { error: 'No transactions found' };

    const header = 'date,amount,payee,category,notes\n';
    const body = rows.map((row: any) => {
      const dateStr = row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date;
      const date = (dateStr || '').split('T')[0];
      return `${date},${row.amount || 0},${row.payee || ''},${row.category || ''},${row.notes || ''}`;
    }).join('\n');

    return { csv: header + body };
  }
}