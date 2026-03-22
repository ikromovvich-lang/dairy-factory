const { MilkDelivery, Sale, SaleItem, Product, Inventory, ProductionBatch } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const axios = require('axios');

exports.getDashboard = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7*24*3600*1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30*24*3600*1000).toISOString().split('T')[0];

    const [todayMilk, weekMilk, todaySales, inventory, expiringCount, batches] = await Promise.all([
      MilkDelivery.findAll({ where: { delivery_date: today } }),
      MilkDelivery.findAll({ where: { delivery_date: { [Op.between]: [weekAgo, today] } } }),
      Sale.findAll({ where: { sale_date: today } }),
      Inventory.findAll({ include: [{ model: Product, as: 'product' }] }),
      ProductionBatch.count({
        where: {
          expiration_date: { [Op.lte]: new Date(Date.now() + 3*24*3600*1000) },
          status: { [Op.in]: ['completed', 'stored'] }
        }
      }),
      ProductionBatch.findAll({ where: { production_date: { [Op.between]: [weekAgo, today] } } })
    ]);

    res.json({
      today_milk_liters: todayMilk.reduce((s,d) => s + parseFloat(d.liters), 0),
      week_milk_liters: weekMilk.reduce((s,d) => s + parseFloat(d.liters), 0),
      today_revenue: todaySales.reduce((s,s2) => s + parseFloat(s2.total_amount), 0),
      today_sales_count: todaySales.length,
      expiring_batches: expiringCount,
      low_stock_count: inventory.filter(i => parseFloat(i.quantity_available) < parseFloat(i.minimum_stock)).length,
      inventory_summary: inventory.map(i => ({
        product: i.product?.name,
        type: i.product?.type,
        available: i.quantity_available,
        unit: i.product?.unit,
        is_low: parseFloat(i.quantity_available) < parseFloat(i.minimum_stock)
      })),
      week_production: batches.length,
      avg_milk_fat: weekMilk.length ? (weekMilk.reduce((s,d) => s + parseFloat(d.fat_percentage), 0) / weekMilk.length).toFixed(2) : 0
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getMilkTrend = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const from = new Date(Date.now() - days*24*3600*1000).toISOString().split('T')[0];
    
    const deliveries = await MilkDelivery.findAll({
      where: { delivery_date: { [Op.gte]: from } },
      attributes: ['delivery_date', 'liters', 'fat_percentage', 'quality_grade'],
      order: [['delivery_date', 'ASC']]
    });

    const grouped = {};
    for (const d of deliveries) {
      const date = d.delivery_date;
      if (!grouped[date]) grouped[date] = { date, total_liters: 0, avg_fat: [], count: 0 };
      grouped[date].total_liters += parseFloat(d.liters);
      grouped[date].avg_fat.push(parseFloat(d.fat_percentage));
      grouped[date].count++;
    }

    const result = Object.values(grouped).map(d => ({
      date: d.date,
      total_liters: d.total_liters,
      avg_fat: d.avg_fat.length ? (d.avg_fat.reduce((a,b)=>a+b,0)/d.avg_fat.length).toFixed(2) : 0,
      deliveries: d.count
    }));

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getSalesTrend = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const from = new Date(Date.now() - days*24*3600*1000).toISOString().split('T')[0];

    const sales = await Sale.findAll({
      where: { sale_date: { [Op.gte]: from } },
      include: [{ model: SaleItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
      order: [['sale_date', 'ASC']]
    });

    const grouped = {};
    for (const s of sales) {
      const date = s.sale_date;
      if (!grouped[date]) grouped[date] = { date, revenue: 0, count: 0, by_product: {} };
      grouped[date].revenue += parseFloat(s.total_amount);
      grouped[date].count++;
      for (const item of (s.items || [])) {
        const pname = item.product?.name || 'Unknown';
        if (!grouped[date].by_product[pname]) grouped[date].by_product[pname] = 0;
        grouped[date].by_product[pname] += parseFloat(item.quantity);
      }
    }

    res.json(Object.values(grouped));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getAIForecast = async (req, res) => {
  try {
    const AI_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8001';
    
    const days = 30;
    const from = new Date(Date.now() - days*24*3600*1000).toISOString().split('T')[0];
    
    const [milkData, salesData] = await Promise.all([
      MilkDelivery.findAll({
        where: { delivery_date: { [Op.gte]: from } },
        attributes: ['delivery_date', 'liters'],
        order: [['delivery_date', 'ASC']]
      }),
      Sale.findAll({
        where: { sale_date: { [Op.gte]: from } },
        attributes: ['sale_date', 'total_amount'],
        order: [['sale_date', 'ASC']]
      })
    ]);

    const response = await axios.post(`${AI_URL}/forecast`, {
      milk_data: milkData.map(d => ({ ds: d.delivery_date, y: parseFloat(d.liters) })),
      sales_data: salesData.map(d => ({ ds: d.sale_date, y: parseFloat(d.total_amount) })),
      forecast_days: 7
    }, { timeout: 30000 });

    res.json(response.data);
  } catch (err) {
    // Return mock forecast if AI service unavailable
    const forecast = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(Date.now() + i*24*3600*1000);
      forecast.push({
        date: d.toISOString().split('T')[0],
        milk_forecast: 800 + Math.random() * 200,
        sales_forecast: 2500000 + Math.random() * 500000,
        confidence: 85
      });
    }
    res.json({ forecast, source: 'fallback', message: 'AI хизмати вақтинча мавжуд эмас' });
  }
};

exports.getProductionEfficiency = async (req, res) => {
  try {
    const batches = await ProductionBatch.findAll({
      include: [{ model: Product, as: 'product' }],
      where: { status: { [Op.ne]: 'discarded' } },
      order: [['production_date', 'DESC']],
      limit: 100
    });

    const byProduct = {};
    for (const b of batches) {
      const type = b.product?.type || 'unknown';
      if (!byProduct[type]) byProduct[type] = { name: b.product?.name, batches: 0, total_milk: 0, total_produced: 0 };
      byProduct[type].batches++;
      byProduct[type].total_milk += parseFloat(b.milk_used_liters);
      byProduct[type].total_produced += parseFloat(b.quantity_produced);
    }

    const efficiency = Object.entries(byProduct).map(([type, data]) => ({
      type, name: data.name, batches: data.batches,
      avg_efficiency: data.total_milk > 0 ? ((data.total_produced / data.total_milk) * 100).toFixed(1) : 0,
      total_milk_used: data.total_milk,
      total_produced: data.total_produced
    }));

    res.json(efficiency);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
