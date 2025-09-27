"use client";

import { useState } from "react";
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
import WalletConnector from "@/lib/walletConnector";

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
        `${baseUrl}/api/weather/${city}`,
        {
          headers: {
            "wallet-address": address,
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-white/80 dark:bg-gray-950/80 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Cloud className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Weather API Demo
            </h1>
          </div>
          <WalletConnector />
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto space-y-10">
          {/* API Endpoint Section */}
          <Card className="shadow-lg border-2 hover:shadow-xl transition-all duration-300 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                API Endpoint Configuration
              </CardTitle>
              <CardDescription className="text-lg text-muted-foreground">
                Current endpoint for weather data requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl font-mono text-base border-l-4 border-blue-500">
                <div className="space-y-2">
                  <div>
                    <span className="text-green-600 dark:text-green-400 font-semibold">GET</span>{" "}
                    <span className="text-gray-900 dark:text-gray-100 font-semibold">{baseUrl}/api/weather/</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">{city || "{city}"}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Query:</span>{" "}
                    <span className="text-gray-500 dark:text-gray-400">?walletAddress=</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      {address || "{walletAddress}"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-base font-medium mb-2">Required Headers:</p>
                <code className="bg-white dark:bg-gray-800 px-3 py-2 rounded-md text-sm border">
                  wallet-address: {address || "{walletAddress}"}
                </code>
              </div>
            </CardContent>
          </Card>

          {/* Request Interface */}
          <Card className="shadow-lg border-2 hover:shadow-xl transition-all duration-300 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold">Make Weather Request</CardTitle>
              <CardDescription className="text-lg">
                {isConnected
                  ? "Enter a city name to fetch weather data"
                  : "Connect your wallet to make API requests"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <Input
                  placeholder="Enter city name (e.g., London, New York)"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!isConnected}
                  className="flex-1 h-14 text-lg px-4 border-2 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200"
                />
                <Button
                  onClick={makeWeatherRequest}
                  disabled={!isConnected || !city || isLoading}
                  className="min-w-[160px] h-14 text-lg font-semibold px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Requesting...
                    </div>
                  ) : (
                    "Get Weather"
                  )}
                </Button>
              </div>
              {!isConnected && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-base text-yellow-800 dark:text-yellow-200 font-medium">
                    ⚠️ Please connect your wallet to enable API requests
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Logs */}
          <Card className="shadow-lg border-2 hover:shadow-xl transition-all duration-300 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                Request Logs
              </CardTitle>
              <CardDescription className="text-lg">
                History of API requests and responses ({requests.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-700 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                    <Activity className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-600 dark:text-gray-300">
                    No requests made yet
                  </h3>
                  <p className="text-lg text-gray-500 dark:text-gray-400">
                    Make your first weather API request above to see the logs here
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {requests.map((request) => (
                      <div
                        key={request.id}
                        className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 bg-white dark:bg-gray-800"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={
                                request.status === "success"
                                  ? "default"
                                  : "destructive"
                              }
                              className="text-sm px-3 py-1 font-semibold"
                            >
                              {request.status.toUpperCase()}
                            </Badge>
                            <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
                              {request.city}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                            {new Date(request.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="text-base space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                              Wallet:
                            </span>
                            <code className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg text-sm font-mono border">
                              {request.walletAddress}
                            </code>
                          </div>

                          {request.status === "success" && request.response && (
                            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 rounded-lg mt-3">
                              <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                                Response Data:
                              </h4>
                              <pre className="text-sm overflow-x-auto text-green-700 dark:text-green-300 bg-white/50 dark:bg-green-900/20 p-3 rounded border">
                                {JSON.stringify(request.response, null, 2)}
                              </pre>
                            </div>
                          )}

                          {request.status === "error" && request.error && (
                            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 rounded-lg mt-3">
                              <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">
                                Error Details:
                              </h4>
                              <p className="text-base text-red-700 dark:text-red-300 bg-white/50 dark:bg-red-900/20 p-3 rounded border">
                                {request.error}
                              </p>
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
