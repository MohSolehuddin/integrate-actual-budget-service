const { pool, getUserBySenderId, getOrCreateUser, addTransaction } = require('../database');
// Note: sync to Actual Budget via @actual-app/api disabled — using CSV export instead
// const { syncToActualBudget } = require('../scripts/budget-sync-wrapper');

/**
 * Get or create user's budget structure
 */
const getOrCreateBudget = async (senderId) => {
  try {
    // Auto-create user if not exists
    let user = await getUserBySenderId(senderId);
    if (!user) {
      console.log(`Creating new user for sender_id: ${senderId}`);
      user = await getOrCreateUser(senderId, `user_${senderId}@localhost`, `User ${senderId}`);
    }

    // Check if budget exists in our local records
    const result = await pool.query('SELECT * FROM budget_accounts WHERE user_id = $1', [user.id]);
    const accountRows = result.rows;

    if (accountRows.length > 0) {
      console.log(`Budget already exists for ${senderId}: ${accountRows.length} accounts`);
      return {
        budgetId: user.id,
        accounts: accountRows,
        userId: user.id,
        email: user.email
      };
    }

    // Create default accounts if none exist
    console.log(`Creating default budget for ${senderId}`);
    await createDefaultBudgetStructure(user.id);
    
    const accounts = await getAccounts(senderId);
    return {
      budgetId: user.id,
      accounts: accounts,
      userId: user.id,
      email: user.email
    };
  } catch (error) {
    console.error(`Error in getOrCreateBudget for ${senderId}:`, error.message);
    throw error;
  }
};

/**
 * Create default budget structure (accounts) for a new user
 */
const createDefaultBudgetStructure = async (userId) => {
  const defaultAccounts = [
    { name: 'Cash', type: 'cash', onBudget: true },
    { name: 'Checking', type: 'checking', onBudget: true },
    { name: 'Savings', type: 'savings', onBudget: true },
    { name: 'Credit Card', type: 'credit_card', onBudget: false }
  ];

  const createdAccounts = [];
  
  for (const account of defaultAccounts) {
    try {
      const result = await pool.query(
        'INSERT INTO budget_accounts (user_id, actual_account_id, name, type, on_budget) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userId, `local_${Date.now()}_${Math.floor(Math.random()*1000)}`, account.name, account.type, account.onBudget]
      );
      createdAccounts.push(result.rows[0]);
    } catch (error) {
      console.error(`Error creating account ${account.name}:`, error.message);
    }
  }

  return createdAccounts;
};

/**
 * Get all accounts for a user
 */
const getAccounts = async (senderId) => {
  try {
    const user = await getUserBySenderId(senderId);
    if (!user) {
      throw new Error(`User not found for sender_id: ${senderId}`);
    }
    
    const result = await pool.query('SELECT * FROM budget_accounts WHERE user_id = $1', [user.id]);
    return result.rows;
  } catch (error) {
    console.error(`Error fetching accounts for ${senderId}:`, error.message);
    throw error;
  }
};

/**
 * Get all categories for a user
 */
const getCategories = async (senderId) => {
  try {
    const user = await getUserBySenderId(senderId);
    if (!user) {
      throw new Error(`User not found for sender_id: ${senderId}`);
    }
    
    // Return default categories for now
    return [
      { id: 'cat_food', name: 'Food' },
      { id: 'cat_transport', name: 'Transportation' },
      { id: 'cat_utility', name: 'Utilities' },
      { id: 'cat_entertainment', name: 'Entertainment' },
      { id: 'cat_health', name: 'Health' },
      { id: 'cat_shopping', name: 'Shopping' }
    ];
  } catch (error) {
    console.error(`Error fetching categories for ${senderId}:`, error.message);
    return [
      { id: 'cat_food', name: 'Food' },
      { id: 'cat_transport', name: 'Transportation' },
      { id: 'cat_utility', name: 'Utilities' },
      { id: 'cat_entertainment', name: 'Entertainment' },
      { id: 'cat_health', name: 'Health' },
      { id: 'cat_shopping', name: 'Shopping' }
    ];
  }
};

/**
 * Sync transaction to database
 */
const syncTransaction = async (senderId, transactionData) => {
  try {
    let user = await getUserBySenderId(senderId);
    if (!user) {
      user = await getOrCreateUser(senderId, `user_${senderId}@localhost`, `User ${senderId}`);
    }

    const result = await addTransaction(user.id, transactionData);
    return result;
  } catch (error) {
    console.error(`Error syncing transaction for ${senderId}:`, error.message);
    throw error;
  }
};

/**
 * Process parsed transaction and save to database (No sync to Actual Budget — using CSV export instead)
 */
const processTransaction = async (senderId, parsedTransaction) => {
  try {
    console.log(`Processing transaction for ${senderId}:`, parsedTransaction);
    
    // Get or create budget
    const budgetInfo = await getOrCreateBudget(senderId);
    const budgetId = budgetInfo.budgetId;
    
    // Get first account ID (default)
    const accountId = budgetInfo.accounts[0]?.id || 1;
    
    // Sync to database
    const dbResult = await syncTransaction(senderId, {
      ...parsedTransaction,
      payee: parsedTransaction.payee || 'Unknown',
      amount: parsedTransaction.amount || 0
    });
    
    console.log(`Transaction saved to PostgreSQL (ID: ${dbResult.id})`);
    console.log(`Note: Sync to Actual Budget disabled — export CSV via /api/budget/export/csv`);
    
    return {
      success: true,
      id: dbResult.id,
      budgetId: budgetId
    };
  } catch (error) {
    console.error(`Error processing transaction for ${senderId}:`, error.message);
    throw error;
  }
};

module.exports = {
  getOrCreateBudget,
  createDefaultBudgetStructure,
  getAccounts,
  getCategories,
  syncTransaction,
  processTransaction
};
