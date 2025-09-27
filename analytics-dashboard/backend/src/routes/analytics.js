import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { analyticsRateLimiter } from '../middleware/rateLimiter.js';
import { CacheService } from '../services/CacheService.js';

const router = express.Router();

// Apply rate limiting to all analytics routes
router.use(analyticsRateLimiter);

// GET /api/analytics/overview - Get comprehensive analytics overview
router.get('/overview', asyncHandler(async (req, res) => {
  const { graphService, cacheService } = req.app.locals;
  const cacheKey = CacheService.keys.globalMetrics();

  // Try cache first
  let data = await cacheService.getOrSet(cacheKey, async () => {
    const [globalMetrics, topProviders, topUsers, recentPayments] = await Promise.all([
      graphService.getGlobalMetrics(),
      graphService.getTopProviders(5),
      graphService.getTopUsers(5),
      graphService.getRecentPayments(10)
    ]);

    return {
      globalMetrics,
      topProviders: topProviders.providers || [],
      topUsers: topUsers.users || [],
      recentPayments: recentPayments.batchPayments || []
    };
  }, 120); // Cache for 2 minutes

  res.json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
}));

// GET /api/analytics/metrics - Get global metrics
router.get('/metrics', asyncHandler(async (req, res) => {
  const { graphService, cacheService } = req.app.locals;
  const cacheKey = CacheService.keys.globalMetrics();

  const metrics = await cacheService.getOrSet(cacheKey, async () => {
    return await graphService.getGlobalMetrics();
  }, 60);

  res.json({
    success: true,
    data: metrics,
    timestamp: new Date().toISOString()
  });
}));

// GET /api/analytics/trends - Get daily metrics and trends
router.get('/trends', asyncHandler(async (req, res) => {
  const { graphService, cacheService } = req.app.locals;
  const { days = 30, startDate, endDate } = req.query;

  let start, end;
  
  if (startDate && endDate) {
    start = startDate;
    end = endDate;
  } else {
    const daysNum = Math.min(Math.max(parseInt(days) || 30, 1), 90);
    end = new Date().toISOString().split('T')[0];
    const startDateTime = new Date();
    startDateTime.setDate(startDateTime.getDate() - daysNum);
    start = startDateTime.toISOString().split('T')[0];
  }

  const cacheKey = CacheService.keys.dailyMetrics(start, end);

  const trends = await cacheService.getOrSet(cacheKey, async () => {
    const result = await graphService.getDailyMetrics(start, end);
    return result.dailyMetrics || [];
  }, 300); // Cache for 5 minutes

  res.json({
    success: true,
    data: {
      trends,
      period: { start, end },
      totalDays: trends.length
    },
    timestamp: new Date().toISOString()
  });
}));

// GET /api/analytics/payment-flows - Analyze payment flows
router.get('/payment-flows', asyncHandler(async (req, res) => {
  const { graphService, cacheService } = req.app.locals;
  const { user, provider, limit = 20 } = req.query;

  const cacheKey = CacheService.keys.paymentFlows(user, provider);

  const flows = await cacheService.getOrSet(cacheKey, async () => {
    const result = await graphService.getPaymentFlows(user, provider, parseInt(limit));
    return result.paymentFlows || [];
  }, 180); // Cache for 3 minutes

  // Calculate additional insights
  const insights = {
    totalFlows: flows.length,
    totalVolume: flows.reduce((sum, flow) => sum + parseFloat(flow.totalAmount || 0), 0),
    totalCalls: flows.reduce((sum, flow) => sum + parseFloat(flow.totalCalls || 0), 0),
    averageFlowSize: flows.length > 0 ? 
      flows.reduce((sum, flow) => sum + parseFloat(flow.totalAmount || 0), 0) / flows.length : 0,
    topFlows: flows.slice(0, 5)
  };

  res.json({
    success: true,
    data: {
      flows,
      insights,
      filters: { user, provider, limit }
    },
    timestamp: new Date().toISOString()
  });
}));

// GET /api/analytics/comparisons - Compare metrics across different periods
router.get('/comparisons', asyncHandler(async (req, res) => {
  const { graphService } = req.app.locals;
  const { period = '7d' } = req.query;

  // Calculate date ranges for current and previous periods
  const periods = calculateComparisonPeriods(period);
  
  const [currentData, previousData] = await Promise.all([
    graphService.getDailyMetrics(periods.current.start, periods.current.end),
    graphService.getDailyMetrics(periods.previous.start, periods.previous.end)
  ]);

  const current = currentData.dailyMetrics || [];
  const previous = previousData.dailyMetrics || [];

  // Calculate aggregated metrics for each period
  const currentMetrics = aggregateMetrics(current);
  const previousMetrics = aggregateMetrics(previous);

  // Calculate percentage changes
  const changes = calculateChanges(currentMetrics, previousMetrics);

  res.json({
    success: true,
    data: {
      period,
      current: {
        period: periods.current,
        metrics: currentMetrics,
        dailyData: current
      },
      previous: {
        period: periods.previous,
        metrics: previousMetrics,
        dailyData: previous
      },
      changes
    },
    timestamp: new Date().toISOString()
  });
}));

