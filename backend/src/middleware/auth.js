const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Авторизация талаб этилади' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Фойдаланувчи топилмади' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Токен нотўғри' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Рухсат йўқ' });
  }
  next();
};

module.exports = { auth, authorize };
