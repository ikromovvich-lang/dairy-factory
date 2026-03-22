const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('Product', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  name_ru: { type: DataTypes.STRING(100) },
  name_uz: { type: DataTypes.STRING(100) },
  type: { type: DataTypes.ENUM('milk', 'yogurt', 'tvorog', 'smetana', 'butter', 'kefir'), allowNull: false },
  unit: { type: DataTypes.ENUM('liter', 'kg', 'piece'), defaultValue: 'liter' },
  price_per_unit: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  milk_ratio: { type: DataTypes.DECIMAL(5,3), allowNull: false, comment: 'Liters of milk per unit produced' },
  shelf_life_days: { type: DataTypes.INTEGER, defaultValue: 7 },
  fat_percentage: { type: DataTypes.DECIMAL(5,2) },
  description: { type: DataTypes.TEXT },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'products' });
