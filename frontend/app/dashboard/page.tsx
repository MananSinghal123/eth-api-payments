"use client";

import type React from "react";
import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import {
  Terminal,
  Bot,
  TrendingUp,
  Shield,
  Zap,
  Network,
  Cpu,
  Eye,
  Activity,
  ChevronRight,
} from "lucide-react";
import WalletConnector from "@/lib/walletConnector";
import PYUSDBalanceCard from "@/components/PYUSDBalanceCard";
import NetworkSwitcher from "@/components/NetworkSwitcher";
import EscrowDashboard from "@/components/EscrowDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Define the chain details
const SEPOLIA_CHAIN_ID = 11155111;

export default function Dashboard(): React.ReactElement {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isSepoliaChain = chainId === SEPOLIA_CHAIN_ID;
  const isCorrectChain = isSepoliaChain;

  const [activeSection, setActiveSection] = useState<"overview" | "escrow">(
    "overview"
  );

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-purple-900/10 to-cyan-900/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-600/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-600/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,.1)_50%,transparent_75%,transparent_100%)] bg-[length:30px_30px]" />
      </div>

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative z-10">
        {/* Neural Network Header */}
        <div className="border-b border-gray-800/50 bg-black/40 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Bot className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black animate-pulse" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
                    ZK Neural Gateway
                  </h1>
                  <p className="text-gray-400 text-sm font-medium">
                    Autonomous AI agent payments • Zero-knowledge verification •
                    Smart escrow system
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Badge
                  variant="secondary"
                  className="bg-green-500/10 text-green-400 border-green-500/20"
                >
                  <Activity className="w-3 h-3 mr-1" />
                  Neural Active
                </Badge>
                <NetworkSwitcher />
                <WalletConnector />
              </div>
            </div>
          </div>
        </div>

        {/* AI Status Bar */}
        <div className="border-b border-gray-800/30">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-gray-400">System Status: </span>
                  <span className="text-green-400 font-medium">
                    Operational
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-400">Processing Units: </span>
                  <span className="text-blue-400 font-medium">256 Cores</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-400">ZK Proofs: </span>
                  <span className="text-purple-400 font-medium">Verified</span>
                </div>
              </div>
              {address && (
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-500">Neural ID: </span>
                  <span className="text-gray-300 font-mono text-xs">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-xl border border-gray-800/50 backdrop-blur-sm">
            {[
              { id: "overview", label: "Neural Overview", icon: Terminal },
              { id: "escrow", label: "Smart Escrow", icon: Shield },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  activeSection === tab.id
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 pb-12">
          {/* Network Warning */}
          {isConnected && !isCorrectChain && (
            <Card className="mb-6 border-amber-500/20 bg-gradient-to-r from-amber-900/10 to-orange-900/10">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Terminal className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-amber-300">
                      Neural Network Mismatch
                    </h3>
                    <p className="text-amber-200">
                      Your agent is connected to an unsupported network. Please
                      switch to Sepolia to enable AI operations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Overview Section */}
          {activeSection === "overview" && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PYUSDBalanceCard />
                <EscrowDashboard />
              </div>

              {/* AI Agent Metrics */}
              <Card className="border-gray-800/50 bg-gray-900/20 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bot className="w-5 h-5 text-blue-400" />
                    <span>AI Agent Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        98.7%
                      </div>
                      <div className="text-sm text-gray-400">Uptime</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">
                        1,247
                      </div>
                      <div className="text-sm text-gray-400">API Calls</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">
                        42ms
                      </div>
                      <div className="text-sm text-gray-400">Avg Response</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-cyan-400">
                        256
                      </div>
                      <div className="text-sm text-gray-400">ZK Proofs</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activities */}
              <Card className="border-gray-800/50 bg-gray-900/20 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-green-400" />
                    <span>Neural Activity Feed</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        time: "2 min ago",
                        action: "ZK proof generated for API call",
                        status: "success",
                      },
                      {
                        time: "5 min ago",
                        action: "Cross-chain bridge initiated",
                        status: "pending",
                      },
                      {
                        time: "12 min ago",
                        action: "Escrow deposit confirmed",
                        status: "success",
                      },
                      {
                        time: "18 min ago",
                        action: "Neural network calibration",
                        status: "success",
                      },
                    ].map((activity, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-700/50"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              activity.status === "success"
                                ? "bg-green-400"
                                : activity.status === "pending"
                                ? "bg-yellow-400 animate-pulse"
                                : "bg-red-400"
                            }`}
                          />
                          <span className="text-gray-300">
                            {activity.action}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">
                            {activity.time}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Escrow Section */}
          {activeSection === "escrow" && (
            <div className="space-y-6">
              <EscrowDashboard />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
