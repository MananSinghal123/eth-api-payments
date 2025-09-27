// lib/useContracts.ts
import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount, useSwitchChain, useChainId } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { sepolia } from 'wagmi/chains';
import { pyusdTokenContract, escrowContract } from './config';

// Hook for escrow operations with proper approval flow
export function useEscrowOperations() {
  const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { switchChain } = useSwitchChain();
  const { address } = useAccount();
  const chainId = useChainId();
  
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);
  const [customError, setCustomError] = useState<Error | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Combined error state
  const error = customError || writeError;

  // Check PYUSD allowance for escrow contract
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: pyusdTokenContract.address,
    abi: pyusdTokenContract.abi,
    functionName: 'allowance',
    args: address ? [address, escrowContract.address] : undefined,
    chainId: sepolia.id,
    query: {
      enabled: !!address && chainId === sepolia.id,
      refetchInterval: 5000,
    },
  });

  // Reset custom error when new transaction starts
  useEffect(() => {
    if (isPending) {
      setCustomError(null);
    }
  }, [isPending]);

  const ensureCorrectNetwork = async () => {
    if (chainId !== sepolia.id) {
      try {
        setIsNetworkSwitching(true);
        setCustomError(null);
        
        await switchChain({ chainId: sepolia.id });
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (switchError: any) {
        console.error('Network switch failed:', switchError);
        setCustomError(new Error(`Failed to switch to Sepolia: ${switchError.message}`));
        throw switchError;
      } finally {
        setIsNetworkSwitching(false);
      }
    }
  };

  // Approve PYUSD spending by escrow contract
  const approvePYUSD = async (amountUSD: string) => {
    try {
      setIsApproving(true);
      
      // Convert USD to PYUSD tokens (1 USD = 1 PYUSD with 6 decimals)
      const pyusdAmount = parseUnits(amountUSD, 6);
      
      writeContract({
        address: pyusdTokenContract.address,
        abi: pyusdTokenContract.abi,
        functionName: 'approve',
        args: [escrowContract.address, pyusdAmount],
        chainId: sepolia.id,
      });
      
    } catch (error: any) {
      console.error('Approval failed:', error);
      setCustomError(new Error(`Approval failed: ${error.message}`));
      setIsApproving(false);
    }
  };

  // Deposit to escrow - expects USD amount (contract converts to PYUSD internally)
  const depositToEscrow = async (amountUSD: string) => {
    try {
      console.log('Starting deposit process...', { amountUSD, currentChain: chainId, targetChain: sepolia.id });
      
      await ensureCorrectNetwork();
      
      const usdAmount = parseFloat(amountUSD);
      const requiredAllowance = parseUnits(amountUSD, 6); // PYUSD tokens needed
      const currentAllowance = (allowance as bigint) || BigInt(0);
      
      console.log('Checking allowance...', { 
        required: requiredAllowance.toString(), 
        current: currentAllowance.toString() 
      });
      
      // Check if we need approval first
      if (currentAllowance < requiredAllowance) {
        console.log('Insufficient allowance, requesting approval...');
        await approvePYUSD(amountUSD);
        return; // Exit here, user needs to approve first
      }
      
      console.log('Sufficient allowance, proceeding with deposit...');
      
      // Convert to integer USD (contract expects whole dollars)
      const amountUSDInt = Math.floor(usdAmount);
      
      writeContract({
        address: escrowContract.address,
        abi: escrowContract.abi,
        functionName: 'deposit',
        args: [BigInt(amountUSDInt)], // Contract expects USD amount as uint256
        chainId: sepolia.id,
      });
      
    } catch (error: any) {
      console.error('Deposit failed:', error);
      setCustomError(new Error(`Deposit failed: ${error.message}`));
    }
  };

  // Withdraw from escrow - expects amount in cents
  const withdrawFromEscrow = async (amountUSD: string) => {
    try {
      console.log('Starting withdraw process...', { amountUSD, currentChain: chainId, targetChain: sepolia.id });
      
      await ensureCorrectNetwork();
      
      // Convert USD to cents (contract expects cents)
      const amountInCents = Math.floor(parseFloat(amountUSD) * 100);
      
      console.log('Converting amount...', { 
        amountUSD, 
        amountInCents 
      });
      
      writeContract({
        address: escrowContract.address,
        abi: escrowContract.abi,
        functionName: 'withdraw',
        args: [BigInt(amountInCents)], // Contract expects cents as uint256
        chainId: sepolia.id,
      });
      
    } catch (error: any) {
      console.error('Withdraw failed:', error);
      setCustomError(new Error(`Withdraw failed: ${error.message}`));
    }
  };

  // Handle successful approval
  useEffect(() => {
    if (isSuccess && isApproving) {
      setIsApproving(false);
      // Refetch allowance after successful approval
      setTimeout(() => {
        refetchAllowance();
      }, 2000);
    }
  }, [isSuccess, isApproving]);

  return {
    depositToEscrow,
    withdrawFromEscrow,
    approvePYUSD,
    allowance,
    isPending: isPending || isNetworkSwitching,
    isConfirming,
    isSuccess,
    error,
    hash,
    isNetworkSwitching,
    isApproving,
    refetchAllowance,
  };
}