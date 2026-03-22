const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type: { type: DataTypes.ENUM('low_stock', 'expiring', 'out_of_stock', 'payment_due', 'milk_low', 'quality_alert', 'system'), allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  severity: { type: DataTypes.ENUM('info', 'warning', 'critical'), defaultValue: 'info' },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  related_id: { type: DataTypes.UUID },
  related_type: { type: DataTypes.STRING(50) },
  user_id: { type: DataTypes.UUID }
}, { tableName: 'notifications' });
