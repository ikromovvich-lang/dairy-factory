/**
 * Milk Routes — Сут қабул | Приём молока
 */
const router = require('express').Router();
const { Op, fn, col, literal } = require('sequelize');
const { body, validationResult, query } = require('express-validator');
const { MilkDelivery, Farmer, User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

// Quality grade → bonus multiplier
const QUALITY_BONUS = { Premium: 1.15, A: 1.08, B: 1.0, C: 0.92, Reject: 0 };

const genDeliveryNumber = () => {
  const now = new Date();
  return `SUT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Date.now().toString().slice(-5)}`;
};

// GET /api/v1/milk — all deliveries
router.get('/', authenticate, async (req, res) => {
  try {
    const { date, farmerId, grade, page = 1, limit = 20 } = req.query;
    const where = {};
    if (date) where.deliveryDate = date;
    if (farmerId) where.farmerId = farmerId;
    if (grade) where.qualityGrade = grade;

    const offset = (page - 1) * limit;
    const { count, rows } = await MilkDelivery.findAndCountAll({
      where,
      include: [{ model: Farmer, as: 'farmer', attributes: ['name','phone','location','code'] }],
      order: [['delivery_date','DESC'],['created_at','DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count/limit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/milk — record new delivery
router.post('/', authenticate, authorize('admin','manager','worker'), [
  body('farmerId').isUUID(),
  body('liters').isFloat({ min: 1, max: 20000 }),
  body('fatPercent').isFloat({ min: 2.5, max: 8.0 }),
  body('qualityGrade').isIn(['Premium','A','B','C','Reject']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { farmerId, liters, fatPercent, proteinPercent, acidity, temperature, qualityGrade, notes, tankNumber } = req.body;

    const farmer = await Farmer.findByPk(farmerId);
    if (!farmer || !farmer.isActive) return res.status(404).json({ success: false, error: 'Fermer topilmadi' });

    const pricePerLiter = parseFloat(farmer.pricePerLiter);
    const multiplier = QUALITY_BONUS[qualityGrade] || 1.0;
    const qualityBonus = liters * pricePerLiter * (multiplier - 1);
    const totalPayment = liters * pricePerLiter * multiplier;

    const delivery = await MilkDelivery.create({
      deliveryNumber: genDeliveryNumber(),
      farmerId,
      liters,
      fatPercent,
      proteinPercent: proteinPercent || 3.2,
      acidity,
      temperature,
      qualityGrade,
      pricePerLiter,
      qualityBonus: qualityBonus.toFixed(2),
      totalPayment: totalPayment.toFixed(2),
      notes,
      tankNumber,
      receivedBy: req.user.id,
      deliveryDate: new Date().toISOString().split('T')[0],
      deliveryTime: new Date().toTimeString().split(' ')[0],
    });

    // Update farmer totals
    await farmer.increment({
      totalDelivered: parseFloat(liters),
    });

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('milk:received', {
        farmer: farmer.name,
        liters,
        qualityGrade,
        totalPayment,
        timestamp: new Date(),
      });
    }

    const full = await MilkDelivery.findByPk(delivery.id, {
      include: [{ model: Farmer, as: 'farmer' }]
    });

    res.status(201).json({ success: true, data: full, message: 'Sut muvaffaqiyatli qabul qilindi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/milk/daily-report — daily intake report
router.get('/daily-report', authenticate, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const deliveries = await MilkDelivery.findAll({
      where: { deliveryDate: date },
      include: [{ model: Farmer, as: 'farmer' }],
      order: [['delivery_time','ASC']],
    });

    const summary = {
      date,
      totalDeliveries: deliveries.length,
      totalLiters: deliveries.reduce((s, d) => s + parseFloat(d.liters), 0),
      avgFatPercent: deliveries.length
        ? (deliveries.reduce((s,d) => s + parseFloat(d.fatPercent), 0) / deliveries.length).toFixed(2)
        : 0,
      totalPayment: deliveries.reduce((s, d) => s + parseFloat(d.totalPayment || 0), 0),
      byGrade: {
        Premium: deliveries.filter(d => d.qualityGrade === 'Premium').length,
        A: deliveries.filter(d => d.qualityGrade === 'A').length,
        B: deliveries.filter(d => d.qualityGrade === 'B').length,
        C: deliveries.filter(d => d.qualityGrade === 'C').length,
        Reject: deliveries.filter(d => d.qualityGrade === 'Reject').length,
      },
      deliveries: deliveries.map(d => ({
        id: d.id,
        deliveryNumber: d.deliveryNumber,
        farmer: d.farmer?.name,
        liters: d.liters,
        fatPercent: d.fatPercent,
        qualityGrade: d.qualityGrade,
        totalPayment: d.totalPayment,
        time: d.deliveryTime,
      }))
    };

    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/milk/stats — weekly/monthly stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const from = new Date();
    from.setDate(from.getDate() - days);

    const stats = await MilkDelivery.findAll({
      where: { deliveryDate: { [Op.gte]: from.toISOString().split('T')[0] } },
      attributes: [
        [fn('DATE', col('delivery_date')), 'date'],
        [fn('SUM', col('liters')), 'totalLiters'],
        [fn('AVG', col('fat_percent')), 'avgFat'],
        [fn('COUNT', col('id')), 'deliveryCount'],
        [fn('SUM', col('total_payment')), 'totalPayment'],
      ],
      group: [literal('DATE(delivery_date)')],
      order: [[literal('DATE(delivery_date)'), 'ASC']],
      raw: true,
    });

    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/milk/:id/pay — mark as paid
router.put('/:id/pay', authenticate, authorize('admin','manager'), async (req, res) => {
  try {
    const delivery = await MilkDelivery.findByPk(req.params.id);
    if (!delivery) return res.status(404).json({ success: false, error: 'Yozuv topilmadi' });

    await delivery.update({ isPaid: true, paymentDate: new Date().toISOString().split('T')[0] });

    // Update farmer total paid
    const farmer = await Farmer.findByPk(delivery.farmerId);
    if (farmer) await farmer.increment({ totalPaid: parseFloat(delivery.totalPayment) });

    res.json({ success: true, message: 'To\'lov amalga oshirildi' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
