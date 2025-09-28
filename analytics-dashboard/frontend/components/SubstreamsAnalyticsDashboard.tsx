"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Activity, TrendingUp, AlertTriangle, Zap, Brain, DollarSign, Users, Network } from 'lucide-react';

interface AnalyticsData {
  payment_analytics?: {
    total_volume: string;
    unique_users: number;
    unique_providers: number;
    avg_payment_size: string;
    payment_frequency: number;
    block_number: number;
    timestamp?: { seconds: number };
  };
  anomaly_alerts?: Array<{
    anomaly_type: string;
    description: string;
    severity_score: number;
    user_address: Uint8Array;
    provider_address: Uint8Array;
    transaction_hash: string;
    block_number: number;
  }>;
  network_metrics?: {
    total_unique_users: number;
    total_unique_providers: number;
    active_user_provider_pairs: number;
    network_density: number;
    total_network_volume: string;
    top_connections: Array<{
      user_address: Uint8Array;
      provider_address: Uint8Array;
      transaction_count: number;
      relationship_strength: number;
    }>;
  };
}

interface AIInsights {
  user_insights?: {
    user_category: string;
    confidence: number;
    recommendations: string[];
    risk_score: number;
    efficiency_score: number;
  };
  anomaly_score: number;
  cost_suggestions: Array<{
    type: string;
    description: string;
    potential_savings_usd: number;
    confidence: number;
  }>;
  confidence_score: number;
  timestamp: string;
}

