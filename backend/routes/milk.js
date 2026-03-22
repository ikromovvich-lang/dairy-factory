const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, authorize } = require('../middleware/auth');
const { emitAlert } = require('../utils/socket');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'dairy_factory',
  user: process.env.DB_USER || 'dairy_admin',
  password: process.env.DB_PASSWORD, port: 5432,
});

// Quality bonus multiplier
function getQualityMultiplier(grade) {
  const multipliers = { premium: 1.15, first: 1.0, second: 0.85, rejected: 0 };
  return multipliers[grade] || 1.0;
}

// Record milk delivery
router.post('/', authenticate, async (req, res) => {
  const { farmer_id, liters, fat_percent, protein_percent, temperature, quality_grade, notes } = req.body;
  
  if (!farmer_id || !liters || !fat_percent) {
    return res.status(400).json({ error: 'Fermer, litr va yog\' foizi majburiy' });
  }
  
  // Get farmer's price
  const farmerResult = await pool.query('SELECT * FROM farmers WHERE id = $1 AND factory_id = $2', [farmer_id, req.user.factory_id]);
  if (!farmerResult.rows[0]) return res.status(404).json({ error: 'Fermer topilmadi' });
  const farmer = farmerResult.rows[0];
  
  const multiplier = getQualityMultiplier(quality_grade || 'first');
  const pricePerLiter = farmer.price_per_liter * multiplier;
  const totalPayment = liters * pricePerLiter;
  
  const result = await pool.query(
    `INSERT INTO milk_deliveries 
     (factory_id, farmer_id, liters, fat_percent, protein_percent, temperature, quality_grade, price_per_liter, total_payment, notes, recorded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [req.user.factory_id, farmer_id, liters, fat_percent, protein_percent, temperature,
     quality_grade || 'first', pricePerLiter, totalPayment, notes, req.user.id]
  );
  
  // Update farmer stats
  await pool.query(
    'UPDATE farmers SET total_deliveries = total_deliveries+1, total_liters = total_liters+$1, updated_at=NOW() WHERE id=$2',
    [liters, farmer_id]
  );
  
  // Alert if low quality
  if (quality_grade === 'rejected') {
    emitAlert(req.user.factory_id, {
      type: 'quality_alert', severity: 'error',
      title: '⚠️ Sut rad etildi!',
      message: `${farmer.name}dan kelgan ${liters}L sut sifatsiz deb topildi`,
    });
  }
  
  // Create notification in DB
  if (quality_grade === 'rejected' || parseFloat(fat_percent) < 3.0) {
    await pool.query(
      `INSERT INTO notifications (factory_id, type, title, message, severity, metadata)
       VALUES ($1,'milk_quality','Sut sifati ogohlantirishi',$2,'warning',$3)`,
      [req.user.factory_id, `${farmer.name}: ${liters}L sut, ${fat_percent}% yog'`, JSON.stringify({ farmer_id, liters, quality_grade })]
    );
  }
  
  res.status(201).json({ ...result.rows[0], farmer, total_payment: totalPayment });
});

// Get deliveries
router.get('/', authenticate, async (req, res) => {
  const { date, farmer_id, quality_grade, limit = 50, offset = 0 } = req.query;
  let query = `SELECT md.*, f.name as farmer_name, f.phone as farmer_phone, f.location as farmer_location,
    u.name as recorded_by_name
    FROM milk_deliveries md
    JOIN farmers f ON md.farmer_id = f.id
    LEFT JOIN users u ON md.recorded_by = u.id
    WHERE md.factory_id = $1`;
  const params = [req.user.factory_id];
  
  if (date) { query += ` AND DATE(md.delivery_date) = $${params.length+1}`; params.push(date); }
  if (farmer_id) { query += ` AND md.farmer_id = $${params.length+1}`; params.push(farmer_id); }
  if (quality_grade) { query += ` AND md.quality_grade = $${params.length+1}`; params.push(quality_grade); }
  
  query += ` ORDER BY md.delivery_date DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
  params.push(parseInt(limit), parseInt(offset));
  
  const result = await pool.query(query, params);
  const countResult = await pool.query('SELECT COUNT(*) FROM milk_deliveries WHERE factory_id = $1', [req.user.factory_id]);
  
  res.json({ deliveries: result.rows, total: parseInt(countResult.rows[0].count) });
});

// Daily report
router.get('/report/daily', authenticate, async (req, res) => {
  const { date } = req.query;
  const reportDate = date || new Date().toISOString().split('T')[0];
  
  const summary = await pool.query(`
    SELECT 
      COUNT(*) as delivery_count,
      SUM(liters) as total_liters,
      AVG(fat_percent) as avg_fat,
      AVG(protein_percent) as avg_protein,
      SUM(total_payment) as total_payment,
      SUM(CASE WHEN quality_grade = 'premium' THEN liters ELSE 0 END) as premium_liters,
      SUM(CASE WHEN quality_grade = 'first' THEN liters ELSE 0 END) as first_liters,
      SUM(CASE WHEN quality_grade = 'second' THEN liters ELSE 0 END) as second_liters,
      SUM(CASE WHEN quality_grade = 'rejected' THEN liters ELSE 0 END) as rejected_liters
    FROM milk_deliveries
    WHERE factory_id = $1 AND DATE(delivery_date) = $2
  `, [req.user.factory_id, reportDate]);
  
  const byFarmer = await pool.query(`
    SELECT f.name, f.location, SUM(md.liters) as liters,
      AVG(md.fat_percent) as avg_fat, md.quality_grade, SUM(md.total_payment) as payment
    FROM milk_deliveries md JOIN farmers f ON md.farmer_id = f.id
    WHERE md.factory_id = $1 AND DATE(md.delivery_date) = $2
    GROUP BY f.name, f.location, md.quality_grade ORDER BY liters DESC
  `, [req.user.factory_id, reportDate]);
  
  res.json({ date: reportDate, summary: summary.rows[0], by_farmer: byFarmer.rows });
});

// Mark payment
router.patch('/:id/pay', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const result = await pool.query(
    'UPDATE milk_deliveries SET is_paid=true, paid_at=NOW() WHERE id=$1 AND factory_id=$2 RETURNING *',
    [req.params.id, req.user.factory_id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Yetkazma topilmadi' });
  res.json({ message: 'To\'lov amalga oshirildi', delivery: result.rows[0] });
});

module.exports = router;
