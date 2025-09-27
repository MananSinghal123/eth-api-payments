
'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { useEscrowBalance } from '../lib/useEscrowBalance';
import { useEscrowOperations } from '../lib/useContracts';
import { pyusdTokenContract } from '../lib/config';
import WalletConnector from '../lib/walletConnector';

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Fetch PYUSD balance using wagmi's useBalance
  const { data: pyusdBalance, isLoading: isPyusdLoading, refetch: refetchPyusd } = useBalance({
    address: address,
    token: pyusdTokenContract.address,
    chainId: sepolia.id,
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  });

  // Fetch escrow balance using your custom hook
  const { formattedBalance, isLoading: isEscrowLoading, refetch: refetchEscrow } = useEscrowBalance(address);

  // Use escrow operations hook
  const { depositToEscrow, withdrawFromEscrow, isPending, isConfirming, isSuccess, error } = useEscrowOperations();

  const handleDeposit = () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    depositToEscrow(depositAmount);
  };

  const handleWithdraw = () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
    withdrawFromEscrow(withdrawAmount);
  };

  // Refresh balances after successful transaction
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        refetchPyusd();
        refetchEscrow();
        setDepositAmount('');
        setWithdrawAmount('');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, refetchPyusd, refetchEscrow]);

  const isWrongNetwork = isConnected && chainId !== sepolia.id;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">Connect your wallet to use the PYUSD Escrow</p>
          <WalletConnector />
        </div>
      </div>
    );
  }

  if (isWrongNetwork) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-yellow-800 mb-4">Wrong Network</h2>
          <p className="text-yellow-700 mb-4">
            This application requires Sepolia testnet. You're currently connected to{' '}
            {(() => {
              const networks: Record<number, string> = {
                1: 'Ethereum Mainnet',
                137: 'Polygon Mainnet', 
                80002: 'Polygon Amoy',
                11155111: 'Sepolia'
              };
              return networks[chainId as number] || `Chain ID: ${chainId}`;
            })()}.
          </p>
          <button
            onClick={handleSwitchNetwork}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors mb-4"
          >
            Switch to Sepolia
          </button>
          <p className="text-sm text-yellow-600">
            If you don't have Sepolia configured, please add it to your wallet first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">PYUSD Escrow Dashboard</h1>
          <p className="text-gray-600">
            Connected: {address?.slice(0, 6)}...{address?.slice(-4)} | Network: Sepolia
          </p>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* PYUSD Balance */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Your PYUSD Balance</h2>
            <div className="text-center">
              {isPyusdLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-24 mx-auto"></div>
                </div>
              ) : (
                <p className="text-3xl font-mono font-bold text-green-600">
                  {pyusdBalance ? parseFloat(pyusdBalance.formatted).toFixed(6) : '0.000000'}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-2">Available in wallet</p>
            </div>
          </div>

          {/* Escrow Balance */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Escrow Balance</h2>
            <div className="text-center">
              {isEscrowLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-24 mx-auto"></div>
                </div>
              ) : (
                <p className="text-3xl font-mono font-bold text-blue-600">
                  {parseFloat(formattedBalance || '0').toFixed(6)}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-2">Locked in escrow</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Deposit */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Deposit to Escrow</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (PYUSD)
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.000000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={isPending || isConfirming}
                  step="0.000001"
                  min="0"
                />
              </div>
              <button
                onClick={handleDeposit}
                disabled={!depositAmount || parseFloat(depositAmount) <= 0 || isPending || isConfirming}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {isPending ? 'Preparing...' : isConfirming ? 'Confirming...' : 'Deposit'}
              </button>
            </div>
          </div>

          {/* Withdraw */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Withdraw from Escrow</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (PYUSD)
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.000000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isPending || isConfirming}
                  step="0.000001"
                  min="0"
                />
              </div>
              <button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || isPending || isConfirming}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {isPending ? 'Preparing...' : isConfirming ? 'Confirming...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-600 text-sm font-medium">
              Transaction Error: {error.message}
            </p>
          </div>
        )}

        {isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-green-600 text-sm font-medium">
              Transaction completed successfully! Balances will update shortly.
            </p>
          </div>
        )}

        {/* Refresh Button */}
        <div className="text-center">
          <button
            onClick={() => {
              refetchPyusd();
              refetchEscrow();
            }}
            disabled={isPyusdLoading || isEscrowLoading}
            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-md transition-colors"
          >
            {isPyusdLoading || isEscrowLoading ? 'Refreshing...' : 'Refresh Balances'}
          </button>
        </div>
      </div>
    </div>
  );
}