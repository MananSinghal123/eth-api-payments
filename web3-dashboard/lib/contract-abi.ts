"use client";

import { useCallback, useMemo } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from '@wagmi/core';
import { parseUnits, formatUnits, maxUint256 } from "viem";
import { sepolia } from "wagmi/chains";
import { config } from './wagmi';

// Contract addresses
const CONTRACT_ADDRESS = "0x6E5559e7Cf01860416ff9CbEcC3bbdC1f05dB3D0" as `0x${string}`;
const PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9" as `0x${string}`;

// Contract ABIs
const contractAbi = [
  {
    type: "function",
    name: "deposit",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getUserBalance",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "paused",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
] as const;

const erc20Abi = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export function useDeposit() {
  const { address, isConnected } = useAccount();

  // Get PYUSD wallet balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: PYUSD_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: sepolia.id,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000,
    },
  });

  // Get allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: PYUSD_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, CONTRACT_ADDRESS] : undefined,
    chainId: sepolia.id,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Get contract paused status
  const { data: isPaused } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractAbi,
    functionName: "paused",
    chainId: sepolia.id,
    query: {
      refetchInterval: 30000,
    },
  });

  // 🔥 FETCH USER BALANCE USING getUserBalance FUNCTION
  const { 
    data: userBalanceFromContract, 
    refetch: refetchUserBalance,
    error: userBalanceError,
    isLoading: userBalanceLoading
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractAbi,
    functionName: "getUserBalance",
    args: address ? [address] : undefined,
    chainId: sepolia.id,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 5000, // Refresh every 5 seconds
    },
  });

  const { writeContractAsync: approveAsync, isPending: isApproving } = useWriteContract();
  const { writeContractAsync: depositAsync, isPending: isDepositing } = useWriteContract();

  // Combined loading state
  const isLoading = useMemo(() => 
    isApproving || isDepositing || userBalanceLoading, 
    [isApproving, isDepositing, userBalanceLoading]
  );

  // Format wallet balance
  const formattedBalance = useMemo(() => {
    if (!balance) return "0.000000";
    try {
      return formatUnits(balance, 6);
    } catch {
      return "0.000000";
    }
  }, [balance]);

  // 🔥 FORMAT USER ESCROW BALANCE FROM getUserBalance CONTRACT FUNCTION
  const userEscrowBalance = useMemo(() => {
    if (!userBalanceFromContract) return "0.000000";
    try {
      const formatted = formatUnits(userBalanceFromContract,2);
      console.log("📊 User escrow balance from getUserBalance():", formatted, "PYUSD");
      return formatted;
    } catch (error) {
      console.error("❌ Error formatting user balance:", error);
      return "0.000000";
    }
  }, [userBalanceFromContract]);

  // Check if sufficient balance for deposit
  const hasSufficientBalance = useCallback((amount: string) => {
    if (!balance) return false;
    try {
      const amountWei = parseUnits(amount, 6);
      return balance >= amountWei;
    } catch {
      return false;
    }
  }, [balance]);

  // 🔥 REFRESH ALL BALANCES INCLUDING getUserBalance
  const refreshAllBalances = useCallback(async () => {
    console.log("🔄 Refreshing all balances...");
    try {
      const promises = [
        refetchBalance(),
        refetchAllowance(),
        refetchUserBalance(), // This calls getUserBalance(address)
      ];
      
      await Promise.all(promises);
      console.log("✅ All balances refreshed successfully");
      
      // Log current balances for debugging
      console.log("📊 Current balances after refresh:");
      console.log("- Wallet PYUSD:", formattedBalance);
      console.log("- Escrow PYUSD (from getUserBalance):", userEscrowBalance);
      
    } catch (error) {
      console.error("❌ Error refreshing balances:", error);
    }
  }, [refetchBalance, refetchAllowance, refetchUserBalance, formattedBalance, userEscrowBalance]);

  const depositPYUSD = useCallback(async (amount: string) => {
    console.log("🚀 Starting deposit process...");
    console.log("- User address:", address);
    console.log("- Deposit amount:", amount);
    console.log("- Current wallet balance:", formattedBalance);
    console.log("- Current escrow balance (getUserBalance):", userEscrowBalance);
    
    // Basic validations
    if (!address || !isConnected) {
      console.log("❌ Wallet not connected");
      return { success: false, error: "Wallet not connected" };
    }

    if (!amount || Number(amount) <= 0) {
      return { success: false, error: "Invalid amount" };
    }

    if (isPaused) {
      return { success: false, error: "Contract is currently paused" };
    }

    if (!hasSufficientBalance(amount)) {
      return { success: false, error: `Insufficient PYUSD balance. You have ${formattedBalance} PYUSD available.` };
    }

    try {
      const amountWei = parseUnits(amount, 0);
      console.log("- Amount in wei:", amountWei.toString());

      // Step 1: Check allowance and approve if needed
      const currentAllowance = allowance || BigInt(0);
      console.log("- Current allowance:", formatUnits(currentAllowance, 0), "PYUSD");

      if (currentAllowance < amountWei) {
        console.log("💫 Approval needed, requesting maximum allowance...");
        
        const approveTx = await approveAsync({
          address: PYUSD_ADDRESS,
          abi: erc20Abi,
          functionName: "approve",
          args: [CONTRACT_ADDRESS, maxUint256],
          chainId: sepolia.id,
        });

        console.log("✅ Approval tx submitted:", approveTx);
        
        await waitForTransactionReceipt(config, {
          hash: approveTx,
          chainId: sepolia.id,
          confirmations: 1,
        });

        console.log("✅ Approval confirmed");
        await refetchAllowance();
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log("✅ Sufficient allowance already exists");
      }

      // Step 2: Deposit to contract
      console.log("💰 Calling contract deposit function...");
      
      const depositTx = await depositAsync({
        address: CONTRACT_ADDRESS,
        abi: contractAbi,
        functionName: "deposit",
        args: [amountWei],
        chainId: sepolia.id,
        gas: BigInt(200000),
      });

      console.log("✅ Deposit tx submitted:", depositTx);
      
      const receipt = await waitForTransactionReceipt(config, {
        hash: depositTx,
        chainId: sepolia.id,
        confirmations: 1,
      });

      console.log("✅ Deposit confirmed in block:", receipt.blockNumber);

      // 🔥 REFRESH USER BALANCE FROM getUserBalance AFTER DEPOSIT
      console.log("🔄 Refreshing balances after successful deposit...");
      await refreshAllBalances();
      
      // Additional delay for UI sync
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify the deposit worked by checking new balance
      console.log("📊 New escrow balance after deposit:", userEscrowBalance);

      return { success: true, txHash: depositTx };

    } catch (error: any) {
      console.error("❌ Deposit error:", error);

      // Handle specific errors
      if (
        error?.message?.includes("User rejected") ||
        error?.message?.includes("rejected") ||
        error?.code === 4001
      ) {
        return { success: false, error: "Transaction was rejected by user" };
      }

      if (error?.message?.includes("insufficient funds")) {
        return { success: false, error: "Insufficient ETH for gas fees" };
      }

      if (error?.message?.includes("execution reverted")) {
        return { success: false, error: "Contract execution failed. Please check contract requirements." };
      }

      const errorMessage = error?.shortMessage || error?.message || "Transaction failed";
      return { success: false, error: errorMessage };
    }
  }, [
    address,
    isConnected,
    isPaused,
    hasSufficientBalance,
    formattedBalance,
    userEscrowBalance,
    allowance,
    approveAsync,
    depositAsync,
    refreshAllBalances,
    refetchAllowance,
  ]);

  // 🔥 DEBUG FUNCTION TO CHECK getUserBalance
  const debugUserBalance = useCallback(async () => {
    console.log("🔍 Debug: Checking getUserBalance from contract...");
    console.log("- Contract address:", CONTRACT_ADDRESS);
    console.log("- User address:", address);
    console.log("- Function: getUserBalance(address)");
    console.log("- Raw user balance from contract:", userBalanceFromContract?.toString());
    console.log("- Formatted user balance:", userEscrowBalance);
    console.log("- User balance error:", userBalanceError);
    console.log("- User balance loading:", userBalanceLoading);
    
    if (userBalanceFromContract) {
      console.log("- Balance in wei:", userBalanceFromContract.toString());
      console.log("- Balance in PYUSD:", formatUnits(userBalanceFromContract, 6));
    }
  }, [address, userBalanceFromContract, userEscrowBalance, userBalanceError, userBalanceLoading]);

  return {
    // Main functions
    depositPYUSD,
    hasSufficientBalance,
    debugUserBalance, // For debugging getUserBalance function
    
    // Refresh functions
    refetchBalance,
    refetchAllowance,
    refetchUserBalance, // Specifically refetches getUserBalance(address)
    refreshAllBalances,
    
    // Data
    balance: formattedBalance, // Wallet PYUSD balance
    userEscrowBalance, // 🔥 User balance from getUserBalance(address) function
    
    // Raw data for debugging
    rawUserBalance: userBalanceFromContract,
    userBalanceError,
    
    // States
    isLoading,
    isApproving,
    isDepositing,
    isPaused: !!isPaused,
    isConnected,
  };
}
