"use client"

import React, { useState, useEffect } from "react"
import { useAccount, useChainId, useBalance } from "wagmi"
import { formatUnits, parseUnits } from "viem"
import { 
  ArrowRight, 
  Loader2, 
  Network, 
  Zap, 
  Bot,
  Activity,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { pyusdTokenContract, wrappedPyusdAdapterContract } from "../lib/config"
import { useWPYUSDTransfer } from "../lib/useContracts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const SEPOLIA_CHAIN_ID = 11155111
const POLYGON_AMOY_CHAIN_ID = 80002

export default function BridgeComponent() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const isSepoliaChain = chainId === SEPOLIA_CHAIN_ID
  
  const [bridgeAmount, setBridgeAmount] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [bridgeStatus, setBridgeStatus] = useState<'idle' | 'approving' | 'bridging' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState<string>('')

  // Get PYUSD balance on Sepolia
  const { data: pyusdBalance, isLoading: isBalanceLoading, refetch: refetchBalance } = useBalance({
    address: address,
    token: pyusdTokenContract.address,
    chainId: SEPOLIA_CHAIN_ID,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000,
    },
  })

  // Use the existing bridge functionality
  const { 
    transferTokens, 
    quoteFee,
    allowance,
    bridgeStep,
    isPending, 
    isConfirming, 
    isSuccess,
    error,
    refetchQuote,
    refetchAllowance
  } = useWPYUSDTransfer()

  // Handle successful transactions
  useEffect(() => {
    if (isSuccess) {
      if (bridgeStep === 'approving') {
        // Approval successful, now initiate the send
        setBridgeStatus('bridging')
        setStatusMessage('Approval successful! Starting cross-chain transfer...')
        refetchAllowance()
        setTimeout(() => {
          transferTokens(bridgeAmount)
        }, 2000) // Wait a bit for allowance to update
      } else if (bridgeStep === 'sending') {
        // Bridge successful
        setBridgeStatus('success')
        setStatusMessage('Cross-chain bridge completed successfully!')
        setBridgeAmount("")
        setIsProcessing(false)
        refetchBalance()
        
        // Reset status after 5 seconds
        setTimeout(() => {
          setBridgeStatus('idle')
          setStatusMessage('')
        }, 5000)
      }
    }
  }, [isSuccess, bridgeStep, bridgeAmount, refetchBalance, refetchAllowance, transferTokens])

  // Handle errors
  useEffect(() => {
    if (error) {
      setBridgeStatus('error')
      setStatusMessage(error.message || 'Bridge transaction failed')
      setIsProcessing(false)
    }
  }, [error])

  // Handle bridge submission
  const handleBridge = async () => {
    if (!bridgeAmount || parseFloat(bridgeAmount) <= 0) {
      setStatusMessage("Please enter a valid amount")
      return
    }

    if (!pyusdBalance || parseUnits(bridgeAmount, 6) > pyusdBalance.value) {
      setStatusMessage("Insufficient PYUSD balance")
      return
    }

    if (!isSepoliaChain) {
      setStatusMessage("Please switch to Sepolia network to bridge PYUSD")
      return
    }

    setBridgeStatus('approving')
    setStatusMessage('Initiating cross-chain bridge...')
    setIsProcessing(true)
    
    try {
      await transferTokens(bridgeAmount)
    } catch (err) {
      console.error("Bridge error:", err)
      setBridgeStatus('error')
      setStatusMessage('Failed to initiate bridge transaction')
      setIsProcessing(false)
    }
  }

  const formatPYUSD = (amount: bigint | undefined) => {
    if (!amount) return "$0.00"
    return `$${parseFloat(formatUnits(amount, 6)).toFixed(2)}`
  }

  const isButtonDisabled = isProcessing || isPending || isConfirming || !bridgeAmount || parseFloat(bridgeAmount) <= 0

  // Check if user needs approval
  const needsApproval = allowance && bridgeAmount ? 
    (allowance as bigint) < parseUnits(bridgeAmount, 6) : false

  const handleRefresh = () => {
    refetchBalance()
    refetchQuote()
    refetchAllowance()
  }

  return (
    <Card className="border-gray-800/50 bg-gradient-to-br from-gray-900/40 to-black/40 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg">
              <Network className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Neural Bridge
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
              <Bot className="w-3 h-3 mr-1" />
              AI Powered
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isBalanceLoading}
              className="h-8 w-8 p-0 hover:bg-gray-800/50"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${isBalanceLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Bridge Route Visualization */}
        <div className="p-4 bg-gradient-to-r from-gray-800/30 to-gray-900/30 rounded-xl border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20 mb-2">
                Source
              </Badge>
              <div className="text-sm font-medium text-gray-300">Ethereum Sepolia</div>
              <div className="text-xs text-gray-500">PYUSD</div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-px bg-gradient-to-r from-cyan-500/50 to-blue-500/50"></div>
              <ArrowRight className="w-5 h-5 text-cyan-400" />
              <div className="w-8 h-px bg-gradient-to-r from-blue-500/50 to-purple-500/50"></div>
            </div>
            
            <div className="text-center">
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20 mb-2">
                Destination
              </Badge>
              <div className="text-sm font-medium text-gray-300">Polygon Amoy</div>
              <div className="text-xs text-gray-500">wPYUSD</div>
            </div>
          </div>
        </div>

        {/* PYUSD Balance Display */}
        <div className="p-4 bg-gradient-to-r from-blue-900/20 to-blue-800/20 border border-blue-500/20 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">Available Balance (Sepolia)</span>
            </div>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          
          <div className="text-2xl font-bold">
            {isBalanceLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                <span className="text-blue-400">Loading...</span>
              </div>
            ) : (
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {formatPYUSD(pyusdBalance?.value)}
              </span>
            )}
          </div>
          
          <div className="text-xs text-gray-500 mt-1">
            Source network balance
          </div>
        </div>

        {/* Bridge Amount Input */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="bridgeAmount" className="text-gray-300 mb-2 block">
              Amount to Bridge (PYUSD)
            </Label>
            <div className="flex space-x-2">
              <Input
                id="bridgeAmount"
                type="number"
                step="0.01"
                min="0"
                value={bridgeAmount}
                onChange={(e) => setBridgeAmount(e.target.value)}
                placeholder="Enter amount"
                className="flex-1 bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-400"
                disabled={isProcessing || isPending || isConfirming}
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (pyusdBalance?.value) {
                    setBridgeAmount(formatUnits(pyusdBalance.value, 6))
                  }
                }}
                disabled={!pyusdBalance?.value || isProcessing}
                className="border-gray-700/50 text-gray-300 hover:bg-gray-800/50"
              >
                Max
              </Button>
            </div>
          </div>

          {/* Status Message */}
          {(bridgeStatus !== 'idle' || statusMessage) && (
            <div className={`p-4 rounded-lg border ${
              bridgeStatus === 'success' ? 'bg-green-500/10 border-green-500/20' :
              bridgeStatus === 'error' ? 'bg-red-500/10 border-red-500/20' :
              'bg-blue-500/10 border-blue-500/20'
            }`}>
              <div className="flex items-center space-x-2">
                {(bridgeStatus === 'approving' || bridgeStatus === 'bridging') && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {bridgeStatus === 'success' && <CheckCircle className="w-4 h-4 text-green-400" />}
                {bridgeStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                <span className={`text-sm font-medium ${
                  bridgeStatus === 'success' ? 'text-green-400' :
                  bridgeStatus === 'error' ? 'text-red-400' :
                  'text-blue-400'
                }`}>
                  {statusMessage || (
                    bridgeStatus === 'approving' ? 'Approving tokens...' :
                    bridgeStatus === 'bridging' ? 'Bridging tokens...' :
                    'Ready to bridge'
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Bridge Button */}
          <Button
            onClick={handleBridge}
            disabled={isButtonDisabled}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3"
          >
            {(isProcessing || isPending || isConfirming) ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>
                  {bridgeStatus === 'approving' ? "Approving..." : 
                   bridgeStatus === 'bridging' ? "Bridging..." :
                   isPending ? "Confirming..." : 
                   isConfirming ? "Processing..." : "Processing..."}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Network className="w-5 h-5" />
                <span>
                  {needsApproval ? "Approve & Bridge" : "Bridge to Amoy"}
                </span>
              </div>
            )}
          </Button>
        </div>

        {/* Network Warning */}
        {isConnected && !isSepoliaChain && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-amber-400 font-medium">Wrong Network</div>
                <div className="text-amber-300 text-sm">Switch to Sepolia to bridge PYUSD</div>
              </div>
            </div>
          </div>
        )}

        {/* AI Agent Info */}
        <Separator className="bg-gray-800/50" />
        <div className="flex items-center justify-between p-3 bg-gray-800/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Bot className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-gray-300">Neural Bridge Protocol</span>
          </div>
          <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
            <Activity className="w-3 h-3 mr-1" />
            Active
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}