import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { analyticsRateLimiter } from '../middleware/rateLimiter.js';
import { CacheService } from '../services/CacheService.js';
import Joi from 'joi';

const router = express.Router();

// Apply rate limiting
router.use(analyticsRateLimiter);

// Validation schemas
const addressSchema = Joi.string()
  .pattern(/^0x[a-fA-F0-9]{40}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid Ethereum address format',
    'any.required': 'Address is required'
  });

// GET /api/providers/:address - Get detailed provider analytics
router.get('/:address', asyncHandler(async (req, res) => {
  const { error, value } = addressSchema.validate(req.params.address);
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation Error',
        details: error.details[0].message
      }
    });
  }

  const { graphService, cacheService } = req.app.locals;
  const address = value.toLowerCase();
  const { limit = 10 } = req.query;

  const cacheKey = CacheService.keys.providerAnalytics(address);

  const providerData = await cacheService.getOrSet(cacheKey, async () => {
    const result = await graphService.getProviderAnalytics(address, parseInt(limit));
    return result.provider;
  }, 120);

  if (!providerData) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Provider not found',
        address
      }
    });
  }

  // Calculate additional insights
  const insights = calculateProviderInsights(providerData);

  res.json({
    success: true,
    data: {
      provider: providerData,
      insights
    },
    timestamp: new Date().toISOString()
  });
}));

// GET /api/providers/:address/earnings - Get provider's earnings history
router.get('/:address/earnings', asyncHandler(async (req, res) => {
  const { error, value } = addressSchema.validate(req.params.address);
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation Error',
        details: error.details[0].message
      }
    });
  }

  const { graphService, cacheService } = req.app.locals;
  const address = value.toLowerCase();
  const { limit = 20, offset = 0 } = req.query;

  const cacheKey = `provider:earnings:${address}:${limit}:${offset}`;

  const earningsData = await cacheService.getOrSet(cacheKey, async () => {
    // Get payment flows to this provider
    const result = await graphService.getPaymentFlows(null, address, parseInt(limit) + parseInt(offset));
    return result.paymentFlows || [];
  }, 180);

  // Apply pagination
  const startIndex = parseInt(offset);
  const endIndex = startIndex + parseInt(limit);
  const paginatedEarnings = earningsData.slice(startIndex, endIndex);

  // Calculate earnings statistics
  const stats = {
    totalEarningFlows: earningsData.length,
    totalEarnings: earningsData.reduce((sum, flow) => sum + parseFloat(flow.totalAmount || 0), 0),
    totalApiCalls: earningsData.reduce((sum, flow) => sum + parseFloat(flow.totalCalls || 0), 0),
    uniqueUsers: new Set(earningsData.map(flow => flow.user?.id)).size,
    averageRevenuePerUser: earningsData.length > 0 ? 
      earningsData.reduce((sum, flow) => sum + parseFloat(flow.totalAmount || 0), 0) / earningsData.length : 0
  };

  // Calculate ARPU (Average Revenue Per User) if unique users > 0
  if (stats.uniqueUsers > 0) {
    stats.arpu = stats.totalEarnings / stats.uniqueUsers;
  } else {
    stats.arpu = 0;
  }

  res.json({
    success: true,
    data: {
      earnings: paginatedEarnings,
      pagination: {
        limit: parseInt(limit),
        offset: startIndex,
        total: earningsData.length,
        hasNext: endIndex < earningsData.length
      },
      stats
    },
    timestamp: new Date().toISOString()
  });
}));

// GET /api/providers/:address/performance - Analyze provider performance metrics
router.get('/:address/performance', asyncHandler(async (req, res) => {
  const { error, value } = addressSchema.validate(req.params.address);
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation Error',
        details: error.details[0].message
      }
    });
  }

  const { graphService, cacheService } = req.app.locals;
  const address = value.toLowerCase();

  const cacheKey = `provider:performance:${address}`;

  const performance = await cacheService.getOrSet(cacheKey, async () => {
    // Get comprehensive provider data
    const providerData = await graphService.getProviderAnalytics(address, 100);
    const paymentFlows = await graphService.getPaymentFlows(null, address, 100);
    const allProviders = await graphService.getTopProviders(100);

    if (!providerData.provider) {
      return null;
    }

    return analyzeProviderPerformance(
      providerData.provider, 
      paymentFlows.paymentFlows || [], 
      allProviders.providers || []
    );
  }, 300);

  if (!performance) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Provider not found or insufficient data',
        address
      }
    });
  }

  res.json({
    success: true,
    data: performance,
    timestamp: new Date().toISOString()
  });
}));

