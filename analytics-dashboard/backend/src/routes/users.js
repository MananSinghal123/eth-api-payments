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

const limitSchema = Joi.number().integer().min(1).max(100).default(10);

// GET /api/users/:address - Get detailed user analytics
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

  const cacheKey = CacheService.keys.userAnalytics(address);

  const userData = await cacheService.getOrSet(cacheKey, async () => {
    const result = await graphService.getUserAnalytics(address, parseInt(limit));
    return result.user;
  }, 120);

  if (!userData) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'User not found',
        address
      }
    });
  }

  // Calculate additional insights
  const insights = calculateUserInsights(userData);

  res.json({
    success: true,
    data: {
      user: userData,
      insights
    },
    timestamp: new Date().toISOString()
  });
}));

// GET /api/users/:address/payments - Get user's payment history
router.get('/:address/payments', asyncHandler(async (req, res) => {
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

  const cacheKey = `user:payments:${address}:${limit}:${offset}`;

  const paymentsData = await cacheService.getOrSet(cacheKey, async () => {
    // Get payment flows for this user
    const result = await graphService.getPaymentFlows(address, null, parseInt(limit) + parseInt(offset));
    return result.paymentFlows || [];
  }, 180);

  // Apply pagination
  const startIndex = parseInt(offset);
  const endIndex = startIndex + parseInt(limit);
  const paginatedPayments = paymentsData.slice(startIndex, endIndex);

  // Calculate payment statistics
  const stats = {
    totalPaymentFlows: paymentsData.length,
    totalAmount: paymentsData.reduce((sum, flow) => sum + parseFloat(flow.totalAmount || 0), 0),
    totalCalls: paymentsData.reduce((sum, flow) => sum + parseFloat(flow.totalCalls || 0), 0),
    uniqueProviders: new Set(paymentsData.map(flow => flow.provider?.id)).size,
    averagePaymentSize: paymentsData.length > 0 ? 
      paymentsData.reduce((sum, flow) => sum + parseFloat(flow.totalAmount || 0), 0) / paymentsData.length : 0
  };

  res.json({
    success: true,
    data: {
      payments: paginatedPayments,
      pagination: {
        limit: parseInt(limit),
        offset: startIndex,
        total: paymentsData.length,
        hasNext: endIndex < paymentsData.length
      },
      stats
    },
    timestamp: new Date().toISOString()
  });
}));

// GET /api/users/:address/spending-patterns - Analyze user spending patterns
router.get('/:address/spending-patterns', asyncHandler(async (req, res) => {
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

  const cacheKey = `user:patterns:${address}`;

  const patterns = await cacheService.getOrSet(cacheKey, async () => {
    // Get comprehensive user data
    const userData = await graphService.getUserAnalytics(address, 50);
    const paymentFlows = await graphService.getPaymentFlows(address, null, 50);

    if (!userData.user) {
      return null;
    }

    return analyzeSpendingPatterns(userData.user, paymentFlows.paymentFlows || []);
  }, 300);

  if (!patterns) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'User not found or insufficient data',
        address
      }
    });
  }

  res.json({
    success: true,
    data: patterns,
    timestamp: new Date().toISOString()
  });
}));

// GET /api/users/search - Search users
router.get('/search', asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.length < 3) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Search query must be at least 3 characters long'
      }
    });
  }

  const { graphService } = req.app.locals;

  const searchResults = await graphService.searchUsers(q, parseInt(limit));

  res.json({
    success: true,
    data: {
      query: q,
      results: searchResults.users || [],
      total: searchResults.users?.length || 0
    },
    timestamp: new Date().toISOString()
  });
}));

