"use client";

import type React from "react";
import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import {
  Wallet,
  Shield,
  AlertTriangle,
  Settings,
  Home,
} from "lucide-react";
import WalletConnector from "@/lib/walletConnector";
import PYUSDBalanceCard from "@/components/PYUSDBalanceCard";
import NetworkSwitcher from "@/components/NetworkSwitcher";
import EscrowDashboard from "@/components/EscrowDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">
                  API Payment Dashboard
                </h1>
                <p className="text-sm text-gray-400">
                  Manage your escrow and token balances
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <NetworkSwitcher />
              <WalletConnector />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveSection("overview")}
              className={`py-4 px-2 border-b-2 transition-colors ${
                activeSection === "overview"
                  ? "border-white text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Home className="w-4 h-4" />
                <span>Overview</span>
              </div>
            </button>
            <button
              onClick={() => setActiveSection("escrow")}
              className={`py-4 px-2 border-b-2 transition-colors ${
                activeSection === "escrow"
                  ? "border-white text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Escrow</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Network Warning */}
        {isConnected && !isCorrectChain && (
          <Card className="mb-8 border-yellow-500/20 bg-yellow-500/10">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <div>
                  <h3 className="font-medium text-yellow-500">
                    Wrong Network
                  </h3>
                  <p className="text-sm text-yellow-500/80">
                    Please switch to Sepolia testnet to use this application.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overview Section */}
        {activeSection === "overview" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PYUSDBalanceCard />
              <EscrowDashboard />
            </div>

            {/* Status Card */}
            <Card className="border-gray-800 bg-gray-900/50">
              <CardHeader>
                <CardTitle className="text-white">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      Online
                    </div>
                    <div className="text-sm text-gray-400">Network Status</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {isConnected ? "Connected" : "Disconnected"}
                    </div>
                    <div className="text-sm text-gray-400">Wallet Status</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {isCorrectChain ? "Sepolia" : "Wrong Chain"}
                    </div>
                    <div className="text-sm text-gray-400">Current Network</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Escrow Section */}
        {activeSection === "escrow" && (
          <div>
            <EscrowDashboard />
          </div>
        )}
      </div>
    </div>
  );
}
