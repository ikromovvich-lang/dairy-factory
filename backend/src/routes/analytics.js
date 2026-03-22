const router = require('express').Router();
const c = require('../controllers/analyticsController');

router.get('/dashboard', c.getDashboard);
router.get('/milk-trend', c.getMilkTrend);
router.get('/sales-trend', c.getSalesTrend);
router.get('/ai-forecast', c.getAIForecast);
router.get('/production-efficiency', c.getProductionEfficiency);
module.exports = router;
