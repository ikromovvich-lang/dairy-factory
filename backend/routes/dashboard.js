const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate } = require('../middleware/auth');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'dairy_factory',
  user: process.env.DB_USER || 'dairy_admin',
  password: process.env.DB_PASSWORD, port: 5432,
});

router.get('/summary', authenticate, async (req, res) => {
  const fId = req.user.factory_id;
  const [todayMilk, todaySales, alerts, recentBatches] = await Promise.all([
    pool.query(`SELECT COALESCE(SUM(liters),0) as liters, COUNT(*) as count FROM milk_deliveries WHERE factory_id=$1 AND DATE(delivery_date)=CURRENT_DATE`, [fId]),
    pool.query(`SELECT COALESCE(SUM(final_amount),0) as revenue, COUNT(*) as count FROM sales WHERE factory_id=$1 AND DATE(sale_date)=CURRENT_DATE`, [fId]),
    pool.query(`SELECT COUNT(*) as count FROM notifications WHERE factory_id=$1 AND is_read=false`, [fId]),
    pool.query(`SELECT batch_number, product_type, quantity_produced, unit, production_date, expiration_date, status FROM production_batches WHERE factory_id=$1 ORDER BY created_at DESC LIMIT 5`, [fId]),
  ]);
  
  res.json({
    today_milk_liters: parseFloat(todayMilk.rows[0].liters),
    today_milk_count: parseInt(todayMilk.rows[0].count),
    today_revenue: parseFloat(todaySales.rows[0].revenue),
    today_sales_count: parseInt(todaySales.rows[0].count),
    unread_notifications: parseInt(alerts.rows[0].count),
    recent_batches: recentBatches.rows,
  });
});

module.exports = router;
