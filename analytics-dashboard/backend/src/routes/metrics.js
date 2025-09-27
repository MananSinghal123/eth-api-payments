import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { analyticsRateLimiter, aiRateLimiter } from '../middleware/rateLimiter.js';
import { CacheService } from '../services/CacheService.js';

const router = express.Router();

// GET /api/metrics/global - Get global system metrics
router.get('/global', analyticsRateLimiter, asyncHandler(async (req, res) => {
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

// GET /api/metrics/summary - Get metrics summary with key insights
router.get('/summary', analyticsRateLimiter, asyncHandler(async (req, res) => {
  const { graphService, cacheService, aiInsightsService } = req.app.locals;
  
  const summaryData = await cacheService.getOrSet('metrics:summary', async () => {
    const [globalMetrics, recentPayments, topProviders, topUsers] = await Promise.all([
      graphService.getGlobalMetrics(),
      graphService.getRecentPayments(5),
      graphService.getTopProviders(3),
      graphService.getTopUsers(3)
    ]);

    // Get AI insights if available
    const insights = aiInsightsService.getLatestInsights();

    return {
      global: globalMetrics,
      recent: recentPayments.batchPayments || [],
      topProviders: topProviders.providers || [],
      topUsers: topUsers.users || [],
      aiInsights: insights ? {
        summary: insights.recommendations?.total || 0,
        lastUpdate: insights.timestamp,
        hasAnomalies: insights.anomalies?.totalAnomalies > 0
      } : null
    };
  }, 90); // Cache for 1.5 minutes

  res.json({
    success: true,
    data: summaryData,
    timestamp: new Date().toISOString()
  });
}));

// GET /api/metrics/live - Get live system metrics
router.get('/live', analyticsRateLimiter, asyncHandler(async (req, res) => {
  const { websocketHandler } = req.app.locals;
  
  const liveMetrics = {
    websocket: websocketHandler.getStatus(),
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }
  };

  res.json({
    success: true,
    data: liveMetrics
  });
}));

// GET /api/metrics/ai-insights - Get AI-generated insights
router.get('/ai-insights', aiRateLimiter, asyncHandler(async (req, res) => {
  const { aiInsightsService, cacheService } = req.app.locals;
  
  const insights = await cacheService.getOrSet(
    CacheService.keys.aiInsights(),
    async () => {
      return aiInsightsService.getLatestInsights();
    },
    300 // Cache for 5 minutes
  );

  if (!insights) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'No AI insights available',
        suggestion: 'Insights are generated periodically. Please try again later.'
      }
    });
  }

  res.json({
    success: true,
    data: insights,
    meta: {
      age: aiInsightsService.getInsightsAge(),
      lastUpdate: insights.timestamp
    }
  });
}));

// POST /api/metrics/ai-query - Query AI for specific insights
router.post('/ai-query', aiRateLimiter, asyncHandler(async (req, res) => {
  const { aiInsightsService } = req.app.locals;
  const { question } = req.body;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Question is required and must be a string'
      }
    });
  }

  const answer = await aiInsightsService.query(question);

  res.json({
    success: true,
    data: {
      question,
      answer,
      timestamp: new Date().toISOString()
    }
  });
}));

// GET /api/metrics/performance - Get system performance metrics
router.get('/performance', analyticsRateLimiter, asyncHandler(async (req, res) => {
  const { graphService, cacheService } = req.app.locals;
  const { timeframe = '1h' } = req.query;

  const performanceData = await cacheService.getOrSet(
    `metrics:performance:${timeframe}`,
    async () => {
      // In a production system, you'd collect these metrics over time
      const startTime = Date.now();
      
      // Test Graph service response time
      const graphStartTime = Date.now();
      try {
        await graphService.getGlobalMetrics();
        var graphResponseTime = Date.now() - graphStartTime;
      } catch (error) {
        var graphResponseTime = -1;
      }

      // Test cache response time
      const cacheStartTime = Date.now();
      await cacheService.get('test-key');
      const cacheResponseTime = Date.now() - cacheStartTime;

      return {
        graph: {
          responseTime: graphResponseTime,
          status: graphResponseTime > 0 ? 'healthy' : 'unhealthy',
          endpoint: graphService.endpoint
        },
        cache: {
          responseTime: cacheResponseTime,
          status: cacheService.isHealthy() ? 'healthy' : 'unhealthy'
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          platform: process.platform,
          nodeVersion: process.version
        },
        timestamp: new Date().toISOString()
      };
    },
    60 // Cache for 1 minute
  );

  res.json({
    success: true,
    data: performanceData
  });
}));

