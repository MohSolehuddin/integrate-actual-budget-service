require('dotenv').config();
const app = require('./app');

const PORT = require('./config').PORT;
const ACTUAL_BASE_URL = require('./config').ACTUAL_BASE_URL;

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log(`Terhubung ke Actual Budget di: ${ACTUAL_BASE_URL}`);
  });
};

startServer();

// Initialize Telegram Bot (non-blocking, auto-retry)
try {
  require('./telegram-bot');
} catch (err) {
  console.warn('[SERVER] Telegram bot failed to start:', err.message);
}
