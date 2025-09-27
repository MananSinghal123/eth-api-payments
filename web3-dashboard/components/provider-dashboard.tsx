"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Download,
  FileCheck,
  TrendingUp,
  DollarSign,
  Activity,
  Clock,
  Shield,
} from "lucide-react";
export function ProviderDashboard() {
  const [totalEarned, setTotalEarned] = useState(4567.89);
  const [availableToWithdraw, setAvailableToWithdraw] = useState(1234.56);

  const handleWithdraw = () => {
    setTotalEarned((prev) => prev + availableToWithdraw);
    setAvailableToWithdraw(0);
  };

  const batchProofs = [
    {
      id: "batch_001",
      timestamp: "2024-01-15 14:30:00",
      callsProcessed: 1247,
      revenue: 156.78,
      status: "verified",
      proofHash: "0x9a8b7c6d5e4f3g2h1i0j",
    },
    {
      id: "batch_002",
      timestamp: "2024-01-15 13:15:00",
      callsProcessed: 892,
      revenue: 112.45,
      status: "verified",
      proofHash: "0x1k2l3m4n5o6p7q8r9s0t",
    },
    {
      id: "batch_003",
      timestamp: "2024-01-15 12:00:00",
      callsProcessed: 1534,
      revenue: 203.67,
      status: "verified",
      proofHash: "0x5u6v7w8x9y0z1a2b3c4d",
    },
    {
      id: "batch_004",
      timestamp: "2024-01-15 10:45:00",
      callsProcessed: 678,
      revenue: 89.23,
      status: "pending",
      proofHash: "0xe5f6g7h8i9j0k1l2m3n4",
    },
    {
      id: "batch_005",
      timestamp: "2024-01-15 09:30:00",
      callsProcessed: 1123,
      revenue: 145.89,
      status: "verified",
      proofHash: "0xo5p6q7r8s9t0u1v2w3x4",
    },
  ];

  const apiCallsData = [
    { time: "00:00", calls: 120 },
    { time: "04:00", calls: 89 },
    { time: "08:00", calls: 245 },
    { time: "12:00", calls: 378 },
    { time: "16:00", calls: 456 },
    { time: "20:00", calls: 334 },
  ];

  const revenueData = [
    { batch: "B1", revenue: 156.78 },
    { batch: "B2", revenue: 112.45 },
    { batch: "B3", revenue: 203.67 },
    { batch: "B4", revenue: 89.23 },
    { batch: "B5", revenue: 145.89 },
    { batch: "B6", revenue: 178.34 },
  ];

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-16 right-16 w-12 h-12 bg-chart-1/20 rounded-full float-animation"
          style={{ animationDelay: "0s" }}
        />
        <div
          className="absolute top-32 left-16 w-10 h-10 bg-chart-1/10 rounded-lg float-animation"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-32 right-32 w-16 h-16 bg-chart-1/15 rounded-full float-animation"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <div className="relative container mx-auto px-6 py-12 space-y-12">
        <div className="text-center space-y-4 border-b border-border pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-chart-1/20 rounded-xl flex items-center justify-center pulse-glow">
              <Shield className="h-8 w-8 text-chart-1" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Provider Dashboard
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            Monitor API revenue, batch settlements, and real-time analytics
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-background border border-border p-6 rounded-xl">
            <CardHeader className="pb-4 border-b border-border">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <div className="w-10 h-10 bg-chart-1 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                Total Earnings
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Cumulative revenue from API settlements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 border-b border-border pb-4">
                <div className="text-4xl font-extrabold text-chart-1">
                  ${totalEarned.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">USDC earned</div>
              </div>

              <div className="p-4 rounded-xl bg-background/50 border border-border">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      Available to Withdraw
                    </div>
                    <div className="text-2xl font-bold text-chart-1">
                      ${availableToWithdraw.toFixed(2)}
                    </div>
                  </div>
                  <Button
                    onClick={handleWithdraw}
                    disabled={availableToWithdraw === 0}
                    size="lg"
                    className="bg-chart-1 hover:bg-chart-1/90 text-white px-6 py-3 text-base rounded-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Withdraw
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="bg-background border border-border p-4 rounded-xl">
              <CardContent className="p-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-chart-1 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">5,474</div>
                    <div className="text-xs text-muted-foreground">
                      API Calls Today
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background border border-border p-4 rounded-xl">
              <CardContent className="p-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-chart-1 flex items-center justify-center">
                    <FileCheck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">12</div>
                    <div className="text-xs text-muted-foreground">
                      Batches Processed
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-background border border-border p-6 rounded-xl">
            <CardHeader className="pb-4 border-b border-border">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <div className="w-8 h-8 bg-chart-1 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                API Calls Over Time
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                24-hour activity overview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart
                  data={apiCallsData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#4b5563"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="time"
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #4b5563",
                      borderRadius: "8px",
                      color: "#f9fafb",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="calls"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: "#3b82f6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-background border border-border p-6 rounded-xl">
            <CardHeader className="pb-4 border-b border-border">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <div className="w-8 h-8 bg-chart-1 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                Revenue Per Batch
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Latest batch settlements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={revenueData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#4b5563"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="batch"
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #4b5563",
                      borderRadius: "8px",
                      color: "#f9fafb",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#3b82f6"
                    radius={[8, 8, 0, 0]}
                    opacity={0.9}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-background border border-border p-6 rounded-xl">
          <CardHeader className="pb-4 border-b border-border">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="w-8 h-8 bg-chart-1 rounded-lg flex items-center justify-center">
                <FileCheck className="h-4 w-4 text-white" />
              </div>
              Latest Batch Proofs
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Recent settlement batches with cryptographic verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {batchProofs.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border hover:border-chart-1/20 transition-all duration-300"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded-md">
                        {batch.id}
                      </code>
                      <Badge
                        variant="secondary"
                        className={
                          batch.status === "verified"
                            ? "bg-chart-1/20 text-chart-1 border-chart-1/20 px-3 py-1 text-xs"
                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 px-3 py-1 text-xs"
                        }
                      >
                        {batch.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground text-xs">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {batch.timestamp}
                      </span>
                      <span className="text-sm">
                        {batch.callsProcessed.toLocaleString()} calls
                      </span>
                      <span className="text-sm font-mono">
                        Hash: {batch.proofHash}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-chart-1">
                      ${batch.revenue.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">Revenue</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
