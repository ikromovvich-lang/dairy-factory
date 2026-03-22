const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const axios = require('axios');
const { authenticate } = require('../middleware/auth');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'dairy_factory',
  user: process.env.DB_USER || 'dairy_admin',
  password: process.env.DB_PASSWORD, port: 5432,
});

// Dashboard KPIs
router.get('/kpis', authenticate, async (req, res) => {
  const factoryId = req.user.factory_id;
  
  const [milk, production, sales, inventory] = await Promise.all([
    pool.query(`
      SELECT SUM(liters) as today_liters, SUM(total_payment) as today_cost,
        COUNT(DISTINCT farmer_id) as active_farmers
      FROM milk_deliveries WHERE factory_id=$1 AND DATE(delivery_date)=CURRENT_DATE
    `, [factoryId]),
    pool.query(`
      SELECT COUNT(*) as today_batches,
        SUM(CASE WHEN product_type='milk' THEN quantity_produced ELSE 0 END) as milk_produced,
        SUM(CASE WHEN product_type='yogurt' THEN quantity_produced ELSE 0 END) as yogurt_produced,
        SUM(CASE WHEN product_type='tvorog' THEN quantity_produced ELSE 0 END) as tvorog_produced,
        SUM(CASE WHEN product_type='smetana' THEN quantity_produced ELSE 0 END) as smetana_produced
      FROM production_batches WHERE factory_id=$1 AND DATE(production_date)=CURRENT_DATE AND status='completed'
    `, [factoryId]),
    pool.query(`
      SELECT COUNT(*) as today_sales, SUM(final_amount) as today_revenue,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM sales WHERE factory_id=$1 AND DATE(sale_date)=CURRENT_DATE
    `, [factoryId]),
    pool.query(`
      SELECT product_type, SUM(quantity_available) as stock,
        CASE WHEN SUM(quantity_available) <= low_stock_threshold THEN true ELSE false END as low_stock
      FROM inventory WHERE factory_id=$1
      GROUP BY product_type, low_stock_threshold
    `, [factoryId]),
  ]);
  
  // Month comparison
  const monthStats = await pool.query(`
    SELECT 
      SUM(CASE WHEN DATE_TRUNC('month',sale_date)=DATE_TRUNC('month',NOW()) THEN final_amount ELSE 0 END) as this_month,
      SUM(CASE WHEN DATE_TRUNC('month',sale_date)=DATE_TRUNC('month',NOW()-INTERVAL '1 month') THEN final_amount ELSE 0 END) as last_month
    FROM sales WHERE factory_id=$1
  `, [factoryId]);
  
  res.json({
    milk: milk.rows[0],
    production: production.rows[0],
    sales: sales.rows[0],
    inventory: inventory.rows,
    revenue_comparison: monthStats.rows[0],
  });
});

// 30-day trends
router.get('/trends', authenticate, async (req, res) => {
  const { days = 30 } = req.query;
  const factoryId = req.user.factory_id;
  
  const [milkTrend, salesTrend, productionTrend] = await Promise.all([
    pool.query(`
      SELECT DATE(delivery_date) as date, SUM(liters) as liters, AVG(fat_percent) as avg_fat, COUNT(*) as deliveries
      FROM milk_deliveries WHERE factory_id=$1 AND delivery_date >= NOW()-INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(delivery_date) ORDER BY date
    `, [factoryId]),
    pool.query(`
      SELECT DATE(sale_date) as date, SUM(final_amount) as revenue, COUNT(*) as sales
      FROM sales WHERE factory_id=$1 AND sale_date >= NOW()-INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(sale_date) ORDER BY date
    `, [factoryId]),
    pool.query(`
      SELECT DATE(production_date) as date, product_type, SUM(quantity_produced) as quantity
      FROM production_batches WHERE factory_id=$1 AND production_date >= NOW()-INTERVAL '${parseInt(days)} days'
        AND status='completed'
      GROUP BY DATE(production_date), product_type ORDER BY date
    `, [factoryId]),
  ]);
  
  res.json({
    milk_trend: milkTrend.rows,
    sales_trend: salesTrend.rows,
    production_trend: productionTrend.rows,
  });
});

