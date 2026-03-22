const { Inventory, Product } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const items = await Inventory.findAll({
      include: [{ model: Product, as: 'product' }],
      order: [['last_updated', 'DESC']]
    });
    const withAlerts = items.map(i => ({
      ...i.toJSON(),
      is_low_stock: parseFloat(i.quantity_available) < parseFloat(i.minimum_stock),
      is_out_of_stock: parseFloat(i.quantity_available) === 0
    }));
    res.json(withAlerts);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.update = async (req, res) => {
  try {
    const item = await Inventory.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Топилмади' });
    await item.update({ ...req.body, last_updated: new Date() });
    res.json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
};
