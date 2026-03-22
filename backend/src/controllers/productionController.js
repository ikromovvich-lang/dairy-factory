const { ProductionBatch, Product, Inventory } = require('../models');
const { generateBatchQR } = require('../services/qrService');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

const generateBatchNumber = () => {
  const d = new Date();
  return `BATCH-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000)+1000}`;
};

exports.getBatches = async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.product_id) where.product_id = req.query.product_id;
    const batches = await ProductionBatch.findAll({
      where, include: [{ model: Product, as: 'product' }],
      order: [['production_date', 'DESC']]
    });
    res.json(batches);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createBatch = async (req, res) => {
  try {
    const product = await Product.findByPk(req.body.product_id);
    if (!product) return res.status(404).json({ error: 'Махсулот топилмади' });

    const milkUsed = parseFloat(req.body.milk_used_liters);
    const qtyProduced = parseFloat(req.body.quantity_produced) || (milkUsed / parseFloat(product.milk_ratio));
    const yieldPct = ((qtyProduced / milkUsed) * product.milk_ratio * 100).toFixed(2);

    const batchNumber = req.body.batch_number || generateBatchNumber();
    const prodDate = req.body.production_date || new Date().toISOString().split('T')[0];
    const expDate = req.body.expiration_date || (() => {
      const d = new Date(prodDate);
      d.setDate(d.getDate() + product.shelf_life_days);
      return d.toISOString().split('T')[0];
    })();

    const batch = await ProductionBatch.create({
      ...req.body,
      batch_number: batchNumber,
      production_date: prodDate,
      expiration_date: expDate,
      quantity_produced: qtyProduced,
      yield_percentage: yieldPct,
      produced_by: req.user?.id,
      status: 'completed'
    });

    const qrCode = await generateBatchQR(batch, product);
    await batch.update({ qr_code: qrCode });

    // Update inventory
    let inv = await Inventory.findOne({ where: { product_id: product.id } });
    if (inv) {
      await inv.update({
        quantity_available: parseFloat(inv.quantity_available) + qtyProduced,
        last_updated: new Date()
      });
    } else {
      await Inventory.create({
        product_id: product.id,
        quantity_available: qtyProduced,
        minimum_stock: 20
      });
    }

    const result = await ProductionBatch.findByPk(batch.id, {
      include: [{ model: Product, as: 'product' }]
    });
    res.status(201).json(result);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getBatch = async (req, res) => {
  try {
    const batch = await ProductionBatch.findByPk(req.params.id, {
      include: [{ model: Product, as: 'product' }]
    });
    if (!batch) return res.status(404).json({ error: 'Топилмади' });
    res.json(batch);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.verifyBatch = async (req, res) => {
  try {
    const batch = await ProductionBatch.findOne({
      where: { batch_number: req.params.batchNumber },
      include: [{ model: Product, as: 'product' }]
    });
    if (!batch) return res.status(404).json({ error: 'Партия топилмади' });
    res.json({ valid: true, batch });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
