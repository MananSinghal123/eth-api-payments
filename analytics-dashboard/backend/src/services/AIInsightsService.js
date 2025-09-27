import { logger } from '../utils/logger.js';

export class AIInsightsService {
  constructor() {
    this.insights = new Map();
    this.lastUpdate = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    this.isGenerating = false; // Prevent concurrent generation
  }

  // Generate predictive analytics and insights
  async generateInsights(graphData) {
    try {
      const insights = {
        timestamp: new Date().toISOString(),
        
        // User Behavior Insights
        userBehavior: await this.analyzeUserBehavior(graphData),
        
        // Payment Pattern Analysis  
        paymentPatterns: await this.analyzePaymentPatterns(graphData),
        
        // Provider Performance
        providerPerformance: await this.analyzeProviderPerformance(graphData),
        
        // Market Trends
        marketTrends: await this.analyzeMarketTrends(graphData),
        
        // Anomaly Detection
        anomalies: await this.detectAnomalies(graphData),
        
        // Predictions
        predictions: await this.generatePredictions(graphData),
        
        // Recommendations
        recommendations: await this.generateRecommendations(graphData)
      };

      this.insights.set('current', insights);
      this.lastUpdate = new Date();
      
      logger.info('AI insights generated successfully');
      return insights;
    } catch (error) {
      logger.error('Failed to generate AI insights:', error);
      throw error;
    }
  }

  // Analyze user spending patterns and behavior
  async analyzeUserBehavior(data) {
    const { users = [], dailyMetrics = [] } = data;
    
    // Calculate user segments based on spending patterns
    const userSegments = this.segmentUsers(users);
    
    // Analyze retention patterns
    const retentionAnalysis = this.analyzeRetention(users);
    
    // Calculate lifetime value
    const lifetimeValue = this.calculateLifetimeValue(users);
    
    return {
      totalActiveUsers: users.length,
      userSegments,
      retentionAnalysis,
      lifetimeValue,
      insights: [
        this.generateUserInsight(users),
        this.generateRetentionInsight(retentionAnalysis),
        this.generateSpendingInsight(users)
      ]
    };
  }

  // Analyze payment patterns and costs
  async analyzePaymentPatterns(data) {
    const { payments = [], paymentFlows = [] } = data;
    
    // Calculate average costs and patterns
    const costAnalysis = this.analyzeCosts(payments);
    
    // Analyze API usage patterns
    const usagePatterns = this.analyzeUsagePatterns(payments);
    
    // Peak usage times
    const peakTimes = this.analyzePeakUsage(payments);
    
    return {
      totalPayments: payments.length,
      costAnalysis,
      usagePatterns,
      peakTimes,
      insights: [
        this.generateCostInsight(costAnalysis),
        this.generateUsageInsight(usagePatterns),
        this.generatePeakTimeInsight(peakTimes)
      ]
    };
  }

  // Analyze provider performance and earnings
  async analyzeProviderPerformance(data) {
    const { providers = [], paymentFlows = [] } = data;
    
    // Provider ranking by multiple metrics
    const providerRanking = this.rankProviders(providers);
    
    // Market share analysis
    const marketShare = this.calculateMarketShare(providers);
    
    // Growth trends
    const growthTrends = this.analyzeGrowthTrends(providers);
    
    return {
      totalProviders: providers.length,
      providerRanking,
      marketShare,
      growthTrends,
      insights: [
        this.generateProviderInsight(providerRanking),
        this.generateMarketShareInsight(marketShare),
        this.generateGrowthInsight(growthTrends)
      ]
    };
  }

  // Analyze overall market trends
  async analyzeMarketTrends(data) {
    const { dailyMetrics = [] } = data;
    
    // Calculate trend direction and strength
    const trends = this.calculateTrends(dailyMetrics);
    
    // Seasonal patterns
    const seasonality = this.detectSeasonality(dailyMetrics);
    
    // Growth metrics
    const growth = this.calculateGrowthMetrics(dailyMetrics);
    
    return {
      trends,
      seasonality,
      growth,
      insights: [
        this.generateTrendInsight(trends),
        this.generateSeasonalityInsight(seasonality),
        this.generateGrowthInsight(growth)
      ]
    };
  }

