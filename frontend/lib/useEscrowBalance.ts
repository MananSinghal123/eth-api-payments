import { useReadContract } from 'wagmi'
import { polygonAmoy } from 'wagmi/chains'
import { formatUnits } from 'viem'

const ESCROW_ADDRESS = "0xAC6a80da31d9D32f453332A9d6184c8b2376430E" as const // Replace with your actual escrow contract address

const ESCROW_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getBalance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalEscrowed",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const

/**
 * Custom hook to fetch user's escrow balance
 */
export const useEscrowBalance = (userAddress: `0x${string}` | undefined, enabled: boolean = true) => {
  const { 
    data: rawBalance, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'getBalance',
    args: userAddress ? [userAddress] : undefined,
    chainId: polygonAmoy.id,
    query: { 
      enabled: !!userAddress && enabled,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  })

  // Format the balance for display
  const formattedBalance = rawBalance ? formatUnits(rawBalance as bigint, 6) : '0'
  const balanceAsNumber = parseFloat(formattedBalance)

  return {
    rawBalance: rawBalance as bigint | undefined,
    formattedBalance,
    balanceAsNumber,
    isLoading,
    isError,
    error,
    refetch,
    hasBalance: balanceAsNumber > 0
  }
}

/**
 * Custom hook to fetch total escrow contract balance
 */
export const useTotalEscrowBalance = (enabled: boolean = true) => {
  const { 
    data: totalEscrowed, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'totalEscrowed',
    chainId: polygonAmoy.id,
    query: { 
      enabled: enabled,
      refetchInterval: 15000,
    },
  })

  const formattedTotal = totalEscrowed ? formatUnits(totalEscrowed as bigint, 6) : '0'

  return {
    totalEscrowed: totalEscrowed as bigint | undefined,
    formattedTotal,
    totalAsNumber: parseFloat(formattedTotal),
    isLoading,
    isError,
    error,
    refetch
  }
}