require('dotenv').config();
require('express-async-errors');

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const { initDatabase } = require('./config/database');
const { initSocket } = require('./utils/socket');
const { initRedis } = require('./config/redis');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const farmerRoutes = require('./routes/farmers');
const milkRoutes = require('./routes/milk');
const productionRoutes = require('./routes/production');
const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
    ].filter(Boolean);
    if (allowed.includes(origin) || /\.railway\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());
app.use(compression());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use('/api', rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Oqsuv Sut Kombinati',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/milk', milkRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack, url: req.url });
  if (err.name === 'ValidationError' || err.isJoi) {
    return res.status(400).json({ error: 'Validation Error', details: err.details });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ error: 'Duplicate entry', field: err.fields });
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await initDatabase();
    await initRedis();
    const io = initSocket(server);
    app.set('io', io);
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🥛 Oqsuv API running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
module.exports = app;
