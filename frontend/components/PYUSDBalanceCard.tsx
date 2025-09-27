import React from "react";
import { Loader2, Wallet, RefreshCw, AlertCircle } from "lucide-react";
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
    <Card className="border-gray-800 bg-gray-900/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Wallet className="w-5 h-5 text-white" />
            <span className="text-white">PYUSD Balance</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isPyusdLoading}
            className="h-8 w-8 p-0 hover:bg-gray-800"
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-400 ${
                isPyusdLoading ? "animate-spin" : ""
              }`}
            />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* PYUSD Balance */}
        <div className="p-4 rounded-lg border border-gray-800 bg-gray-800/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="border-gray-600 text-gray-300">
                Sepolia
              </Badge>
              <span className="text-sm font-medium text-gray-300">PYUSD</span>
            </div>
          </div>

          <div className="text-3xl font-bold mb-2">
            {!isConnected ? (
              <span className="text-gray-500">Connect Wallet</span>
            ) : isPyusdLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span className="text-white">Loading...</span>
              </div>
            ) : isPyusdError ? (
              <span className="text-red-500">Error</span>
            ) : (
              <span className="text-white">
                {formatBalance(pyusdBalance)}
              </span>
            )}
          </div>

          <div className="text-xs text-gray-400">
            Sepolia Testnet • PYUSD Token
          </div>
        </div>

        {/* Status */}
        {isConnected && (
          <div>
            {!isSepoliaChain ? (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-500 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Switch to Sepolia to view balance
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                <span className="text-sm text-gray-300">Network Status</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm text-green-500 font-medium">
                    Connected
                  </span>
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