export default function SubstreamsAnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [aiInsights, setAIInsights] = useState<AIInsights | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [realTimeData, setRealTimeData] = useState<any[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  // Real-time WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        wsRef.current = new WebSocket('ws://localhost:3007');
        
        wsRef.current.onopen = () => {
          console.log('🔗 Connected to Substreams analytics');
          setConnectionStatus('connected');
        };
        
        wsRef.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'stats') {
              // Convert sink service stats to frontend analytics format
              const stats = message.data;
              const convertedAnalytics = {
                payment_analytics: {
                  total_volume: (parseInt(stats.totalPaymentVolume) + parseInt(stats.totalDepositAmount)).toString(),
                  unique_users: stats.uniqueUsers,
                  unique_providers: stats.uniqueProviders,
                  avg_payment_size: stats.totalBatchPayments > 0 ? 
                    Math.floor(parseInt(stats.totalPaymentVolume) / stats.totalBatchPayments).toString() : "0",
                  payment_frequency: stats.totalBatchPayments,
                  block_number: stats.lastBlockProcessed,
                  timestamp: { seconds: Math.floor(Date.now() / 1000) }
                },
                network_metrics: {
                  total_unique_users: stats.uniqueUsers,
                  total_unique_providers: stats.uniqueProviders,
                  active_user_provider_pairs: Math.min(stats.uniqueUsers, stats.uniqueProviders),
                  network_density: stats.uniqueUsers > 0 ? stats.uniqueProviders / stats.uniqueUsers : 0,
                  total_network_volume: (parseInt(stats.totalPaymentVolume) + parseInt(stats.totalDepositAmount)).toString(),
                  top_connections: []
                }
              };
              
              setAnalyticsData(convertedAnalytics);
              
              // Add to real-time chart data
              const timestamp = new Date().toLocaleTimeString();
              const newDataPoint = {
                time: timestamp,
                volume: parseInt(stats.totalPaymentVolume) + parseInt(stats.totalDepositAmount),
                users: stats.uniqueUsers,
                providers: stats.uniqueProviders,
                anomaly_score: 0.1 // Default low anomaly score
              };
              
              setRealTimeData(prev => [...prev.slice(-19), newDataPoint]);
              
              // Generate mock AI insights for now
              const mockAI = {
                user_insights: {
                  user_category: 'regular_user',
                  confidence: 0.85,
                  recommendations: [
                    "Your payment pattern is optimal",
                    "Consider batching smaller payments",
                    "API usage is well distributed"
                  ],
                  risk_score: 0.1,
                  efficiency_score: 0.9
                },
                anomaly_score: 0.1,
                cost_suggestions: [{
                  type: "batch_optimization",
                  description: "Current usage pattern is efficient",
                  potential_savings_usd: 5,
                  confidence: 0.8
                }],
                confidence_score: 0.85,
                timestamp: new Date().toISOString()
              };
              setAIInsights(mockAI);
            }
            
            if (message.type === 'event') {
              console.log(`📊 Received real-time event: ${message.data.eventType}`);
              setAlertCount(prev => prev + 1);
            }
            
            if (message.type === 'connected') {
              console.log('✅ Sink service connected successfully');
            }
            
            if (message.type === 'error') {
              console.error('❌ Sink service error:', message.error);
            }
            
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        wsRef.current.onclose = () => {
          console.log('🔌 Disconnected from Substreams analytics');
          setConnectionStatus('disconnected');
          
          // Reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000);
        };
        
        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionStatus('disconnected');
        };
        
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setConnectionStatus('disconnected');
        setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Mock data for demonstration when WebSocket is not available
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      const interval = setInterval(() => {
        const mockData: AnalyticsData = {
          payment_analytics: {
            total_volume: (Math.random() * 1000000).toFixed(0),
            unique_users: Math.floor(Math.random() * 100) + 50,
            unique_providers: Math.floor(Math.random() * 20) + 10,
            avg_payment_size: (Math.random() * 1000).toFixed(0),
            payment_frequency: Math.floor(Math.random() * 50) + 10,
            block_number: Math.floor(Math.random() * 1000000) + 18000000,
          },
          network_metrics: {
            total_unique_users: Math.floor(Math.random() * 500) + 200,
            total_unique_providers: Math.floor(Math.random() * 50) + 25,
            active_user_provider_pairs: Math.floor(Math.random() * 200) + 100,
            network_density: Math.random() * 0.3 + 0.1,
            total_network_volume: (Math.random() * 5000000).toFixed(0),
            top_connections: []
          }
        };

        const mockAI: AIInsights = {
          user_insights: {
            user_category: ['power_user', 'regular_user', 'occasional_user'][Math.floor(Math.random() * 3)],
            confidence: Math.random() * 0.4 + 0.6,
            recommendations: [
              "Consider batching smaller payments for gas optimization",
              "Your usage pattern is highly efficient",
              "Diversify API providers for better reliability"
            ],
            risk_score: Math.random() * 0.3,
            efficiency_score: Math.random() * 0.3 + 0.7
          },
          anomaly_score: Math.random() * 0.2,
          cost_suggestions: [
            {
              type: "batch_optimization",
              description: "Batch payments to save ~15% on gas costs",
              potential_savings_usd: Math.random() * 50 + 10,
              confidence: 0.8
            }
          ],
          confidence_score: Math.random() * 0.3 + 0.7,
          timestamp: new Date().toISOString()
        };

        setAnalyticsData(mockData);
        setAIInsights(mockAI);

        const timestamp = new Date().toLocaleTimeString();
        const newDataPoint = {
          time: timestamp,
          volume: parseFloat(mockData.payment_analytics?.total_volume || '0'),
          users: mockData.payment_analytics?.unique_users || 0,
          providers: mockData.payment_analytics?.unique_providers || 0,
          anomaly_score: mockAI.anomaly_score
        };
        
        setRealTimeData(prev => [...prev.slice(-19), newDataPoint]);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [connectionStatus]);

  const formatAddress = (address: Uint8Array | string) => {
    if (!address) return 'N/A';
    const addr = typeof address === 'string' ? address : `0x${Buffer.from(address).toString('hex')}`;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const getUserCategoryColor = (category: string) => {
    switch (category) {
      case 'power_user': return 'bg-green-500';
      case 'regular_user': return 'bg-blue-500';
      case 'occasional_user': return 'bg-yellow-500';
      case 'at_risk_user': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAnomalyColor = (score: number) => {
    if (score > 0.8) return 'text-red-500';
    if (score > 0.5) return 'text-yellow-500';
    return 'text-green-500';
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            AI-Powered API Analytics
          </h1>
          <p className="text-gray-600 mt-1">Real-time insights powered by Substreams & AI</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
            <Activity className="h-3 w-3 mr-1" />
            {connectionStatus === 'connected' ? 'Live Stream' : 'Demo Mode'}
          </Badge>
          {alertCount > 0 && (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {alertCount} Alerts
            </Badge>
          )}
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analyticsData?.payment_analytics?.total_volume || '0')}
            </div>
            <p className="text-xs opacity-90">
              Avg: {formatCurrency(analyticsData?.payment_analytics?.avg_payment_size || '0')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Active Users</CardTitle>
            <Users className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.payment_analytics?.unique_users || 0}
            </div>
            <p className="text-xs opacity-90">
              {analyticsData?.payment_analytics?.unique_providers || 0} providers
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Network Density</CardTitle>
            <Network className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((analyticsData?.network_metrics?.network_density || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-xs opacity-90">
              {analyticsData?.network_metrics?.active_user_provider_pairs || 0} connections
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">AI Confidence</CardTitle>
            <Brain className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((aiInsights?.confidence_score || 0) * 100).toFixed(0)}%
            </div>
            <p className="text-xs opacity-90">
              Anomaly: {((aiInsights?.anomaly_score || 0) * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Real-time Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={realTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="volume" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="users" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              Anomaly Detection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={realTimeData.slice(-10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="anomaly_score" fill="#ff7c7c" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Section */}
      {aiInsights && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                AI User Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">User Category:</span>
                <Badge className={getUserCategoryColor(aiInsights.user_insights?.user_category || '')}>
                  {aiInsights.user_insights?.user_category?.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Risk Score:</span>
                <span className={`text-sm font-bold ${getAnomalyColor(aiInsights.user_insights?.risk_score || 0)}`}>
                  {((aiInsights.user_insights?.risk_score || 0) * 100).toFixed(1)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Efficiency Score:</span>
                <span className="text-sm font-bold text-green-600">
                  {((aiInsights.user_insights?.efficiency_score || 0) * 100).toFixed(1)}%
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">AI Recommendations:</span>
                {aiInsights.user_insights?.recommendations?.slice(0, 3).map((rec, index) => (
                  <Alert key={index} className="py-2">
                    <AlertDescription className="text-xs">{rec}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Cost Optimization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiInsights.cost_suggestions?.map((suggestion, index) => (
                <Alert key={index} className="border-green-200 bg-green-50">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium text-green-800">{suggestion.description}</p>
                      <div className="flex items-center justify-between text-xs text-green-600">
                        <span>Potential Savings: {formatCurrency(suggestion.potential_savings_usd)}</span>
                        <span>Confidence: {(suggestion.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
              
              {(!aiInsights.cost_suggestions || aiInsights.cost_suggestions.length === 0) && (
                <Alert>
                  <AlertDescription>No optimization suggestions at this time.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Anomaly Alerts */}
      {analyticsData?.anomaly_alerts && analyticsData.anomaly_alerts.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Anomaly Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.anomaly_alerts.slice(0, 3).map((alert, index) => (
                <Alert key={index} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">{alert.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span>User: {formatAddress(alert.user_address)}</span>
                        <span>Severity: {(alert.severity_score * 100).toFixed(0)}%</span>
                        <span>Block: #{alert.block_number}</span>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center text-xs text-gray-500 mt-8">
        🚀 Powered by Substreams + Token API + AI • Real-time blockchain analytics with machine learning insights
      </div>
    </div>
  );
}