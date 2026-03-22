const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('SaleItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  sale_id: { type: DataTypes.UUID, allowNull: false },
  product_id: { type: DataTypes.UUID, allowNull: false },
  quantity: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  price_per_unit: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  total_price: { type: DataTypes.DECIMAL(14,2), allowNull: false },
  batch_id: { type: DataTypes.UUID }
}, { tableName: 'sale_items' });
