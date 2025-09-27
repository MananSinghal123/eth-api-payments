'use client';

import { apiClient } from '@/lib/api/client';
import { useApi } from './useApi';

// Overview metrics hook
export function useOverviewMetrics() {
  return useApi(
    () => apiClient.getOverviewMetrics(),
    { 
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );
}

// Global metrics hook
export function useGlobalMetrics() {
  return useApi(
    () => apiClient.getGlobalMetrics(),
    { 
      refetchInterval: 60000, // Refetch every minute
    }
  );
}

// Daily trends hook
export function useDailyTrends(days: number = 30) {
  return useApi(
    () => apiClient.getDailyTrends(days),
    { 
      refetchInterval: 60000, // Refetch every minute
    }
  );
}

// Payment flows hook
export function usePaymentFlows(user?: string, provider?: string, limit?: number) {
  return useApi(
    () => apiClient.getPaymentFlows(user, provider, limit),
    { 
      refetchInterval: 30000,
    }
  );
}

// Comparisons hook
export function useComparisons(period: string = '7d') {
  return useApi(
    () => apiClient.getComparisons(period),
    { 
      refetchInterval: 60000,
    }
  );
}

// Leaderboards hook
export function useLeaderboards(type: string = 'all', limit: number = 10) {
  return useApi(
    () => apiClient.getLeaderboards(type, limit),
    { 
      refetchInterval: 60000,
    }
  );
}

// Users data hook
export function useUsers(page: number = 1, limit: number = 50) {
  return useApi(
    () => apiClient.getUsers(page, limit),
    { 
      refetchInterval: 60000,
    }
  );
}

// User metrics hook
export function useUserMetrics() {
  return useApi(
    () => apiClient.getUserMetrics(),
    { 
      refetchInterval: 30000,
    }
  );
}

// User segments hook
export function useUserSegments() {
  return useApi(
    () => apiClient.getUserSegments(),
    { 
      refetchInterval: 60000,
    }
  );
}

// Providers hook
export function useProviders(page: number = 1, limit: number = 50) {
  return useApi(
    () => apiClient.getProviders(page, limit),
    { 
      refetchInterval: 60000,
    }
  );
}

// Provider metrics hook
export function useProviderMetrics() {
  return useApi(
    () => apiClient.getProviderMetrics(),
    { 
      refetchInterval: 30000,
    }
  );
}

// Market trends hook
export function useMarketTrends() {
  return useApi(
    () => apiClient.getMarketTrends(),
    { 
      refetchInterval: 60000,
    }
  );
}

// System health hook
export function useSystemHealth() {
  return useApi(
    () => apiClient.getSystemHealth(),
    { 
      refetchInterval: 10000, // Check every 10 seconds
    }
  );
}

// Recent activity hook
export function useRecentActivity(limit: number = 10) {
  return useApi(
    () => apiClient.getRecentActivity(limit),
    { 
      refetchInterval: 5000, // Very frequent updates for real-time feel
    }
  );
}

// Top transactions hook
export function useTopTransactions(timeframe: string = '24h') {
  return useApi(
    () => apiClient.getTopTransactions(timeframe),
    { 
      refetchInterval: 30000,
    }
  );
}