const { pool, getUserBySenderId, getOrCreateUser, addTransaction } = require('../database');
const path = require('path');
const http = require('http');

/**
 * Export transactions to Actual Budget CSV format
 */
const exportToCSV = async (userId) => {
  const result = await pool.query(`
    SELECT 
      t.date,
      t.amount,
      t.payee,
      t.category,
      t.notes
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    WHERE u.id = $1
    ORDER BY t.date DESC
  `, [userId]);

  const rows = result.rows;
  if (rows.length === 0) {
    return { error: 'No transactions found' };
  }

  // CSV Header
  const header = 'date,amount,payee,category,notes\n';

  // CSV Body (Actual Budget compatible)
  const body = rows.map(row => {
    // Handle date — can be string or Date object
    const dateStr = row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date;
    const date = dateStr.split('T')[0]; // Remove time part if present
    const amount = row.amount; // positive = income, negative = expense
    const payee = row.payee || '';
    const category = row.category || '';
    const notes = row.notes || '';
    return `${date},${amount},${payee},${category},${notes}`;
  }).join('\n');

  return { csv: header + body };
};

/**
 * Send transaction to Actual Budget via HTTP
 */
const sendToActualBudget = async (accountId, transactions) => {
  try {
    const apiPath = '/api/budget/transactions';
    const url = new URL(process.env.ACTUAL_BASE_URL || 'http://localhost:5006');
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: apiPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Sender': '7133351898',
        'User-Agent': 'integrate-actual-budget-service/1.0'
      }
    };

    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode === 200) {
              resolve(parsed);
            } else {
              reject(new Error(`Actual Budget API error: ${res.statusCode} - ${data}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data.substring(0, 200)}`));
          }
        });
      });

      req.on('error', (e) => {
        reject(new Error(`HTTP error: ${e.message}`));
      });

      req.write(JSON.stringify({ accountId, transactions }));
      req.end();
    });
  } catch (error) {
    console.error('Error sending to Actual Budget:', error.message);
    throw error;
  }
};

module.exports = {
  exportToCSV
};
