import { Sequelize } from 'sequelize';
import path from 'path';

// Define the absolute path for the sqlite database
const dbPath = path.resolve(process.cwd(), 'database.sqlite');

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});
