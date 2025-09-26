"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { LandingPage } from "@/components/landing-page"
import { ClientDashboard } from "@/components/client-dashboard"
import { ProviderDashboard } from "@/components/provider-dashboard"

export default function Home() {
  const [activeTab, setActiveTab] = useState<"landing" | "client" | "provider">("landing")

  const renderContent = () => {
    switch (activeTab) {
      case "landing":
        return <LandingPage />
      case "client":
        return <ClientDashboard />
      case "provider":
        return <ProviderDashboard />
      default:
        return <LandingPage />
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      {renderContent()}
    </main>
  )
}
