const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('Customer', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  type: { type: DataTypes.ENUM('retail', 'wholesale', 'distributor', 'supermarket'), defaultValue: 'retail' },
  phone: { type: DataTypes.STRING(20) },
  email: { type: DataTypes.STRING(150) },
  address: { type: DataTypes.TEXT },
  tax_id: { type: DataTypes.STRING(50) },
  credit_limit: { type: DataTypes.DECIMAL(14,2), defaultValue: 0 },
  current_balance: { type: DataTypes.DECIMAL(14,2), defaultValue: 0 },
  discount_percent: { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  total_purchases: { type: DataTypes.DECIMAL(14,2), defaultValue: 0 }
}, { tableName: 'customers' });
