const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('MilkDelivery', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  farmer_id: { type: DataTypes.UUID, allowNull: false },
  delivery_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  liters: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  fat_percentage: { type: DataTypes.DECIMAL(5,2), allowNull: false },
  protein_percentage: { type: DataTypes.DECIMAL(5,2) },
  quality_grade: { type: DataTypes.ENUM('premium', 'first', 'second', 'rejected'), allowNull: false },
  temperature_celsius: { type: DataTypes.DECIMAL(5,2) },
  price_per_liter: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  bonus_per_liter: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  total_payment: { type: DataTypes.DECIMAL(14,2), allowNull: false },
  is_paid: { type: DataTypes.BOOLEAN, defaultValue: false },
  paid_at: { type: DataTypes.DATE },
  notes: { type: DataTypes.TEXT },
  received_by: { type: DataTypes.UUID }
}, { tableName: 'milk_deliveries' });
