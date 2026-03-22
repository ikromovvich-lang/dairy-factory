const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('Factory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  location: { type: DataTypes.STRING(300) },
  capacity_liters_per_day: { type: DataTypes.DECIMAL(10,2) },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'factories' });
