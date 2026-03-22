const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'dairy_factory',
  user: process.env.DB_USER || 'dairy_admin',
  password: process.env.DB_PASSWORD,
  port: 5432,
});

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Avtorizatsiya token talab qilinadi' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    const result = await pool.query(
      'SELECT id, name, email, role, factory_id, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (!result.rows[0] || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'Foydalanuvchi topilmadi yoki faol emas' });
    }
    
    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token muddati tugagan, qayta kiring' });
    }
    return res.status(401).json({ error: 'Noto\'g\'ri token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'Bu amalni bajarish uchun ruxsat yo\'q',
      required: roles,
      current: req.user.role,
    });
  }
  next();
};

module.exports = { authenticate, authorize };