// GET /api/analytics/leaderboards - Get various leaderboards
router.get('/leaderboards', asyncHandler(async (req, res) => {
  const { graphService, cacheService } = req.app.locals;
  const { type = 'all', limit = 10 } = req.query;

  const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

  let data = {};

  if (type === 'all' || type === 'providers') {
    const cacheKey = CacheService.keys.topProviders(limitNum);
    data.topProviders = await cacheService.getOrSet(cacheKey, async () => {
      const result = await graphService.getTopProviders(limitNum);
      return result.providers || [];
    }, 180);
  }

  if (type === 'all' || type === 'users') {
    const cacheKey = CacheService.keys.topUsers(limitNum);
    data.topUsers = await cacheService.getOrSet(cacheKey, async () => {
      const result = await graphService.getTopUsers(limitNum);
      return result.users || [];
    }, 180);
  }

  if (type === 'all' || type === 'flows') {
    data.topFlows = await cacheService.getOrSet('leaderboard:flows', async () => {
      const result = await graphService.getPaymentFlows(null, null, limitNum);
      return result.paymentFlows || [];
    }, 180);
  }

  res.json({
    success: true,
    data,
    meta: {
      type,
      limit: limitNum,
      generatedAt: new Date().toISOString()
    }
  });
}));

// GET /api/analytics/insights - Get AI-generated insights
router.get('/insights', asyncHandler(async (req, res) => {
  const { graphService, cacheService, aiInsightsService } = req.app.locals;
  const { refresh = false } = req.query;
  
  const forceRefresh = refresh === 'true';
  
  try {
    // Get fresh data for insights generation
    const [globalMetrics, users, providers, payments, dailyMetrics] = await Promise.all([
      graphService.getGlobalMetrics(),
      graphService.getTopUsers(100), // Get more users for better analysis
      graphService.getTopProviders(100),
      graphService.getRecentPayments(100),
      graphService.getDailyMetrics(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      )
    ]);

    const graphData = {
      globalMetrics,
      users: users.users || [],
      providers: providers.providers || [],
      payments: payments.batchPayments || [],
      dailyMetrics: dailyMetrics.dailyMetrics || []
    };

    // Get insights with caching
    const insights = await aiInsightsService.getInsights(graphData, forceRefresh);
    
    if (!insights) {
      return res.status(503).json({
        success: false,
        error: 'Unable to generate insights at this time',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: insights,
      meta: {
        cacheValid: aiInsightsService.isCacheValid(),
        cacheAge: aiInsightsService.getInsightsAge(),
        forceRefresh
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate insights',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

// GET /api/analytics/insights/query - Query specific insights
router.get('/insights/query', asyncHandler(async (req, res) => {
  const { aiInsightsService } = req.app.locals;
  const { question } = req.query;

  if (!question) {
    return res.status(400).json({
      success: false,
      error: 'Question parameter is required'
    });
  }

  try {
    const response = await aiInsightsService.query(question);
    
    res.json({
      success: true,
      data: response,
      query: question,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to process query',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

// GET /api/analytics/health - Analytics service health check
router.get('/health', asyncHandler(async (req, res) => {
  const { graphService, cacheService } = req.app.locals;

  const health = {
    status: 'healthy',
    services: {
      graph: {
        status: graphService.isHealthy() ? 'healthy' : 'unhealthy',
        endpoint: graphService.endpoint
      },
      cache: {
        status: cacheService.isHealthy() ? 'healthy' : 'unhealthy'
      }
    },
    timestamp: new Date().toISOString()
  };

  // Test actual connectivity
  try {
    await graphService.healthCheck();
  } catch (error) {
    health.services.graph.status = 'unhealthy';
    health.services.graph.error = error.message;
  }

  const overallHealthy = Object.values(health.services).every(service => service.status === 'healthy');
  health.status = overallHealthy ? 'healthy' : 'degraded';

  res.status(overallHealthy ? 200 : 503).json({
    success: overallHealthy,
    data: health
  });
}));

// Helper functions
function calculateComparisonPeriods(period) {
  const now = new Date();
  let days;
  
  switch (period) {
    case '1d': days = 1; break;
    case '7d': days = 7; break;
    case '30d': days = 30; break;
    default: days = 7;
  }

  const currentEnd = now.toISOString().split('T')[0];
  const currentStart = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const previousEnd = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const previousStart = new Date(now.getTime() - (2 * days - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return {
    current: { start: currentStart, end: currentEnd },
    previous: { start: previousStart, end: previousEnd }
  };
}

function aggregateMetrics(dailyData) {
  if (!dailyData.length) return {};

  return dailyData.reduce((acc, day) => {
    acc.totalDeposits = (acc.totalDeposits || 0) + parseFloat(day.totalDeposits || 0);
    acc.totalWithdrawals = (acc.totalWithdrawals || 0) + parseFloat(day.totalWithdrawals || 0);
    acc.totalPayments = (acc.totalPayments || 0) + parseFloat(day.totalPayments || 0);
    acc.totalApiCalls = (acc.totalApiCalls || 0) + parseFloat(day.totalApiCalls || 0);
    acc.uniqueUsers = Math.max(acc.uniqueUsers || 0, parseInt(day.uniqueUsers || 0));
    acc.uniqueProviders = Math.max(acc.uniqueProviders || 0, parseInt(day.uniqueProviders || 0));
    acc.newUsers = (acc.newUsers || 0) + parseInt(day.newUsers || 0);
    acc.newProviders = (acc.newProviders || 0) + parseInt(day.newProviders || 0);
    return acc;
  }, {});
}

function calculateChanges(current, previous) {
  const changes = {};
  
  Object.keys(current).forEach(key => {
    const curr = current[key] || 0;
    const prev = previous[key] || 0;
    
    if (prev === 0) {
      changes[key] = curr > 0 ? Infinity : 0;
    } else {
      changes[key] = ((curr - prev) / prev) * 100;
    }
  });

  return changes;
}

export default router;