import React from "react"
import { Loader2, ArrowUpRight, ArrowDownRight, CreditCard, RefreshCw } from "lucide-react"
import { useAccount, useChainId } from "wagmi"
import { sepolia } from "wagmi/chains"
import { useEscrowBalance } from "../lib/useEscrowBalance" // Import the custom hook

interface EscrowBalanceCardProps {
  isPending?: boolean
  isConfirming?: boolean
  setShowDepositModal: (open: boolean) => void
  setShowWithdrawModal: (open: boolean) => void
  onRefresh?: () => void
}

const EscrowBalanceCard: React.FC<EscrowBalanceCardProps> = ({
  isPending = false,
  isConfirming = false,
  setShowDepositModal,
  setShowWithdrawModal,
  onRefresh,
}) => {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  
  const isSepoliaChain = chainId === sepolia.id
  const isCorrectChain = isSepoliaChain

  // Use the custom hook to fetch escrow balance
  const {
    formattedBalance,
    balanceAsNumber,
    isLoading: isEscrowLoading,
    isError: isEscrowError,
    error: escrowError,
    refetch: refetchEscrowBalance,
    hasBalance
  } = useEscrowBalance(address, isConnected && isSepoliaChain)

  // Format balance for display with $ prefix
  const formatPYUSD = (balance: string | number | undefined): string => {
    if (!balance) return "$0.00"
    const num = typeof balance === 'string' ? parseFloat(balance) : Number(balance)
    return `$${num.toFixed(2)}`
  }

  // Handle manual refresh
  const handleRefresh = async () => {
    try {
      await refetchEscrowBalance()
      onRefresh?.()
    } catch (err) {
      console.error('Failed to refresh balance:', err)
    }
  }

  // Determine if buttons should be disabled
  const isButtonsDisabled = !isConnected || !isCorrectChain || isPending || isConfirming

  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-8 shadow-2xl border border-slate-700/50 backdrop-blur-xl hover:border-slate-600/50 transition-all duration-300 group">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Escrow Balance
            </p>
            {isConnected && isSepoliaChain && (
              <button
                onClick={handleRefresh}
                disabled={isEscrowLoading || isPending || isConfirming}
                className="text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh balance"
              >
                <RefreshCw className={`w-4 h-4 ${isEscrowLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
          
          <div className="text-3xl font-bold text-white mb-4">
            {!isConnected ? (
              <span className="text-slate-500 text-xl">Connect Wallet</span>
            ) : !isSepoliaChain ? (
              <span className="text-amber-400 text-xl">Switch to Sepolia</span>
            ) : isEscrowLoading ? (
              <div className="flex items-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <span className="ml-2 text-lg text-slate-400">Loading...</span>
              </div>
            ) : isEscrowError ? (
              <div className="text-red-400 text-lg">
                Error loading balance
                {escrowError && (
                  <div className="text-xs text-red-300 mt-1 font-normal">
                    {escrowError.message}
                  </div>
                )}
              </div>
            ) : (
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {formatPYUSD(formattedBalance)}
              </span>
            )}
          </div>

          {/* Action buttons */}
          {isConnected && isSepoliaChain && !isEscrowError && (
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => setShowDepositModal(true)}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center font-medium transition-colors group-hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isButtonsDisabled}
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Top Up
                {(isPending || isConfirming) && (
                  <Loader2 className="w-3 h-3 animate-spin ml-1" />
                )}
              </button>
              
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="text-sm text-purple-400 hover:text-purple-300 flex items-center font-medium transition-colors group-hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isButtonsDisabled || !hasBalance}
                title={!hasBalance ? "No balance to withdraw" : undefined}
              >
                <ArrowDownRight className="w-4 h-4 mr-2" />
                Withdraw
                {!hasBalance && (
                  <span className="text-xs text-slate-500 ml-1">(No balance)</span>
                )}
              </button>
            </div>
          )}

          {/* Network warning for connected users on wrong chain */}
          {isConnected && !isSepoliaChain && (
            <div className="mt-4 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
              <p className="text-amber-400 text-xs font-medium">
                Switch to Sepolia to view and manage your escrow balance
              </p>
            </div>
          )}

          {/* Error retry button */}
          {isConnected && isSepoliaChain && isEscrowError && (
            <button
              onClick={handleRefresh}
              className="mt-2 text-sm text-red-400 hover:text-red-300 flex items-center font-medium transition-colors"
              disabled={isEscrowLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isEscrowLoading ? 'animate-spin' : ''}`} />
              Retry
            </button>
          )}
        </div>
        
        {/* Icon container */}
        <div className="ml-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
            <CreditCard className="w-8 h-8 text-blue-400" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default EscrowBalanceCard