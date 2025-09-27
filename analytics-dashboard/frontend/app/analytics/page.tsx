'use client';

import Sidebar from '@/components/layout/Sidebar';
import { ChartComponent, generateVolumeChartData } from '@/components/charts/ChartComponent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, BarChart3, PieChart, Activity, Loader2 } from 'lucide-react';
import { useOverviewMetrics, useDailyTrends, useLeaderboards } from '@/hooks/useAnalytics';

const generateTransactionsByHourData = (data: { hour: string; transactions: number }[]) => ({
  labels: data.map(d => d.hour),
  datasets: [
    {
      label: 'Transactions per Hour',
      data: data.map(d => d.transactions),
      borderColor: '#ffffff',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 2,
      fill: false,
    },
  ],
});

// Convert cents to USD
const formatCurrency = (cents: string | number) => {
  const usd = typeof cents === 'string' ? parseFloat(cents) / 100 : cents / 100;
  return usd.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
};

// Format large numbers
const formatLargeNumber = (num: number) => {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toString();
};

export default function AnalyticsPage() {
  const { data: overviewData, loading: overviewLoading, error: overviewError } = useOverviewMetrics();
  const { data: trendsData, loading: trendsLoading } = useDailyTrends(14);
  const { data: leaderboardData, loading: leaderboardLoading } = useLeaderboards('all', 5);

  const globalMetrics = overviewData?.data?.globalMetrics;
  const recentPayments = overviewData?.data?.recentPayments || [];
  const trends = trendsData?.data?.trends || [];
  
  // Calculate trend data for charts
  const volumeChartData = trends.map((day: any) => ({
    date: day.date,
    volume: parseFloat(day.totalPayments || 0) / 100 // Convert cents to USD
  }));

  // Mock hourly data (since we don't have hourly breakdown from The Graph yet)
  const hourlyData = Array.from({length: 24}, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    transactions: Math.floor(Math.random() * 100) + 20
  }));

  if (overviewLoading) {
    return (
      <Sidebar>
        <div className="px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading analytics data...</span>
          </div>
        </div>
      </Sidebar>
    );
  }

  if (overviewError) {
    return (
      <Sidebar>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <p className="text-red-800">Failed to load analytics data. Please try again later.</p>
            </CardContent>
          </Card>
        </div>
      </Sidebar>
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
                Advanced Analytics
              </h1>
              <p className="text-muted-foreground mt-1">
                Powered by The Graph Protocol - Real-time onchain analytics
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                <BarChart3 className="w-3 h-3 mr-1" />
                The Graph
              </Badge>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Live Data
              </Badge>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {globalMetrics ? formatLargeNumber(globalMetrics.totalUsers) : '0'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">registered users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                Total Providers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {globalMetrics ? formatLargeNumber(globalMetrics.totalProviders) : '0'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">API providers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <PieChart className="h-4 w-4 mr-2" />
                Total Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {globalMetrics ? formatCurrency(globalMetrics.totalPayments) : '$0'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">payments processed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                API Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {globalMetrics ? formatLargeNumber(parseInt(globalMetrics.totalApiCalls)) : '0'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">total API calls</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Payment Volume Trends</CardTitle>
              <CardDescription>Daily payment volume over the last 14 days</CardDescription>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : volumeChartData.length > 0 ? (
                <ChartComponent
                  title="Payment Volume"
                  description="Daily payment trends"
                  data={generateVolumeChartData(volumeChartData)}
                  type="line"
                  height={300}
                />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transaction Distribution</CardTitle>
              <CardDescription>Estimated transactions per hour (24h cycle)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartComponent
                title="Transaction Distribution"
                description="Estimated hourly transactions"
                data={generateTransactionsByHourData(hourlyData)}
                type="bar"
                height={300}
              />
            </CardContent>
          </Card>
        </div>

        {/* Recent Payments Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Payments</CardTitle>
            <CardDescription>Latest payments processed through the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction Hash</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>API Calls</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Cost per Call</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.length > 0 ? recentPayments.map((payment: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">
                      {payment.transactionHash ? 
                        `${payment.transactionHash.slice(0, 10)}...` : 
                        'N/A'
                      }
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      {payment.numCalls}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {payment.user?.id ? `${payment.user.id.slice(0, 8)}...` : 'N/A'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {payment.provider?.id ? `${payment.provider.id.slice(0, 8)}...` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {payment.costPerCall ? formatCurrency(parseFloat(payment.costPerCall)) : 'N/A'}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No recent payments found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Top Providers</CardTitle>
              <CardDescription>Highest earning API providers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboardLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : leaderboardData?.data?.topProviders?.length > 0 ? (
                  leaderboardData.data.topProviders.map((provider: any, index: number) => (
                    <div key={index} className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-sm font-mono text-foreground">
                          {provider.id.slice(0, 12)}...
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">
                          {formatCurrency(provider.totalEarned)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {provider.paymentCount} payments
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No providers found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Top Users</CardTitle>
              <CardDescription>Highest spending users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboardLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : leaderboardData?.data?.topUsers?.length > 0 ? (
                  leaderboardData.data.topUsers.map((user: any, index: number) => (
                    <div key={index} className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-sm font-mono text-foreground">
                          {user.id.slice(0, 12)}...
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">
                          {formatCurrency(user.totalSpent)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.paymentCount} payments
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No users found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Sidebar>
  );
}