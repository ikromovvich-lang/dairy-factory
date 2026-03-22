require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { sequelize } = require('./models');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiter');
const { setSocketIO, checkLowStock, checkExpiringBatches } = require('./services/notificationService');
const logger = require('./config/logger');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || '*', credentials: true }
});

// Security & middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: m => logger.info(m.trim()) } }));
app.use('/api', apiLimiter);

// Socket.io
setSocketIO(io);
io.on('connection', socket => {
  logger.info(`Client connected: ${socket.id}`);
  socket.on('disconnect', () => logger.info(`Client disconnected: ${socket.id}`));
});

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => res.json({
  status: 'healthy', service: 'Dairy Factory API',
  version: '1.0.0', timestamp: new Date().toISOString()
}));

// QR verify public endpoint
app.get('/verify/:batchNumber', async (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${req.params.batchNumber}`);
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Сервер хатоси', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database connected');
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('✅ Models synchronized');
    
    // Seed default data
    await seedDefaultData();
    
    // Schedule periodic checks
    setInterval(checkLowStock, 30 * 60 * 1000);
    setInterval(checkExpiringBatches, 60 * 60 * 1000);
    
    server.listen(PORT, () => logger.info(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start:', err);
    process.exit(1);
  }
};

const seedDefaultData = async () => {
  const { User, Product } = require('./models');
  const bcrypt = require('bcryptjs');
  
  const adminExists = await User.findOne({ where: { email: 'admin@dairy.com' } });
  if (!adminExists) {
    await User.create({
      name: 'Администратор', email: 'admin@dairy.com',
      password: 'admin123', role: 'admin'
    });
    logger.info('✅ Default admin created: admin@dairy.com / admin123');
  }

  const productsExist = await Product.count();
  if (productsExist === 0) {
    await Product.bulkCreate([
      { name: 'Сут (3.5%)', name_ru: 'Молоко 3.5%', name_uz: 'Sut 3.5%', type: 'milk', unit: 'liter', price_per_unit: 8000, milk_ratio: 1.05, shelf_life_days: 5, fat_percentage: 3.5 },
      { name: 'Йогурт', name_ru: 'Йогурт', name_uz: 'Yogurt', type: 'yogurt', unit: 'kg', price_per_unit: 15000, milk_ratio: 1.1, shelf_life_days: 14, fat_percentage: 2.5 },
      { name: 'Творог', name_ru: 'Творог', name_uz: 'Tvorog', type: 'tvorog', unit: 'kg', price_per_unit: 18000, milk_ratio: 5.0, shelf_life_days: 7, fat_percentage: 9.0 },
      { name: 'Сметана (20%)', name_ru: 'Сметана 20%', name_uz: 'Smetana 20%', type: 'smetana', unit: 'kg', price_per_unit: 20000, milk_ratio: 3.0, shelf_life_days: 21, fat_percentage: 20.0 },
      { name: 'Кефир', name_ru: 'Кефир', name_uz: 'Kefir', type: 'kefir', unit: 'liter', price_per_unit: 9000, milk_ratio: 1.08, shelf_life_days: 10, fat_percentage: 2.5 }
    ]);
    logger.info('✅ Default products created');
  }
};

start();
