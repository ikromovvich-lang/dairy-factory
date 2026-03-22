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

router.get('/', authenticate, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM notifications WHERE factory_id=$1 ORDER BY created_at DESC LIMIT 50',
    [req.user.factory_id]
  );
  res.json(result.rows);
});

router.patch('/:id/read', authenticate, async (req, res) => {
  await pool.query(
    'UPDATE notifications SET is_read=true, read_by=$1, read_at=NOW() WHERE id=$2',
    [req.user.id, req.params.id]
  );
  res.json({ message: 'O\'qilgan belgilandi' });
});

router.patch('/read-all', authenticate, async (req, res) => {
  await pool.query(
    'UPDATE notifications SET is_read=true, read_by=$1, read_at=NOW() WHERE factory_id=$2 AND is_read=false',
    [req.user.id, req.user.factory_id]
  );
  res.json({ message: 'Barchasi o\'qilgan' });
});

module.exports = router;
