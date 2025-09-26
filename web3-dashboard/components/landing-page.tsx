"use client"

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Zap, CheckCircle, ArrowRight, Download, Code, BookOpen } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen font-sans">
      <section className="container mx-auto px-6 py-12 relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-16 right-16 w-20 h-20 bg-chart-1/10 rounded-full animate-pulse" />
          <div
            className="absolute top-32 left-16 w-12 h-12 bg-chart-1/5 rounded-full animate-bounce"
            style={{ animationDelay: "0.8s", animationDuration: "2.5s" }}
          />
          <div
            className="absolute bottom-32 right-32 w-16 h-16 bg-chart-1/10 rounded-full animate-pulse"
            style={{ animationDelay: "1.5s" }}
          />
        </div>

        <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10">
          <div className="space-y-4">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-28 h-28 bg-chart-1/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-chart-1/30">
                  <div className="w-20 h-20 bg-chart-1/30 rounded-full flex items-center justify-center">
                    <Shield className="h-10 w-10 text-chart-1" />
                  </div>
                </div>
                <div className="absolute inset-0 bg-chart-1/20 rounded-full blur-lg animate-pulse" />
              </div>
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-balance leading-tight">
              Secure Payment Integration SDK for <span className="text-chart-1">APIs</span>
            </h1>
            <p className="text-lg text-muted-foreground text-pretty max-w-xl mx-auto leading-relaxed">
              Enhance your API with a robust SDK for secure payment integration, ensuring data protection and transaction safety.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button
              size="lg"
              className="bg-chart-1 hover:bg-chart-1/90 text-white px-8 py-5 text-base font-medium rounded-full"
            >
              <Download className="mr-2 h-4 w-4" /> Download SDK
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-chart-1/30 hover:bg-chart-1/10 px-8 py-5 text-base font-medium bg-transparent rounded-full"
            >
              <Code className="mr-2 h-4 w-4" /> View Integration
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="hover:bg-chart-1/10 px-8 py-5 text-base font-medium rounded-full"
            >
              <BookOpen className="mr-2 h-4 w-4" /> Documentation
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-24 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Our Features</h2>
            <p className="text-base text-muted-foreground max-w-lg mx-auto">
              Cutting-edge tools for secure payment integration in decentralized APIs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-background border border-border/20 hover:border-chart-1/30 hover:bg-chart-1/5 transition-all duration-300 p-6 rounded-xl group">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-xl bg-chart-1 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg font-bold">Instant Transactions</CardTitle>
                <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                  Enable fast and secure payment processing with real-time confirmation.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-background border border-border/20 hover:border-chart-1/30 hover:bg-chart-1/5 transition-all duration-300 p-6 rounded-xl group">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-xl bg-chart-1 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg font-bold">Enhanced Security</CardTitle>
                <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                  Protect transactions with advanced cryptographic signing and verification.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-background border border-border/20 hover:border-chart-1/30 hover:bg-chart-1/5 transition-all duration-300 p-6 rounded-xl group">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-xl bg-chart-1 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg font-bold">Automated Billing</CardTitle>
                <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                  Streamline payments with automated, gas-efficient smart contract settlements.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-24 relative border-b border-border">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-8 left-8 w-24 h-24 bg-chart-1/5 rounded-full blur-xl animate-pulse" />
          <div
            className="absolute bottom-8 right-8 w-32 h-32 bg-chart-1/5 rounded-full blur-2xl animate-pulse"
            style={{ animationDelay: "1.2s" }}
          />
        </div>

        <div className="max-w-2xl mx-auto text-center space-y-8 relative z-10">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-balance">
              Integrate Secure Payments Now
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Start enhancing your API with our secure payment integration SDK today.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-chart-1 hover:bg-chart-1/90 text-white px-8 py-5 text-base font-medium rounded-full"
            >
              Start Building Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-chart-1/30 hover:bg-chart-1/10 px-8 py-5 text-base font-medium bg-transparent rounded-full"
            >
              View Examples
              <Code className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <footer className="container mx-auto px-6 py-12 border-t border-border text-center">
        <div className="space-y-6">
          <div className="flex justify-center space-x-6">
            <a href="#" className="text-muted-foreground hover:text-chart-1 transition-colors">Privacy Policy</a>
            <a href="#" className="text-muted-foreground hover:text-chart-1 transition-colors">Terms of Service</a>
            <a href="#" className="text-muted-foreground hover:text-chart-1 transition-colors">Contact Us</a>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; 2025 Payment Integration SDK Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}