const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('ProductionBatch', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  batch_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  product_id: { type: DataTypes.UUID, allowNull: false },
  production_date: { type: DataTypes.DATEONLY, allowNull: false },
  expiration_date: { type: DataTypes.DATEONLY, allowNull: false },
  milk_used_liters: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  quantity_produced: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  yield_percentage: { type: DataTypes.DECIMAL(5,2) },
  fat_input: { type: DataTypes.DECIMAL(5,2) },
  quality_check: { type: DataTypes.ENUM('passed', 'failed', 'pending'), defaultValue: 'pending' },
  qr_code: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('in_production', 'completed', 'stored', 'sold', 'expired', 'discarded'), defaultValue: 'in_production' },
  notes: { type: DataTypes.TEXT },
  produced_by: { type: DataTypes.UUID },
  cost_per_unit: { type: DataTypes.DECIMAL(10,2) }
}, { tableName: 'production_batches' });
