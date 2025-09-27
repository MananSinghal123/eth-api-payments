"use client";

import React from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { Network, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function NetworkSwitcher() {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const isSepoliaChain = chainId === sepolia.id;

  const handleSwitchToSepolia = () => {
    switchChain({ chainId: sepolia.id });
  };

  if (isSepoliaChain) {
    return (
      <Badge variant="outline" className="border-green-500/50 text-green-500">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-3 h-3" />
          <span className="text-sm">Sepolia</span>
        </div>
      </Badge>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-3 h-3" />
          <span className="text-sm">Wrong Network</span>
        </div>
      </Badge>

      <Button
        onClick={handleSwitchToSepolia}
        disabled={isPending}
        size="sm"
        className="bg-white text-black hover:bg-gray-100"
      >
        {isPending ? (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            <span className="text-xs">Switching...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Network className="w-3 h-3" />
            <span className="text-xs">Switch to Sepolia</span>
          </div>
        )}
      </Button>
    </div>
  );
}
