import { useState, useEffect, useRef, useCallback } from 'react';

export interface EscrowEvent {
  eventType: string;
  userAddress: string;
  providerAddress: string;
  amountCents: string;
  numCalls: number;
  oldVerifier: string;
  newVerifier: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  contractAddress: string;
  gasUsed: number;
  gasPrice: string;
}

export interface RealTimeStats {
  totalDeposits: number;
  totalDepositAmount: string;
  totalWithdrawals: number;
  totalWithdrawalAmount: string;
  totalBatchPayments: number;
  totalPaymentVolume: string;
  uniqueUsers: number;
  uniqueProviders: number;
  totalApiCalls: number;
  recentEvents: EscrowEvent[];
  lastBlockProcessed: number;
}

interface StreamMessage {
  type: 'event' | 'stats' | 'error' | 'connected';
  data?: any;
  error?: string;
  timestamp: number;
}

interface UseSubstreamOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
}

interface UseSubstreamReturn {
  stats: RealTimeStats | null;
  recentEvents: EscrowEvent[];
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
}

export function useSubstream(options: UseSubstreamOptions = {}): UseSubstreamReturn {
  const {
    url = 'ws://localhost:3007', // Updated to match sink service port
    autoConnect = true,
    reconnectInterval = 5000,
  } = options;

  const [stats, setStats] = useState<RealTimeStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<EscrowEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.CONNECTING || 
        ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('🔌 Connected to Substream WebSocket');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttempts.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const message: StreamMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'stats':
              setStats(message.data as RealTimeStats);
              if (message.data?.recentEvents) {
                setRecentEvents(message.data.recentEvents);
              }
              break;
            
            case 'event':
              const newEvent = message.data as EscrowEvent;
              setRecentEvents(prev => [newEvent, ...prev.slice(0, 49)]); // Keep last 50
              break;
            
            case 'connected':
              console.log('✅ Substream service connected:', message.data);
              break;
            
            case 'error':
              console.error('❌ Substream error:', message.error);
              setError(message.error || 'Unknown error');
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        console.log('🔌 Disconnected from Substream WebSocket');
        setIsConnected(false);
        setIsConnecting(false);

        // Attempt to reconnect if not at max attempts
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`🔄 Reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          setError('Max reconnection attempts reached');
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
        setIsConnecting(false);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError('Failed to connect to real-time service');
      setIsConnecting(false);
    }
  }, [url, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    reconnectAttempts.current = 0;
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    stats,
    recentEvents,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
  };
}

// Hook for fetching REST API data as fallback
export function useSubstreamAPI(baseUrl: string = 'http://localhost:3007') {
  const [stats, setStats] = useState<RealTimeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${baseUrl}/api/stats`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setStats(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      console.error('Failed to fetch substream stats:', err);
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  const fetchRecentEvents = useCallback(async (limit: number = 20) => {
    try {
      const response = await fetch(`${baseUrl}/api/events/recent?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data as EscrowEvent[];
    } catch (err) {
      console.error('Failed to fetch recent events:', err);
      return [];
    }
  }, [baseUrl]);

  useEffect(() => {
    fetchStats();
    
    // Set up polling for REST API
    const interval = setInterval(fetchStats, 10000); // Poll every 10 seconds
    
    return () => clearInterval(interval);
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    fetchStats,
    fetchRecentEvents,
  };
}