  // Detect anomalies and unusual patterns
  async detectAnomalies(data) {
    const anomalies = [];
    
    // Payment amount anomalies
    const paymentAnomalies = this.detectPaymentAnomalies(data.payments || []);
    anomalies.push(...paymentAnomalies);
    
    // User behavior anomalies
    const userAnomalies = this.detectUserAnomalies(data.users || []);
    anomalies.push(...userAnomalies);
    
    // Provider anomalies
    const providerAnomalies = this.detectProviderAnomalies(data.providers || []);
    anomalies.push(...providerAnomalies);
    
    return {
      totalAnomalies: anomalies.length,
      anomalies,
      criticalCount: anomalies.filter(a => a.severity === 'critical').length,
      warningCount: anomalies.filter(a => a.severity === 'warning').length
    };
  }

  // Generate predictions for future trends
  async generatePredictions(data) {
    const predictions = {};
    
    // Revenue predictions
    predictions.revenue = this.predictRevenue(data.dailyMetrics || []);
    
    // User growth predictions
    predictions.userGrowth = this.predictUserGrowth(data.dailyMetrics || []);
    
    // API usage predictions
    predictions.apiUsage = this.predictApiUsage(data.dailyMetrics || []);
    
    // Market dynamics
    predictions.marketDynamics = this.predictMarketDynamics(data);
    
    return predictions;
  }

  // Generate actionable recommendations
  async generateRecommendations(data) {
    const recommendations = [];
    
    // User acquisition recommendations
    recommendations.push(...this.getUserAcquisitionRecommendations(data));
    
    // Pricing optimization recommendations
    recommendations.push(...this.getPricingRecommendations(data));
    
    // Provider onboarding recommendations
    recommendations.push(...this.getProviderRecommendations(data));
    
    // Platform optimization recommendations
    recommendations.push(...this.getPlatformRecommendations(data));
    
    return {
      total: recommendations.length,
      highPriority: recommendations.filter(r => r.priority === 'high'),
      mediumPriority: recommendations.filter(r => r.priority === 'medium'),
      lowPriority: recommendations.filter(r => r.priority === 'low'),
      recommendations
    };
  }

  // Helper methods for analysis
  segmentUsers(users) {
    const segments = {
      whales: users.filter(u => parseFloat(u.totalSpent) > 10000).length,
      heavy: users.filter(u => parseFloat(u.totalSpent) > 1000 && parseFloat(u.totalSpent) <= 10000).length,
      moderate: users.filter(u => parseFloat(u.totalSpent) > 100 && parseFloat(u.totalSpent) <= 1000).length,
      light: users.filter(u => parseFloat(u.totalSpent) <= 100).length
    };
    
    return {
      ...segments,
      distribution: {
        whales: (segments.whales / users.length * 100).toFixed(1),
        heavy: (segments.heavy / users.length * 100).toFixed(1),
        moderate: (segments.moderate / users.length * 100).toFixed(1),
        light: (segments.light / users.length * 100).toFixed(1)
      }
    };
  }

  analyzeRetention(users) {
    const now = Date.now() / 1000;
    const day = 24 * 60 * 60;
    
    const retention = {
      day7: users.filter(u => (now - parseInt(u.lastActivityTimestamp)) <= 7 * day).length,
      day30: users.filter(u => (now - parseInt(u.lastActivityTimestamp)) <= 30 * day).length,
      day90: users.filter(u => (now - parseInt(u.lastActivityTimestamp)) <= 90 * day).length
    };
    
    return {
      ...retention,
      rates: {
        day7: (retention.day7 / users.length * 100).toFixed(1),
        day30: (retention.day30 / users.length * 100).toFixed(1),
        day90: (retention.day90 / users.length * 100).toFixed(1)
      }
    };
  }

  calculateLifetimeValue(users) {
    const values = users.map(u => parseFloat(u.totalSpent));
    values.sort((a, b) => b - a);
    
    return {
      average: (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2),
      median: values[Math.floor(values.length / 2)].toFixed(2),
      top10Percent: values.slice(0, Math.floor(values.length * 0.1))
        .reduce((sum, v) => sum + v, 0) / Math.floor(values.length * 0.1),
      distribution: {
        min: Math.min(...values),
        max: Math.max(...values),
        p25: values[Math.floor(values.length * 0.25)],
        p75: values[Math.floor(values.length * 0.75)]
      }
    };
  }