// GET /api/providers/leaderboard - Get top providers by various metrics
router.get('/leaderboard', asyncHandler(async (req, res) => {
  const { metric = 'totalEarned', limit = 10 } = req.query;
  const { graphService, cacheService } = req.app.locals;

  const validMetrics = ['totalEarned', 'paymentCount', 'uniqueUsers', 'currentBalance'];
  if (!validMetrics.includes(metric)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid metric',
        validMetrics
      }
    });
  }

  const cacheKey = `providers:leaderboard:${metric}:${limit}`;

  const leaderboard = await cacheService.getOrSet(cacheKey, async () => {
    const result = await graphService.getTopProviders(parseInt(limit));
    return result.providers || [];
  }, 300);

  // Sort by the requested metric (since subgraph might not support all sorting options)
  const sortedLeaderboard = leaderboard.sort((a, b) => {
    const aValue = parseFloat(a[metric] || 0);
    const bValue = parseFloat(b[metric] || 0);
    return bValue - aValue;
  });

  // Add ranking
  const rankedLeaderboard = sortedLeaderboard.map((provider, index) => ({
    ...provider,
    rank: index + 1,
    metricValue: provider[metric]
  }));

  res.json({
    success: true,
    data: {
      metric,
      leaderboard: rankedLeaderboard,
      total: rankedLeaderboard.length
    },
    timestamp: new Date().toISOString()
  });
}));

// GET /api/providers/market-share - Get provider market share analysis
router.get('/market-share', asyncHandler(async (req, res) => {
  const { graphService, cacheService } = req.app.locals;
  const { limit = 20 } = req.query;

  const cacheKey = `providers:market-share:${limit}`;

  const marketShare = await cacheService.getOrSet(cacheKey, async () => {
    const [providers, globalMetrics] = await Promise.all([
      graphService.getTopProviders(parseInt(limit)),
      graphService.getGlobalMetrics()
    ]);

    return analyzeMarketShare(providers.providers || [], globalMetrics);
  }, 600); // Cache for 10 minutes

  res.json({
    success: true,
    data: marketShare,
    timestamp: new Date().toISOString()
  });
}));

// GET /api/providers/growth-trends - Analyze provider growth trends
router.get('/growth-trends', asyncHandler(async (req, res) => {
  const { graphService, cacheService } = req.app.locals;
  const { days = 30 } = req.query;

  const cacheKey = `providers:growth:${days}`;

  const growth = await cacheService.getOrSet(cacheKey, async () => {
    // Calculate date range
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const [dailyMetrics, providers] = await Promise.all([
      graphService.getDailyMetrics(startDate, endDate),
      graphService.getTopProviders(50)
    ]);

    return analyzeProviderGrowth(dailyMetrics.dailyMetrics || [], providers.providers || []);
  }, 900); // Cache for 15 minutes

  res.json({
    success: true,
    data: growth,
    timestamp: new Date().toISOString()
  });
}));

// GET /api/providers/pricing-analysis - Analyze pricing across providers
router.get('/pricing-analysis', asyncHandler(async (req, res) => {
  const { graphService, cacheService } = req.app.locals;

  const cacheKey = 'providers:pricing:analysis';

  const pricingData = await cacheService.getOrSet(cacheKey, async () => {
    // Get all payment flows to analyze pricing
    const paymentFlows = await graphService.getPaymentFlows(null, null, 200);
    return analyzePricing(paymentFlows.paymentFlows || []);
  }, 600);

  res.json({
    success: true,
    data: pricingData,
    timestamp: new Date().toISOString()
  });
}));

