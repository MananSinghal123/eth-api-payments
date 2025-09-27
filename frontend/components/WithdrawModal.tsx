import React from "react"
import { Loader2 } from "lucide-react"
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { parseUnits, formatUnits } from "viem"
import { polygonAmoy } from "wagmi/chains"
import { useEscrowBalance } from "../lib/useEscrowBalance"

// Contract addresses and ABIs
const ESCROW_ADDRESS = "0xAC6a80da31d9D32f453332A9d6184c8b2376430E" as const // Replace with your actual escrow contract address

const ESCROW_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "withdrawAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const

interface WithdrawModalProps {
  isOpen: boolean
  setShowWithdrawModal: (open: boolean) => void
  onWithdrawSuccess?: () => void
}

const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  setShowWithdrawModal,
  onWithdrawSuccess,
}) => {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [withdrawAmount, setWithdrawAmount] = React.useState<string>('')
  const [currentStep, setCurrentStep] = React.useState<'input' | 'withdrawing' | 'success' | 'error'>('input')
  const [error, setError] = React.useState<string>('')
  const [isWithdrawAll, setIsWithdrawAll] = React.useState<boolean>(false)
  
  const isAmoyChain = chainId === polygonAmoy.id

  // Get user's escrow balance
  const {
    rawBalance,
    formattedBalance,
    balanceAsNumber,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
    refetch: refetchBalance
  } = useEscrowBalance(address, isConnected && isAmoyChain && isOpen)

  // Contract write hooks
  const { 
    writeContract: withdrawFromEscrow, 
    isPending: isWithdrawPending,
    data: withdrawHash,
    error: withdrawError
  } = useWriteContract()

  // Wait for transaction
  const { 
    isLoading: isWithdrawConfirming, 
    isSuccess: isWithdrawSuccess,
    error: withdrawReceiptError
  } = useWaitForTransactionReceipt({
    hash: withdrawHash,
  })

  // Handle errors
  React.useEffect(() => {
    if (withdrawError) {
      console.error('Withdraw error:', withdrawError)
      setError(`Withdrawal failed: ${withdrawError.message}`)
      setCurrentStep('error')
    }
    if (withdrawReceiptError) {
      console.error('Withdraw receipt error:', withdrawReceiptError)
      setError(`Withdrawal transaction failed: ${withdrawReceiptError.message}`)
      setCurrentStep('error')
    }
  }, [withdrawError, withdrawReceiptError])

  // Handle transaction success
  React.useEffect(() => {
    if (isWithdrawSuccess && currentStep === 'withdrawing') {
      console.log('Withdrawal successful')
      setCurrentStep('success')
      refetchBalance()
      onWithdrawSuccess?.()
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        handleClose()
      }, 3000)
    }
  }, [isWithdrawSuccess, currentStep, refetchBalance, onWithdrawSuccess])

  const handleClose = () => {
    setShowWithdrawModal(false)
    setWithdrawAmount('')
    setCurrentStep('input')
    setError('')
    setIsWithdrawAll(false)
  }

  const handleWithdraw = async () => {
    if (!address || !isAmoyChain) return

    // Validate amounts
    if (isWithdrawAll) {
      if (balanceAsNumber <= 0) {
        setError('No balance to withdraw')
        return
      }
    } else {
      if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
        setError('Please enter a valid withdrawal amount')
        return
      }
      if (parseFloat(withdrawAmount) > balanceAsNumber) {
        setError('Insufficient balance')
        return
      }
    }

    try {
      setError('')
      setCurrentStep('withdrawing')
      
      if (isWithdrawAll) {
        console.log('Withdrawing all balance:', formattedBalance)
        withdrawFromEscrow({
          address: ESCROW_ADDRESS,
          abi: ESCROW_ABI,
          functionName: 'withdrawAll',
          chainId: polygonAmoy.id,
        })
      } else {
        const amountBig = parseUnits(withdrawAmount, 6) // wPYUSD has 6 decimals
        console.log('Withdrawing amount:', withdrawAmount, 'Wei:', amountBig.toString())
        withdrawFromEscrow({
          address: ESCROW_ADDRESS,
          abi: ESCROW_ABI,
          functionName: 'withdraw',
          args: [amountBig],
          chainId: polygonAmoy.id,
        })
      }
    } catch (err: any) {
      console.error('Error starting withdrawal flow:', err)
      setError(`Failed to start withdrawal: ${err.message}`)
      setCurrentStep('error')
    }
  }

  // Helper function to set max amount
  const setMaxAmount = () => {
    if (formattedBalance) {
      setWithdrawAmount(formattedBalance)
      setIsWithdrawAll(false)
    }
  }

  // Toggle withdraw all
  const toggleWithdrawAll = () => {
    setIsWithdrawAll(!isWithdrawAll)
    if (!isWithdrawAll) {
      setWithdrawAmount('')
    }
  }

  // Get current step display text
  const getStepText = () => {
    switch (currentStep) {
      case 'withdrawing':
        return isWithdrawPending ? 'Withdrawing...' : 'Confirming Withdrawal...'
      case 'success':
        return 'Success!'
      case 'error':
        return 'Error'
      default:
        return isWithdrawAll ? 'Withdraw All' : 'Withdraw'
    }
  }

  const isPending = isWithdrawPending
  const isConfirming = isWithdrawConfirming
  const isFormDisabled = isPending || isConfirming || !isAmoyChain || !isConnected

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-slate-700/50 backdrop-blur-xl">
        <h3 className="text-2xl font-bold text-white mb-6">Withdraw from Escrow</h3>
        
        {/* Network Check */}
        {!isConnected && (
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl">
            <p className="text-amber-400 text-sm font-medium">
              Please connect your wallet first
            </p>
          </div>
        )}
        
        {isConnected && !isAmoyChain && (
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl">
            <p className="text-amber-400 text-sm font-medium">
              Please switch to Polygon Amoy network to withdraw
            </p>
            <p className="text-amber-300 text-xs mt-1">
              Current: Chain ID {chainId} | Expected: Chain ID {polygonAmoy.id}
            </p>
          </div>
        )}

        {/* Step Indicator */}
        {currentStep !== 'input' && currentStep !== 'error' && (
          <div className="mb-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl">
            <div className="flex items-center">
              {(isPending || isConfirming) && (
                <Loader2 className="w-4 h-4 animate-spin text-purple-400 mr-2" />
              )}
              <p className="text-purple-400 text-sm font-medium">
                {getStepText()}
              </p>
            </div>
            {currentStep === 'success' && (
              <p className="text-purple-300 text-xs mt-1">
                Closing in 3 seconds...
              </p>
            )}
          </div>
        )}

        <div className="space-y-6">
          {/* Balance Display */}
          <div className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/50">
            <p className="text-sm text-slate-400 mb-1">Available Balance</p>
            <p className="text-2xl font-bold text-white">
              {!isConnected || !isAmoyChain ? (
                <span className="text-slate-500 text-lg">Connect to Amoy</span>
              ) : isBalanceLoading ? (
                <div className="flex items-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                  <span className="ml-2 text-base text-slate-400">Loading...</span>
                </div>
              ) : isBalanceError ? (
                <span className="text-red-400 text-lg">Error loading</span>
              ) : (
                <span className="text-green-400">
                  ${balanceAsNumber.toFixed(2)}
                </span>
              )}
            </p>
          </div>

          {/* Withdraw All Toggle */}
          {isConnected && isAmoyChain && !isBalanceError && balanceAsNumber > 0 && (
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="withdrawAll"
                checked={isWithdrawAll}
                onChange={toggleWithdrawAll}
                disabled={isFormDisabled}
                className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 focus:ring-2"
              />
              <label htmlFor="withdrawAll" className="text-sm text-slate-300 font-medium">
                Withdraw all available balance
              </label>
            </div>
          )}

          {/* Amount Input */}
          {!isWithdrawAll && (
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
                Amount to Withdraw (wPYUSD)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 text-white placeholder-slate-400 backdrop-blur-sm transition-all duration-300 pr-16"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  max={formattedBalance || "0"}
                  disabled={isFormDisabled}
                />
                <button
                  type="button"
                  onClick={setMaxAmount}
                  disabled={isFormDisabled || isBalanceLoading || !formattedBalance || balanceAsNumber <= 0}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  MAX
                </button>
              </div>
              
              {/* Validation Messages */}
              {withdrawAmount && (
                <div className="flex justify-between items-center mt-2">
                  <div className="text-xs text-slate-500">
                    {parseFloat(withdrawAmount) > balanceAsNumber && (
                      <span className="text-red-400">Amount exceeds available balance</span>
                    )}
                    {parseFloat(withdrawAmount) <= 0 && withdrawAmount !== '' && (
                      <span className="text-red-400">Amount must be greater than 0</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Withdraw All Summary */}
          {isWithdrawAll && (
            <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl">
              <p className="text-purple-400 text-sm font-medium">
                Withdrawing entire balance: ${balanceAsNumber.toFixed(2)}
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm font-medium">{error}</p>
              {currentStep === 'error' && (
                <button
                  onClick={() => {
                    setCurrentStep('input')
                    setError('')
                  }}
                  className="text-red-300 text-xs mt-2 hover:text-red-200"
                >
                  Try again
                </button>
              )}
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 text-slate-300 bg-slate-700/50 rounded-xl hover:bg-slate-600/50 transition-all duration-300 font-semibold border border-slate-600/50"
              disabled={isPending || isConfirming}
            >
              Cancel
            </button>
            <button
              onClick={handleWithdraw}
              className="flex-1 px-6 py-3 text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl hover:from-purple-500 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 flex items-center justify-center font-semibold shadow-lg shadow-purple-500/25"
              disabled={
                isFormDisabled ||
                balanceAsNumber <= 0 ||
                (!isWithdrawAll && (!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > balanceAsNumber)) ||
                currentStep === 'success' ||
                isBalanceError
              }
            >
              {isPending || isConfirming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                getStepText()
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WithdrawModal