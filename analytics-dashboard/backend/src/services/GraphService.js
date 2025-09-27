import { GraphQLClient } from 'graphql-request';
import { logger } from '../utils/logger.js';

export class GraphService {
  constructor(endpoint) {
    this.client = new GraphQLClient(endpoint, {
      timeout: 30000,
      retry: 3
    });
    this.endpoint = endpoint;
    this.healthy = true;
  }

  async query(query, variables = {}) {
    try {
      const result = await this.client.request(query, variables);
      this.healthy = true;
      return result;
    } catch (error) {
      this.healthy = false;
      logger.error('GraphQL query failed:', { error: error.message, query, variables });
      throw error;
    }
  }

  // User Analytics Queries
  async getUserAnalytics(userAddress, limit = 10) {
    const query = `
      query GetUserAnalytics($userAddress: Bytes!, $limit: Int!) {
        user(id: $userAddress) {
          id
          totalDeposited
          totalWithdrawn
          currentBalance
          totalSpent
          depositCount
          withdrawalCount
          paymentCount
          firstDepositTimestamp
          lastActivityTimestamp
          deposits(first: $limit, orderBy: timestamp, orderDirection: desc) {
            amount
            timestamp
            blockNumber
            transactionHash
          }
          withdrawals(first: $limit, orderBy: timestamp, orderDirection: desc) {
            amount
            timestamp
            blockNumber
            transactionHash
          }
          paymentsFrom(first: $limit, orderBy: timestamp, orderDirection: desc) {
            amount
            numCalls
            costPerCall
            timestamp
            provider {
              id
            }
            transactionHash
          }
        }
      }
    `;

    return this.query(query, { userAddress: userAddress.toLowerCase(), limit });
  }

  // Provider Analytics Queries
  async getProviderAnalytics(providerAddress, limit = 10) {
    const query = `
      query GetProviderAnalytics($providerAddress: Bytes!, $limit: Int!) {
        provider(id: $providerAddress) {
          id
          totalEarned
          totalWithdrawn
          currentBalance
          paymentCount
          uniqueUsers
          firstPaymentTimestamp
          lastActivityTimestamp
          withdrawals(first: $limit, orderBy: timestamp, orderDirection: desc) {
            amount
            timestamp
            transactionHash
          }
          paymentsTo(first: $limit, orderBy: timestamp, orderDirection: desc) {
            amount
            numCalls
            costPerCall
            timestamp
            user {
              id
            }
            transactionHash
          }
        }
      }
    `;

    return this.query(query, { providerAddress: providerAddress.toLowerCase(), limit });
  }

  // Global Metrics
  async getGlobalMetrics() {
    const query = `
      query GetGlobalMetrics {
        globalMetrics(id: "0x676c6f62616c") {
          totalUsers
          totalProviders
          totalDeposits
          totalWithdrawals
          totalPayments
          totalApiCalls
          totalValueLocked
          averagePaymentSize
          lastUpdatedTimestamp
        }
      }
    `;

    const result = await this.query(query);
    return result.globalMetrics;
  }

  // Daily Metrics with time range
  async getDailyMetrics(startDate, endDate, limit = 30) {
    const query = `
      query GetDailyMetrics($startDate: String!, $endDate: String!, $limit: Int!) {
        dailyMetrics(
          where: { date_gte: $startDate, date_lte: $endDate }
          orderBy: date
          orderDirection: asc
          first: $limit
        ) {
          date
          totalDeposits
          totalWithdrawals
          totalPayments
          uniqueUsers
          uniqueProviders
          newUsers
          newProviders
          totalApiCalls
          averagePaymentAmount
          timestamp
        }
      }
    `;

    return this.query(query, { startDate, endDate, limit });
  }

  // Top Providers by earnings
  async getTopProviders(limit = 10) {
    const query = `
      query GetTopProviders($limit: Int!) {
        providers(
          first: $limit
          orderBy: totalEarned
          orderDirection: desc
          where: { totalEarned_gt: "0" }
        ) {
          id
          totalEarned
          totalWithdrawn
          currentBalance
          paymentCount
          uniqueUsers
          firstPaymentTimestamp
          lastActivityTimestamp
        }
      }
    `;

    return this.query(query, { limit });
  }

  // Top Users by spending
  async getTopUsers(limit = 10) {
    const query = `
      query GetTopUsers($limit: Int!) {
        users(
          first: $limit
          orderBy: totalSpent
          orderDirection: desc
          where: { totalSpent_gt: "0" }
        ) {
          id
          totalDeposited
          totalSpent
          currentBalance
          paymentCount
          firstDepositTimestamp
          lastActivityTimestamp
        }
      }
    `;

    return this.query(query, { limit });
  }

  // Payment Flows Analysis
  async getPaymentFlows(userAddress = null, providerAddress = null, limit = 20) {
    let whereClause = '';
    const variables = { limit };

    if (userAddress && providerAddress) {
      whereClause = 'where: { user: $userAddress, provider: $providerAddress }';
      variables.userAddress = userAddress.toLowerCase();
      variables.providerAddress = providerAddress.toLowerCase();
    } else if (userAddress) {
      whereClause = 'where: { user: $userAddress }';
      variables.userAddress = userAddress.toLowerCase();
    } else if (providerAddress) {
      whereClause = 'where: { provider: $providerAddress }';
      variables.providerAddress = providerAddress.toLowerCase();
    }

    const query = `
      query GetPaymentFlows($limit: Int!${userAddress ? ', $userAddress: Bytes!' : ''}${providerAddress ? ', $providerAddress: Bytes!' : ''}) {
        paymentFlows(
          ${whereClause}
          first: $limit
          orderBy: totalAmount
          orderDirection: desc
        ) {
          id
          user {
            id
          }
          provider {
            id
          }
          totalAmount
          totalCalls
          paymentCount
          firstPaymentTimestamp
          lastPaymentTimestamp
          averageCostPerCall
        }
      }
    `;

    return this.query(query, variables);
  }

  // Recent Payments
  async getRecentPayments(limit = 20) {
    const query = `
      query GetRecentPayments($limit: Int!) {
        batchPayments(
          first: $limit
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          user {
            id
          }
          provider {
            id
          }
          amount
          numCalls
          costPerCall
          timestamp
          blockNumber
          transactionHash
        }
      }
    `;

    return this.query(query, { limit });
  }

  // Get payment trends over time
  async getPaymentTrends(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = new Date().toISOString().split('T')[0];

    const dailyMetrics = await this.getDailyMetrics(startDateStr, endDateStr, days);
    
    return dailyMetrics.dailyMetrics || [];
  }

  // Search functionality
  async searchUsers(searchTerm, limit = 10) {
    // Note: The Graph doesn't support text search, so we'll implement basic filtering
    const query = `
      query SearchUsers($limit: Int!) {
        users(
          first: $limit
          orderBy: totalSpent
          orderDirection: desc
        ) {
          id
          totalDeposited
          totalSpent
          currentBalance
          paymentCount
          lastActivityTimestamp
        }
      }
    `;

    const result = await this.query(query, { limit });
    
    // Client-side filtering (in production, consider implementing this in the subgraph)
    if (searchTerm) {
      const filtered = result.users.filter(user => 
        user.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return { users: filtered };
    }
    
    return result;
  }

  // Health check
  isHealthy() {
    return this.healthy;
  }

  async healthCheck() {
    try {
      await this.getGlobalMetrics();
      this.healthy = true;
      return true;
    } catch (error) {
      this.healthy = false;
      logger.error('Graph service health check failed:', error.message);
      return false;
    }
  }
}