const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, authorize } = require('../middleware/auth');
const { emitAlert } = require('../utils/socket');

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { require: true, rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'dairy_factory',
      user: process.env.DB_USER || 'dairy_admin',
      password: process.env.DB_PASSWORD,
      port: 5432,
    });

router.get('/', authenticate, async (req, res) => {
  const result = await pool.query(`
    SELECT 
      i.product_type,
      SUM(i.quantity_available) as total_available,
      SUM(i.quantity_reserved) as total_reserved,
      MIN(pb.expiration_date) as earliest_expiry,
      MAX(pb.expiration_date) as latest_expiry,
      i.low_stock_threshold,
      ps.price_per_unit,
      ps.unit as price_unit,
      COUNT(i.batch_id) as batch_count,
      CASE WHEN SUM(i.quantity_available) <= i.low_stock_threshold THEN true ELSE false END as is_low_stock
    FROM inventory i
    LEFT JOIN production_batches pb ON i.batch_id = pb.id
    LEFT JOIN price_settings ps ON i.factory_id = ps.factory_id AND i.product_type = ps.product_type
    WHERE i.factory_id = $1
    GROUP BY i.product_type, i.low_stock_threshold, ps.price_per_unit, ps.unit
    ORDER BY i.product_type
  `, [req.user.factory_id]);
  res.json(result.rows);
});

router.get('/batches', authenticate, async (req, res) => {
  const { product_type } = req.query;
  let query = `
    SELECT i.*, pb.batch_number, pb.production_date, pb.expiration_date, pb.fat_content,
      ps.price_per_unit,
      CASE WHEN pb.expiration_date < NOW() + INTERVAL '3 days' THEN true ELSE false END as expiring_soon,
      CASE WHEN pb.expiration_date < NOW() THEN true ELSE false END as expired
    FROM inventory i
    JOIN production_batches pb ON i.batch_id = pb.id
    LEFT JOIN price_settings ps ON i.factory_id = ps.factory_id AND i.product_type = ps.product_type
    WHERE i.factory_id = $1 AND i.quantity_available > 0`;
  const params = [req.user.factory_id];

  if (product_type) {
    query += ` AND i.product_type = $${params.length + 1}`;
    params.push(product_type);
  }
  query += ' ORDER BY pb.expiration_date ASC';

  const result = await pool.query(query, params);
  res.json(result.rows);
});

router.patch('/:product_type/threshold', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const { threshold } = req.body;
  await pool.query(
    'UPDATE inventory SET low_stock_threshold=$1 WHERE factory_id=$2 AND product_type=$3',
    [threshold, req.user.factory_id, req.params.product_type]
  );
  res.json({ message: 'Chegara yangilandi' });
});

router.get('/movements', authenticate, async (req, res) => {
  const result = await pool.query(`
    SELECT 'production' as type, pb.production_date as date, pb.product_type,
      pb.quantity_produced as quantity, pb.unit, pb.batch_number
    FROM production_batches pb WHERE pb.factory_id = $1
    UNION ALL
    SELECT 'sale' as type, s.sale_date as date, si.product_type,
      -si.quantity as quantity, si.unit, s.invoice_number
    FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.factory_id = $1
    ORDER BY date DESC LIMIT 100
  `, [req.user.factory_id]);
  res.json(result.rows);
});

router.get('/alerts/low-stock', authenticate, async (req, res) => {
  const result = await pool.query(`
    SELECT product_type, SUM(quantity_available) as total, low_stock_threshold
    FROM inventory WHERE factory_id=$1
    GROUP BY product_type, low_stock_threshold
    HAVING SUM(quantity_available) <= low_stock_threshold
  `, [req.user.factory_id]);

  for (const item of result.rows) {
    emitAlert(req.user.factory_id, {
      type: 'low_stock', severity: 'warning',
      title: '📦 Kam zaxira!',
      message: `${item.product_type}: ${item.total} qoldi (min: ${item.low_stock_threshold})`,
    });
  }

  res.json(result.rows);
});

module.exports = router;
