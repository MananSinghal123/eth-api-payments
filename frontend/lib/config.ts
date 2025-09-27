// lib/config.ts
import { createConfig, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { metaMask, walletConnect, injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    metaMask(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id',
    }),
    injected(),
  ],
  transports: {
    [sepolia.id]: http(),
  },
})

// PYUSD Token Contract
export const pyusdTokenContract = {
  address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as const,
  abi: [
    {
      inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
      name: "allowance",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
      name: "approve",
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [{ name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function"
    }
  ] as const,
  chainId: sepolia.id,
}

// Escrow Contract - Updated to match your actual contract
export const escrowContract = {
  address: "0xe73922A448D76756bAbC9126f4401101cbFB4FBc" as const,
  abi: [
    // User functions
    {
      inputs: [{ name: "amountUSD", type: "uint256" }],
      name: "deposit",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [{ name: "amountCents", type: "uint256" }],
      name: "withdraw",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    // View functions - matching your actual contract
    {
      inputs: [{ name: "user", type: "address" }],
      name: "getUserBalance",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [{ name: "user", type: "address" }],
      name: "getUserBalanceUSD",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function"
    },
    // Provider functions
    {
      inputs: [{ name: "amountCents", type: "uint256" }],
      name: "providerWithdraw",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [],
      name: "providerWithdrawAll",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [{ name: "provider", type: "address" }],
      name: "getProviderBalance",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function"
    },
    // ERC20 approval (you'll need this)
    {
      inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
      name: "approve",
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function"
    }
  ] as const,
  chainId: sepolia.id,
}