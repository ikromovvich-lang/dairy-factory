const { Notification, Inventory, ProductionBatch, Product } = require('../models');
const { Op } = require('sequelize');

let io;
const setSocketIO = (socketIO) => { io = socketIO; };

const createNotification = async (data) => {
  try {
    const notif = await Notification.create(data);
    if (io) io.emit('notification', notif.toJSON());
    return notif;
  } catch(e) { console.error('Notification error:', e); }
};

const checkLowStock = async () => {
  const { sequelize } = require('../models');
  const items = await Inventory.findAll({
    include: [{ model: Product, as: 'product' }]
  });
  for (const item of items) {
    if (parseFloat(item.quantity_available) < parseFloat(item.minimum_stock)) {
      await createNotification({
        type: item.quantity_available == 0 ? 'out_of_stock' : 'low_stock',
        title: item.quantity_available == 0 ? 'Махсулот тугади!' : 'Захира кам',
        message: `${item.product?.name}: ${item.quantity_available} ${item.product?.unit} қолди`,
        severity: item.quantity_available == 0 ? 'critical' : 'warning',
        related_id: item.product_id,
        related_type: 'inventory'
      });
    }
  }
};

const checkExpiringBatches = async () => {
  const soon = new Date();
  soon.setDate(soon.getDate() + 3);
  const batches = await ProductionBatch.findAll({
    where: {
      expiration_date: { [Op.lte]: soon },
      status: { [Op.in]: ['completed', 'stored'] }
    },
    include: [{ model: Product, as: 'product' }]
  });
  for (const b of batches) {
    await createNotification({
      type: 'expiring', severity: 'critical',
      title: 'Муддати тугаяпти!',
      message: `${b.product?.name} (${b.batch_number}) - ${b.expiration_date}`,
      related_id: b.id, related_type: 'batch'
    });
  }
};

module.exports = { setSocketIO, createNotification, checkLowStock, checkExpiringBatches };