// GET /api/users/leaderboard - Get top users by various metrics
router.get('/leaderboard', asyncHandler(async (req, res) => {
  const { metric = 'totalSpent', limit = 10 } = req.query;
  const { graphService, cacheService } = req.app.locals;

  const validMetrics = ['totalSpent', 'totalDeposited', 'paymentCount'];
  if (!validMetrics.includes(metric)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid metric',
        validMetrics
      }
    });
  }

  const cacheKey = `users:leaderboard:${metric}:${limit}`;

  const leaderboard = await cacheService.getOrSet(cacheKey, async () => {
    // For now, we'll use the top users query - in a real implementation,
    // you might want to create specific subgraph queries for different metrics
    const result = await graphService.getTopUsers(parseInt(limit));
    return result.users || [];
  }, 300);

  // Add ranking
  const rankedLeaderboard = leaderboard.map((user, index) => ({
    ...user,
    rank: index + 1,
    metricValue: user[metric]
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

// GET /api/users/segments - Get user segments analysis
router.get('/segments', asyncHandler(async (req, res) => {
  const { graphService, cacheService } = req.app.locals;

  const cacheKey = 'users:segments:analysis';

  const segmentData = await cacheService.getOrSet(cacheKey, async () => {
    // Get all users for segmentation
    const allUsers = await graphService.getTopUsers(1000); // Get up to 1000 users
    return analyzeUserSegments(allUsers.users || []);
  }, 600); // Cache for 10 minutes

  res.json({
    success: true,
    data: segmentData,
    timestamp: new Date().toISOString()
  });
}));

// Helper functions
function calculateUserInsights(userData) {
  const insights = {};

  // Balance insights
  const balance = parseFloat(userData.currentBalance || 0);
  const deposited = parseFloat(userData.totalDeposited || 0);
  const spent = parseFloat(userData.totalSpent || 0);

  insights.balanceRatio = deposited > 0 ? (balance / deposited) * 100 : 0;
  insights.spendingRatio = deposited > 0 ? (spent / deposited) * 100 : 0;
  
  // Activity insights
  const now = Date.now() / 1000;
  const lastActivity = parseInt(userData.lastActivityTimestamp || 0);
  const daysSinceLastActivity = (now - lastActivity) / (24 * 60 * 60);
  
  insights.daysSinceLastActivity = daysSinceLastActivity;
  insights.activityStatus = daysSinceLastActivity < 1 ? 'very_active' :
                          daysSinceLastActivity < 7 ? 'active' :
                          daysSinceLastActivity < 30 ? 'inactive' : 'dormant';

  // Payment behavior
  const paymentCount = parseInt(userData.paymentCount || 0);
  insights.averagePaymentSize = paymentCount > 0 ? spent / paymentCount : 0;

  // User classification
  if (spent > 10000) insights.userTier = 'whale';
  else if (spent > 1000) insights.userTier = 'heavy';
  else if (spent > 100) insights.userTier = 'moderate';
  else insights.userTier = 'light';

  return insights;
}

function analyzeSpendingPatterns(userData, paymentFlows) {
  const patterns = {
    overview: {
      totalSpent: parseFloat(userData.totalSpent || 0),
      totalPayments: parseInt(userData.paymentCount || 0),
      uniqueProviders: paymentFlows.length,
      averagePaymentSize: 0
    },
    providerDistribution: {},
    temporalPatterns: {},
    insights: []
  };

  if (patterns.overview.totalPayments > 0) {
    patterns.overview.averagePaymentSize = patterns.overview.totalSpent / patterns.overview.totalPayments;
  }

  // Provider spending distribution
  paymentFlows.forEach(flow => {
    const providerId = flow.provider?.id || 'unknown';
    const amount = parseFloat(flow.totalAmount || 0);
    
    if (!patterns.providerDistribution[providerId]) {
      patterns.providerDistribution[providerId] = {
        amount: 0,
        calls: 0,
        payments: 0,
        percentage: 0
      };
    }
    
    patterns.providerDistribution[providerId].amount += amount;
    patterns.providerDistribution[providerId].calls += parseFloat(flow.totalCalls || 0);
    patterns.providerDistribution[providerId].payments += parseInt(flow.paymentCount || 0);
  });

  // Calculate percentages
  Object.keys(patterns.providerDistribution).forEach(providerId => {
    patterns.providerDistribution[providerId].percentage = 
      (patterns.providerDistribution[providerId].amount / patterns.overview.totalSpent) * 100;
  });

  // Generate insights
  if (paymentFlows.length === 1) {
    patterns.insights.push({
      type: 'loyalty',
      message: 'User shows high provider loyalty, using only one service',
      impact: 'positive'
    });
  } else if (paymentFlows.length > 5) {
    patterns.insights.push({
      type: 'diversification',
      message: 'User diversifies across multiple providers',
      impact: 'neutral'
    });
  }

  return patterns;
}

function analyzeUserSegments(users) {
  const segments = {
    bySpending: {
      whales: { users: [], threshold: 10000, count: 0 },
      heavy: { users: [], threshold: 1000, count: 0 },
      moderate: { users: [], threshold: 100, count: 0 },
      light: { users: [], threshold: 0, count: 0 }
    },
    byActivity: {
      veryActive: { users: [], daysThreshold: 1, count: 0 },
      active: { users: [], daysThreshold: 7, count: 0 },
      inactive: { users: [], daysThreshold: 30, count: 0 },
      dormant: { users: [], daysThreshold: Infinity, count: 0 }
    },
    summary: {
      total: users.length,
      activeUsers: 0,
      totalVolume: 0
    }
  };

  const now = Date.now() / 1000;

  users.forEach(user => {
    const spent = parseFloat(user.totalSpent || 0);
    const lastActivity = parseInt(user.lastActivityTimestamp || 0);
    const daysSinceActivity = (now - lastActivity) / (24 * 60 * 60);

    segments.summary.totalVolume += spent;
    if (spent > 0) segments.summary.activeUsers++;

    // Spending segments
    if (spent >= 10000) {
      segments.bySpending.whales.users.push(user);
      segments.bySpending.whales.count++;
    } else if (spent >= 1000) {
      segments.bySpending.heavy.users.push(user);
      segments.bySpending.heavy.count++;
    } else if (spent >= 100) {
      segments.bySpending.moderate.users.push(user);
      segments.bySpending.moderate.count++;
    } else {
      segments.bySpending.light.users.push(user);
      segments.bySpending.light.count++;
    }

    // Activity segments
    if (daysSinceActivity < 1) {
      segments.byActivity.veryActive.users.push(user);
      segments.byActivity.veryActive.count++;
    } else if (daysSinceActivity < 7) {
      segments.byActivity.active.users.push(user);
      segments.byActivity.active.count++;
    } else if (daysSinceActivity < 30) {
      segments.byActivity.inactive.users.push(user);
      segments.byActivity.inactive.count++;
    } else {
      segments.byActivity.dormant.users.push(user);
      segments.byActivity.dormant.count++;
    }
  });

  // Calculate percentages
  ['whales', 'heavy', 'moderate', 'light'].forEach(tier => {
    segments.bySpending[tier].percentage = (segments.bySpending[tier].count / users.length) * 100;
  });

  ['veryActive', 'active', 'inactive', 'dormant'].forEach(tier => {
    segments.byActivity[tier].percentage = (segments.byActivity[tier].count / users.length) * 100;
  });

  return segments;
}

export default router;