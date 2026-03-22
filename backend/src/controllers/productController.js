const { Product, Inventory } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const products = await Product.findAll({ where: { is_active: true }, order: [['name','ASC']] });
    res.json(products);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    await Inventory.create({ product_id: product.id, quantity_available: 0, minimum_stock: 20 });
    res.status(201).json(product);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.update = async (req, res) => {
  try {
    const p = await Product.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: 'Топилмади' });
    await p.update(req.body);
    res.json(p);
  } catch (err) { res.status(400).json({ error: err.message }); }
};
