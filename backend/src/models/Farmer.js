const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('Farmer', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  phone: { type: DataTypes.STRING(20), allowNull: false },
  location: { type: DataTypes.STRING(200), allowNull: false },
  price_per_liter: { type: DataTypes.DECIMAL(10,2), defaultValue: 3500 },
  quality_bonus: { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  bank_account: { type: DataTypes.STRING(50) },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  total_delivered: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  total_paid: { type: DataTypes.DECIMAL(14,2), defaultValue: 0 }
}, { tableName: 'farmers' });
