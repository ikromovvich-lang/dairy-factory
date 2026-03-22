const router = require('express').Router();
const c = require('../controllers/salesController');
const { authorize } = require('../middleware/auth');

router.get('/customers', c.getCustomers);
router.post('/customers', authorize('admin','manager'), c.createCustomer);
router.get('/', c.getSales);
router.post('/', c.createSale);
router.get('/report/daily', c.getDailyRevenue);
module.exports = router;
