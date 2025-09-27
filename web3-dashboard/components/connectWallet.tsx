'use client'

import { useState } from 'react'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { sepolia, arbitrumSepolia, optimismSepolia } from 'wagmi/chains'

// Helper function to shorten an address
const shortenAddress = (address: string): string => 
  `${address.slice(0, 6)}...${address.slice(-4)}`

interface ConnectButtonProps {
  className?: string
}

function ConnectButton({ className = '' }: ConnectButtonProps) {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false)

  // Supported testnet chains
  const supportedChains = [sepolia, arbitrumSepolia, optimismSepolia]
  const isWrongChain = isConnected && !supportedChains.some(chain => chain.id === chainId)
  const currentChain = supportedChains.find(chain => chain.id === chainId)

  // 1. If connected and on a supported chain
  if (isConnected && !isWrongChain) {
    return (
      <div className={`flex items-center gap-3 p-2 border border-blue-600 rounded-md ${className}`}>
        <p className="m-0 font-bold">
          ✅ {shortenAddress(address!)}
        </p>
        <p className="m-0 text-sm">
          <strong>{currentChain?.name || 'Unknown'}</strong>
        </p>
        <button
          onClick={() => setIsDisconnectOpen(!isDisconnectOpen)}
          className="px-3 py-1 text-white bg-gray-600 rounded-md hover:bg-gray-700"
          aria-label="Toggle disconnect option"
        >
          ⋮
        </button>
        {isDisconnectOpen && (
          <button
            onClick={() => {
              disconnect()
              setIsDisconnectOpen(false)
            }}
            disabled={isConnecting}
            className="px-3 py-1 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Disconnect wallet"
          >
            {isConnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        )}
      </div>
    )
  }

  // 2. If connected but on an unsupported chain
  if (isConnected && isWrongChain) {
    return (
      <div className={`flex items-center gap-3 p-2 border border-red-600 rounded-md text-red-600 ${className}`}>
        <p className="m-0 font-bold">⚠️ Unsupported Network!</p>
        <div className="flex items-center gap-2">
          {supportedChains.map(chain => (
            <button
              key={chain.id}
              onClick={() => switchChain({ chainId: chain.id })}
              disabled={isSwitching}
              className="px-3 py-1 text-white bg-orange-500 rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Switch to ${chain.name} network`}
            >
              {isSwitching ? 'Switching...' : `Switch to ${chain.name}`}
            </button>
          ))}
          <button
            onClick={() => disconnect()}
            className="px-3 py-1 text-white bg-red-600 rounded-md hover:bg-red-700 text-sm"
            aria-label="Disconnect wallet"
          >
            Disconnect
          </button>
        </div>
      </div>
    )
  }

  // 3. If not connected, show connect button that triggers wallet selection modal
  return (
    <div className={className}>
      <button
        onClick={() => connect({ connector: connectors[0] })} // Use the first available connector
        disabled={isConnecting}
        className="px-5 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Connect wallet"
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  )
}

export default ConnectButton