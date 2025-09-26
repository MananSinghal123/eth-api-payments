"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"

interface NavigationProps {
  activeTab: "landing" | "client" | "provider"
  onTabChange: (tab: "landing" | "client" | "provider") => void
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const [isWalletConnected, setIsWalletConnected] = useState(false)

  const handleWalletConnect = () => {
    setIsWalletConnected(!isWalletConnected)
  }

  return (
    <nav className="border-b border-border/20 bg-background">
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
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

          <Button
            onClick={handleWalletConnect}
            variant={isWalletConnected ? "secondary" : "default"}
            className="flex items-center gap-2 bg-chart-1 hover:bg-chart-1/90 text-white border-0"
          >
            <Wallet className="h-4 w-4" />
            {isWalletConnected ? "0x1234...5678" : "Connect Wallet"}
          </Button>
        </div>
      </div>
    </nav>
  )
}