// Helper functions
function calculateProviderInsights(providerData) {
  const insights = {};

  // Revenue insights
  const totalEarned = parseFloat(providerData.totalEarned || 0);
  const totalWithdrawn = parseFloat(providerData.totalWithdrawn || 0);
  const currentBalance = parseFloat(providerData.currentBalance || 0);

  insights.withdrawalRatio = totalEarned > 0 ? (totalWithdrawn / totalEarned) * 100 : 0;
  insights.retainedEarnings = totalEarned - totalWithdrawn;

  // User engagement
  const uniqueUsers = parseInt(providerData.uniqueUsers || 0);
  const paymentCount = parseInt(providerData.paymentCount || 0);

  insights.averagePaymentsPerUser = uniqueUsers > 0 ? paymentCount / uniqueUsers : 0;
  insights.userEngagement = uniqueUsers > 0 && paymentCount > uniqueUsers ? 'high' : 'low';

  // Activity status
  const now = Date.now() / 1000;
  const lastActivity = parseInt(providerData.lastActivityTimestamp || 0);
  const daysSinceLastActivity = (now - lastActivity) / (24 * 60 * 60);

  insights.daysSinceLastActivity = daysSinceLastActivity;
  insights.activityStatus = daysSinceLastActivity < 1 ? 'very_active' :
                          daysSinceLastActivity < 7 ? 'active' :
                          daysSinceLastActivity < 30 ? 'inactive' : 'dormant';

  // Revenue per user
  insights.arpu = uniqueUsers > 0 ? totalEarned / uniqueUsers : 0;

  return insights;
}

function analyzeProviderPerformance(providerData, paymentFlows, allProviders) {
  const performance = {
    overview: {
      totalEarned: parseFloat(providerData.totalEarned || 0),
      uniqueUsers: parseInt(providerData.uniqueUsers || 0),
      paymentCount: parseInt(providerData.paymentCount || 0),
      marketPosition: 0
    },
    benchmarks: {},
    userAnalytics: {},
    insights: []
  };

  // Calculate market position
  const sortedProviders = allProviders.sort((a, b) => 
    parseFloat(b.totalEarned || 0) - parseFloat(a.totalEarned || 0)
  );
  performance.overview.marketPosition = sortedProviders.findIndex(p => 
    p.id.toLowerCase() === providerData.id.toLowerCase()
  ) + 1;

  // Benchmarks against market averages
  if (allProviders.length > 0) {
    const avgEarnings = allProviders.reduce((sum, p) => sum + parseFloat(p.totalEarned || 0), 0) / allProviders.length;
    const avgUsers = allProviders.reduce((sum, p) => sum + parseInt(p.uniqueUsers || 0), 0) / allProviders.length;
    const avgPayments = allProviders.reduce((sum, p) => sum + parseInt(p.paymentCount || 0), 0) / allProviders.length;

    performance.benchmarks = {
      earningsVsMarket: performance.overview.totalEarned / avgEarnings,
      usersVsMarket: performance.overview.uniqueUsers / avgUsers,
      paymentsVsMarket: performance.overview.paymentCount / avgPayments
    };
  }

  // User analytics from payment flows
  const userDistribution = {};
  let totalRevenue = 0;
  
  paymentFlows.forEach(flow => {
    const userId = flow.user?.id || 'unknown';
    const amount = parseFloat(flow.totalAmount || 0);
    
    if (!userDistribution[userId]) {
      userDistribution[userId] = {
        totalSpent: 0,
        paymentCount: 0,
        avgPaymentSize: 0
      };
    }
    
    userDistribution[userId].totalSpent += amount;
    userDistribution[userId].paymentCount += parseInt(flow.paymentCount || 0);
    totalRevenue += amount;
  });

  // Calculate user value distribution
  const userValues = Object.values(userDistribution);
  userValues.sort((a, b) => b.totalSpent - a.totalSpent);

  performance.userAnalytics = {
    topUsers: userValues.slice(0, 10),
    userValueDistribution: {
      top10Percent: userValues.slice(0, Math.ceil(userValues.length * 0.1))
        .reduce((sum, user) => sum + user.totalSpent, 0),
      totalRevenue
    }
  };

  // Generate insights
  if (performance.overview.marketPosition <= 3) {
    performance.insights.push({
      type: 'market_leader',
      message: `Top ${performance.overview.marketPosition} provider by earnings`,
      impact: 'positive'
    });
  }

  if (performance.benchmarks.usersVsMarket > 1.5) {
    performance.insights.push({
      type: 'user_acquisition',
      message: 'Strong user acquisition - 50% above market average',
      impact: 'positive'
    });
  }

  return performance;
}

