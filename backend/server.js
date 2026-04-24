require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const authRoutes = require('./src/routes/auth.routes');
const gpuRoutes = require('./src/routes/gpu.routes');
const modelsRoutes = require('./src/routes/models.routes');
const insightsRoutes = require('./src/routes/insights.routes');
const backupsRoutes = require('./src/routes/backups.routes');
const { errorHandler } = require('./src/middleware/errorHandler.middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const HAS_DIST = fs.existsSync(DIST_DIR);
const isProduction = process.env.NODE_ENV === 'production';
const authLimiterWindowMs = isProduction ? 15 * 60 * 1000 : 60 * 1000;
const authLimiterMax = isProduction ? 5 : 20;

const scriptSrc = ["'self'"];
const styleSrc = ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"];
const connectSrc = ["'self'"];

if (!isProduction) {
  scriptSrc.push("'unsafe-inline'", "http://localhost:5173");
  styleSrc.push("http://localhost:5173");
  connectSrc.push("http://localhost:5173", "ws://localhost:5173");
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc,
      styleSrc,
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:"],
      connectSrc,
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: []
    }
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-domain.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.'
    });
  }
});

const authLimiter = rateLimit({
  windowMs: authLimiterWindowMs,
  max: authLimiterMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res, next, options) => {
    const retryAfterSeconds = Math.max(1, Math.ceil((req.rateLimit.resetTime - new Date()) / 1000));

    res.status(options.statusCode).json({
      error: isProduction
        ? 'Too many login attempts from this IP, please try again later.'
        : 'Too many login attempts. Please wait a moment and try again.',
      retry_after_seconds: retryAfterSeconds
    });
  }
});

app.use('/api/', limiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (HAS_DIST) {
  app.use(express.static(DIST_DIR, { index: false }));
}

app.get('/admin', (req, res) => {
  const adminEntry = HAS_DIST ? path.join(DIST_DIR, 'index.html') : path.join(ROOT_DIR, 'index.html');
  res.sendFile(adminEntry);
});

app.get('/', (req, res) => {
  const frontendIndex = HAS_DIST ? path.join(DIST_DIR, 'index.html') : path.join(ROOT_DIR, 'index.html');
  res.sendFile(frontendIndex);
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/gpu', gpuRoutes);
app.use('/api/v1/models', modelsRoutes);
app.use('/api/v1/insights', insightsRoutes);
app.use('/api/v1/backups', backupsRoutes);

app.get('/api/v1/stats', (req, res) => {
  try {
    const db = require('./config/database');

    const totalGPUs = db.prepare('SELECT COUNT(*) as count FROM gpu_benchmarks').get().count;
    const vendors = db.prepare('SELECT DISTINCT vendor FROM gpu_benchmarks').all().map(v => v.vendor);
    const topScore = db.prepare('SELECT name, score FROM gpu_benchmarks ORDER BY score DESC LIMIT 1').get();
    const avgScore = db.prepare('SELECT AVG(score) as avg_score FROM gpu_benchmarks').get();

    res.json({
      total_gpus: totalGPUs,
      vendors: vendors,
      top_gpu: topScore,
      average_score: Math.round(avgScore.avg_score || 0),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

let server = null;

function startServer() {
  if (server) {
    return server;
  }

  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Public frontend: http://localhost:${PORT}/`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
    console.log(`API health: http://localhost:${PORT}/api/v1/health`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer
};
