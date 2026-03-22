/**
 * Dashboard Route — Boshqaruv paneli
 */
const dashRouter = require('express').Router();
const { Op, fn, col, literal, QueryTypes } = require('sequelize');
const { sequelize, MilkDelivery, ProductionBatch, Inventory, Sale, Customer, Farmer, Notification } = require('../models');
const { authenticate } = require('../middleware/auth');

dashRouter.get('/', authenticate, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7*86400000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30*86400000).toISOString().split('T')[0];

    const [
      todayMilk,
      todayProduction,
      todaySales,
      inventory,
      weekRevenue,
      monthRevenue,
      activeFarmers,
      activeCustomers,
      pendingPayments,
      expiringBatches,
    ] = await Promise.all([
      MilkDelivery.findAll({ where: { deliveryDate: today }, attributes: ['liters','qualityGrade','totalPayment'] }),
      ProductionBatch.findAll({ where: { productionDate: today, status: { [Op.not]: 'rejected' } }, attributes: ['productType','quantityProduced','unit'] }),
      Sale.findAll({ where: { saleDate: today }, attributes: ['totalAmount','paymentStatus'] }),
      Inventory.findAll(),
      Sale.findAll({ where: { saleDate: { [Op.gte]: weekAgo } }, attributes: ['totalAmount','saleDate'] }),
      Sale.findAll({ where: { saleDate: { [Op.gte]: monthAgo } }, attributes: ['totalAmount'] }),
      Farmer.count({ where: { isActive: true } }),
      Customer.count({ where: { isActive: true } }),
      Sale.findAll({ where: { paymentStatus: { [Op.in]: ['pending','partial','overdue'] } }, attributes: ['totalAmount','paidAmount'] }),
      ProductionBatch.findAll({
        where: {
          expiryDate: { [Op.between]: [today, new Date(Date.now() + 3*86400000).toISOString().split('T')[0]] },
          status: 'approved',
        },
        attributes: ['batchNumber','productNameRu','expiryDate','quantityProduced'],
      }),
    ]);

    const totalMilkToday = todayMilk.reduce((s, d) => s + parseFloat(d.liters), 0);
    const totalRevenueToday = todaySales.reduce((s, d) => s + parseFloat(d.totalAmount), 0);
    const totalRevenueWeek = weekRevenue.reduce((s, d) => s + parseFloat(d.totalAmount), 0);
    const totalRevenueMonth = monthRevenue.reduce((s, d) => s + parseFloat(d.totalAmount), 0);
    const totalPendingDebt = pendingPayments.reduce((s, d) => s + (parseFloat(d.totalAmount) - parseFloat(d.paidAmount)), 0);

    const lowStockItems = inventory.filter(i => parseFloat(i.currentStock) <= parseFloat(i.minStockAlert));

    res.json({
      success: true,
      data: {
        today: {
          milkReceived: totalMilkToday.toFixed(1),
          deliveries: todayMilk.length,
          productionBatches: todayProduction.length,
          sales: todaySales.length,
          revenue: totalRevenueToday.toFixed(0),
        },
        weekly: { revenue: totalRevenueWeek.toFixed(0) },
        monthly: { revenue: totalRevenueMonth.toFixed(0) },
        inventory: inventory.map(i => ({
          productType: i.productType,
          productName: i.productNameRu,
          stock: i.currentStock,
          unit: i.unit,
          minAlert: i.minStockAlert,
          isLow: parseFloat(i.currentStock) <= parseFloat(i.minStockAlert),
        })),
        lowStockCount: lowStockItems.length,
        pendingDebt: totalPendingDebt.toFixed(0),
        activeFarmers,
        activeCustomers,
        expiringBatches,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// ANALYTICS ROUTES
// ─────────────────────────────────────────────
const analyticsRouter = require('express').Router();

analyticsRouter.get('/overview', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const from = new Date(Date.now() - days*86400000).toISOString().split('T')[0];

    const milkData = await sequelize.query(`
      SELECT DATE(delivery_date) as date, SUM(liters) as liters, AVG(fat_percent) as fat_avg
      FROM milk_deliveries WHERE delivery_date >= :from
      GROUP BY DATE(delivery_date) ORDER BY date ASC
    `, { replacements: { from }, type: QueryTypes.SELECT });

    const salesData = await sequelize.query(`
      SELECT DATE(sale_date) as date, SUM(total_amount) as revenue, COUNT(*) as count
      FROM sales WHERE sale_date >= :from
      GROUP BY DATE(sale_date) ORDER BY date ASC
    `, { replacements: { from }, type: QueryTypes.SELECT });

    const productionData = await sequelize.query(`
      SELECT product_type, SUM(quantity_produced) as total, COUNT(*) as batches
      FROM production_batches WHERE production_date >= :from AND status != 'rejected'
      GROUP BY product_type
    `, { replacements: { from }, type: QueryTypes.SELECT });

    res.json({ success: true, data: { milkData, salesData, productionData } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

analyticsRouter.get('/ai-forecast', authenticate, async (req, res) => {
  try {
    const axios = require('axios');
    const aiUrl = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
    const response = await axios.get(`${aiUrl}/forecast/all`, { timeout: 15000 });
    res.json({ success: true, data: response.data });
  } catch (err) {
    // Fallback mock forecast if AI service is down
    const today = new Date();
    const forecast = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today.getTime() + i*86400000).toISOString().split('T')[0];
      forecast.push({
        date: d,
        milk_demand: Math.round(1200 + Math.random()*300),
        milk_yogurt: Math.round(150 + Math.random()*50),
        milk_tvorog: Math.round(80 + Math.random()*30),
        milk_smetana: Math.round(120 + Math.random()*40),
        revenue: Math.round(2500000 + Math.random()*500000),
      });
    }
    res.json({ success: true, data: { forecast, source: 'fallback' } });
  }
});

// ─────────────────────────────────────────────
// INVENTORY ROUTES
// ─────────────────────────────────────────────
const inventoryRouter = require('express').Router();

inventoryRouter.get('/', authenticate, async (req, res) => {
  try {
    const items = await Inventory.findAll({ order: [['product_type', 'ASC']] });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

inventoryRouter.put('/:type/adjust', authenticate, require('../middleware/auth').authorize('admin','manager'), async (req, res) => {
  try {
    const { quantity, reason } = req.body;
    const item = await Inventory.findOne({ where: { productType: req.params.type } });
    if (!item) return res.status(404).json({ success: false, error: 'Mahsulot topilmadi' });
    const newStock = Math.max(0, parseFloat(item.currentStock) + parseFloat(quantity));
    await item.update({ currentStock: newStock, updatedAt: new Date() });
    res.json({ success: true, data: item, message: 'Inventar yangilandi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// FARMER ROUTES
// ─────────────────────────────────────────────
const farmerRouter = require('express').Router();
const { Farmer } = require('../models');

farmerRouter.get('/', authenticate, async (req, res) => {
  try {
    const farmers = await Farmer.findAll({ where: { isActive: true }, order: [['name','ASC']] });
    res.json({ success: true, data: farmers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

farmerRouter.post('/', authenticate, require('../middleware/auth').authorize('admin','manager'), async (req, res) => {
  try {
    const { name, phone, location, district, pricePerLiter, bankAccount } = req.body;
    if (!name || !phone || !location) return res.status(400).json({ success: false, error: 'Ism, telefon va manzil majburiy' });

    const code = `FRM-${Date.now().toString().slice(-6)}`;
    const farmer = await Farmer.create({ code, name, phone, location, district, pricePerLiter: pricePerLiter || 3500, bankAccount });
    res.status(201).json({ success: true, data: farmer, message: 'Fermer muvaffaqiyatli qo\'shildi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

farmerRouter.put('/:id', authenticate, require('../middleware/auth').authorize('admin','manager'), async (req, res) => {
  try {
    const farmer = await Farmer.findByPk(req.params.id);
    if (!farmer) return res.status(404).json({ success: false, error: 'Fermer topilmadi' });
    await farmer.update(req.body);
    res.json({ success: true, data: farmer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// CUSTOMER ROUTES
// ─────────────────────────────────────────────
const customerRouter = require('express').Router();

customerRouter.get('/', authenticate, async (req, res) => {
  try {
    const customers = await Customer.findAll({ where: { isActive: true }, order: [['name','ASC']] });
    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

customerRouter.post('/', authenticate, require('../middleware/auth').authorize('admin','manager'), async (req, res) => {
  try {
    const { name, type, phone, email, address, district, creditLimit, discountPercent, contactName } = req.body;
    if (!name || !phone) return res.status(400).json({ success: false, error: 'Ism va telefon majburiy' });
    const code = `CUS-${Date.now().toString().slice(-6)}`;
    const customer = await Customer.create({ code, name, type, phone, email, address, district, creditLimit, discountPercent, contactName });
    res.status(201).json({ success: true, data: customer, message: 'Mijoz muvaffaqiyatli qo\'shildi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

customerRouter.put('/:id', authenticate, require('../middleware/auth').authorize('admin','manager'), async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ success: false, error: 'Mijoz topilmadi' });
    await customer.update(req.body);
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// NOTIFICATION ROUTES
// ─────────────────────────────────────────────
const notifRouter = require('express').Router();

notifRouter.get('/', authenticate, async (req, res) => {
  try {
    const notifs = await Notification.findAll({
      order: [['created_at','DESC']],
      limit: 50,
    });
    res.json({ success: true, data: notifs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

notifRouter.put('/:id/read', authenticate, async (req, res) => {
  try {
    await Notification.update({ isRead: true }, { where: { id: req.params.id } });
    res.json({ success: true, message: 'O\'qildi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

notifRouter.put('/mark-all-read', authenticate, async (req, res) => {
  try {
    await Notification.update({ isRead: true }, { where: { isRead: false } });
    res.json({ success: true, message: 'Barchasi o\'qildi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = {
  dashboardRouter: dashRouter,
  analyticsRouter,
  inventoryRouter,
  farmerRouter,
  customerRouter,
  notifRouter,
};
