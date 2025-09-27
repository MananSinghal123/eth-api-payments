"use client";

import React from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Wallet, LogOut } from "lucide-react";

function truncateAddress(address: string | undefined): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function WalletConnector() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    console.log('Available connectors:', connectors.map(c => ({ id: c.id, name: c.name })));
    const connector = connectors[0];
    
    if (connector) {
      console.log('Connecting with connector:', connector.id, connector.name);
      connect({ connector });
    } else {
      console.error("No wallet connectors found. Please make sure MetaMask is installed.");
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="font-mono text-sm text-white">
            {truncateAddress(address)}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors"
          title="Disconnect wallet"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Disconnect</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isPending}
      className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 disabled:bg-gray-300 text-black rounded-lg transition-colors font-medium"
    >
      <Wallet className="w-4 h-4" />
      <span>{isPending ? "Connecting..." : "Connect Wallet"}</span>
    </button>
  );
}
