"use client";

import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import ConnectButton from "./connectWallet";

interface NavigationProps {
  activeTab: "landing" | "client" | "provider";
  onTabChange: (tab: "landing" | "client" | "provider") => void;
}

// Helper function to shorten an address
const shortenAddress = (address: string) => 
  `${address.slice(0, 6)}...${address.slice(-4)}`;

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  // Wagmi Hooks for Connection State and Actions
  const { address, isConnected, status: accountStatus } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();

  // Find the injected connector (like MetaMask) for simple connection
  const injectedConnector = connectors.find(c => c.id === 'injected');

  const isConnecting = accountStatus === 'connecting' || isPending;
  const isWrongChain = isConnected && chainId !== sepolia.id;

  // --- Custom Button Logic based on Wagmi State ---

  let WalletButton;

  // 1. Loading / Connecting
  if (isConnecting) {
    WalletButton = (
      <Button disabled variant="outline">
        Connecting...
      </Button>
    );
  } 
  // 2. Disconnected (or Injected Connector not found)
  else if (!isConnected || !injectedConnector) {
    WalletButton = (
      <Button
        // Connect directly using the injected connector
        onClick={() => injectedConnector && connect({ connector: injectedConnector })}
        type="button"
        disabled={!injectedConnector}
        className="flex items-center gap-2 bg-[#0659fe] hover:bg-[#0561ff] text-white border-0"
      >
        <Wallet className="h-4 w-4" />
        {/* Fallback text if injected wallet isn't detected */}
        {injectedConnector ? 'Connect Wallet' : 'Wallet Not Found'}
      </Button>
    );
  }
  // 3. Wrong Network
  else if (isWrongChain) {
    // In a simple wagmi setup, we can only prompt the user to disconnect
    // or tell them to manually switch. Wagmi doesn't provide a direct `switchChain` modal here.
    WalletButton = (
      <Button 
        // We will disconnect and let them reconnect, or tell them to switch manually
        onClick={() => disconnect()} 
        type="button" 
        variant="destructive"
      >
        Wrong Network (Disconnect)
      </Button>
    );
  }
  // 4. Connected (and on Sepolia)
  else {
    WalletButton = (
      <div className="flex items-center space-x-2">
        {/* Chain Display - Simple text or button to highlight the network */}
        <Button variant="outline" disabled className="text-sm font-medium">
          {sepolia.name}
        </Button>

        {/* Account Button - Use disconnect action on click */}
        <Button onClick={() => disconnect()} type="button" variant="secondary">
          {shortenAddress(address!)}
        </Button>
      </div>
    );
  }

  return (
    <nav className="border-b border-border/20 bg-background">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side: Logo + Tabs */}
          <div className="flex items-center space-x-12">
            <div className="text-xl font-bold text-foreground">Web3API</div>
            <div className="flex space-x-2">
              <Button
                variant={activeTab === "landing" ? "default" : "ghost"}
                onClick={() => onTabChange("landing")}
                className="text-sm font-medium"
              >
                Home
              </Button>
              <Button
                variant={activeTab === "client" ? "default" : "ghost"}
                onClick={() => onTabChange("client")}
                className="text-sm font-medium"
              >
                Client
              </Button>
              <Button
                variant={activeTab === "provider" ? "default" : "ghost"}
                onClick={() => onTabChange("provider")}
                className="text-sm font-medium"
              >
                Provider
              </Button>
            </div>
          </div>

          {/* Right side: Custom Wagmi Wallet Button */}
          <ConnectButton/>

        </div>
      </div>
    </nav>
  );
}