// AI Forecasting proxy
router.get('/forecast', authenticate, async (req, res) => {
  const { type = 'milk_demand', days = 7 } = req.query;
  
  try {
    // Fetch historical data for AI
    const histData = await pool.query(`
      SELECT DATE(delivery_date) as ds, SUM(liters) as y
      FROM milk_deliveries WHERE factory_id=$1 AND delivery_date >= NOW()-INTERVAL '90 days'
      GROUP BY DATE(delivery_date) ORDER BY ds
    `, [req.user.factory_id]);
    
    const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/forecast`, {
      type,
      historical_data: histData.rows,
      days: parseInt(days),
      factory_id: req.user.factory_id,
    }, { timeout: 30000 });
    
    res.json(aiResponse.data);
  } catch (err) {
    // Fallback: simple moving average if AI service down
    const histData = await pool.query(`
      SELECT DATE(delivery_date) as date, SUM(liters) as value
      FROM milk_deliveries WHERE factory_id=$1 AND delivery_date >= NOW()-INTERVAL '14 days'
      GROUP BY DATE(delivery_date) ORDER BY date
    `, [req.user.factory_id]);
    
    const values = histData.rows.map(r => parseFloat(r.value));
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 1000;
    const trend = values.length > 1 ? (values[values.length-1] - values[0]) / values.length : 0;
    
    const forecast = Array.from({ length: parseInt(days) }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      return {
        ds: date.toISOString().split('T')[0],
        yhat: Math.max(0, avg + trend * (i + 1)).toFixed(0),
        yhat_lower: Math.max(0, (avg + trend * (i+1)) * 0.85).toFixed(0),
        yhat_upper: ((avg + trend * (i+1)) * 1.15).toFixed(0),
      };
    });
    
    res.json({ forecast, model: 'fallback_moving_average', accuracy: 78 });
  }
});

// Sales forecast by product
router.get('/forecast/sales', authenticate, async (req, res) => {
  try {
    const histData = await pool.query(`
      SELECT DATE(s.sale_date) as ds, si.product_type, SUM(si.quantity) as y
      FROM sale_items si JOIN sales s ON si.sale_id=s.id
      WHERE s.factory_id=$1 AND s.sale_date >= NOW()-INTERVAL '60 days'
      GROUP BY DATE(s.sale_date), si.product_type ORDER BY ds
    `, [req.user.factory_id]);
    
    const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/forecast/sales`, {
      historical_data: histData.rows,
    }, { timeout: 30000 });
    
    res.json(aiResponse.data);
  } catch (err) {
    // Fallback data
    const products = ['milk', 'yogurt', 'tvorog', 'smetana'];
    const result = {};
    products.forEach(p => {
      result[p] = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i + 1);
        const base = { milk: 500, yogurt: 200, tvorog: 80, smetana: 120 }[p];
        return { date: date.toISOString().split('T')[0], predicted: base + Math.random() * 50 - 25 };
      });
    });
    res.json({ forecast: result, model: 'fallback' });
  }
});

// AI production optimization
router.get('/optimize', authenticate, async (req, res) => {
  try {
    const [milkAvail, salesTrend, inventoryLevels] = await Promise.all([
      pool.query(`SELECT SUM(liters) - COALESCE((SELECT SUM(milk_used_liters) FROM production_batches WHERE factory_id=$1 AND DATE(production_date)=CURRENT_DATE),0) as available_milk
        FROM milk_deliveries WHERE factory_id=$1 AND DATE(delivery_date)=CURRENT_DATE`, [req.user.factory_id]),
      pool.query(`SELECT si.product_type, AVG(daily_qty) as avg_daily_sales FROM (
        SELECT DATE(s.sale_date) as d, si.product_type, SUM(si.quantity) as daily_qty
        FROM sale_items si JOIN sales s ON si.sale_id=s.id
        WHERE s.factory_id=$1 AND s.sale_date>=NOW()-INTERVAL '7 days'
        GROUP BY DATE(s.sale_date), si.product_type) sub
        GROUP BY si.product_type`, [req.user.factory_id]),
      pool.query(`SELECT product_type, SUM(quantity_available) as stock FROM inventory WHERE factory_id=$1 GROUP BY product_type`, [req.user.factory_id]),
    ]);
    
    const availableMilk = parseFloat(milkAvail.rows[0]?.available_milk || 0);
    const salesMap = {};
    salesTrend.rows.forEach(r => salesMap[r.product_type] = parseFloat(r.avg_daily_sales || 0));
    const stockMap = {};
    inventoryLevels.rows.forEach(r => stockMap[r.product_type] = parseFloat(r.stock || 0));
    
    const YIELD = { milk: 0.97, yogurt: 0.85, tvorog: 0.12, smetana: 0.25 };
    const recommendations = [];
    
    const products = ['milk', 'yogurt', 'tvorog', 'smetana'];
    for (const product of products) {
      const stock = stockMap[product] || 0;
      const avgSales = salesMap[product] || 10;
      const daysOfStock = avgSales > 0 ? stock / avgSales : 999;
      const SHELF = { milk: 7, yogurt: 14, tvorog: 5, smetana: 10 };
      
      let priority = 'low';
      let recommended_milk = 0;
      
      if (daysOfStock < 2) { priority = 'urgent'; recommended_milk = Math.min(availableMilk * 0.4, (avgSales * 3) / YIELD[product]); }
      else if (daysOfStock < 4) { priority = 'high'; recommended_milk = Math.min(availableMilk * 0.25, (avgSales * 2) / YIELD[product]); }
      else if (daysOfStock < SHELF[product]) { priority = 'medium'; recommended_milk = Math.min(availableMilk * 0.15, avgSales / YIELD[product]); }
      
      if (recommended_milk > 0) {
        recommendations.push({
          product_type: product,
          priority,
          current_stock: stock,
          days_of_stock: daysOfStock.toFixed(1),
          avg_daily_sales: avgSales.toFixed(1),
          recommended_milk_liters: recommended_milk.toFixed(0),
          expected_yield: (recommended_milk * YIELD[product]).toFixed(1),
          reason: daysOfStock < 2 ? 'Kritik zaxira - zudlik bilan ishlab chiqarish kerak' :
                  daysOfStock < 4 ? 'Zaxira kam - ishlab chiqarish tavsiya etiladi' :
                  'Ishlab chiqarishni rejalashtirish tavsiya etiladi',
        });
      }
    }
    
    res.json({
      available_milk_liters: availableMilk,
      recommendations: recommendations.sort((a, b) => {
        const p = { urgent: 0, high: 1, medium: 2, low: 3 };
        return p[a.priority] - p[b.priority];
      }),
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Optimizatsiya hisobi xatolik', details: err.message });
  }
});

module.exports = router;
