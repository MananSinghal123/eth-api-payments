// API client configuration and base methods
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw new Error(`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Analytics endpoints
  async getOverviewMetrics(): Promise<ApiResponse<any>> {
    return this.request('/analytics/overview');
  }

  async getGlobalMetrics(): Promise<ApiResponse<any>> {
    return this.request('/analytics/metrics');
  }

  async getDailyTrends(days: number = 30): Promise<ApiResponse<any>> {
    return this.request(`/analytics/trends?days=${days}`);
  }

  async getPaymentFlows(user?: string, provider?: string, limit?: number): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (user) params.append('user', user);
    if (provider) params.append('provider', provider);
    if (limit) params.append('limit', limit.toString());
    
    return this.request(`/analytics/payment-flows${params.toString() ? '?' + params.toString() : ''}`);
  }

  async getComparisons(period: string = '7d'): Promise<ApiResponse<any>> {
    return this.request(`/analytics/comparisons?period=${period}`);
  }

  async getLeaderboards(type: string = 'all', limit: number = 10): Promise<ApiResponse<any>> {
    return this.request(`/analytics/leaderboards?type=${type}&limit=${limit}`);
  }

  async getAnalyticsHealth(): Promise<ApiResponse<any>> {
    return this.request('/analytics/health');
  }

  // User endpoints
  async getUsers(page: number = 1, limit: number = 50): Promise<ApiResponse<any>> {
    return this.request(`/users?page=${page}&limit=${limit}`);
  }

  async getUserMetrics(): Promise<ApiResponse<any>> {
    return this.request('/users/metrics');
  }

  async getUserSegments(): Promise<ApiResponse<any>> {
    return this.request('/users/segments');
  }

  async getUserBehaviorAnalysis(): Promise<ApiResponse<any>> {
    return this.request('/users/behavior');
  }

  // Provider endpoints
  async getProviders(page: number = 1, limit: number = 50): Promise<ApiResponse<any>> {
    return this.request(`/providers?page=${page}&limit=${limit}`);
  }

  async getProviderMetrics(): Promise<ApiResponse<any>> {
    return this.request('/providers/metrics');
  }

  async getProviderPerformance(): Promise<ApiResponse<any>> {
    return this.request('/providers/performance');
  }

  // Market trends endpoints
  async getMarketTrends(): Promise<ApiResponse<any>> {
    return this.request('/market/trends');
  }

  async getSystemHealth(): Promise<ApiResponse<any>> {
    return this.request('/system/health');
  }

  // Real-time data endpoints
  async getRecentActivity(limit: number = 10): Promise<ApiResponse<any>> {
    return this.request(`/activity/recent?limit=${limit}`);
  }

  async getTopTransactions(timeframe: string = '24h'): Promise<ApiResponse<any>> {
    return this.request(`/transactions/top?timeframe=${timeframe}`);
  }
}

// Create a singleton instance
export const apiClient = new ApiClient();