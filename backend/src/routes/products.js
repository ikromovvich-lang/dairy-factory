const router = require('express').Router();
const c = require('../controllers/productController');
const { authorize } = require('../middleware/auth');

router.get('/', c.getAll);
router.post('/', authorize('admin','manager'), c.create);
router.put('/:id', authorize('admin','manager'), c.update);
module.exports = router;
