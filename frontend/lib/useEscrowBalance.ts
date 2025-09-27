import { useReadContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { formatUnits } from "viem";

const ESCROW_ADDRESS = "0x6E5559e7Cf01860416ff9CbEcC3bbdC1f05dB3D0" as const; // Updated escrow contract address on Sepolia

const ESCROW_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserBalanceUSD",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "provider", type: "address" }],
    name: "getProviderBalance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Custom hook to fetch user's escrow balance
 */
export const useEscrowBalance = (
  userAddress: `0x${string}` | undefined,
  enabled: boolean = true
) => {
  const {
    data: rawBalance,
    isLoading,
    isError,
    error,
    refetch,
  } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "getUserBalanceUSD",
    args: userAddress ? [userAddress] : undefined,
    chainId: sepolia.id,
    query: {
      enabled: !!userAddress && enabled,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  // Format the balance for display: The contract returns whole USD (0 decimals).
  // We remove the redundant division by 100.
  const formattedBalance = rawBalance
    ? (Number(formatUnits(rawBalance as bigint, 0))).toString()
    : "0";
  const balanceAsNumber = parseFloat(formattedBalance);

  return {
    rawBalance: rawBalance as bigint | undefined,
    formattedBalance,
    balanceAsNumber,
    isLoading,
    isError,
    error,
    refetch,
    hasBalance: balanceAsNumber > 0,
  };
};

/**
 * Custom hook to fetch provider balance
 */
export const useProviderBalance = (
  providerAddress: `0x${string}` | undefined,
  enabled: boolean = true
) => {
  const {
    data: rawBalance,
    isLoading,
    isError,
    error,
    refetch,
  } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "getProviderBalance",
    args: providerAddress ? [providerAddress] : undefined,
    chainId: sepolia.id,
    query: {
      enabled: !!providerAddress && enabled,
      refetchInterval: 15000,
    },
  });

  const formattedBalance = rawBalance
    ? (Number(formatUnits(rawBalance as bigint, 0))).toString()
    : "0";
  const balanceAsNumber = parseFloat(formattedBalance);

  return {
    rawBalance: rawBalance as bigint | undefined,
    formattedBalance,
    balanceAsNumber,
    isLoading,
    isError,
    error,
    refetch,
    hasBalance: balanceAsNumber > 0,
  };
};