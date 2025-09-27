"use client";

import React from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { polygonAmoy } from "wagmi/chains";
import { Network, AlertTriangle, CheckCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function NetworkSwitcher() {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const isAmoyChain = chainId === polygonAmoy.id;

  const handleSwitchToAmoy = () => {
    switchChain({ chainId: polygonAmoy.id });
  };

  const addAmoyNetwork = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x13882', // 80002 in hex
            chainName: 'Polygon Amoy Testnet',
            nativeCurrency: {
              name: 'MATIC',
              symbol: 'MATIC',
              decimals: 18,
            },
            rpcUrls: ['https://rpc-amoy.polygon.technology/'],
            blockExplorerUrls: ['https://amoy.polygonscan.com/'],
          }],
        });
        // After adding, try to switch to it
        handleSwitchToAmoy();
      } catch (error) {
        console.error('Failed to add Polygon Amoy network:', error);
      }
    }
  };

  if (isAmoyChain) {
    return (
      <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20 px-3 py-2">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-4 h-4" />
          <span className="font-medium">Polygon Amoy</span>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        </div>
      </Badge>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 border-amber-500/20 px-3 py-2">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="font-medium">
            Wrong Network
          </span>
        </div>
      </Badge>
      
      <div className="flex items-center space-x-1">
        <Button
          onClick={handleSwitchToAmoy}
          disabled={isPending}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white border-0"
        >
          {isPending ? (
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-xs">Switching...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <Network className="w-3 h-3" />
              <span className="text-xs">Switch</span>
            </div>
          )}
        </Button>
        
        <Button
          onClick={addAmoyNetwork}
          size="sm"
          variant="outline"
          className="border-gray-700/50 text-gray-300 hover:bg-gray-800/50 hover:text-white"
        >
          <div className="flex items-center space-x-1">
            <Zap className="w-3 h-3" />
            <span className="text-xs">Add Network</span>
          </div>
        </Button>
      </div>
    </div>
  );
}