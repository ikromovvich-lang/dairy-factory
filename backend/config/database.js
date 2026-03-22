const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
      logging: false,
    })
  : new Sequelize({
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'dairy_factory',
      username: process.env.DB_USER || 'dairy_admin',
      password: process.env.DB_PASSWORD || '',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
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
