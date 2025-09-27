import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

import { logger } from './utils/logger.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import analyticsRoutes from './routes/analytics.js';
import metricsRoutes from './routes/metrics.js';
import usersRoutes from './routes/users.js';
import providersRoutes from './routes/providers.js';
import { GraphService } from './services/GraphService.js';
import { CacheService } from './services/CacheService.js';
import { AIInsightsService } from './services/AIInsightsService.js';
import { WebSocketHandler } from './services/WebSocketHandler.js';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize services
const graphService = new GraphService(process.env.GRAPH_API_URL || 'http://localhost:8000/subgraphs/name/eth-api-payments-analytics');
const cacheService = new CacheService({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
});
const aiInsightsService = new AIInsightsService();
const websocketHandler = new WebSocketHandler(wss);

// Global services for route access
app.locals.graphService = graphService;
app.locals.cacheService = cacheService;
app.locals.aiInsightsService = aiInsightsService;
app.locals.websocketHandler = websocketHandler;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Performance middleware
app.use(compression());
app.use(rateLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: NODE_ENV,
    services: {
      graph: graphService.isHealthy(),
      cache: cacheService.isHealthy(),
      websocket: websocketHandler.isHealthy()
    }
  });
});

// API routes
app.use('/api/analytics', analyticsRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/providers', providersRoutes);

// WebSocket connection handling
websocketHandler.initialize();

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Close services
  await cacheService.disconnect();
  websocketHandler.close();
});

server.listen(PORT, () => {
  logger.info(`🚀 Analytics backend server running on port ${PORT}`);
  logger.info(`📊 Graph API URL: ${process.env.GRAPH_API_URL || 'http://localhost:8000/subgraphs/name/eth-api-payments-analytics'}`);
  logger.info(`🔗 WebSocket server initialized`);
});

export default app;