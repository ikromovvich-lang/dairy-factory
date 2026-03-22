const router = require('express').Router();
const { Notification } = require('../models');

router.get('/', async (req, res) => {
  try {
    const notifs = await Notification.findAll({
      where: req.user.role !== 'admin' ? { user_id: [req.user.id, null] } : {},
      order: [['created_at', 'DESC']],
      limit: 50
    });
    res.json(notifs);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/read', async (req, res) => {
  try {
    const n = await Notification.findByPk(req.params.id);
    if (n) await n.update({ is_read: true });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/read-all', async (req, res) => {
  try {
    await Notification.update({ is_read: true }, { where: { is_read: false } });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
