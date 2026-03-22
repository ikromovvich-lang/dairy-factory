const router = require('express').Router();
const c = require('../controllers/productionController');
const { authorize } = require('../middleware/auth');

router.get('/', c.getBatches);
router.post('/', authorize('admin','manager','worker'), c.createBatch);
router.get('/verify/:batchNumber', c.verifyBatch);
router.get('/:id', c.getBatch);
module.exports = router;
