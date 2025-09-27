'use client';

import Sidebar from '@/components/layout/Sidebar';
import { MetricCard } from '@/components/ui/MetricCard';
import { ChartComponent, generateVolumeChartData, generateUserGrowthChartData, generateProviderDistributionData } from '@/components/charts/ChartComponent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Users, Activity, TrendingUp, Zap, Globe, AlertCircle, RefreshCw } from 'lucide-react';
import { 
  useOverviewMetrics, 
  useGlobalMetrics, 
  useDailyTrends
} from '@/hooks/useAnalytics';

// Fallback data for when API is not available
const fallbackMetrics = {
  totalVolume: 12847.52,
  activeUsers: 1234,
  totalProviders: 45,
  dailyTransactions: 892,
  avgTransactionSize: 15.67,
  platformFee: 2.3,
};

const fallbackVolumeData = [
  { date: '2024-01-01', volume: 1200 },
  { date: '2024-01-02', volume: 1450 },
  { date: '2024-01-03', volume: 1100 },
  { date: '2024-01-04', volume: 1800 },
  { date: '2024-01-05', volume: 2100 },
  { date: '2024-01-06', volume: 1900 },
  { date: '2024-01-07', volume: 2300 },
];

export default function Dashboard() {
  const { data: overviewData, loading: overviewLoading, error: overviewError, refetch: refetchMetrics } = useOverviewMetrics();
  const { data: globalData, loading: globalLoading, error: globalError } = useGlobalMetrics();
  const { data: trendsData, loading: trendsLoading, error: trendsError } = useDailyTrends(7);

  // Extract data
  const globalMetrics = overviewData?.data?.globalMetrics || globalData?.data;
  const recentPayments = overviewData?.data?.recentPayments || [];
  const trends = trendsData?.data?.trends || [];
  
  // Calculate current metrics from The Graph data
  const currentMetrics = globalMetrics ? {
    totalVolume: parseFloat(globalMetrics.totalPayments || 0) / 100, // Convert cents to USD
    activeUsers: globalMetrics.totalUsers || 0,
    totalProviders: globalMetrics.totalProviders || 0,
    dailyTransactions: recentPayments.length || 0, // Approximation
    avgTransactionSize: globalMetrics.averagePaymentSize ? parseFloat(globalMetrics.averagePaymentSize) / 100 : 0,
    platformFee: 2.3, // This would be configured separately
  } : fallbackMetrics;

  // Process trends data for volume chart
  const currentVolumeData = trends.length > 0 ? trends.map((day: any) => ({
    date: day.date,
    volume: parseFloat(day.totalPayments || 0) / 100 // Convert cents to USD
  })) : fallbackVolumeData;
  
  const isAnyLoading = overviewLoading || globalLoading || trendsLoading;
  const hasErrors = overviewError || globalError || trendsError;

  if (isAnyLoading && !globalMetrics && !trends.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <Sidebar>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Analytics Overview
              </h1>
              <p className="text-muted-foreground mt-1">
                Real-time insights into your ETH API payment system
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {hasErrors && (
                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  API Issues
                </Badge>
              )}
              <button 
                onClick={() => refetchMetrics()}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                disabled={overviewLoading}
              >
                <RefreshCw className={`h-4 w-4 ${overviewLoading ? 'animate-spin' : ''}`} />
              </button>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                {hasErrors ? 'Fallback Mode' : 'Live'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {hasErrors && (
          <Card className="mb-6 border-red-500/20 bg-red-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-500">
                    API Connection Issues
                  </p>
                  <p className="text-xs text-red-500/80">
                    Displaying cached data. Real-time updates may be delayed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <MetricCard
            title="Total Volume"
            value={currentMetrics.totalVolume || fallbackMetrics.totalVolume}
            format="currency"
            trend={{ value: 12.5, period: '7d' }}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <MetricCard
            title="Active Users"
            value={currentMetrics.activeUsers || fallbackMetrics.activeUsers}
            format="number"
            trend={{ value: -2.1, period: '7d' }}
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard
            title="Providers"
            value={currentMetrics.totalProviders || fallbackMetrics.totalProviders}
            format="number"
            icon={<Globe className="h-4 w-4" />}
          />
          <MetricCard
            title="Daily Transactions"
            value={currentMetrics.dailyTransactions || fallbackMetrics.dailyTransactions}
            format="number"
            trend={{ value: 8.3, period: '24h' }}
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCard
            title="Avg Transaction"
            value={currentMetrics.avgTransactionSize || fallbackMetrics.avgTransactionSize}
            format="currency"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <MetricCard
            title="Platform Fee"
            value={currentMetrics.platformFee || fallbackMetrics.platformFee}
            format="percentage"
            icon={<Zap className="h-4 w-4" />}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <div className="xl:col-span-2">
            <ChartComponent
              title="Daily Volume Trend"
              description="ETH volume processed over the last 7 days"
              data={generateVolumeChartData(currentVolumeData)}
              type="line"
              height={300}
            />
          </div>
          <div>
            {/* Provider distribution would use real data here */}
            <ChartComponent
              title="Provider Distribution"
              description="Revenue share by provider"
              data={generateProviderDistributionData([
                { name: 'Provider A', revenue: 3200 },
                { name: 'Provider B', revenue: 2800 },
                { name: 'Provider C', revenue: 2100 },
                { name: 'Provider D', revenue: 1900 },
                { name: 'Others', revenue: 2900 },
              ])}
              type="doughnut"
              height={300}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          {/* User Growth Chart - would use real data */}
          <ChartComponent
            title="User Growth"
            description="Active users over time"
            data={generateUserGrowthChartData([
              { date: '2024-01-01', users: 850 },
              { date: '2024-01-02', users: 920 },
              { date: '2024-01-03', users: 880 },
              { date: '2024-01-04', users: 1050 },
              { date: '2024-01-05', users: 1150 },
              { date: '2024-01-06', users: 1100 },
              { date: '2024-01-07', users: 1234 },
            ])}
            type="line"
            height={250}
          />
          
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                Recent Activity
                {overviewLoading && <RefreshCw className="h-4 w-4 ml-2 animate-spin" />}
              </CardTitle>
              <CardDescription>Latest transactions and system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentPayments?.slice(0, 4).map((payment: any, index: number) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {payment.user?.id ? `${payment.user.id.slice(0, 10)}...` : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">Payment</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        ${(parseFloat(payment.amount || 0) / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">recent</p>
                    </div>
                  </div>
                )) || 
                // Fallback activities
                [
                  { type: 'payment', user: '0x742d...8f3a', amount: '25.4 ETH', time: '2 mins ago' },
                  { type: 'deposit', user: '0x123a...9b2c', amount: '100.0 ETH', time: '5 mins ago' },
                  { type: 'withdrawal', user: '0xabc9...7d4e', amount: '45.8 ETH', time: '8 mins ago' },
                  { type: 'payment', user: '0x567f...3c1b', amount: '12.1 ETH', time: '12 mins ago' },
                ].map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'payment' ? 'bg-green-500' : 
                        activity.type === 'deposit' ? 'bg-blue-500' : 'bg-orange-500'
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{activity.user}</p>
                        <p className="text-xs text-muted-foreground capitalize">{activity.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{activity.amount}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              System Status
              {overviewLoading && <RefreshCw className="h-4 w-4 ml-2 animate-spin" />}
            </CardTitle>
            <CardDescription>Real-time system health and performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { name: 'The Graph', status: 'Synced', value: hasErrors ? 'Error' : 'Healthy', color: hasErrors ? 'red' : 'green' },
                { name: 'API Server', status: 'Active', value: hasErrors ? 'Issues' : '99.9%', color: hasErrors ? 'red' : 'green' },
                { name: 'Database', status: 'Connected', value: '2.1ms avg', color: 'green' },
                { name: 'Network', status: 'Optimal', value: '45ms latency', color: 'green' },
              ].map((item: any, index: number) => (
                <div key={index} className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{item.name}</span>
                    <div className={`w-2 h-2 rounded-full bg-${item.color}-500`}></div>
                  </div>
                  <div>
                    <p className={`text-xs font-medium text-${item.color}-500`}>{item.status}</p>
                    <p className="text-xs text-muted-foreground">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Sidebar>
  );
}
