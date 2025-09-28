"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus, Hash, AlertCircle, CheckCircle, Loader2, RefreshCw, TrendingUp, Activity, Eye } from "lucide-react";
import { useDeposit } from "../lib/contract-abi";

export function ClientDashboard() {
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    type: 'idle' | 'processing' | 'success' | 'error';
    message: string;
    txHash?: string;
  }>({ type: 'idle', message: '' });

  // Simple state for transaction details
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const {
    depositPYUSD,
    balance,
    userEscrowBalance,
    hasSufficientBalance,
    isLoading,
    isApproving,
    isDepositing,
    isPaused,
    isConnected,
    refetchBalance,
    refetchAllowance,
    refetchUserBalance,
  } = useDeposit();

  // Reset transaction status when dialog closes
  useEffect(() => {
    if (!isTopUpOpen) {
      setTransactionStatus({ type: 'idle', message: '' });
      setTopUpAmount("");
    }
  }, [isTopUpOpen]);

  // Monitor transaction states
  useEffect(() => {
    if (isApproving) {
      setTransactionStatus({
        type: 'processing',
        message: 'Approving PYUSD for spending...'
      });
    } else if (isDepositing) {
      setTransactionStatus({
        type: 'processing',
        message: 'Depositing PYUSD to escrow...'
      });
    }
  }, [isApproving, isDepositing]);

  // Simple function to fetch transactions
  const fetchTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const response = await fetch('http://localhost:3001/api/events-full?limit=5');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Load transactions on mount
  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleRefreshBalance = async () => {
    try {
      await Promise.all([
        refetchBalance(),
        refetchAllowance(),
        refetchUserBalance()
      ]);
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  };

  const handleTopUp = async () => {
    console.log("🎯 Deposit button clicked");
    
    if (!isConnected) {
      setTransactionStatus({
        type: 'error',
        message: 'Please connect your wallet first'
      });
      return;
    }

    if (!topUpAmount || Number(topUpAmount) <= 0) {
      setTransactionStatus({
        type: 'error',
        message: 'Please enter a valid amount greater than 0'
      });
      return;
    }

    if (isPaused) {
      setTransactionStatus({
        type: 'error',
        message: 'Contract is currently paused'
      });
      return;
    }

    if (!hasSufficientBalance(topUpAmount)) {
      setTransactionStatus({
        type: 'error',
        message: `Insufficient PYUSD balance. You have ${balance} PYUSD available.`
      });
      return;
    }

    console.log(`🚀 Starting deposit: ${topUpAmount} PYUSD`);

    try {
      setTransactionStatus({
        type: 'processing',
        message: 'Preparing transaction...'
      });

      const result = await depositPYUSD(topUpAmount);
      console.log({result})
      
      if (result?.success) {
        console.log("✅ Deposit successful!", result?.txHash);
        setTransactionStatus({
          type: 'success',
          message: 'PYUSD deposited successfully!',
          txHash: result?.txHash
        });
        
        await handleRefreshBalance();
        
        // Refresh transactions after deposit
        setTimeout(() => {
          fetchTransactions();
        }, 2000);
        
        setTimeout(() => {
          setIsTopUpOpen(false);
        }, 3000);
      } else {
        console.error("❌ Deposit failed:", result.error);
        setTransactionStatus({
          type: 'error',
          message: result.error || 'Deposit failed'
        });
      }
    } catch (err: any) {
      console.error("🔥 Unexpected error:", err);
      setTransactionStatus({
        type: 'error',
        message: 'An unexpected error occurred'
      });
    }
  };

  // Validation helpers
  const canSubmit = topUpAmount && 
    Number(topUpAmount) > 0 && 
    !isLoading && 
    !isPaused &&
    isConnected &&
    hasSufficientBalance(topUpAmount);

  const getValidationError = () => {
    if (!isConnected) return "Please connect your wallet";
    if (!topUpAmount) return null;
    if (Number(topUpAmount) <= 0) return "Amount must be greater than 0";
    if (isPaused) return "Contract is currently paused";
    if (!hasSufficientBalance(topUpAmount)) {
      return `Insufficient balance. You have ${balance} PYUSD available.`;
    }
    return null;
  };

  const validationError = getValidationError();

  const recentCalls = [
    {
      id: "0x1a2b3c4d",
      endpoint: "/api/v1/data/market",
      timestamp: "2 minutes ago",
      cost: 0.05,
      status: "success",
      responseHash: "0x8f9e2d1c...",
    },
    {
      id: "0x5e6f7g8h",
      endpoint: "/api/v1/analytics/trends",
      timestamp: "5 minutes ago",
      cost: 0.12,
      status: "success",
      responseHash: "0x3a4b5c6d...",
    },
  ];

  return (
    <div className="container mx-auto px-6 py-12 space-y-12 font-sans">
      <div className="space-y-3 border-b border-border pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Client Dashboard</h1>
        <p className="text-base text-muted-foreground">
          Manage your API usage and PYUSD escrow deposits
        </p>
      </div>

      {/* Wallet Connection Status */}
      {!isConnected && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Please connect your wallet to continue</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balance Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Wallet Balance Card */}
        <Card className="bg-background border border-border rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Wallet className="h-5 w-5 text-chart-1" />
              Wallet Balance
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              PYUSD available in your wallet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="text-3xl font-extrabold text-chart-1">
                  {balance} PYUSD
                </div>
                <div className="text-sm text-muted-foreground">Available to deposit</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshBalance}
                disabled={!isConnected || isLoading}
                className="h-8 w-8 p-0 hover:bg-chart-1/10"
                title="Refresh balance"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Escrow Balance Card */}
        <Card className="bg-background border border-border rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Escrow Balance
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              PYUSD deposited in escrow contract
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-extrabold text-green-600">
                {userEscrowBalance || "0.000000"} PYUSD
              </div>
              <div className="text-sm text-muted-foreground">Ready for API usage</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contract Status and Deposit */}
      <Card className="bg-background border border-border p-6 rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <Plus className="h-5 w-5 text-chart-1" />
            Deposit to Escrow
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Transfer PYUSD to your escrow account for API usage
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Contract Status Alert */}
          {isPaused && (
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-yellow-50 border-yellow-200 text-yellow-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Contract is currently paused. Deposits are temporarily disabled.</span>
            </div>
          )}

          {/* Balance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold text-chart-1">{balance}</div>
              <div className="text-xs text-muted-foreground">Wallet PYUSD</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{userEscrowBalance || "0.000000"}</div>
              <div className="text-xs text-muted-foreground">Escrow PYUSD</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">
                {(Number(balance || 0) + Number(userEscrowBalance || 0)).toFixed(6)}
              </div>
              <div className="text-xs text-muted-foreground">Total PYUSD</div>
            </div>
          </div>

          <div className="flex justify-center">
            <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-chart-1 hover:bg-chart-1/90 text-white px-8 py-4 text-base font-medium rounded-full disabled:bg-gray-400"
                  disabled={!isConnected || isPaused || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {!isConnected ? "Connect Wallet" : isPaused ? "Contract Paused" : "Deposit PYUSD"}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background border border-border rounded-xl max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Deposit PYUSD to Escrow</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    Transfer PYUSD from your wallet to the escrow contract for API usage
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Contract pause warning in dialog */}
                  {isPaused && (
                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-yellow-50 border-yellow-200 text-yellow-800">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Contract is paused. Deposits are currently disabled.</span>
                    </div>
                  )}

                  {/* Wallet connection warning */}
                  {!isConnected && (
                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-red-50 border-red-200 text-red-800">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Please connect your wallet to continue.</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm font-medium">
                      Deposit Amount
                    </Label>
                    <div className="relative">
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        className={`pr-16 text-lg ${validationError ? 'border-red-300' : ''}`}
                        min="0.01"
                        step="0.01"
                        disabled={isLoading || isPaused || !isConnected}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                        PYUSD
                      </div>
                    </div>
                    
                    {/* Validation error */}
                    {validationError && (
                      <div className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationError}
                      </div>
                    )}
                  </div>

                  {/* Balance Info */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg text-sm">
                    <div>
                      <div className="text-muted-foreground">Wallet Balance</div>
                      <div className="font-semibold">{balance} PYUSD</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Current Escrow</div>
                      <div className="font-semibold text-green-600">{userEscrowBalance} PYUSD</div>
                    </div>
                    {topUpAmount && Number(topUpAmount) > 0 && hasSufficientBalance(topUpAmount) && (
                      <>
                        <div>
                          <div className="text-muted-foreground">After Deposit</div>
                          <div className="font-semibold text-green-600">
                            {(Number(userEscrowBalance || 0) + Number(topUpAmount)).toFixed(6)} PYUSD
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Remaining Wallet</div>
                          <div className="font-semibold">
                            {(Number(balance || 0) - Number(topUpAmount)).toFixed(6)} PYUSD
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Transaction Status */}
                  {transactionStatus.type !== 'idle' && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                      transactionStatus.type === 'success' 
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : transactionStatus.type === 'error'
                        ? 'bg-red-50 border-red-200 text-red-800'
                        : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}>
                      {transactionStatus.type === 'success' && <CheckCircle className="h-4 w-4" />}
                      {transactionStatus.type === 'error' && <AlertCircle className="h-4 w-4" />}
                      {transactionStatus.type === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
                      <span className="text-sm">{transactionStatus.message}</span>
                    </div>
                  )}

                  {/* Transaction link */}
                  {transactionStatus.type === 'success' && transactionStatus.txHash && (
                    <div className="text-xs text-green-600">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${transactionStatus.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-green-800"
                      >
                        View transaction on Etherscan ↗
                      </a>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={handleTopUp}
                      disabled={!canSubmit || isLoading}
                      className="flex-1 bg-chart-1 hover:bg-chart-1/90 text-white py-3 rounded-full disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {!isConnected 
                        ? "Connect Wallet"
                        : isPaused 
                        ? "Contract Paused"
                        : isApproving 
                        ? "Approving..." 
                        : isDepositing 
                        ? "Depositing..." 
                        : "Confirm Deposit"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsTopUpOpen(false)}
                      disabled={isLoading}
                      className="flex-1 py-3 rounded-full"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Simple Transaction Details */}
      <Card className="bg-background border border-border p-6 rounded-xl">
        <CardHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Activity className="h-5 w-5 text-chart-1" />
                Transaction Details
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Recent contract events and transactions
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchTransactions}
              disabled={loadingTransactions}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${loadingTransactions ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loadingTransactions ? (
            <div className="text-center py-4">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading transactions...</p>
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs bg-background px-2 py-1 rounded">
                        {tx.transactionHash?.slice(0, 10)}...{tx.transactionHash?.slice(-8)}
                      </code>
                      <Badge variant="outline" className="text-xs">
                        {tx.eventType || 'Event'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Block {tx.blockNumber} • {new Date(tx.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No transactions found</p>
              <p className="text-sm">Contract events will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent API Calls */}
      <Card className="bg-background border border-border p-6 rounded-xl">
        <CardHeader className="pb-4 border-b border-border">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <Hash className="h-5 w-5 text-chart-1" />
            Recent API Calls
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Latest API calls with cryptographic verification
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            {recentCalls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-chart-1/20 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <code className="text-xs font-mono bg-background px-3 py-1 rounded-md border">
                      {call.endpoint}
                    </code>
                    <Badge variant="secondary" className="bg-chart-1/20 text-chart-1 text-xs">
                      {call.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <span>ID: {call.id}</span>
                    <span>Hash: {call.responseHash}</span>
                    <span>{call.timestamp}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">${call.cost.toFixed(3)}</div>
                  <div className="text-xs text-muted-foreground">Cost</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
