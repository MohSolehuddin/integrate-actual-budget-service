const express = require('express');
const app = express();
const budgetRoutes = require('./routes/budget.routes');
const config = require('./config');

// Middleware
app.use(express.json());

// Register Routes
app.use('/api/budget', budgetRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Budget Service',
    port: config.PORT
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint tidak ditemukan' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    success: false, 
    error: err.message || 'Terjadi kesalahan internal'
  });
});

// Only start server if this file is run directly
if (require.main === module) {
  const PORT = config.PORT;
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log(`Terhubung ke Actual Budget di: ${config.ACTUAL_BASE_URL}`);
  });
}

module.exports = app;
