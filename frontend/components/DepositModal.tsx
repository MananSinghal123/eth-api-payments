import React from "react"
import { Loader2 } from "lucide-react"
import { useAccount, useChainId, useBalance, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi"
import { formatUnits } from "viem"
import { sepolia } from "wagmi/chains"
import { contractConfig } from "../lib/config"

// Contract addresses from config
const PYUSD_SEPOLIA_ADDRESS = contractConfig.sepolia.pyusdToken.address
const ESCROW_ADDRESS = contractConfig.sepolia.escrow.address

// Use ABIs directly with proper typing
const ERC20_ABI = [
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const

const ESCROW_ABI = [
  {
    inputs: [{ name: "amountUSD", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const

interface DepositModalProps {
  isOpen: boolean
  setShowDepositModal: (open: boolean) => void
  onDepositSuccess?: () => void
}

const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  setShowDepositModal,
  onDepositSuccess,
}) => {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [depositAmount, setDepositAmount] = React.useState<string>('')
  const [currentStep, setCurrentStep] = React.useState<'input' | 'approving' | 'depositing' | 'success' | 'error'>('input')
  const [error, setError] = React.useState<string>('')
  
  const isSepoliaChain = chainId === sepolia.id

  // Contract write hooks
  const { 
    writeContract: approveToken, 
    isPending: isApprovePending,
    data: approveHash,
    error: approveError
  } = useWriteContract()

  const { 
    writeContract: depositToEscrow, 
    isPending: isDepositPending,
    data: depositHash,
    error: depositError
  } = useWriteContract()

  // Wait for transactions
  const { 
    isLoading: isApproveConfirming, 
    isSuccess: isApproveSuccess,
    error: approveReceiptError
  } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  const { 
    isLoading: isDepositConfirming, 
    isSuccess: isDepositSuccess,
    error: depositReceiptError
  } = useWaitForTransactionReceipt({
    hash: depositHash,
  })

  // Fetch PYUSD balance
  const { 
    data: pyusdBalance, 
    isLoading: isPyusdLoading, 
    isError: isPyusdError,
    refetch: refetchBalance
  } = useBalance({
    address: address,
    token: PYUSD_SEPOLIA_ADDRESS,
    chainId: sepolia.id,
    query: {
      enabled: !!address && isOpen && isSepoliaChain,
      refetchInterval: 10000,
    },
  })

  // Check allowance
  const { 
    data: allowance, 
    refetch: refetchAllowance,
    isLoading: isAllowanceLoading
  } = useReadContract({
    address: PYUSD_SEPOLIA_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, ESCROW_ADDRESS] : undefined,
    chainId: sepolia.id,
    query: { 
      enabled: !!address && isOpen && isSepoliaChain,
      refetchInterval: 5000
    },
  })

  // Handle errors
  React.useEffect(() => {
    if (approveError) {
      console.error('❌ Approve error:', approveError)
      console.error('❌ Approve error details:', {
        name: approveError.name,
        message: approveError.message,
        cause: approveError.cause
      })
      setError(`Approval failed: ${approveError.message}`)
      setCurrentStep('error')
    }
    if (depositError) {
      console.error('❌ Deposit error:', depositError)
      console.error('❌ Deposit error details:', {
        name: depositError.name,
        message: depositError.message,
        cause: depositError.cause
      })
      setError(`Deposit failed: ${depositError.message}`)
      setCurrentStep('error')
    }
    if (approveReceiptError) {
      console.error('❌ Approve receipt error:', approveReceiptError)
      setError(`Approval transaction failed: ${approveReceiptError.message}`)
      setCurrentStep('error')
    }
    if (depositReceiptError) {
      console.error('❌ Deposit receipt error:', depositReceiptError)
      setError(`Deposit transaction failed: ${depositReceiptError.message}`)
      setCurrentStep('error')
    }
  }, [approveError, depositError, approveReceiptError, depositReceiptError])

  // Handle transaction success
  React.useEffect(() => {
    if (isApproveSuccess && currentStep === 'approving') {
      console.log('Approval successful, starting deposit')
      setCurrentStep('depositing')
      
      try {
        // Contract expects USD amount as integer, but our input might have decimals
        // Convert to the correct USD amount (e.g., "5.00" -> 5)
        const amountUSD = BigInt(Math.floor(parseFloat(depositAmount)))
        console.log('💰 Depositing USD amount:', amountUSD.toString())
        console.log('🔍 Input amount:', depositAmount)
        
        depositToEscrow({
          address: ESCROW_ADDRESS,
          abi: ESCROW_ABI,
          functionName: 'deposit',
          args: [amountUSD],
          chainId: sepolia.id,
          gas: BigInt(150000), // Set explicit gas limit
        })
      } catch (err: any) {
        console.error('Error initiating deposit:', err)
        setError(`Failed to initiate deposit: ${err.message}`)
        setCurrentStep('error')
      }
    }
  }, [isApproveSuccess, currentStep, depositAmount, depositToEscrow])

  React.useEffect(() => {
    if (isDepositSuccess && currentStep === 'depositing') {
      console.log('Deposit successful')
      setCurrentStep('success')
      refetchBalance()
      refetchAllowance()
      onDepositSuccess?.()
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        handleClose()
      }, 3000)
    }
  }, [isDepositSuccess, currentStep, refetchBalance, refetchAllowance, onDepositSuccess])

  const handleClose = () => {
    setShowDepositModal(false)
    setDepositAmount('')
    setCurrentStep('input')
    setError('')
  }

  const handleDeposit = async () => {
    console.log('🚀 handleDeposit called!')
    console.log('📍 Debug info:', {
      address,
      depositAmount,
      isSepoliaChain,
      isConnected,
      chainId
    })
    
    if (!address || !depositAmount || parseFloat(depositAmount) <= 0 || !isSepoliaChain) {
      console.log('❌ Early return due to validation:', {
        hasAddress: !!address,
        hasDepositAmount: !!depositAmount,
        validAmount: depositAmount ? parseFloat(depositAmount) > 0 : false,
        isSepoliaChain
      })
      return
    }

    try {
      console.log('✅ Validation passed, starting deposit process...')
      setError('')
      
      // Contract expects USD amount as integer, but our input might have decimals
      // Convert to the correct USD amount (e.g., "5.00" -> 5)
      const amountUSD = BigInt(Math.floor(parseFloat(depositAmount)))
      // The approval should be for the actual PYUSD tokens that will be transferred
      // Contract will transfer: amountUSD * 1e6 PYUSD tokens (since PYUSD has 6 decimals)
      const expectedTokenTransfer = amountUSD * BigInt(1e6) // What contract will actually transfer
      
      console.log('Deposit amount (USD):', amountUSD.toString())
      console.log('Expected token transfer:', expectedTokenTransfer.toString(), 'PYUSD tokens (raw)')
      console.log('Current allowance:', allowance?.toString())
      
      // Check if we need approval - use expected token transfer amount
      const needsApproval = !allowance || (allowance as bigint) < expectedTokenTransfer
      
      if (needsApproval) {
        console.log('Starting approval flow')
        setCurrentStep('approving')
        approveToken({
          address: PYUSD_SEPOLIA_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [ESCROW_ADDRESS, expectedTokenTransfer],
          chainId: sepolia.id,
        })
      } else {
        console.log('✅ Sufficient allowance, starting deposit directly')
        console.log('💰 Depositing USD amount:', amountUSD.toString())
        console.log('🔍 Input amount:', depositAmount)
        setCurrentStep('depositing')
        depositToEscrow({
          address: ESCROW_ADDRESS,
          abi: ESCROW_ABI,
          functionName: 'deposit',
          args: [amountUSD], // Pass USD amount as bigint
          chainId: sepolia.id,
          gas: BigInt(150000), // Set explicit gas limit
        })
      }
    } catch (err: any) {
      console.error('Error starting deposit flow:', err)
      setError(`Failed to start deposit: ${err.message}`)
      setCurrentStep('error')
    }
  }

  // Get combined pending states
  const isPending = isApprovePending || isDepositPending
  const isConfirming = isApproveConfirming || isDepositConfirming

  if (!isOpen) return null

  console.log('🔍 DepositModal rendered with state:', {
    address,
    isConnected,
    chainId,
    isSepoliaChain,
    depositAmount,
    currentStep,
    isPending,
    isConfirming
  })

  // Format balance for display
  const formatBalance = (balanceData: typeof pyusdBalance) => {
    if (!balanceData || !balanceData.value) return "$0.00"
    const formatted = Number(balanceData.formatted)
    return `$${formatted.toFixed(2)}`
  }

  // Helper function to set max amount
  const setMaxAmount = () => {
    if (pyusdBalance && pyusdBalance.formatted) {
      setDepositAmount(pyusdBalance.formatted)
    }
  }

  // Get raw balance amount for comparison
  const getBalanceAmount = () => {
    if (!pyusdBalance || !pyusdBalance.formatted) return 0
    return parseFloat(pyusdBalance.formatted)
  }

  // Get current step display text
  const getStepText = () => {
    switch (currentStep) {
      case 'approving':
        return isPending ? 'Approving...' : 'Confirming Approval...'
      case 'depositing':
        return isPending ? 'Depositing...' : 'Confirming Deposit...'
      case 'success':
        return 'Success!'
      case 'error':
        return 'Error'
      default:
        return 'Deposit to Escrow'
    }
  }

  const isFormDisabled = isPending || isConfirming || !isSepoliaChain || !isConnected

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-slate-700/50 backdrop-blur-xl">
        <h3 className="text-2xl font-bold text-white mb-6">Deposit PYUSD to Escrow</h3>
        
        {/* Network Check */}
        {!isConnected && (
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl">
            <p className="text-amber-400 text-sm font-medium">
              Please connect your wallet first
            </p>
          </div>
        )}
        
        {isConnected && !isSepoliaChain && (
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl">
            <p className="text-amber-400 text-sm font-medium">
              Please switch to Sepolia network to deposit PYUSD
            </p>
            <p className="text-amber-300 text-xs mt-1">
              Current: Chain ID {chainId} | Expected: Chain ID {sepolia.id}
            </p>
          </div>
        )}

        {/* Step Indicator */}
        {currentStep !== 'input' && currentStep !== 'error' && (
          <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
            <div className="flex items-center">
              {(isPending || isConfirming) && (
                <Loader2 className="w-4 h-4 animate-spin text-blue-400 mr-2" />
              )}
              <p className="text-blue-400 text-sm font-medium">
                {getStepText()}
              </p>
            </div>
            {currentStep === 'success' && (
              <p className="text-blue-300 text-xs mt-1">
                Closing in 3 seconds...
              </p>
            )}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
              Amount to Deposit (PYUSD)
            </label>
            <div className="relative">
              <input
                type="number"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-white placeholder-slate-400 backdrop-blur-sm transition-all duration-300 pr-16"
                placeholder="0.00"
                min="0"
                step="0.01"
                disabled={isFormDisabled}
              />
              <button
                type="button"
                onClick={setMaxAmount}
                disabled={isFormDisabled || isPyusdLoading || !pyusdBalance}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                MAX
              </button>
            </div>
            
            {/* Balance Display */}
            <div className="flex justify-between items-center mt-2">
              <div className="text-xs text-slate-400 font-medium">
                Your PYUSD balance: 
                {!isConnected ? (
                  <span className="text-slate-500 ml-1">Connect Wallet</span>
                ) : !isSepoliaChain ? (
                  <span className="text-amber-400 ml-1">Switch to Sepolia</span>
                ) : isPyusdLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-blue-400 inline ml-1" />
                ) : isPyusdError ? (
                  <span className="text-red-400 ml-1">Error loading</span>
                ) : (
                  <span className="text-green-400 ml-1">{formatBalance(pyusdBalance)}</span>
                )}
              </div>
              {depositAmount && pyusdBalance && (
                <div className="text-xs">
                  {parseFloat(depositAmount) > getBalanceAmount() && (
                    <span className="text-red-400">Insufficient balance</span>
                  )}
                </div>
              )}
            </div>

            {/* Allowance Info */}
            {isSepoliaChain && isConnected && !isAllowanceLoading && allowance && (
              <div className="text-xs text-slate-500 mt-1">
                Current allowance: ${formatUnits(allowance as bigint, 6)}
              </div>
            )}
          </div>

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
              onClick={() => {
                console.log('🔘 Deposit button clicked!')
                handleDeposit()
              }}
              className="flex-1 px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-500 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 flex items-center justify-center font-semibold shadow-lg shadow-blue-500/25"
              disabled={
                isFormDisabled ||
                !depositAmount || 
                Number.parseFloat(depositAmount) <= 0 ||
                parseFloat(depositAmount) > getBalanceAmount() ||
                isPyusdLoading ||
                isPyusdError ||
                currentStep === 'success'
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

export default DepositModal