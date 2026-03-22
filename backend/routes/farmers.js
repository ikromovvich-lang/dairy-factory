const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, authorize } = require('../middleware/auth');

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
  const { search, is_active } = req.query;
  let query = `SELECT f.*, 
    COALESCE(d.deliveries_this_month, 0) as deliveries_this_month,
    COALESCE(d.liters_this_month, 0) as liters_this_month,
    COALESCE(d.payment_this_month, 0) as payment_this_month
    FROM farmers f
    LEFT JOIN (
      SELECT farmer_id, COUNT(*) as deliveries_this_month,
        SUM(liters) as liters_this_month, SUM(total_payment) as payment_this_month
      FROM milk_deliveries
      WHERE DATE_TRUNC('month', delivery_date) = DATE_TRUNC('month', NOW())
      GROUP BY farmer_id
    ) d ON f.id = d.farmer_id
    WHERE f.factory_id = $1`;
  const params = [req.user.factory_id];

  if (search) {
    query += ` AND (f.name ILIKE $${params.length + 1} OR f.phone ILIKE $${params.length + 1})`;
    params.push(`%${search}%`);
  }
  if (is_active !== undefined) {
    query += ` AND f.is_active = $${params.length + 1}`;
    params.push(is_active === 'true');
  }
  query += ' ORDER BY f.name';

  const result = await pool.query(query, params);
  res.json(result.rows);
});

router.get('/:id/stats', authenticate, async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(`
    SELECT f.*,
      COUNT(md.id) as total_deliveries,
      SUM(md.liters) as total_liters,
      SUM(md.total_payment) as total_payment,
      SUM(CASE WHEN NOT md.is_paid THEN md.total_payment ELSE 0 END) as outstanding_payment,
      AVG(md.fat_percent) as avg_fat,
      MAX(md.delivery_date) as last_delivery
    FROM farmers f
    LEFT JOIN milk_deliveries md ON f.id = md.farmer_id
    WHERE f.id = $1 AND f.factory_id = $2
    GROUP BY f.id
  `, [id, req.user.factory_id]);

  if (!result.rows[0]) return res.status(404).json({ error: 'Fermer topilmadi' });

  const deliveries = await pool.query(
    'SELECT * FROM milk_deliveries WHERE farmer_id = $1 ORDER BY delivery_date DESC LIMIT 30',
    [id]
  );

  res.json({ ...result.rows[0], recent_deliveries: deliveries.rows });
});

router.post('/', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const { name, phone, location, region, bank_account, price_per_liter, notes } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Ism va telefon raqam majburiy' });

  const result = await pool.query(
    `INSERT INTO farmers (factory_id, name, phone, location, region, bank_account, price_per_liter, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.user.factory_id, name, phone, location, region, bank_account, price_per_liter || 3500, notes]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const { name, phone, location, region, bank_account, price_per_liter, is_active, notes } = req.body;
  const result = await pool.query(
    `UPDATE farmers SET name=$1, phone=$2, location=$3, region=$4, bank_account=$5,
     price_per_liter=$6, is_active=$7, notes=$8, updated_at=NOW()
     WHERE id=$9 AND factory_id=$10 RETURNING *`,
    [name, phone, location, region, bank_account, price_per_liter, is_active, notes, req.params.id, req.user.factory_id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Fermer topilmadi' });
  res.json(result.rows[0]);
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  await pool.query(
    'UPDATE farmers SET is_active=false WHERE id=$1 AND factory_id=$2',
    [req.params.id, req.user.factory_id]
  );
  res.json({ message: 'Fermer o\'chirildi' });
});

module.exports = router;
