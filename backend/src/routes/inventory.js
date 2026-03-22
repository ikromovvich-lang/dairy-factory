const router = require('express').Router();
const c = require('../controllers/inventoryController');
const { authorize } = require('../middleware/auth');

router.get('/', c.getAll);
router.put('/:id', authorize('admin','manager'), c.update);
module.exports = router;
