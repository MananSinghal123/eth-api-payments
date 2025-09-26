"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cloud, Zap, Activity } from "lucide-react";

interface WeatherRequest {
  id: string;
  timestamp: string;
  city: string;
  walletAddress: string;
  status: "success" | "error";
  response?: Record<string, unknown>;
  error?: string;
}

export default function WeatherApp() {
  const { address, isConnected } = useAccount();
  const [city, setCity] = useState("");
  const [baseUrl] = useState(
    process.env.NEXT_PUBLIC_BASEURL || "http://localhost:3001"
  );
  const [requests, setRequests] = useState<WeatherRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const makeWeatherRequest = async () => {
    if (!city || !address) return;

    setIsLoading(true);
    const requestId = Date.now().toString();
    const timestamp = new Date().toISOString();

    try {
      // Simulate API call - replace with actual endpoint
      const response = await fetch(
        `${baseUrl}/api/weather/${city}?walletAddress=${address}`,
        {
          headers: {
            "x-wallet-address": address,
          },
        }
      );

      const data = await response.json();

      const newRequest: WeatherRequest = {
        id: requestId,
        timestamp,
        city,
        walletAddress: address,
        status: response.ok ? "success" : "error",
        response: response.ok ? data : undefined,
        error: response.ok ? undefined : data.message || "Request failed",
      };

      setRequests((prev) => [newRequest, ...prev]);
    } catch (error) {
      const newRequest: WeatherRequest = {
        id: requestId,
        timestamp,
        city,
        walletAddress: address,
        status: "error",
        error: error instanceof Error ? error.message : "Network error",
      };

      setRequests((prev) => [newRequest, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Weather API Demo</h1>
          </div>
          <ConnectButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* API Endpoint Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                API Endpoint
              </CardTitle>
              <CardDescription>
                Current endpoint for weather data requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                <span className="text-muted-foreground">GET</span>{" "}
                <span className="text-foreground">{baseUrl}/api/weather/</span>
                <span className="text-chart-1">{city || "{city}"}</span>
                <span className="text-muted-foreground">?walletAddress=</span>
                <span className="text-chart-2">
                  {address || "{walletAddress}"}
                </span>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                <p>
                  Headers:{" "}
                  <code className="bg-muted px-1 rounded">
                    x-wallet-address: {address || "{walletAddress}"}
                  </code>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Request Interface */}
          <Card>
            <CardHeader>
              <CardTitle>Make Weather Request</CardTitle>
              <CardDescription>
                {isConnected
                  ? "Enter a city name to fetch weather data"
                  : "Connect your wallet to make API requests"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input
                  placeholder="Enter city name (e.g., London)"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!isConnected}
                  className="flex-1"
                />
                <Button
                  onClick={makeWeatherRequest}
                  disabled={!isConnected || !city || isLoading}
                  className="min-w-[120px]"
                >
                  {isLoading ? "Requesting..." : "Get Weather"}
                </Button>
              </div>
              {!isConnected && (
                <p className="text-sm text-muted-foreground">
                  Please connect your wallet to enable API requests
                </p>
              )}
            </CardContent>
          </Card>

          {/* Request Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Request Logs
              </CardTitle>
              <CardDescription>
                History of API requests and responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No requests made yet</p>
                  <p className="text-sm">
                    Make your first weather API request above
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {requests.map((request) => (
                      <div
                        key={request.id}
                        className="border border-border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                request.status === "success"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {request.status}
                            </Badge>
                            <span className="font-medium">{request.city}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(request.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="text-sm space-y-1">
                          <p>
                            <span className="text-muted-foreground">
                              Wallet:
                            </span>{" "}
                            <code className="bg-muted px-1 rounded text-xs">
                              {request.walletAddress}
                            </code>
                          </p>

                          {request.status === "success" && request.response && (
                            <div className="bg-muted p-3 rounded mt-2">
                              <pre className="text-xs overflow-x-auto">
                                {JSON.stringify(request.response, null, 2)}
                              </pre>
                            </div>
                          )}

                          {request.status === "error" && request.error && (
                            <div className="bg-destructive/10 text-destructive p-3 rounded mt-2">
                              <p className="text-sm">{request.error}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
