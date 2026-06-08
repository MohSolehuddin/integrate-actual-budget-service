const express = require('express');
const router = express.Router();
const budgetService = require('../services/budget.service');
const exportService = require('../services/export.service');

// GET /api/budget/status - Get budget status for sender
router.get('/status', async (req, res) => {
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
});

// GET /api/budget/accounts - Get all accounts
router.get('/accounts', async (req, res) => {
  try {
    const senderId = req.headers['x-telegram-sender'] || 'default';
    
    const accounts = await budgetService.getAccounts(senderId);
    
    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/budget/categories - Get all categories
router.get('/categories', async (req, res) => {
  try {
    const senderId = req.headers['x-telegram-sender'] || 'default';
    
    const categories = await budgetService.getCategories(senderId);
    
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/budget/transactions - Add transaction
router.post('/transactions', async (req, res) => {
  try {
    const senderId = req.headers['x-telegram-sender'] || 'default';
    const { accountId, transactions } = req.body;
    const transaction = transactions ? transactions[0] : req.body;

    const result = await budgetService.processTransaction(senderId, {
      ...transaction,
      accountId: accountId,
      senderId: senderId
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error adding transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/budget/export/csv - Export transactions to CSV
router.get('/export/csv', async (req, res) => {
  try {
    const senderId = req.headers['x-telegram-sender'] || '7133351898';
    
    // Get budget info to find userId
    const budgetInfo = await budgetService.getOrCreateBudget(senderId);
    const budgetId = budgetInfo.budgetId;
    
    const result = await exportService.exportToCSV(budgetId);
    
    if (result.error) {
      return res.status(404).json({ success: false, error: result.error });
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=actual-budget-export.csv');
    res.send(result.csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
