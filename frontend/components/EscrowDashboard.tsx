import React, { useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useBalance,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { parseUnits } from "viem";
import { sepolia } from "wagmi/chains";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  TrendingUp,
  TrendingDown,
  Loader2,
  CheckCircle,
  AlertCircle,
  Wallet,
  Bot,
  Activity,
  RefreshCw,
} from "lucide-react";
import { useEscrowBalance } from "../lib/useEscrowBalance";
import { useEscrowEvents } from "@/hooks/useEscrowEvents";
import { formatShortHash } from "@/lib/escrow-events";

// Contract addresses and ABIs
const PYUSD_SEPOLIA_ADDRESS =
  "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9" as const;
const ESCROW_ADDRESS = "0x6E5559e7Cf01860416ff9CbEcC3bbdC1f05dB3D0" as const;

const ERC20_ABI = [
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const ESCROW_ABI = [
  {
    inputs: [{ name: "amountUSD", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amountCents", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/**
 * Main component that integrates the escrow functionality
 */
const EscrowDashboard: React.FC = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [currentStep, setCurrentStep] = useState<
    "input" | "approving" | "processing" | "success" | "error"
  >("input");
  const [error, setError] = useState("");

  const isSepoliaChain = chainId === sepolia.id;

  // Get escrow balance using the custom hook
  const {
    formattedBalance,
    balanceAsNumber,
  isLoading: isEscrowLoading,
  refetch: refetchEscrowBalance,
  } = useEscrowBalance(address, isConnected && isSepoliaChain);

  const { events: escrowEvents, status: streamStatus, error: streamError } = useEscrowEvents({ limit: 20 });
  const recentEscrowEvents = useMemo(() => escrowEvents.slice(0, 5), [escrowEvents]);

  // Fetch PYUSD balance
  const {
    data: pyusdBalance,
    isLoading: isPyusdLoading,
    refetch: refetchPyusdBalance,
  } = useBalance({
    address: address,
    token: PYUSD_SEPOLIA_ADDRESS,
    chainId: sepolia.id,
    query: {
      enabled: !!address && isSepoliaChain,
      refetchInterval: 10000,
    },
  });

  // Check allowance
  const { data: allowance } = useReadContract({
    address: PYUSD_SEPOLIA_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, ESCROW_ADDRESS] : undefined,
    chainId: sepolia.id,
    query: {
      enabled: !!address && isSepoliaChain,
      refetchInterval: 5000,
    },
  });

  // Contract interactions
  const {
    writeContract: approveToken,
    isPending: isApprovePending,
    data: approveHash,
    error: approveError,
  } = useWriteContract();

  const {
    writeContract: depositToEscrow,
    isPending: isDepositPending,
    data: depositHash,
    error: depositError,
  } = useWriteContract();

  const {
    writeContract: withdrawFromEscrow,
    isPending: isWithdrawPending,
    data: withdrawHash,
    error: withdrawError,
  } = useWriteContract();

  // Wait for transactions
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({ hash: depositHash });

  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawHash });

  // Handle transaction success
  React.useEffect(() => {
    if (isApproveSuccess && currentStep === "approving") {
      setCurrentStep("processing");
      // Use 0 decimals for the USD amount expected by Escrow.sol's deposit function
      const amountUSD = parseUnits(depositAmount, 0); 
      depositToEscrow({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "deposit",
        args: [amountUSD], // Use amountUSD (0 decimals)
        chainId: sepolia.id,
      });
    }
  }, [isApproveSuccess, currentStep, depositAmount, depositToEscrow]);

  React.useEffect(() => {
    if (isDepositSuccess && currentStep === "processing") {
      setCurrentStep("success");
      setDepositAmount("");
      refetchEscrowBalance();
      refetchPyusdBalance();
      setTimeout(() => setCurrentStep("input"), 3000);
    }
  }, [
    isDepositSuccess,
    currentStep,
    refetchEscrowBalance,
    refetchPyusdBalance,
  ]);

  React.useEffect(() => {
    if (isWithdrawSuccess) {
      setCurrentStep("success");
      setWithdrawAmount("");
      refetchEscrowBalance();
      refetchPyusdBalance();
      setTimeout(() => setCurrentStep("input"), 3000);
    }
  }, [isWithdrawSuccess, refetchEscrowBalance, refetchPyusdBalance]);

  // Handle errors
  React.useEffect(() => {
    if (approveError || depositError || withdrawError) {
      setError(
        (approveError || depositError || withdrawError)?.message ||
          "Transaction failed"
      );
      setCurrentStep("error");
    }
  }, [approveError, depositError, withdrawError]);

const handleDeposit = async () => {
    if (!address || !depositAmount || parseFloat(depositAmount) <= 0) return;
    setError("");

    try {
      // 1. Calculate the token amount (PYUSD uses 6 decimals) for approval
      const tokenAmount = parseUnits(depositAmount, 6);
      // 2. Calculate the USD amount (0 decimals) for the Escrow contract's deposit function
      const amountUSD = parseUnits(depositAmount, 0); 

      const needsApproval = !allowance || (allowance as bigint) < tokenAmount;

      if (needsApproval) {
        setCurrentStep("approving");
        console.log("approving");
        approveToken({
          address: PYUSD_SEPOLIA_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [ESCROW_ADDRESS, tokenAmount], // Use tokenAmount (6 decimals) for approval
          chainId: sepolia.id,
        });
      } else {
        setCurrentStep("processing");
        depositToEscrow({
          address: ESCROW_ADDRESS,
          abi: ESCROW_ABI,
          functionName: "deposit",
          args: [amountUSD], // Use amountUSD (0 decimals) for deposit
          chainId: sepolia.id,
        });
      }
    } catch (err) {
      if (err instanceof Error) {
        console.log(err.message);
        setError(err.message);
      }
      setCurrentStep("error");
    }
  };

  const handleWithdraw = async () => {
    if (!address) return;
    setError("");

    try {
      setCurrentStep("processing");
      const amountCents = Math.round(parseFloat(withdrawAmount) * 100);
      const amountBig = BigInt(amountCents);
      withdrawFromEscrow({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "withdraw",
        args: [amountBig],
        chainId: sepolia.id,
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
      setCurrentStep("error");
    }
  };

  const formatBalance = (balanceData: typeof pyusdBalance) => {
    if (!balanceData || !balanceData.value) return "$0.00";
    return `$${Number(balanceData.formatted).toFixed(2)}`;
  };

  const isPending = isApprovePending || isDepositPending || isWithdrawPending;
  const isConfirming =
    isApproveConfirming || isDepositConfirming || isWithdrawConfirming;

  return (
    <Card className="border-gray-800/50 bg-gradient-to-br from-gray-900/40 to-black/40 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Smart Escrow
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              refetchEscrowBalance();
              refetchPyusdBalance();
            }}
            disabled={isEscrowLoading || isPyusdLoading}
            className="h-8 w-8 p-0 hover:bg-gray-800/50"
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-400 ${
                isEscrowLoading || isPyusdLoading ? "animate-spin" : ""
              }`}
            />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Connection Status */}
        {!isConnected ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Wallet className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-medium">
                Connect your wallet to continue
              </span>
            </div>
          </div>
        ) : !isSepoliaChain ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <div>
                <div className="text-red-400 font-medium">Wrong Network</div>
                <div className="text-red-300 text-sm">
                  Switch to Sepolia to use escrow
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Balance Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/20 to-blue-800/20 border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Escrow Balance</span>
                  <Bot className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-bold">
                  {isEscrowLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                  ) : (
                    <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                      ${balanceAsNumber.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-900/20 to-purple-800/20 border border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Wallet Balance</span>
                  <Wallet className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold">
                  {isPyusdLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  ) : (
                    <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      {formatBalance(pyusdBalance)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Transaction Tabs */}
            <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("deposit")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                  activeTab === "deposit"
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Deposit</span>
              </button>
              <button
                onClick={() => setActiveTab("withdraw")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                  activeTab === "withdraw"
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                <span>Withdraw</span>
              </button>
            </div>

            {/* Status Messages */}
            {currentStep !== "input" && (
              <div
                className={`p-4 rounded-lg border ${
                  currentStep === "success"
                    ? "bg-green-500/10 border-green-500/20"
                    : currentStep === "error"
                    ? "bg-red-500/10 border-red-500/20"
                    : "bg-blue-500/10 border-blue-500/20"
                }`}
              >
                <div className="flex items-center space-x-2">
                  {(isPending || isConfirming) && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {currentStep === "success" && (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                  {currentStep === "error" && (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span
                    className={`font-medium ${
                      currentStep === "success"
                        ? "text-green-400"
                        : currentStep === "error"
                        ? "text-red-400"
                        : "text-blue-400"
                    }`}
                  >
                    {currentStep === "approving"
                      ? "Approving tokens..."
                      : currentStep === "processing"
                      ? "Processing transaction..."
                      : currentStep === "success"
                      ? "Transaction successful!"
                      : currentStep === "error"
                      ? error
                      : "Ready"}
                  </span>
                </div>
              </div>
            )}

            {/* Transaction Forms */}
            {activeTab === "deposit" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="depositAmount" className="text-gray-300">
                    Deposit Amount (PYUSD)
                  </Label>
                  <div className="flex space-x-2 mt-2">
                    <Input
                      id="depositAmount"
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 bg-gray-800/50 border-gray-700/50 text-white"
                      disabled={isPending || isConfirming}
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        pyusdBalance && setDepositAmount(pyusdBalance.formatted)
                      }
                      disabled={!pyusdBalance || isPending || isConfirming}
                      className="border-gray-700/50 text-gray-300 hover:bg-gray-800/50"
                    >
                      Max
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleDeposit}
                  disabled={
                    !depositAmount ||
                    parseFloat(depositAmount) <= 0 ||
                    isPending ||
                    isConfirming
                  }
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600"
                >
                  {isPending || isConfirming ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Deposit to Escrow
                </Button>
              </div>
            )}

            {activeTab === "withdraw" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="withdrawAmount" className="text-gray-300">
                    Withdraw Amount (USD)
                  </Label>
                  <div className="flex space-x-2 mt-2">
                    <Input
                      id="withdrawAmount"
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      max={formattedBalance || "0"}
                      className="flex-1 bg-gray-800/50 border-gray-700/50 text-white"
                      disabled={isPending || isConfirming}
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        formattedBalance && setWithdrawAmount(formattedBalance)
                      }
                      disabled={!formattedBalance || isPending || isConfirming}
                      className="border-gray-700/50 text-gray-300 hover:bg-gray-800/50"
                    >
                      Max
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleWithdraw}
                  disabled={
                    balanceAsNumber <= 0 ||
                    !withdrawAmount ||
                    parseFloat(withdrawAmount) <= 0 ||
                    isPending ||
                    isConfirming
                  }
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600"
                >
                  {isPending || isConfirming ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Withdraw
                </Button>
              </div>
            )}

            {/* AI Agent Status */}
            <Separator className="bg-gray-800/50" />
            <div className="flex items-center justify-between p-3 bg-gray-800/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">AI Agent Status</span>
              </div>
              <Badge
                variant="secondary"
                className="bg-green-500/10 text-green-400 border-green-500/20"
              >
                Active
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-300">Live Escrow Events</span>
                </div>
                <Badge className="bg-blue-500/10 border-blue-500/20 text-blue-300">
                  {streamStatus === "open" ? "Streaming" : streamStatus === "error" ? "Reconnecting" : "Connecting"}
                </Badge>
              </div>
              {streamError && (
                <div className="text-xs text-amber-300">
                  Stream issue: {streamError}
                </div>
              )}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {recentEscrowEvents.length === 0 ? (
                  <div className="text-sm text-gray-500">No events yet. Interact with the escrow to see updates.</div>
                ) : (
                  recentEscrowEvents.map((event) => (
                    <div
                      key={`${event.transactionHash}-${event.logIndex ?? Math.random()}`}
                      className="p-3 bg-gray-800/30 border border-gray-700/40 rounded-lg"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Block {event.blockNumber ?? "-"}</span>
                        <span>{event.timestamp ?? "just now"}</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-200">
                        Tx: {formatShortHash(event.transactionHash ?? undefined)}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 break-all">
                        Topics: {event.topics.join(", ") || "-"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EscrowDashboard;
