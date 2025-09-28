// API client configuration and base methods
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3007/api';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`🔗 API Request: ${url}`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      console.log(`📡 API Response [${response.status}]: ${url}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ API Success: ${url}`, data);
      return { data };
    } catch (error) {
      console.error(`❌ API request failed: ${endpoint}`, error);
      throw new Error(`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Analytics endpoints - mapped to sink service endpoints
  async getOverviewMetrics(): Promise<ApiResponse<any>> {
    try {
      // Use the stats endpoint which provides comprehensive data
      const stats = await this.request('/stats');
      const events = await this.request('/events/recent?limit=20');
      
      return {
        data: {
          globalMetrics: stats.data,
          recentPayments: events.data || []
        }
      };
    } catch (error) {
      // If we can't get both, try to get at least stats
      try {
        const stats = await this.request('/stats');
        return {
          data: {
            globalMetrics: stats.data,
            recentPayments: []
          }
        };
      } catch (statsError) {
        throw error; // Re-throw original error
      }
    }
  }

  async getGlobalMetrics(): Promise<ApiResponse<any>> {
    return this.request('/stats');
  }

  async getDailyTrends(days: number = 30): Promise<ApiResponse<any>> {
    // For now, return empty trends as the sink service doesn't have historical data yet
    // This would need to be implemented in the sink service to store historical data
    return {
      data: {
        trends: []
      }
    };
  }

  async getPaymentFlows(user?: string, provider?: string, limit?: number): Promise<ApiResponse<any>> {
    // Use recent events endpoint with filtering
    const limitParam = limit || 50;
    return this.request(`/events/recent?limit=${limitParam}`);
  }

  async getComparisons(period: string = '7d'): Promise<ApiResponse<any>> {
    // Return empty comparisons for now - would need historical data implementation
    return {
      data: {
        comparisons: {
          currentPeriod: {},
          previousPeriod: {},
          change: 0
        }
      }
    };
  }

  async getLeaderboards(type: string = 'all', limit: number = 10): Promise<ApiResponse<any>> {
    // Return empty leaderboards for now - would need aggregated data implementation
    return {
      data: {
        leaderboards: []
      }
    };
  }

  async getAnalyticsHealth(): Promise<ApiResponse<any>> {
    // Map to the health endpoint
    return this.request('/../health'); // Go up one level to get /health instead of /api/health
  }

  // User endpoints - return empty data for now as sink service doesn't have these yet
  async getUsers(page: number = 1, limit: number = 50): Promise<ApiResponse<any>> {
    return {
      data: {
        users: [],
        total: 0,
        page,
        limit
      }
    };
  }

  async getUserMetrics(): Promise<ApiResponse<any>> {
    return {
      data: {
        totalUsers: 0,
        activeUsers: 0,
        newUsers: 0
      }
    };
  }

  async getUserSegments(): Promise<ApiResponse<any>> {
    return {
      data: {
        segments: []
      }
    };
  }

  async getUserBehaviorAnalysis(): Promise<ApiResponse<any>> {
    return {
      data: {
        behavior: []
      }
    };
  }

  // Provider endpoints - return empty data for now
  async getProviders(page: number = 1, limit: number = 50): Promise<ApiResponse<any>> {
    return {
      data: {
        providers: [],
        total: 0,
        page,
        limit
      }
    };
  }

  async getProviderMetrics(): Promise<ApiResponse<any>> {
    return {
      data: {
        totalProviders: 0,
        activeProviders: 0
      }
    };
  }

  async getProviderPerformance(): Promise<ApiResponse<any>> {
    return {
      data: {
        performance: []
      }
    };
  }

  // Market trends endpoints - return empty data for now
  async getMarketTrends(): Promise<ApiResponse<any>> {
    return {
      data: {
        trends: []
      }
    };
  }

  async getSystemHealth(): Promise<ApiResponse<any>> {
    // Map to the health endpoint
    const baseUrl = this.baseUrl.replace('/api', ''); // Remove /api suffix
    const response = await fetch(`${baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return { data };
  }

  // Real-time data endpoints
  async getRecentActivity(limit: number = 10): Promise<ApiResponse<any>> {
    return this.request(`/events/recent?limit=${limit}`);
  }

  async getTopTransactions(timeframe: string = '24h'): Promise<ApiResponse<any>> {
    return this.request(`/events/recent?limit=10`); // Use recent events as top transactions
  }
}

// Create a singleton instance
export const apiClient = new ApiClient();