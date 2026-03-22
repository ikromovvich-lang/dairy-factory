const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, authorize } = require('../middleware/auth');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'dairy_factory',
  user: process.env.DB_USER || 'dairy_admin',
  password: process.env.DB_PASSWORD, port: 5432,
});

function generateInvoiceNumber() {
  const date = new Date();
  return `INV-${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}-${Math.floor(Math.random()*99999).toString().padStart(5,'0')}`;
}

// CUSTOMERS
router.get('/customers', authenticate, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM customers WHERE factory_id=$1 AND is_active=true ORDER BY name',
    [req.user.factory_id]
  );
  res.json(result.rows);
});

router.post('/customers', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const { name, type, phone, email, address, city, discount_percent, credit_limit, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Mijoz nomi majburiy' });
  
  const result = await pool.query(
    `INSERT INTO customers (factory_id, name, type, phone, email, address, city, discount_percent, credit_limit, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [req.user.factory_id, name, type || 'shop', phone, email, address, city,
     discount_percent || 0, credit_limit || 0, notes]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/customers/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  const { name, type, phone, email, address, city, discount_percent, credit_limit, notes } = req.body;
  const result = await pool.query(
    `UPDATE customers SET name=$1,type=$2,phone=$3,email=$4,address=$5,city=$6,
     discount_percent=$7,credit_limit=$8,notes=$9 WHERE id=$10 AND factory_id=$11 RETURNING *`,
    [name, type, phone, email, address, city, discount_percent, credit_limit, notes, req.params.id, req.user.factory_id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Mijoz topilmadi' });
  res.json(result.rows[0]);
});

// SALES
router.post('/', authenticate, async (req, res) => {
  const { customer_id, items, payment_method, notes, discount_amount = 0 } = req.body;
  
  if (!customer_id || !items?.length) {
    return res.status(400).json({ error: 'Mijoz va mahsulotlar majburiy' });
  }
  
  const customer = await pool.query('SELECT * FROM customers WHERE id=$1 AND factory_id=$2', [customer_id, req.user.factory_id]);
  if (!customer.rows[0]) return res.status(404).json({ error: 'Mijoz topilmadi' });
  
  let total_amount = 0;
  const processedItems = [];
  
  for (const item of items) {
    const priceResult = await pool.query(
      'SELECT price_per_unit FROM price_settings WHERE factory_id=$1 AND product_type=$2',
      [req.user.factory_id, item.product_type]
    );
    const price = priceResult.rows[0]?.price_per_unit || item.price_per_unit;
    const itemTotal = parseFloat(item.quantity) * parseFloat(price);
    total_amount += itemTotal;
    processedItems.push({ ...item, price_per_unit: price, total_price: itemTotal });
  }
  
  const customerDiscount = (total_amount * customer.rows[0].discount_percent / 100);
  const final_amount = total_amount - discount_amount - customerDiscount;
  const invoice_number = generateInvoiceNumber();
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const saleResult = await client.query(
      `INSERT INTO sales (invoice_number, factory_id, customer_id, total_amount, discount_amount, final_amount, payment_method, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [invoice_number, req.user.factory_id, customer_id, total_amount, discount_amount + customerDiscount, final_amount, payment_method, notes, req.user.id]
    );
    
    const sale = saleResult.rows[0];
    
    for (const item of processedItems) {
      await client.query(
        'INSERT INTO sale_items (sale_id, product_type, batch_id, quantity, unit, price_per_unit, total_price) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [sale.id, item.product_type, item.batch_id || null, item.quantity, item.unit || 'kg', item.price_per_unit, item.total_price]
      );
      
      // Decrease inventory
      if (item.batch_id) {
        await client.query(
          'UPDATE inventory SET quantity_available = quantity_available - $1 WHERE batch_id=$2 AND factory_id=$3',
          [item.quantity, item.batch_id, req.user.factory_id]
        );
      } else {
        // Deduct from oldest batch
        await client.query(`
          UPDATE inventory SET quantity_available = GREATEST(0, quantity_available - $1)
          WHERE id = (SELECT i.id FROM inventory i JOIN production_batches pb ON i.batch_id=pb.id
            WHERE i.factory_id=$2 AND i.product_type=$3 AND i.quantity_available > 0
            ORDER BY pb.expiration_date ASC LIMIT 1)
        `, [item.quantity, req.user.factory_id, item.product_type]);
      }
    }
    
    await client.query('COMMIT');
    res.status(201).json({ ...sale, items: processedItems });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// Get sales
router.get('/', authenticate, async (req, res) => {
  const { date_from, date_to, customer_id, status, limit = 50, offset = 0 } = req.query;
  
  let query = `SELECT s.*, c.name as customer_name, c.type as customer_type, u.name as created_by_name
    FROM sales s JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.created_by = u.id
    WHERE s.factory_id=$1`;
  const params = [req.user.factory_id];
  
  if (date_from) { query += ` AND s.sale_date >= $${params.length+1}`; params.push(date_from); }
  if (date_to) { query += ` AND s.sale_date <= $${params.length+1}::date + 1`; params.push(date_to); }
  if (customer_id) { query += ` AND s.customer_id = $${params.length+1}`; params.push(customer_id); }
  if (status) { query += ` AND s.status = $${params.length+1}`; params.push(status); }
  
  query += ` ORDER BY s.sale_date DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
  params.push(parseInt(limit), parseInt(offset));
  
  const result = await pool.query(query, params);
  res.json({ sales: result.rows, total: result.rows.length });
});

// Sale detail
router.get('/:id', authenticate, async (req, res) => {
  const sale = await pool.query(
    `SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
     FROM sales s JOIN customers c ON s.customer_id=c.id WHERE s.id=$1 AND s.factory_id=$2`,
    [req.params.id, req.user.factory_id]
  );
  if (!sale.rows[0]) return res.status(404).json({ error: 'Sotuv topilmadi' });
  
  const items = await pool.query(
    'SELECT si.*, pb.batch_number, pb.expiration_date FROM sale_items si LEFT JOIN production_batches pb ON si.batch_id=pb.id WHERE si.sale_id=$1',
    [req.params.id]
  );
  
  res.json({ ...sale.rows[0], items: items.rows });
});

// Daily revenue report
router.get('/report/daily', authenticate, async (req, res) => {
  const { date } = req.query;
  const reportDate = date || new Date().toISOString().split('T')[0];
  
  const summary = await pool.query(`
    SELECT COUNT(*) as sale_count, SUM(final_amount) as revenue,
      SUM(CASE WHEN is_paid THEN final_amount ELSE 0 END) as collected,
      SUM(CASE WHEN NOT is_paid THEN final_amount ELSE 0 END) as outstanding
    FROM sales WHERE factory_id=$1 AND DATE(sale_date)=$2
  `, [req.user.factory_id, reportDate]);
  
  const byProduct = await pool.query(`
    SELECT si.product_type, SUM(si.quantity) as quantity, SUM(si.total_price) as revenue
    FROM sale_items si JOIN sales s ON si.sale_id=s.id
    WHERE s.factory_id=$1 AND DATE(s.sale_date)=$2
    GROUP BY si.product_type
  `, [req.user.factory_id, reportDate]);
  
  res.json({ date: reportDate, summary: summary.rows[0], by_product: byProduct.rows });
});

// Mark as paid
router.patch('/:id/pay', authenticate, authorize('admin', 'manager'), async (req, res) => {
  await pool.query(
    'UPDATE sales SET is_paid=true, paid_at=NOW(), status=\'delivered\' WHERE id=$1 AND factory_id=$2',
    [req.params.id, req.user.factory_id]
  );
  res.json({ message: 'To\'lov qabul qilindi' });
});

module.exports = router;
