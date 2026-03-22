const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('Sale', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  invoice_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  customer_id: { type: DataTypes.UUID, allowNull: false },
  sale_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  subtotal: { type: DataTypes.DECIMAL(14,2), allowNull: false },
  discount_amount: { type: DataTypes.DECIMAL(14,2), defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(14,2), defaultValue: 0 },
  total_amount: { type: DataTypes.DECIMAL(14,2), allowNull: false },
  payment_status: { type: DataTypes.ENUM('pending', 'partial', 'paid', 'overdue'), defaultValue: 'pending' },
  payment_method: { type: DataTypes.ENUM('cash', 'bank_transfer', 'credit', 'card'), defaultValue: 'cash' },
  paid_amount: { type: DataTypes.DECIMAL(14,2), defaultValue: 0 },
  notes: { type: DataTypes.TEXT },
  sold_by: { type: DataTypes.UUID }
}, { tableName: 'sales' });
