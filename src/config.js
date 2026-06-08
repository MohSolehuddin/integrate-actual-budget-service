// Centralized configuration for integrate-actual-budget-service
require('dotenv').config();

module.exports = {
  // Budget Service
  PORT: process.env.PORT || 3001,

  // PostgreSQL Database
  POSTGRES_HOST: process.env.POSTGRES_HOST || 'localhost',
  POSTGRES_PORT: process.env.POSTGRES_PORT || '5432',
  POSTGRES_DB: process.env.POSTGRES_DB || 'budget_service',
  POSTGRES_USER: process.env.POSTGRES_USER || 'postgres',
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || 'postgres',

  // Actual Budget (HTTPS domain)
  ACTUAL_BASE_URL: process.env.ACTUAL_BASE_URL || 'https://actual-budget.msytc.my.id:5006',
  ACTUAL_DEFAULT_PASSWORD: process.env.ACTUAL_DEFAULT_PASSWORD || 'secret',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-jwt-key-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d'
};
