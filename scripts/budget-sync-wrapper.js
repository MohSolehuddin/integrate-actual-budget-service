const { execSync } = require('child_process');
const path = require('path');

const syncToActualBudget = async (accountId, transactions) => {
  try {
    // Export transactions to temp JSON
    const tmpFile = `/tmp/actual-sync-${Date.now()}.json`;
    const fs = require('fs');
    fs.writeFileSync(tmpFile, JSON.stringify(transactions, null, 2));

    const scriptPath = path.join(__dirname, 'sync-to-actual.js');
    const env = { ...process.env, TZ: 'Asia/Jakarta' };

    // Call sync script —accountId parameter for info only
    const output = execSync(`node "${scriptPath}" "${tmpFile}"`, {
      encoding: 'utf8',
      env,
      timeout: 60000
    });

    // Cleanup
    fs.unlinkSync(tmpFile);

    // Parse output
    const result = JSON.parse(output.trim());
    if (result.success) {
      console.log(`[budget-sync-wrapper] ✅ Synced ${result.count} transactions to Actual Budget`);
      return result;
    } else {
      throw new Error(result.error || 'Unknown sync error');
    }
  } catch (error) {
    console.warn(`[budget-sync-wrapper] ❌ Failed to sync to Actual Budget: ${error.message}`);
    // Don't throw - sync is non-critical, data already in PostgreSQL
    return { success: false, error: error.message, count: 0 };
  }
};

module.exports = { syncToActualBudget };
