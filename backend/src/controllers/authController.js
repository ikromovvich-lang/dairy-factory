const jwt = require('jsonwebtoken');
const { User } = require('../models');

const generateToken = (user) => jwt.sign(
  { id: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
);

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email, is_active: true } });
    if (!user || !(await user.validatePassword(password))) {
      return res.status(401).json({ error: 'Email ёки паррол нотўғри' });
    }
    await user.update({ last_login: new Date() });
    res.json({ token: generateToken(user), user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.me = async (req, res) => res.json(req.user);

exports.register = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json({ token: generateToken(user), user: user.toJSON() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll({ order: [['created_at', 'DESC']] });
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Топилмади' });
    await user.update(req.body);
    res.json(user);
  } catch (err) { res.status(400).json({ error: err.message }); }
};
