const router = require('express').Router();
const c = require('../controllers/farmerController');
const { authorize } = require('../middleware/auth');

router.get('/', c.getAll);
router.post('/', authorize('admin','manager'), c.create);
router.put('/:id', authorize('admin','manager'), c.update);
router.get('/deliveries', c.getDeliveries);
router.post('/deliveries', c.createDelivery);
router.get('/report/daily', c.getDailyReport);
module.exports = router;
