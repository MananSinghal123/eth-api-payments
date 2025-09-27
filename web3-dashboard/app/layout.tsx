import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"

// 1. Import the client-side Providers component
import { Providers } from "./providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "Web3 API Settlement Framework",
  description: "Trustless, automated, instant settlements for API usage",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {/* 2. Wrap the children inside the Providers component */}
        <Providers>
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