function analyzeMarketShare(providers, globalMetrics) {
  const totalMarketEarnings = parseFloat(globalMetrics?.totalPayments || 0);
  
  const marketShare = {
    totalMarket: totalMarketEarnings,
    providers: providers.map(provider => {
      const earnings = parseFloat(provider.totalEarned || 0);
      return {
        ...provider,
        marketShare: totalMarketEarnings > 0 ? (earnings / totalMarketEarnings) * 100 : 0,
        earnings
      };
    }),
    concentration: {}
  };

  // Calculate market concentration metrics
  const sortedByEarnings = marketShare.providers.sort((a, b) => b.earnings - a.earnings);
  
  marketShare.concentration = {
    hhi: calculateHHI(sortedByEarnings.map(p => p.marketShare)),
    top3Share: sortedByEarnings.slice(0, 3).reduce((sum, p) => sum + p.marketShare, 0),
    top5Share: sortedByEarnings.slice(0, 5).reduce((sum, p) => sum + p.marketShare, 0),
    topProvider: sortedByEarnings[0]
  };

  return marketShare;
}

function analyzeProviderGrowth(dailyMetrics, providers) {
  // This is a simplified growth analysis
  // In a real implementation, you'd track provider-specific metrics over time
  
  const growth = {
    overall: {
      newProviders: dailyMetrics.reduce((sum, day) => sum + parseInt(day.newProviders || 0), 0),
      totalProviders: providers.length,
      growthRate: 0
    },
    trends: dailyMetrics.map(day => ({
      date: day.date,
      newProviders: parseInt(day.newProviders || 0),
      totalPayments: parseFloat(day.totalPayments || 0),
      totalApiCalls: parseFloat(day.totalApiCalls || 0)
    }))
  };

  // Calculate growth rate (simplified)
  if (dailyMetrics.length > 1) {
    const firstWeek = dailyMetrics.slice(0, 7).reduce((sum, day) => 
      sum + parseInt(day.newProviders || 0), 0);
    const lastWeek = dailyMetrics.slice(-7).reduce((sum, day) => 
      sum + parseInt(day.newProviders || 0), 0);
    
    growth.overall.growthRate = firstWeek > 0 ? ((lastWeek - firstWeek) / firstWeek) * 100 : 0;
  }

  return growth;
}

function analyzePricing(paymentFlows) {
  const pricingData = {
    overview: {
      totalFlows: paymentFlows.length,
      avgCostPerCall: 0,
      medianCostPerCall: 0,
      priceRange: { min: 0, max: 0 }
    },
    providerPricing: {},
    distribution: {},
    insights: []
  };

  if (paymentFlows.length === 0) return pricingData;

  // Calculate costs per call
  const costs = paymentFlows
    .filter(flow => parseFloat(flow.totalCalls || 0) > 0)
    .map(flow => parseFloat(flow.averageCostPerCall || 0))
    .filter(cost => cost > 0);

  if (costs.length === 0) return pricingData;

  costs.sort((a, b) => a - b);

  pricingData.overview.avgCostPerCall = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
  pricingData.overview.medianCostPerCall = costs[Math.floor(costs.length / 2)];
  pricingData.overview.priceRange = { min: costs[0], max: costs[costs.length - 1] };

  // Provider-specific pricing
  paymentFlows.forEach(flow => {
    const providerId = flow.provider?.id || 'unknown';
    const cost = parseFloat(flow.averageCostPerCall || 0);
    
    if (cost > 0) {
      if (!pricingData.providerPricing[providerId]) {
        pricingData.providerPricing[providerId] = {
          costs: [],
          avgCost: 0,
          minCost: cost,
          maxCost: cost
        };
      }
      
      const providerData = pricingData.providerPricing[providerId];
      providerData.costs.push(cost);
      providerData.minCost = Math.min(providerData.minCost, cost);
      providerData.maxCost = Math.max(providerData.maxCost, cost);
    }
  });

  // Calculate averages for each provider
  Object.keys(pricingData.providerPricing).forEach(providerId => {
    const costs = pricingData.providerPricing[providerId].costs;
    pricingData.providerPricing[providerId].avgCost = 
      costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
  });

  return pricingData;
}

function calculateHHI(marketShares) {
  return marketShares.reduce((sum, share) => sum + Math.pow(share, 2), 0);
}

export default router;