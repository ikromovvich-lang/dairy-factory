const router = require('express').Router();
const { login, me, register, getUsers, updateUser } = require('../controllers/authController');
const { auth, authorize } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login', authLimiter, login);
router.get('/me', auth, me);
router.post('/register', auth, authorize('admin'), register);
router.get('/users', auth, authorize('admin', 'manager'), getUsers);
router.put('/users/:id', auth, authorize('admin'), updateUser);
module.exports = router;
