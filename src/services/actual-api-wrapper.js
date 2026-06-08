const { execSync } = require('child_process');
const path = require('path');

/**
 * Sync transaction to Actual Budget using @actual-app/api
 * via Node.js subprocess (invoked from Python)
 */
const syncTransaction = async () => {
  const scriptsDir = path.join(__dirname, 'actual-api-scripts');
  
  try {
    // Ensure script exists
    const scriptPath = path.join(scriptsDir, 'sync-transaction.js');
    
    // Execute Node.js script
    const result = execSync(`node "${scriptPath}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'inherit']
    });
    
    console.log('Actual Budget sync result:', result);
    return { success: true, output: result };
  } catch (error) {
    console.error('Actual Budget sync error:', error.message);
    return { success: false, error: error.message };
  }
};

// Allow CLI invocation
if (require.main === module) {
  syncTransaction().then(result => {
    console.log(JSON.stringify(result));
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { syncTransaction };
