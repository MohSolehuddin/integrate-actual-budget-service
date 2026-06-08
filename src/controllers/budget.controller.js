const budgetService = require('../services/budget.service');

const getBudgetStatus = async (req, res) => {
  try {
    const senderId = req.headers['x-telegram-sender'] || 'default';
    
    const user = await budgetService.getOrCreateBudget(senderId);
    
    res.json({ 
      success: true, 
      exists: true,
      budgetId: user.budgetId,
      email: user.email,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Error checking budget status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAccounts = async (req, res) => {
  try {
    const senderId = req.headers['x-telegram-sender'] || 'default';
    
    const accounts = await budgetService.getAccounts(senderId);
    
    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const senderId = req.headers['x-telegram-sender'] || 'default';
    
    const categories = await budgetService.getCategories(senderId);
    
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const addTransaction = async (req, res) => {
  try {
    const senderId = req.headers['x-telegram-sender'] || 'default';
    const { accountId, transactions } = req.body;
    const transaction = transactions[0];

    const result = await budgetService.syncTransaction(senderId, {
      ...transaction,
      accountId: accountId,
      senderId: senderId
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error adding transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getBudgetStatus,
  getAccounts,
  getCategories,
  addTransaction
};
