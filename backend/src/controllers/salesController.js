const { Sale, SaleItem, Customer, Product, Inventory } = require('../models');
const { Op } = require('sequelize');
const { createNotification } = require('../services/notificationService');

const generateInvoice = () => {
  const d = new Date();
  return `INV-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}-${Math.floor(Math.random()*90000)+10000}`;
};

exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.findAll({ order: [['name','ASC']] });
    res.json(customers);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createCustomer = async (req, res) => {
  try {
    const c = await Customer.create(req.body);
    res.status(201).json(c);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getSales = async (req, res) => {
  try {
    const where = {};
    if (req.query.from && req.query.to) {
      where.sale_date = { [Op.between]: [req.query.from, req.query.to] };
    }
    if (req.query.customer_id) where.customer_id = req.query.customer_id;
    if (req.query.status) where.payment_status = req.query.status;

    const sales = await Sale.findAll({
      where,
      include: [
        { model: Customer, as: 'customer' },
        { model: SaleItem, as: 'items', include: [{ model: Product, as: 'product' }] }
      ],
      order: [['sale_date', 'DESC']]
    });
    res.json(sales);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createSale = async (req, res) => {
  try {
    const { customer_id, items, payment_method, notes, discount_amount = 0 } = req.body;
    
    let subtotal = 0;
    for (const item of items) {
      const product = await Product.findByPk(item.product_id);
      if (!product) return res.status(404).json({ error: `Махсулот топилмади: ${item.product_id}` });
      
      const inv = await Inventory.findOne({ where: { product_id: item.product_id } });
      if (!inv || parseFloat(inv.quantity_available) < parseFloat(item.quantity)) {
        return res.status(400).json({ error: `${product.name} учун захира етарли эмас` });
      }
      subtotal += item.quantity * item.price_per_unit;
    }

    const total = subtotal - discount_amount;
    const sale = await Sale.create({
      invoice_number: generateInvoice(),
      customer_id, subtotal, discount_amount,
      total_amount: total, payment_method,
      notes, sold_by: req.user?.id,
      payment_status: payment_method === 'credit' ? 'pending' : 'paid',
      paid_amount: payment_method === 'credit' ? 0 : total
    });

    for (const item of items) {
      await SaleItem.create({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_per_unit: item.price_per_unit,
        total_price: item.quantity * item.price_per_unit
      });
      
      const inv = await Inventory.findOne({ where: { product_id: item.product_id } });
      const newQty = parseFloat(inv.quantity_available) - parseFloat(item.quantity);
      await inv.update({ quantity_available: Math.max(0, newQty), last_updated: new Date() });
      
      if (newQty < parseFloat(inv.minimum_stock)) {
        await createNotification({
          type: newQty <= 0 ? 'out_of_stock' : 'low_stock',
          title: newQty <= 0 ? 'Махсулот тугади!' : 'Захира кам',
          message: `Сотувдан кейин захира камайди`,
          severity: newQty <= 0 ? 'critical' : 'warning',
          related_id: inv.product_id, related_type: 'inventory'
        });
      }
    }

    await Customer.increment('total_purchases', { by: total, where: { id: customer_id } });

    const result = await Sale.findByPk(sale.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: SaleItem, as: 'items', include: [{ model: Product, as: 'product' }] }
      ]
    });
    res.status(201).json(result);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getDailyRevenue = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const sales = await Sale.findAll({
      where: { sale_date: date },
      include: [
        { model: Customer, as: 'customer' },
        { model: SaleItem, as: 'items', include: [{ model: Product, as: 'product' }] }
      ]
    });

    const revenue = {
      date, total_sales: sales.length,
      total_revenue: sales.reduce((s, sale) => s + parseFloat(sale.total_amount), 0),
      paid_revenue: sales.reduce((s, sale) => s + parseFloat(sale.paid_amount), 0),
      by_payment: {
        cash: sales.filter(s => s.payment_method === 'cash').reduce((a,s)=>a+parseFloat(s.total_amount),0),
        bank: sales.filter(s => s.payment_method === 'bank_transfer').reduce((a,s)=>a+parseFloat(s.total_amount),0),
        credit: sales.filter(s => s.payment_method === 'credit').reduce((a,s)=>a+parseFloat(s.total_amount),0)
      },
      sales
    };
    res.json(revenue);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
