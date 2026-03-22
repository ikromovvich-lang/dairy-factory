const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'dairy_factory',
  user: process.env.DB_USER || 'dairy_admin',
  password: process.env.DB_PASSWORD,
  port: 5432,
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  
  const result = await pool.query(
    'SELECT id, name, email, password_hash, role, factory_id, is_active FROM users WHERE email = $1',
    [email]
  );
  
  const user = result.rows[0];
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
  }
  
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
  }
  
  await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
  
  const token = jwt.sign(
    { userId: user.id, role: user.role, factoryId: user.factory_id },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  
  const { password_hash, ...userSafe } = user;
  res.json({ token, user: userSafe, message: 'Muvaffaqiyatli kirish' });
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.factory_id, u.last_login, u.created_at,
            f.name as factory_name
     FROM users u LEFT JOIN factories f ON u.factory_id = f.id
     WHERE u.id = $1`,
    [req.user.id]
  );
  res.json(result.rows[0]);
});

// Create user (admin only)
router.post('/register', authenticate, [
  body('name').trim().isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('role').isIn(['admin', 'manager', 'worker']),
], async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Faqat admin foydalanuvchi qo\'sha oladi' });
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password, role, phone } = req.body;
  const hash = await bcrypt.hash(password, 12);
  
  const result = await pool.query(
    'INSERT INTO users (name, email, password_hash, role, phone, factory_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, role',
    [name, email, hash, role, phone, req.user.factory_id]
  );
  
  res.status(201).json({ user: result.rows[0], message: 'Foydalanuvchi yaratildi' });
});

// Change password
router.post('/change-password', authenticate, [
  body('currentPassword').isLength({ min: 6 }),
  body('newPassword').isLength({ min: 8 }),
], async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!valid) return res.status(400).json({ error: 'Joriy parol noto\'g\'ri' });
  
  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);
  
  res.json({ message: 'Parol muvaffaqiyatli o\'zgartirildi' });
});

// List users (manager+)
router.get('/users', authenticate, async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) return res.status(403).json({ error: 'Ruxsat yo\'q' });
  
  const result = await pool.query(
    'SELECT id, name, email, phone, role, is_active, last_login, created_at FROM users WHERE factory_id = $1 ORDER BY name',
    [req.user.factory_id]
  );
  res.json(result.rows);
});

module.exports = router;
