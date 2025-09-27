// ../lib/useContracts.ts

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { sepolia, polygonAmoy } from 'wagmi/chains';
import { 
  wrappedPyusdAdapterContract, 
  pyusdTokenContract, 
  escrowContract, 
  wrappedPyusdAmoyContract, 
} from './config';

// Hook for Escrow balance (only on Amoy)
export function useEscrowBalance() {
  const { address } = useAccount();
  
  const { data: balance, isLoading, refetch } = useReadContract({
    address: escrowContract.address,
    abi: escrowContract.abi,
    functionName: 'getBalance',
    args: address ? [address] : undefined,
    chainId: escrowContract.chainId,
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  });

  return {
    balance: balance as bigint | undefined,
    isLoading,
    refetch,
  };
}

// Hook for PYUSD allowance (to check how much the escrow/adapter can spend)
// export function usePYUSDAllowance(isSepoliaChain: boolean) {
//   const { address } = useAccount();
  
//   // On Sepolia: check if WrappedPYUSDAdapter can spend user's PYUSD
//   // On Amoy: check if Escrow can spend user's wrapped PYUSD
//   const tokenContract = isSepoliaChain ? pyusdTokenContract : wrappedPyusdAmoyContract;
//   const spenderAddress = isSepoliaChain ? wrappedPyusdAdapterContract.address : escrowContract.address;
  
//   const { data: allowance, refetch } = useReadContract({
//     address: tokenContract.address,
//     abi: tokenContract.abi,
//     functionName: 'allowance',
//     args: address && spenderAddress ? [address, spenderAddress] : undefined,
//     chainId: tokenContract.chainId,
//     query: {
//       enabled: !!address,
//       refetchInterval: 10000,
//     },
//   });

//   return {
//     allowance: allowance as bigint | undefined,
//     refetch,
//   };
// }

