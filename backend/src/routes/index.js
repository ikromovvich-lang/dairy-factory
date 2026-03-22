const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');

const authRoutes = require('./auth');
const farmerRoutes = require('./farmers');
const productionRoutes = require('./production');
const inventoryRoutes = require('./inventory');
const salesRoutes = require('./sales');
const productRoutes = require('./products');
const analyticsRoutes = require('./analytics');
const notificationRoutes = require('./notifications');

router.use('/auth', authRoutes);
router.use('/farmers', auth, farmerRoutes);
router.use('/production', auth, productionRoutes);
router.use('/inventory', auth, inventoryRoutes);
router.use('/sales', auth, salesRoutes);
router.use('/products', auth, productRoutes);
router.use('/analytics', auth, analyticsRoutes);
router.use('/notifications', auth, notificationRoutes);

module.exports = router;
