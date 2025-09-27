"use client";

import { Button } from "@/components/ui/button";
import { ConnectKitButton } from "connectkit";
import { Wallet } from "lucide-react";

interface NavigationProps {
  activeTab: "landing" | "client" | "provider";
  onTabChange: (tab: "landing" | "client" | "provider") => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="border-b border-border/20 bg-background">
      <div className="container mx-auto px-6 py-6">
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

          {/* Right side: ConnectKit Wallet Button */}
          <ConnectKitButton.Custom>
            {({
              show,
              hide,
              chain,
              address,
              ensName,
              isConnected,
              isConnecting,
            }) => {
              const addressDisplay = ensName || address || "Connected";

              // 1. Loading / Connecting
              if (isConnecting) {
                return (
                  <Button disabled variant="outline">
                    Connecting...
                  </Button>
                );
              }

              // 2. Disconnected
              if (!isConnected) {
                return (
                  <Button
                    onClick={show}
                    type="button"
                    className="flex items-center gap-2 bg-[#0659fe] hover:bg-[#0561ff] text-white border-0"
                  >
                    <Wallet className="h-4 w-4" />
                    Connect Wallet
                  </Button>
                );
              }

              // 3. Wrong Network
              if (chain?.unsupported) {
                return (
                  <Button onClick={show} type="button" variant="destructive">
                    Wrong Network
                  </Button>
                );
              }

              // 4. Connected
              return (
                <div className="flex items-center space-x-2">
                  {/* Chain Switcher */}
                  <Button onClick={show} type="button" variant="outline">
                    {chain?.name}
                  </Button>

                  {/* Account */}
                  <Button onClick={hide} type="button" variant="secondary">
                    {addressDisplay}
                  </Button>
                </div>
              );
            }}
          </ConnectKitButton.Custom>
        </div>
      </div>
    </nav>
  );
}
