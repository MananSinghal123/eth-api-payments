import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"
import { Providers } from "../lib/providers";

export const metadata: Metadata = {
  title: "ZK API Gateway",
  description: "Pay-as-you-use API billing with zero-knowledge proofs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body className="font-sans antialiased">
        <Providers >
          <Suspense fallback={null}>{children}</Suspense>
          <Analytics />
        </Providers>
      </body>
    </html>
  )
}