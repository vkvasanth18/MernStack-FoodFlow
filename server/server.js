import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import connectDB, { checkDBStatus } from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import rawMaterialRoutes from './routes/rawMaterialRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import productionRoutes from './routes/productionRoutes.js';
import wasteRoutes from './routes/wasteRoutes.js';
import forecastRoutes from './routes/forecastRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import userRoutes from './routes/userRoutes.js';
import aiInsightsRoutes from './routes/aiInsightsRoutes.js';

// Load environment variables from .env file
dotenv.config();

const app = express();

// Enable Cross-Origin Resource Sharing (CORS)
const defaultAllowedOrigins = [
  'https://mern-stack-food-flow.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
];

const envOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envOrigins])];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, '');

      // Check against explicit list, local ports regex, or Vercel preview domains
      const isAllowed =
        allowedOrigins.includes(normalizedOrigin) ||
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(normalizedOrigin) ||
        /^https:\/\/mern-stack-food-flow.*\.vercel\.app$/.test(normalizedOrigin);

      if (isAllowed) {
        return callback(null, true);
      }

      console.warn(`[CORS Blocked] Origin not allowed: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

// Body parser middlewares for parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logger in development mode
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Root Welcome Endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the AI-Driven Food Production Planning & Waste Reduction API',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// System Health Check Endpoint
app.get('/api/health', (req, res) => {
  const dbConnected = checkDBStatus();
  res.status(200).json({
    success: true,
    status: 'HEALTHY',
    message: 'Food Production Management API is online and functional.',
    database: dbConnected ? 'Connected' : 'Disconnected (Set MONGO_URI in server/.env)',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

// API Resource Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/raw-materials', rawMaterialRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/waste', wasteRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports',   reportRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/ai-insights', aiInsightsRoutes);

// 404 Not Found Catch-All Handler
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas before starting the Express server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
      console.log(`📡 Health Check URL: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('\n=============================================================');
    console.error('🛑 SERVER STARTUP ABORTED: Failed to connect to MongoDB Atlas');
    console.error('=============================================================');
    console.error('Action required in MongoDB Atlas:');
    console.error(' 1. Network Access (IP Whitelist):');
    console.error('    • Go to MongoDB Atlas -> Network Access -> Add IP Address');
    console.error('    • Add your current IP address (or 0.0.0.0/0 to allow all)');
    console.error(' 2. Database User Credentials:');
    console.error('    • Go to MongoDB Atlas -> Database Access');
    console.error('    • Ensure user exists and password is correct in server/.env');
    console.error(' 3. Connection String:');
    console.error('    • Check MONGO_URI in server/.env is uncommented and accurate.');
    console.error('=============================================================\n');
    process.exit(1);
  }
};

startServer();
