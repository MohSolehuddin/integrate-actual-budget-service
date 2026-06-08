const { Api } = require('@actual-app/api');
require('dotenv').config({ path: '/home/moh_solehuddin190805/.hermes/secrets/actual-budget.env' });

const syncToActualBudget = async (transactions) => {
  try {
    const serverUrl = process.env.ACTUAL_SERVER_URL;
    const password = process.env.ACTUAL_PASSWORD;

    if (!serverUrl || !password) {
      throw new Error('Missing ACTUAL_SERVER_URL or ACTUAL_PASSWORD in env file');
    }

    console.log(`[sync-to-actual] Connecting to: ${serverUrl}`);

    const api = new Api(serverUrl);

    // Login dengan password
    await api.login(password);
    console.log('[sync-to-actual] Login successful to Actual Budget');

    // Get accounts — cari "Checking BCA" atau buat baru
    const accounts = await api.getAccounts();
    let checkingAccount = accounts.find(a => a.name.toLowerCase().includes('checking') || a.name.toLowerCase().includes('bca'));
    if (!checkingAccount) {
      // Create new account "Checking BCA"
      checkingAccount = await api.createAccount({
        name: 'Checking BCA',
        type: 'checking',
        balance: 0,
        closingBalance: 0,
        lastReconciledDate: null
      });
      console.log(`[sync-to-actual] Created new account: ${checkingAccount.name} (id: ${checkingAccount.id})`);
    } else {
      console.log(`[sync-to-actual] Found account: ${checkingAccount.name} (id: ${checkingAccount.id})`);
    }

    // Batching: group per 50 transactions
    const batched = [];
    for (let i = 0; i < transactions.length; i += 50) {
      batched.push(transactions.slice(i, i + 50));
    }
    console.log(`[sync-to-actual] Total transactions: ${transactions.length}, split into ${batched.length} batches`);

    for (let batch of batched) {
      // Map ke Actual Budget format
      const actualTxs = batch.map(t => ({
        date: t.date,
        amount: Math.round(t.amount * 100), // Actual Budget works in cents
        payee_name: t.payee || null,
        category: t.category || null,
        notes: t.notes || null,
        account_id: checkingAccount.id
      }));

      // Create transactions via batch insert
      // Gunakan API query untuk insert massal
      const stmt = `INSERT INTO transactions (date, amount, payee_name, category, notes, account_id) VALUES ?`;
      const values = actualTxs.map(t => [t.date, t.amount, t.payee_name, t.category, t.notes, t.account_id]);
      
      await api.runQuery(stmt, [values]);
      console.log(`[sync-to-actual] Synced ${actualTxs.length} transactions`);
    }

    console.log('[sync-to-actual] ✅ All transactions synced to Actual Budget');
    return { success: true, count: transactions.length };

  } catch (error) {
    console.error(`[sync-to-actual] ❌ Error syncing to Actual Budget: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Export untuk test
module.exports = { syncToActualBudget };

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node scripts/sync-to-actual.js <JSON_FILE> (or pipe via stdin)');
    process.exit(0);
  }

  const fs = require('fs');
  const data = fs.readFileSync(args[0], 'utf8');
  const transactions = JSON.parse(data);

  syncToActualBudget(transactions).then(result => {
    console.log(JSON.stringify(result));
    process.exit(result.success ? 0 : 1);
  }).catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
  });
}
