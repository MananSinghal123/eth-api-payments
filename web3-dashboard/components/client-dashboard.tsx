"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Wallet, Plus, Hash } from "lucide-react"

export function ClientDashboard() {
  const [escrowBalance, setEscrowBalance] = useState(1250.75)
  const [topUpAmount, setTopUpAmount] = useState("")
  const [isTopUpOpen, setIsTopUpOpen] = useState(false)

  const handleTopUp = () => {
    if (topUpAmount) {
      setEscrowBalance((prev) => prev + Number.parseFloat(topUpAmount))
      setTopUpAmount("")
      setIsTopUpOpen(false)
    }
  }

  const recentCalls = [
    {
      id: "0x1a2b3c4d",
      endpoint: "/api/v1/data/market",
      timestamp: "2 minutes ago",
      cost: 0.05,
      status: "success",
      responseHash: "0x8f9e2d1c...",
    },
    {
      id: "0x5e6f7g8h",
      endpoint: "/api/v1/analytics/trends",
      timestamp: "5 minutes ago",
      cost: 0.12,
      status: "success",
      responseHash: "0x3a4b5c6d...",
    },
    {
      id: "0x9i0j1k2l",
      endpoint: "/api/v1/data/historical",
      timestamp: "8 minutes ago",
      cost: 0.08,
      status: "success",
      responseHash: "0x7e8f9g0h...",
    },
    {
      id: "0x3m4n5o6p",
      endpoint: "/api/v1/realtime/feed",
      timestamp: "12 minutes ago",
      cost: 0.03,
      status: "success",
      responseHash: "0x1i2j3k4l...",
    },
    {
      id: "0x7q8r9s0t",
      endpoint: "/api/v1/data/portfolio",
      timestamp: "15 minutes ago",
      cost: 0.07,
      status: "success",
      responseHash: "0x5m6n7o8p...",
    },
  ]

  return (
    <div className="container mx-auto px-6 py-12 space-y-12 font-sans">
      <div className="space-y-3 border-b border-border">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Client Dashboard</h1>
        <p className="text-base text-muted-foreground">Manage your API usage and escrow balance</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3 bg-background border border-border p-6 rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Wallet className="h-5 w-5 text-chart-1" />
              Escrow Balance
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">Available funds for API usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
              <div className="space-y-2">
                <div className="text-4xl font-extrabold text-chart-1">${escrowBalance.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">USDC equivalent</div>
              </div>
              <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-chart-1 hover:bg-chart-1/90 text-white px-6 py-4 text-base font-medium rounded-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Top Up Balance
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background border border-border rounded-xl">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold">Top Up Escrow Balance</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                      Add funds to your escrow account for API usage
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2 border-b border-border pb-2">
                      <Label htmlFor="amount" className="text-sm font-medium">Amount (USDC)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Enter amount"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        className="bg-background border-border/20 rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleTopUp}
                        className="flex-1 bg-chart-1 hover:bg-chart-1/90 text-white py-4 text-base font-medium rounded-full"
                      >
                        Confirm Top Up
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsTopUpOpen(false)}
                        className="flex-1 border-border/20 hover:bg-chart-1/10 py-4 text-base font-medium rounded-full"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-background border border-border p-6 rounded-xl">
        <CardHeader className="pb-4 border-b border-border">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <Hash className="h-5 w-5 text-chart-1" />
            Recent Signed Responses
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Latest API calls with cryptographic verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentCalls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between p-4 rounded-xl bg-background border border-border hover:border-chart-1/20 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded-md">{call.endpoint}</code>
                    <Badge variant="secondary" className="bg-chart-1/20 text-chart-1 border-chart-1/20 text-xs">
                      {call.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground text-xs">
                    <span>ID: {call.id}</span>
                    <span>Hash: {call.responseHash}</span>
                    <span>{call.timestamp}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-base">${call.cost.toFixed(3)}</div>
                  <div className="text-xs text-muted-foreground">Cost</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}