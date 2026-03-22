const { Farmer, MilkDelivery } = require('../models');
const { calculatePayment } = require('../services/paymentService');
const { Op, fn, col, literal } = require('sequelize');

exports.getAll = async (req, res) => {
  try {
    const farmers = await Farmer.findAll({ order: [['name', 'ASC']] });
    res.json(farmers);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const farmer = await Farmer.create(req.body);
    res.status(201).json(farmer);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.update = async (req, res) => {
  try {
    const f = await Farmer.findByPk(req.params.id);
    if (!f) return res.status(404).json({ error: 'Топилмади' });
    await f.update(req.body);
    res.json(f);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getDeliveries = async (req, res) => {
  try {
    const where = {};
    if (req.query.date) where.delivery_date = req.query.date;
    if (req.query.farmer_id) where.farmer_id = req.query.farmer_id;
    if (req.query.from && req.query.to) {
      where.delivery_date = { [Op.between]: [req.query.from, req.query.to] };
    }
    const deliveries = await MilkDelivery.findAll({
      where, include: [{ model: Farmer, as: 'farmer' }],
      order: [['delivery_date', 'DESC']]
    });
    res.json(deliveries);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createDelivery = async (req, res) => {
  try {
    const farmer = await Farmer.findByPk(req.body.farmer_id);
    if (!farmer) return res.status(404).json({ error: 'Фермер топилмади' });

    const payment = calculatePayment(
      req.body.liters, req.body.fat_percentage,
      req.body.quality_grade, farmer.price_per_liter
    );

    const delivery = await MilkDelivery.create({
      ...req.body,
      price_per_liter: payment.effective_price,
      bonus_per_liter: payment.fat_bonus,
      total_payment: payment.total_payment,
      received_by: req.user?.id
    });

    await farmer.update({
      total_delivered: parseFloat(farmer.total_delivered) + parseFloat(req.body.liters)
    });

    const result = await MilkDelivery.findByPk(delivery.id, {
      include: [{ model: Farmer, as: 'farmer' }]
    });
    res.status(201).json({ ...result.toJSON(), payment_details: payment });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getDailyReport = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const deliveries = await MilkDelivery.findAll({
      where: { delivery_date: date },
      include: [{ model: Farmer, as: 'farmer' }]
    });

    const summary = {
      date, total_deliveries: deliveries.length,
      total_liters: deliveries.reduce((s, d) => s + parseFloat(d.liters), 0),
      total_payment: deliveries.reduce((s, d) => s + parseFloat(d.total_payment), 0),
      avg_fat: deliveries.length ? deliveries.reduce((s, d) => s + parseFloat(d.fat_percentage), 0) / deliveries.length : 0,
      by_quality: {
        premium: deliveries.filter(d => d.quality_grade === 'premium').length,
        first: deliveries.filter(d => d.quality_grade === 'first').length,
        second: deliveries.filter(d => d.quality_grade === 'second').length,
        rejected: deliveries.filter(d => d.quality_grade === 'rejected').length
      },
      deliveries
    };
    res.json(summary);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
