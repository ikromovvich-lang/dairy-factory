const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('Inventory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  product_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  quantity_available: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  quantity_reserved: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  minimum_stock: { type: DataTypes.DECIMAL(10,2), defaultValue: 10 },
  maximum_stock: { type: DataTypes.DECIMAL(10,2), defaultValue: 1000 },
  last_updated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  warehouse_location: { type: DataTypes.STRING(50) }
}, { tableName: 'inventory' });
