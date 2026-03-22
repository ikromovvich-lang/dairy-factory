const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, authorize } = require('../middleware/auth');
const { generateBatchQR } = require('../utils/qrcode');
const { emitAlert, emitToFactory } = require('../utils/socket');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'dairy_factory',
  user: process.env.DB_USER || 'dairy_admin',
  password: process.env.DB_PASSWORD, port: 5432,
});

// Yield ratios (liters milk -> kg product)
const YIELD_RATIOS = {
  milk: { ratio: 0.97, unit: 'litr', shelf_days: 7 },
  yogurt: { ratio: 0.85, unit: 'kg', shelf_days: 14 },
  tvorog: { ratio: 0.12, unit: 'kg', shelf_days: 5 },
  smetana: { ratio: 0.25, unit: 'kg', shelf_days: 10 },
};

function generateBatchNumber(productType) {
  const prefixes = { milk: 'SUT', yogurt: 'YOG', tvorog: 'TVR', smetana: 'SMT' };
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `${prefixes[productType] || 'PRD'}-${dateStr}-${rand}`;
}

// Create batch
router.post('/', authenticate, authorize('admin', 'manager', 'worker'), async (req, res) => {
  const { product_type, milk_used_liters, fat_content, notes } = req.body;
  
  if (!product_type || !milk_used_liters) {
    return res.status(400).json({ error: 'Mahsulot turi va ishlatilgan sut miqdori majburiy' });
  }
  
  const yield_info = YIELD_RATIOS[product_type];
  if (!yield_info) return res.status(400).json({ error: 'Noto\'g\'ri mahsulot turi' });
  
  const quantity_produced = parseFloat(milk_used_liters) * yield_info.ratio;
  const yield_percent = yield_info.ratio * 100;
  
  const now = new Date();
  const expirationDate = new Date(now);
  expirationDate.setDate(expirationDate.getDate() + yield_info.shelf_days);
  
  const batch_number = generateBatchNumber(product_type);
  
  // Create batch
  const batchResult = await pool.query(
    `INSERT INTO production_batches 
     (batch_number, factory_id, product_type, status, milk_used_liters, quantity_produced, unit, yield_percent, production_date, expiration_date, fat_content, notes, started_by)
     VALUES ($1,$2,$3,'in_progress',$4,$5,$6,$7,NOW(),$8,$9,$10,$11) RETURNING *`,
    [batch_number, req.user.factory_id, product_type, milk_used_liters, quantity_produced.toFixed(2),
     yield_info.unit, yield_percent.toFixed(2), expirationDate, fat_content, notes, req.user.id]
  );
  
  const batch = batchResult.rows[0];
  
  // Generate QR code
  const qrResult = await generateBatchQR(batch);
  await pool.query('UPDATE production_batches SET qr_code=$1, status=$2, completed_by=$3 WHERE id=$4',
    [qrResult.dataUrl, 'completed', req.user.id, batch.id]);
  
  // Update inventory
  await pool.query(
    `INSERT INTO inventory (factory_id, product_type, batch_id, quantity_available, unit, low_stock_threshold)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (factory_id, product_type, batch_id) DO UPDATE SET quantity_available = $4`,
    [req.user.factory_id, product_type, batch.id, quantity_produced.toFixed(2), yield_info.unit,
     product_type === 'milk' ? 200 : 50]
  );
  
  const finalBatch = { ...batch, qr_code: qrResult.dataUrl, qr_file: qrResult.filePath, status: 'completed' };
  
  // Notify all factory users
  emitToFactory(req.user.factory_id, 'batch_created', {
    batch_number, product_type, quantity_produced: quantity_produced.toFixed(2), unit: yield_info.unit,
  });
  
  res.status(201).json(finalBatch);
});

// Get all batches
router.get('/', authenticate, async (req, res) => {
  const { product_type, status, date_from, date_to, limit = 50, offset = 0 } = req.query;
  
  let query = `SELECT pb.*, u.name as started_by_name, u2.name as completed_by_name
    FROM production_batches pb
    LEFT JOIN users u ON pb.started_by = u.id
    LEFT JOIN users u2 ON pb.completed_by = u2.id
    WHERE pb.factory_id = $1`;
  const params = [req.user.factory_id];
  
  if (product_type) { query += ` AND pb.product_type = $${params.length+1}`; params.push(product_type); }
  if (status) { query += ` AND pb.status = $${params.length+1}`; params.push(status); }
  if (date_from) { query += ` AND pb.production_date >= $${params.length+1}`; params.push(date_from); }
  if (date_to) { query += ` AND pb.production_date <= $${params.length+1}`; params.push(date_to); }
  
  query += ` ORDER BY pb.production_date DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
  params.push(parseInt(limit), parseInt(offset));
  
  const result = await pool.query(query, params);
  const count = await pool.query('SELECT COUNT(*) FROM production_batches WHERE factory_id=$1', [req.user.factory_id]);
  
  res.json({ batches: result.rows, total: parseInt(count.rows[0].count) });
});

// Get single batch with QR
router.get('/:id', authenticate, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM production_batches WHERE id=$1 AND factory_id=$2',
    [req.params.id, req.user.factory_id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Partiya topilmadi' });
  res.json(result.rows[0]);
});

// Expiring soon alert
router.get('/alerts/expiring', authenticate, async (req, res) => {
  const result = await pool.query(`
    SELECT pb.*, i.quantity_available
    FROM production_batches pb
    JOIN inventory i ON pb.id = i.batch_id
    WHERE pb.factory_id = $1
      AND pb.expiration_date BETWEEN NOW() AND NOW() + INTERVAL '3 days'
      AND i.quantity_available > 0
    ORDER BY pb.expiration_date ASC
  `, [req.user.factory_id]);
  res.json(result.rows);
});

module.exports = router;
