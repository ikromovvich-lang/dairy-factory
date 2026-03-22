const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dairy_factory',
  username: process.env.DB_USER || 'dairy_admin',
  password: process.env.DB_PASSWORD || 'DairyFactory2024!',
  logging: (msg) => { if (process.env.NODE_ENV !== 'production') logger.debug(msg); },
  pool: { max: 20, min: 5, acquire: 30000, idle: 10000 },
  define: { timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' },
});

async function initDatabase() {
  try {
    await sequelize.authenticate();
    logger.info('PostgreSQL connected successfully');
  } catch (err) {
    logger.error('Database connection failed:', err.message);
    throw err;
  }
}

module.exports = { sequelize, initDatabase };