// Hook for escrow operations (deposit, withdraw, approve, etc.)
export function useEscrowOperations() {
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // // Mint PYUSD for testing (only on Sepolia - assuming MockERC20 has mint function)
  // const mintPYUSD = (amount: string) => {
  //   console.log('Initiating mintPYUSD...');
  //   writeContract({
  //     address: pyusdTokenContract.address,
  //     abi: pyusdTokenContract.abi,
  //     functionName: 'mint', // This might not exist on the actual PYUSD contract
  //     args: [parseUnits(amount, 6)],
  //     chainId: sepolia.id,
  //   });
  // };

  // // Approve PYUSD spending
  // const approvePYUSD = (amount: string, isSepoliaChain: boolean, spender: `0x${string}`) => {
  //   console.log(`Initiating approvePYUSD for spender: ${spender} on chain: ${isSepoliaChain ? 'Sepolia' : 'Amoy'}`);
  //   const tokenContract = isSepoliaChain ? pyusdTokenContract : wrappedPyusdAmoyContract;
  //   const spenderAddress = spender;
    
  //   writeContract({
  //     address: tokenContract.address,
  //     abi: tokenContract.abi,
  //     functionName: 'approve',
  //     args: [spenderAddress, parseUnits(amount, 6)],
  //     chainId: isSepoliaChain ? sepolia.id : polygonAmoy.id,
  //   });
  // };

  // Deposit to escrow (only on Amoy)
  const depositToEscrow = (amount: string) => {
    console.log('Initiating depositToEscrow...');
    writeContract({
      address: escrowContract.address,
      abi: escrowContract.abi,
      functionName: 'deposit',
      args: [parseUnits(amount, 6)],
      chainId: polygonAmoy.id,
    });
  };

  // Withdraw from escrow (only on Amoy)
  const withdrawFromEscrow = (amount: string) => {
    console.log('Initiating withdrawFromEscrow...');
    writeContract({
      address: escrowContract.address,
      abi: escrowContract.abi,
      functionName: 'withdraw',
      args: [parseUnits(amount, 6)],
      chainId: polygonAmoy.id,
    });
  };

  return {
    // mintPYUSD,
    // approvePYUSD,
    depositToEscrow,
    withdrawFromEscrow,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

// Updated bridging hook with approval and proper OFTAdapter implementation
export function useWPYUSDTransfer() {
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: txReceipt } = useWaitForTransactionReceipt({ hash });
  const { address } = useAccount();

  const [guid, setGuid] = useState<string | null>(null);
  const [bridgeStep, setBridgeStep] = useState<'idle' | 'approving' | 'approved' | 'sending'>('idle');

  // Check current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: pyusdTokenContract.address,
    abi: pyusdTokenContract.abi,
    functionName: 'allowance',
    args: address ? [address, wrappedPyusdAdapterContract.address] : undefined,
    chainId: sepolia.id,
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    },
  });

  // Get quote for LayerZero cross-chain transfer
  const { data: quoteFee, refetch: refetchQuote } = useReadContract({
    address: wrappedPyusdAdapterContract.address,
    abi: wrappedPyusdAdapterContract.abi,
    functionName: 'quoteSend',
    args: address ? [
      {
        dstEid: 40267, // Polygon Amoy EID
        to: `0x000000000000000000000000${address.slice(2)}` as `0x${string}`,
        amountLD: parseUnits('1', 6), // Sample amount for quote
        minAmountLD: parseUnits('0.95', 6), // 5% slippage
        extraOptions: '0x0003010011010000000000000000000000000030d40', // Gas options
        composeMsg: '0x',
        oftCmd: '0x',
      },
      false // payInLzToken
    ] : undefined,
    chainId: sepolia.id,
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  });

  // Reset bridge step when transaction is successful
  useEffect(() => {
    if (isSuccess) {
      setBridgeStep('idle');
    }
  }, [isSuccess]);

  const transferTokens = async (amount: string) => {
    console.log('Initiating cross-chain transfer...');
    if (!address) {
      console.error('Wallet not connected');
      throw new Error('Wallet not connected');
    }
    if (!quoteFee) {
      console.error('Unable to get quote fee');
      throw new Error('Unable to get quote fee');
    }

    const amountLD = parseUnits(amount, 6);
    
    // Check if approval is needed
    const currentAllowance = allowance as bigint || BigInt(0);
    if (currentAllowance < amountLD) {
      console.log('Approval needed. Current allowance:', currentAllowance.toString(), 'Required:', amountLD.toString());
      setBridgeStep('approving');
      
      // First approve the adapter to spend PYUSD
      writeContract({
        address: pyusdTokenContract.address,
        abi: pyusdTokenContract.abi,
        functionName: 'approve',
        args: [wrappedPyusdAdapterContract.address, amountLD],
        chainId: sepolia.id,
      });
      
      // After approval, we'll need to wait and then send
      // This will be handled by the component watching isSuccess
      return;
    }

    // If we have sufficient allowance, proceed with the send
    setBridgeStep('sending');
    const addressAsBytes32 = `0x000000000000000000000000${address.slice(2)}` as `0x${string}`;
    const minAmountLD = parseUnits((parseFloat(amount) * 0.95).toString(), 6); // 5% slippage
    
    const sendParam = {
      dstEid: 40267, // Polygon Amoy endpoint ID
      to: addressAsBytes32,
      amountLD,
      minAmountLD,
      extraOptions: '0x0003010011010000000000000000000000000030d40', // Gas options for LayerZero
      composeMsg: '0x',
      oftCmd: '0x',
    };

    const fee = {
      nativeFee: (quoteFee as any).nativeFee || (quoteFee as any)[0],
      lzTokenFee: (quoteFee as any).lzTokenFee || (quoteFee as any)[1] || BigInt(0),
    };
    
    console.log('Sending transaction with params:', { sendParam, fee, value: fee.nativeFee });
    writeContract({
      address: wrappedPyusdAdapterContract.address,
      abi: wrappedPyusdAdapterContract.abi,
      functionName: 'send',
      args: [sendParam, fee, address],
      value: fee.nativeFee,
      chainId: sepolia.id,
    });
  };

  return {
    transferTokens,
    quoteFee,
    allowance,
    bridgeStep,
    isPending,
    isConfirming,
    isSuccess,
    txReceipt,
    error,
    hash,
    guid,
    setGuid,
    refetchQuote,
    refetchAllowance,
  };
}
