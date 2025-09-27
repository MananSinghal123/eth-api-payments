// lib/useEscrowBalance.ts
import { useReadContract } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { formatUnits } from 'viem'

const ESCROW_ADDRESS = "0xe73922A448D76756bAbC9126f4401101cbFB4FBc" as const

const ESCROW_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserBalance", // Correct function name from your contract
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserBalanceUSD", // Also available for USD format
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const

/**
 * Custom hook to fetch user's escrow balance
 */
export const useEscrowBalance = (userAddress: `0x${string}` | undefined, enabled: boolean = true) => {
  // Get balance in cents
  const {
    data: rawBalanceInCents,
    isLoading,
    isError,
    error,
    refetch
  } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'getUserBalance', // Returns balance in cents
    args: userAddress ? [userAddress] : undefined,
    chainId: sepolia.id,
    query: {
      enabled: !!userAddress && enabled,
      refetchInterval: 10000,
    },
  })

  // Convert cents to USD for display (divide by 100)
  const balanceInCents = rawBalanceInCents as bigint | undefined
  const balanceInUSD = balanceInCents ? Number(balanceInCents) / 100 : 0
  
  // Format for display (6 decimal places to match PYUSD)
  const formattedBalance = balanceInUSD.toFixed(6)

  return {
    rawBalance: balanceInCents, // Balance in cents (as stored in contract)
    balanceInCents: balanceInCents ? Number(balanceInCents) : 0,
    balanceInUSD, // Balance in USD
    formattedBalance, // Formatted string for display
    balanceAsNumber: balanceInUSD,
    isLoading,
    isError,
    error,
    refetch,
    hasBalance: balanceInUSD > 0
  }
}

/**
 * Custom hook to fetch total escrow contract balance (if needed)
 */
export const useTotalEscrowBalance = (enabled: boolean = true) => {
  // You might need to add a totalEscrowed function to your contract
  // For now, this is a placeholder
  return {
    totalEscrowed: undefined,
    formattedTotal: '0',
    totalAsNumber: 0,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {}
  }
}