  // Generate insight messages
  generateUserInsight(users) {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => parseFloat(u.totalSpent) > 0).length;
    const conversionRate = (activeUsers / totalUsers * 100).toFixed(1);
    
    return {
      type: 'user_behavior',
      title: 'User Conversion Analysis',
      message: `${conversionRate}% of registered users have made payments (${activeUsers}/${totalUsers})`,
      actionable: conversionRate < 50,
      recommendation: conversionRate < 50 ? 'Focus on user onboarding and first payment incentives' : null
    };
  }

  generateRetentionInsight(retentionData) {
    const day30Rate = parseFloat(retentionData.rates.day30);
    
    return {
      type: 'user_retention',
      title: '30-Day User Retention',
      message: `${day30Rate}% of users were active in the last 30 days`,
      actionable: day30Rate < 70,
      recommendation: day30Rate < 70 ? 'Implement user re-engagement campaigns' : null
    };
  }

  generateSpendingInsight(users) {
    const avgSpending = users.reduce((sum, u) => sum + parseFloat(u.totalSpent), 0) / users.length;
    
    return {
      type: 'spending_pattern',
      title: 'Average User Spending',
      message: `Users spend an average of $${(avgSpending / 100).toFixed(2)}`,
      trend: avgSpending > 500 ? 'positive' : avgSpending < 100 ? 'concerning' : 'neutral'
    };
  }

  // Public methods
  async getInsights(graphData, forceRefresh = false) {
    const cacheAge = this.getInsightsAge();
    const shouldRefresh = forceRefresh || 
                         !this.insights.has('current') || 
                         (cacheAge && cacheAge > this.cacheTimeout);
    
    if (shouldRefresh && !this.isGenerating) {
      logger.info('Generating fresh AI insights on-demand');
      await this.generateInsights(graphData);
    } else if (this.isGenerating) {
      logger.info('Insights generation in progress, returning cached data');
    }
    
    return this.getLatestInsights();
  }

  async refreshInsights(graphData) {
    if (!graphData) {
      logger.warn('No graph data provided for insights refresh');
      return null;
    }
    
    this.isGenerating = true;
    try {
      logger.info('Refreshing AI insights with fresh data...');
      return await this.generateInsights(graphData);
    } finally {
      this.isGenerating = false;
    }
  }

  isCacheValid() {
    const cacheAge = this.getInsightsAge();
    return this.insights.has('current') && 
           cacheAge !== null && 
           cacheAge <= this.cacheTimeout;
  }

  getLatestInsights() {
    return this.insights.get('current') || null;
  }

  getInsightsAge() {
    return this.lastUpdate ? Date.now() - this.lastUpdate.getTime() : null;
  }

  // MCP Server compatible methods
  async query(question) {
    const insights = this.getLatestInsights();
    if (!insights) {
      return { error: 'No insights available. Please refresh insights first.' };
    }

    // Simple question matching - in production, this would use proper NLP
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('user') && lowerQuestion.includes('behav')) {
      return insights.userBehavior;
    } else if (lowerQuestion.includes('payment') && lowerQuestion.includes('pattern')) {
      return insights.paymentPatterns;
    } else if (lowerQuestion.includes('provider') && lowerQuestion.includes('performance')) {
      return insights.providerPerformance;
    } else if (lowerQuestion.includes('trend')) {
      return insights.marketTrends;
    } else if (lowerQuestion.includes('anomal') || lowerQuestion.includes('unusual')) {
      return insights.anomalies;
    } else if (lowerQuestion.includes('predict') || lowerQuestion.includes('forecast')) {
      return insights.predictions;
    } else if (lowerQuestion.includes('recommend') || lowerQuestion.includes('suggest')) {
      return insights.recommendations;
    }
    
    // Return summary if no specific match
    return {
      summary: 'Available insights categories',
      categories: Object.keys(insights).filter(key => key !== 'timestamp'),
      timestamp: insights.timestamp
    };
  }
}