// GET /api/metrics/alerts - Get system alerts and warnings
router.get('/alerts', analyticsRateLimiter, asyncHandler(async (req, res) => {
  const { graphService, cacheService, aiInsightsService } = req.app.locals;
  
  const alerts = [];
  
  // Check service health
  if (!graphService.isHealthy()) {
    alerts.push({
      type: 'error',
      service: 'graph',
      message: 'Graph service is unhealthy',
      timestamp: new Date().toISOString(),
      severity: 'high'
    });
  }

  if (!cacheService.isHealthy()) {
    alerts.push({
      type: 'warning',
      service: 'cache',
      message: 'Cache service is unavailable - using fallback',
      timestamp: new Date().toISOString(),
      severity: 'medium'
    });
  }

  // Check AI insights for anomalies
  const insights = aiInsightsService.getLatestInsights();
  if (insights && insights.anomalies) {
    const criticalAnomalies = insights.anomalies.criticalCount || 0;
    const warningAnomalies = insights.anomalies.warningCount || 0;

    if (criticalAnomalies > 0) {
      alerts.push({
        type: 'alert',
        service: 'analytics',
        message: `${criticalAnomalies} critical anomalies detected`,
        timestamp: new Date().toISOString(),
        severity: 'high',
        count: criticalAnomalies
      });
    }

    if (warningAnomalies > 0) {
      alerts.push({
        type: 'warning',
        service: 'analytics',
        message: `${warningAnomalies} anomalies requiring attention`,
        timestamp: new Date().toISOString(),
        severity: 'medium',
        count: warningAnomalies
      });
    }
  }

  // Check system resources
  const memory = process.memoryUsage();
  const memoryUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;
  
  if (memoryUsagePercent > 90) {
    alerts.push({
      type: 'warning',
      service: 'system',
      message: `High memory usage: ${memoryUsagePercent.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
      severity: 'medium',
      value: memoryUsagePercent
    });
  }

  res.json({
    success: true,
    data: {
      alerts,
      summary: {
        total: alerts.length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      }
    },
    timestamp: new Date().toISOString()
  });
}));

// GET /api/metrics/export - Export metrics data
router.get('/export', analyticsRateLimiter, asyncHandler(async (req, res) => {
  const { graphService } = req.app.locals;
  const { format = 'json', days = 7 } = req.query;

  // Calculate date range
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      dateRange: { start: startDate, end: endDate },
      format,
      source: 'eth-api-payments-analytics'
    },
    data: {}
  };

  try {
    const [globalMetrics, dailyMetrics, topProviders, topUsers] = await Promise.all([
      graphService.getGlobalMetrics(),
      graphService.getDailyMetrics(startDate, endDate),
      graphService.getTopProviders(50),
      graphService.getTopUsers(50)
    ]);

    exportData.data = {
      globalMetrics,
      dailyMetrics: dailyMetrics.dailyMetrics || [],
      topProviders: topProviders.providers || [],
      topUsers: topUsers.users || []
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(exportData.data.dailyMetrics);
      
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="analytics-${startDate}-to-${endDate}.csv"`
      });
      
      return res.send(csv);
    }

    // Default JSON format
    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="analytics-${startDate}-to-${endDate}.json"`
    });

    res.json(exportData);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to export metrics data',
        details: error.message
      }
    });
  }
}));

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return 'No data available';
  }

  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(value => 
      typeof value === 'string' && value.includes(',') ? `"${value}"` : value
    ).join(',')
  );

  return [headers, ...rows].join('\n');
}

export default router;