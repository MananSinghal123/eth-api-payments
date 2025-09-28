'use client';

import Sidebar from '@/components/layout/Sidebar';
import { ChartComponent, generateVolumeChartData } from '@/components/charts/ChartComponent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, BarChart3, PieChart, Activity, Loader2, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useSubstream, useSubstreamAPI } from '@/hooks/useSubstream';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const generateTransactionsByHourData = (events: any[]) => {
  const hourlyData = Array.from({length: 24}, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    transactions: events.filter(e => {
      const eventHour = new Date(e.timestamp).getHours();
      return eventHour === i;
    }).length
  }));

  return {
    labels: hourlyData.map(d => d.hour),
    datasets: [
      {
        label: 'Transactions per Hour',
        data: hourlyData.map(d => d.transactions),
        borderColor: '#ffffff',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 2,
        fill: false,
      },
    ],
  };
};

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
  // Primary data source: Real-time WebSocket
  const { stats, recentEvents, isConnected, isConnecting, error: wsError, connect } = useSubstream({
    autoConnect: true,
  });

  // Fallback data source: REST API
  const { stats: fallbackStats, loading: apiLoading, error: apiError } = useSubstreamAPI();

  // Use WebSocket stats if available, otherwise fallback to REST API
  const currentStats = stats || fallbackStats;
  const displayEvents = recentEvents.length > 0 ? recentEvents : (currentStats?.recentEvents || []);
  
  // Generate chart data from recent events
  const volumeChartData = displayEvents
    .filter(e => e.eventType === 'BatchPayment')
    .slice(0, 14)
    .reverse()
    .map((event, index) => ({
      date: new Date(event.timestamp).toLocaleDateString(),
      volume: parseFloat(event.amountCents || '0') / 100
    }));

  const isLoading = isConnecting || apiLoading;
  const hasError = wsError || apiError;

  return (
    <Sidebar>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Live Blockchain Analytics
              </h1>
              <p className="text-muted-foreground mt-1">
                Real-time Escrow contract data streaming from Ethereum Sepolia
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                <BarChart3 className="w-3 h-3 mr-1" />
                Ethereum
              </Badge>
              <Badge 
                variant="outline" 
                className={`${isConnected ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}
              >
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 mr-1" />
                    Live
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 mr-1" />
                    {isConnecting ? 'Connecting' : 'Offline'}
                  </>
                )}
              </Badge>
            </div>
          </div>
        </div>

        {/* Connection Status Alert */}
        {hasError && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {isConnected ? 'Connected to live blockchain data' : 'Connection issue - using cached data'} - 
                {wsError ? ` WebSocket: ${wsError}` : ''}
                {apiError ? ` API: ${apiError}` : ''}
              </span>
              {!isConnected && (
                <Button size="sm" variant="outline" onClick={connect}>
                  Reconnect
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && !currentStats && (
          <div className="px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-[400px]">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Connecting to blockchain data stream...</span>
            </div>
          </div>
        )}

        {/* Key Metrics Cards */}
        {currentStats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Unique Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {formatLargeNumber(currentStats.uniqueUsers)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">active users</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                    <Activity className="h-4 w-4 mr-2" />
                    Providers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {formatLargeNumber(currentStats.uniqueProviders)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">API providers</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                    <PieChart className="h-4 w-4 mr-2" />
                    Payment Volume
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(currentStats.totalPaymentVolume)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">total processed</p>
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
                    {formatLargeNumber(currentStats.totalApiCalls)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">calls processed</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Volume Trends</CardTitle>
                  <CardDescription>Real-time payment activity from Ethereum</CardDescription>
                </CardHeader>
                <CardContent>
                  {volumeChartData.length > 0 ? (
                    <ChartComponent
                      title="Payment Volume"
                      description="Blockchain payment trends"
                      data={generateVolumeChartData(volumeChartData)}
                      type="line"
                      height={300}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No payment data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Transaction Distribution</CardTitle>
                  <CardDescription>Hourly transaction activity (24h)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartComponent
                    title="Transaction Distribution"
                    description="Blockchain event distribution by hour"
                    data={generateTransactionsByHourData(displayEvents)}
                    type="bar"
                    height={300}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Recent Events Table */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center">
                  Recent Events
                  {isConnected && (
                    <Badge variant="outline" className="ml-2 bg-green-500/10 text-green-500 border-green-500/20">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                      Live
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Latest events from Escrow contract {currentStats.lastBlockProcessed > 0 ? `- Block #${currentStats.lastBlockProcessed}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Transaction Hash</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>User/Provider</TableHead>
                      <TableHead>Block</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayEvents.length > 0 ? displayEvents.slice(0, 10).map((event, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant="secondary" className={`
                            ${event.eventType === 'UserDeposit' ? 'bg-green-100 text-green-800' : ''}
                            ${event.eventType === 'UserWithdraw' ? 'bg-red-100 text-red-800' : ''}
                            ${event.eventType === 'BatchPayment' ? 'bg-blue-100 text-blue-800' : ''}
                            ${event.eventType === 'ProviderWithdraw' ? 'bg-purple-100 text-purple-800' : ''}
                          `}>
                            {event.eventType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {event.transactionHash.slice(0, 10)}...
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(event.amountCents)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {event.eventType === 'BatchPayment' ? (
                            <div>
                              <div>User: {event.userAddress.slice(0, 8)}...</div>
                              <div>Provider: {event.providerAddress.slice(0, 8)}...</div>
                            </div>
                          ) : (
                            <div>
                              {(event.userAddress || event.providerAddress).slice(0, 8)}...
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{event.blockNumber.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          {isLoading ? 'Loading events...' : 'No recent events found'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Deposits</CardTitle>
                  <CardDescription>User deposit activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Deposits:</span>
                      <span className="font-semibold">{currentStats.totalDeposits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span className="font-semibold">{formatCurrency(currentStats.totalDepositAmount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Withdrawals</CardTitle>
                  <CardDescription>User & provider withdrawals</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Withdrawals:</span>
                      <span className="font-semibold">{currentStats.totalWithdrawals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span className="font-semibold">{formatCurrency(currentStats.totalWithdrawalAmount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Batch Payments</CardTitle>
                  <CardDescription>API payment activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Payments:</span>
                      <span className="font-semibold">{currentStats.totalBatchPayments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Volume:</span>
                      <span className="font-semibold">{formatCurrency(currentStats.totalPaymentVolume)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </Sidebar>
  );
}