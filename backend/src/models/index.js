const sequelize = require('../config/database');
const User = require('./User');
const Farmer = require('./Farmer');
const MilkDelivery = require('./MilkDelivery');
const Product = require('./Product');
const ProductionBatch = require('./ProductionBatch');
const Inventory = require('./Inventory');
const Customer = require('./Customer');
const Sale = require('./Sale');
const SaleItem = require('./SaleItem');
const Notification = require('./Notification');
const Factory = require('./Factory');

// Associations
Farmer.hasMany(MilkDelivery, { foreignKey: 'farmer_id', as: 'deliveries' });
MilkDelivery.belongsTo(Farmer, { foreignKey: 'farmer_id', as: 'farmer' });

Product.hasMany(ProductionBatch, { foreignKey: 'product_id', as: 'batches' });
ProductionBatch.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Product.hasOne(Inventory, { foreignKey: 'product_id', as: 'inventory' });
Inventory.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Customer.hasMany(Sale, { foreignKey: 'customer_id', as: 'sales' });
Sale.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

Sale.hasMany(SaleItem, { foreignKey: 'sale_id', as: 'items' });
SaleItem.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });
SaleItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

module.exports = {
  sequelize,
  User,
  Farmer,
  MilkDelivery,
  Product,
  ProductionBatch,
  Inventory,
  Customer,
  Sale,
  SaleItem,
  Notification,
  Factory
};
