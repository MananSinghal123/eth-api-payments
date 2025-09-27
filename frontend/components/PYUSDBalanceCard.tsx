import React from "react";
import { Loader2, Bot, Zap, Coins, TrendingUp, RefreshCw } from "lucide-react";
import { useAccount, useChainId, useBalance } from "wagmi";
import { sepolia } from "wagmi/chains";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// PYUSD contract address on Sepolia
const PYUSD_SEPOLIA_ADDRESS =
  "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9" as const;

interface PYUSDBalanceCardProps {
  //   setShowTopupFlow: (open: boolean) => void
}

const PYUSDBalanceCard: React.FC<PYUSDBalanceCardProps> = (
  {
    //   setShowTopupFlow,
  }
) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const isSepoliaChain = chainId === sepolia.id;
  const isCorrectChain = isSepoliaChain;

  // Fetch PYUSD balance on Sepolia
  const {
    data: pyusdBalance,
    isLoading: isPyusdLoading,
    refetch: refetchPyusdBalance,
    isError: isPyusdError,
  } = useBalance({
    address: address,
    token: PYUSD_SEPOLIA_ADDRESS,
    chainId: sepolia.id,
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  });

  // Format balance for display
  const formatBalance = (balanceData: typeof pyusdBalance) => {
    if (!balanceData || !balanceData.value) return "$0.00";
    // Balance data already comes formatted from useBalance
    const formatted = Number(balanceData.formatted);
    return `$${formatted.toFixed(2)}`;
  };

  const handleRefresh = () => {
    refetchPyusdBalance();
  };

  return (
    <Card className="border-gray-800/50 bg-gradient-to-br from-gray-900/40 to-black/40 backdrop-blur-sm hover:border-gray-700/50 transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-lg">
              <Coins className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Token Assets
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isPyusdLoading}
            className="h-8 w-8 p-0 hover:bg-gray-800/50"
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-400 ${
                isPyusdLoading ? "animate-spin" : ""
              }`}
            />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* PYUSD Balance (Sepolia) */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/20 to-blue-800/20 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Badge
                variant="secondary"
                className="bg-blue-500/10 text-blue-400 border-blue-500/20"
              >
                Sepolia
              </Badge>
              <span className="text-sm font-medium text-gray-300">PYUSD</span>
            </div>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>

          <div className="text-2xl font-bold">
            {!isConnected ? (
              <span className="text-gray-500">Connect Wallet</span>
            ) : isPyusdLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                <span className="text-blue-400">Loading...</span>
              </div>
            ) : isPyusdError ? (
              <span className="text-red-400">Error</span>
            ) : (
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {formatBalance(pyusdBalance)}
              </span>
            )}
          </div>

          <div className="text-xs text-gray-500 mt-1">
            Smart contract • Testnet
          </div>
        </div>

        {/* Action buttons - only show when connected */}
        {isConnected && (
          <div className="pt-2">
            {!isSepoliaChain ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-400 flex items-center">
                  <Zap className="w-4 h-4 mr-2" />
                  Switch to Sepolia to interact with tokens
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                  <div className="text-xs text-gray-400 mb-1">
                    Network Status
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-sm text-green-400 font-medium">
                      Active
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                  <div className="text-xs text-gray-400 mb-1">AI Agent</div>
                  <div className="flex items-center space-x-2">
                    <Bot className="w-3 h-3 text-blue-400" />
                    <span className="text-sm text-blue-400 font-medium">
                      Ready
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PYUSDBalanceCard;
