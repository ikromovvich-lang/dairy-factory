/**
 * 🥛 DAIRY FACTORY MANAGEMENT SYSTEM
 * Молочный Завод Бошқаруви | Sut Zavodi Boshqaruvi
 * Backend API Server v2.0
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cron = require('node-cron');
const path = require('path');

const { sequelize } = require('./config/database');
const logger = require('./utils/logger');
const { setupSocketIO } = require('./services/notificationService');

// Routes
const authRoutes = require('./routes/auth');
const farmerRoutes = require('./routes/farmers');
const milkRoutes = require('./routes/milk');
const productionRoutes = require('./routes/production');
const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');
const analyticsRoutes = require('./routes/analytics');
const dashboardRoutes = require('./routes/dashboard');
const customerRoutes = require('./routes/customers');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);

// ─────────────────────────────────────────────────────────────
//  Socket.IO Setup
// ─────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// Make io accessible globally
app.set('io', io);
setupSocketIO(io);

// ─────────────────────────────────────────────────────────────
//  Middleware
// ─────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Static files (QR codes)
app.use('/qrcodes', express.static(path.join(__dirname, '../qrcodes')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─────────────────────────────────────────────────────────────
//  API Routes
// ─────────────────────────────────────────────────────────────
const API = '/api/v1';

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/farmers`, farmerRoutes);
app.use(`${API}/milk`, milkRoutes);
app.use(`${API}/production`, productionRoutes);
app.use(`${API}/inventory`, inventoryRoutes);
app.use(`${API}/sales`, salesRoutes);
app.use(`${API}/analytics`, analyticsRoutes);
app.use(`${API}/dashboard`, dashboardRoutes);
app.use(`${API}/customers`, customerRoutes);
app.use(`${API}/notifications`, notificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: '🥛 Dairy Factory API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─────────────────────────────────────────────────────────────
//  Error Handler
// ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} — ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Сервер хатоси | Server xatosi',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─────────────────────────────────────────────────────────────
//  Scheduled Tasks (Cron)
// ─────────────────────────────────────────────────────────────
function setupCronJobs() {
  const { checkLowStock, checkExpiringBatches } = require('./services/alertService');

  // Every hour — check inventory levels
  cron.schedule('0 * * * *', async () => {
    logger.info('⏰ Checking inventory levels...');
    await checkLowStock(io);
  });

  // Every 6 hours — check expiring products
  cron.schedule('0 */6 * * *', async () => {
    logger.info('⏰ Checking expiring batches...');
    await checkExpiringBatches(io);
  });

  // Every day at 7am — generate daily report
  cron.schedule('0 7 * * *', async () => {
    logger.info('📊 Generating daily report...');
    // trigger report generation
  });

  logger.info('✅ Cron jobs scheduled');
}

// ─────────────────────────────────────────────────────────────
//  Start Server
// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('✅ PostgreSQL connected');

    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('✅ Database synced');

    setupCronJobs();

    server.listen(PORT, () => {
      logger.info(`🥛 Dairy Factory API running on port ${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server, io };
