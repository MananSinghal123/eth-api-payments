'use client';

import Sidebar from '@/components/layout/Sidebar';
import { MetricCard } from '@/components/ui/MetricCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserPlus, UserMinus, DollarSign, Activity, Clock } from 'lucide-react';

// Mock user data
const mockUserData = {
  metrics: {
    totalUsers: 1234,
    activeUsers: 892,
    newUsersToday: 23,
    churnedUsers: 5,
    avgSpendPerUser: 15.67,
    retentionRate: 87.5,
  },
  users: [
    {
      id: '0x742d35Cc6Ab3C0532c4c8f3a2E2dA4dCF8F5E8f3a',
      totalSpent: 245.67,
      balance: 12.34,
      transactions: 45,
      joinDate: '2024-01-10',
      lastActivity: '2 hours ago',
      status: 'active',
      risk: 'low'
    },
    {
      id: '0x123aBc45dEf67890GhI123jKl456mNo789PqR012',
      totalSpent: 1203.45,
      balance: 89.12,
      transactions: 189,
      joinDate: '2023-11-15',
      lastActivity: '1 day ago',
      status: 'active',
      risk: 'low'
    },
    {
      id: '0xabc9XyZ321DeF456GhI789JkL012MnO345PqR678',
      totalSpent: 67.89,
      balance: 2.45,
      transactions: 12,
      joinDate: '2024-01-12',
      lastActivity: '5 days ago',
      status: 'dormant',
      risk: 'medium'
    },
    {
      id: '0x567fAb123CdE456FgH789IjK012LmN345OpQ678',
      totalSpent: 1567.23,
      balance: 234.56,
      transactions: 312,
      joinDate: '2023-09-22',
      lastActivity: '3 hours ago',
      status: 'active',
      risk: 'low'
    },
    {
      id: '0x890gHi456JkL789MnO123PqR456StU789VwX012',
      totalSpent: 23.45,
      balance: 0.12,
      transactions: 3,
      joinDate: '2024-01-13',
      lastActivity: '1 week ago',
      status: 'dormant',
      risk: 'high'
    },
  ],
  segments: [
    { name: 'Whales', count: 23, percentage: 1.9, avgSpend: 2340.56 },
    { name: 'Heavy Users', count: 156, percentage: 12.6, avgSpend: 456.78 },
    { name: 'Regular Users', count: 467, percentage: 37.8, avgSpend: 123.45 },
    { name: 'Light Users', count: 588, percentage: 47.7, avgSpend: 34.56 },
  ]
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'dormant':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'churned':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'low':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'medium':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'high':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
};

export default function UsersPage() {
  return (
    <Sidebar>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                User Analytics
              </h1>
              <p className="text-muted-foreground mt-1">
                Comprehensive user behavior and engagement metrics
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                <Users className="w-3 h-3 mr-1" />
                {mockUserData.metrics.totalUsers} Users
              </Badge>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <MetricCard
            title="Total Users"
            value={mockUserData.metrics.totalUsers}
            format="number"
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard
            title="Active Users"
            value={mockUserData.metrics.activeUsers}
            format="number"
            trend={{ value: 5.2, period: '7d' }}
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCard
            title="New Today"
            value={mockUserData.metrics.newUsersToday}
            format="number"
            trend={{ value: 12.3, period: '24h' }}
            icon={<UserPlus className="h-4 w-4" />}
          />
          <MetricCard
            title="Churned"
            value={mockUserData.metrics.churnedUsers}
            format="number"
            trend={{ value: -2.1, period: '7d' }}
            icon={<UserMinus className="h-4 w-4" />}
          />
          <MetricCard
            title="Avg Spend"
            value={mockUserData.metrics.avgSpendPerUser}
            format="currency"
            trend={{ value: 8.7, period: '30d' }}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <MetricCard
            title="Retention Rate"
            value={mockUserData.metrics.retentionRate}
            format="percentage"
            trend={{ value: 3.2, period: '30d' }}
            icon={<Clock className="h-4 w-4" />}
          />
        </div>

        {/* User Segments */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">User Segments</CardTitle>
            <CardDescription>User distribution by spending behavior</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {mockUserData.segments.map((segment, index) => (
                <div key={index} className="p-4 rounded-lg border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground">{segment.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {segment.percentage}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-foreground">{segment.count}</p>
                    <p className="text-xs text-muted-foreground">
                      Avg: {segment.avgSpend.toFixed(2)} ETH
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">User Details</CardTitle>
            <CardDescription>Detailed view of individual user accounts and activity</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Address</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Churn Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockUserData.users.map((user, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">
                      {`${user.id.slice(0, 8)}...${user.id.slice(-6)}`}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {user.totalSpent.toFixed(2)} ETH
                    </TableCell>
                    <TableCell>
                      {user.balance.toFixed(2)} ETH
                    </TableCell>
                    <TableCell>{user.transactions}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.joinDate}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.lastActivity}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(user.status)}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getRiskColor(user.risk)}>
                        {user.risk}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Sidebar>
  );
}