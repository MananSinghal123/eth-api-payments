import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              API Metering SDK
            </h1>
            <Badge variant="secondary">v1.0.0</Badge>
          </div>
          <p className="text-2xl text-muted-foreground max-w-4xl mx-auto mb-8">
            Turn any API into a monetized service in minutes. No billing infrastructure required.
          </p>
        </div>

        {/* What We're Building */}
        <section className="mb-16">
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl mb-4">🚀 What We're Building</CardTitle>
              <CardDescription className="text-lg max-w-4xl mx-auto">
                The complete API monetization platform for the modern web
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">🎯 The Problem</h3>
                  <p className="text-muted-foreground">
                    SaaS companies and enterprises spend months building billing infrastructure, 
                    usage tracking, and payment systems just to monetize their APIs. Big Tech companies 
                    have teams dedicated to this, but smaller companies struggle with the complexity.
                  </p>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">✨ Our Solution</h3>
                  <p className="text-muted-foreground">
                    A drop-in SDK that transforms any API into a pay-per-use service with zero-knowledge 
                    privacy, automated billing, and enterprise-grade reliability. From free tier to 
                    production-ready in under 10 minutes.
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-semibold">💡 Perfect For</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    <div className="text-2xl mb-2">🏢</div>
                    <h4 className="font-semibold">SaaS Companies</h4>
                    <p className="text-sm text-muted-foreground">Add usage-based billing to existing APIs</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    <div className="text-2xl mb-2">🤖</div>
                    <h4 className="font-semibold">AI/ML Services</h4>
                    <p className="text-sm text-muted-foreground">Monetize model inference calls</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    <div className="text-2xl mb-2">🌐</div>
                    <h4 className="font-semibold">Web3 Projects</h4>
                    <p className="text-sm text-muted-foreground">Privacy-first blockchain integrations</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                    <div className="text-2xl mb-2">🏗️</div>
                    <h4 className="font-semibold">Enterprises</h4>
                    <p className="text-sm text-muted-foreground">Internal API cost allocation</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Value Proposition */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">🎁 Why Choose Our API Metering SDK?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-center gap-2">
                  ⚡ <span>5-Minute Integration</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Add 3 lines of code and you're done. No complex billing logic, no payment gateway setup, 
                  no infrastructure headaches.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-center gap-2">
                  🔒 <span>Privacy-First</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Zero-knowledge proofs ensure usage data privacy. Users pay without revealing 
                  sensitive information about their API consumption patterns.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-center gap-2">
                  📈 <span>Enterprise Ready</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Built for scale with batch processing, Redis clustering, and real-time analytics. 
                  Handles millions of API calls without breaking a sweat.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Traditional Problems vs Our Solution */}
        <section className="mb-16">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">🔄 Traditional API Billing vs Our Solution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-red-600 dark:text-red-400">❌ Traditional Approach</h3>
                  <div className="space-y-3">
                    {[
                      "Months of development for billing infrastructure",
                      "Complex usage tracking across multiple services",
                      "Security concerns with payment processing",
                      "Expensive third-party billing solutions",
                      "No privacy for sensitive API usage data",
                      "Difficult to scale and maintain"
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-red-500 mt-1">•</span>
                        <span className="text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-green-600 dark:text-green-400">✅ With Our SDK</h3>
                  <div className="space-y-3">
                    {[
                      "5-minute setup with 3 lines of code",
                      "Automatic usage tracking and batching",
                      "Built-in security with zero-knowledge proofs",
                      "Pay-as-you-grow pricing model",
                      "Complete privacy for all usage data",
                      "Auto-scaling infrastructure included"
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        <span className="text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">📚 Complete Documentation</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to integrate and start monetizing your APIs today
          </p>
        </div>

        {/* Quick Start */}
        <section className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🚀 Quick Start
              </CardTitle>
              <CardDescription>
                Get up and running in minutes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Installation</h4>
                <pre className="bg-muted p-3 rounded-md overflow-x-auto">
                  <code>npm install api-metering-sdk</code>
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Basic Usage</h4>
                <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                  <code>{`import APIMeteringSDK, { createMeteringMiddleware } from 'api-metering-sdk';
import express from 'express';

const app = express();
const sdk = new APIMeteringSDK({ batchSize: 4 });

await sdk.initialize();
app.use(createMeteringMiddleware(sdk));

app.get('/api/data', (req, res) => {
  res.json({ data: 'example' });
});

app.listen(3000);`}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Core Features */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Core Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🔒 Zero-Knowledge Proofs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Generate privacy-preserving proofs for API usage without revealing sensitive data.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📦 Batch Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Efficiently process API requests in configurable batches for optimal performance.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">💾 Flexible Storage</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Support for in-memory, Redis, and custom storage adapters.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📊 Real-time Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Track usage patterns, response times, and billing metrics in real-time.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Configuration */}
        <section className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle>⚙️ Configuration</CardTitle>
              <CardDescription>
                Customize the SDK behavior to fit your needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                <code>{`const sdk = new APIMeteringSDK({
  batchSize: 4,                    // Requests per batch
  batchTimeout: 600000,            // 10 minutes timeout
  paymentGatewayUrl: 'http://...',
  storageAdapter: customStorage,   // Optional
  cacheAdapter: customCache,       // Optional
  debug: false
});`}</code>
              </pre>
            </CardContent>
          </Card>
        </section>

        {/* API Reference */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">API Reference</h2>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { method: 'initialize()', description: 'Initialize the SDK and connect to storage' },
                    { method: 'addUsage(wallet, data)', description: 'Add usage data for a specific wallet' },
                    { method: 'getBatchStatus(wallet)', description: 'Get current batch information' },
                    { method: 'forceProcessBatch(wallet)', description: 'Process batch immediately' },
                    { method: 'getStats()', description: 'Get SDK statistics and metrics' },
                    { method: 'destroy()', description: 'Clean up resources and connections' },
                  ].map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b last:border-b-0">
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{item.method}</code>
                      <span className="text-muted-foreground">{item.description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Types</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                  <code>{`interface UsageData {
  endpoint: string;
  method: string;
  responseSize: number;
  processingTime: number;
  statusCode: number;
  customMetrics?: Record<string, number>;
}

interface BatchData {
  walletAddress: string;
  requestIds: string[];
  usageData: UsageData[];
  totalTokens: number;
  createdAt: number;
  lastUpdated: number;
}`}</code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Usage Examples */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Usage Examples</h2>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Express Middleware</CardTitle>
                <CardDescription>Automatic usage tracking for Express applications</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                  <code>{`app.use(createMeteringMiddleware(sdk, {
  calculateTokens: (data) => {
    return 10 + Math.ceil(data.responseSize / 1000);
  }
}));`}</code>
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Direct Usage</CardTitle>
                <CardDescription>Manual usage tracking with custom logic</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                  <code>{`const result = await sdk.addUsage('0x123...', {
  endpoint: '/api/data',
  method: 'GET',
  responseSize: 1024,
  processingTime: 150,
  statusCode: 200
});`}</code>
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Handling</CardTitle>
                <CardDescription>Listen to SDK events for monitoring and debugging</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                  <code>{`sdk.on('batchProcessed', (data) => {
  console.log(\`Batch: \${data.batch.totalTokens} tokens\`);
});

sdk.on('error', (error) => {
  console.error('SDK Error:', error);
});`}</code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Storage Adapters */}
        <section className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle>💾 Storage Adapters</CardTitle>
              <CardDescription>
                Choose the right storage solution for your needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  In-Memory Storage
                  <Badge variant="outline">Default</Badge>
                </h4>
                <pre className="bg-muted p-3 rounded-md text-sm">
                  <code>const sdk = new APIMeteringSDK(); // Uses in-memory by default</code>
                </pre>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  Upstash Redis
                  <Badge variant="outline">Production</Badge>
                </h4>
                <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                  <code>{`import { UpstashStorageAdapter } from 'api-metering-sdk/adapters';

const sdk = new APIMeteringSDK({
  storageAdapter: new UpstashStorageAdapter({
    url: process.env.UPSTASH_REDIS_URL,
    token: process.env.UPSTASH_REDIS_TOKEN
  })
});`}</code>
                </pre>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Custom Storage</h4>
                <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                  <code>{`class CustomStorage implements StorageAdapter {
  async setBatch(wallet: string, batch: BatchData): Promise<void> {
    // Your implementation
  }
  
  async getBatch(wallet: string): Promise<BatchData | null> {
    // Your implementation
  }
  
  // ... other methods
}`}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Request/Response Format */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Request & Response Format</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Required Headers</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-3 rounded-md text-sm">
                  <code>{`curl -H "wallet-address: 0x1234567890abcdef" \\
     http://localhost:3000/api/data`}</code>
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Response Headers</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-3 rounded-md text-sm">
                  <code>{`X-Request-ID: abc123...
X-Token-Usage: 15
X-Batch-Size: 2/4
X-Total-Usage: 28
X-Batch-Ready: false`}</code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Production Setup */}
        <section className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle>🚀 Production Setup</CardTitle>
              <CardDescription>
                Recommended configuration for production environments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                <code>{`const sdk = new APIMeteringSDK({
  batchSize: 10,
  debug: false,
  paymentGatewayUrl: process.env.PAYMENT_GATEWAY_URL,
  storageAdapter: new UpstashStorageAdapter({
    url: process.env.UPSTASH_REDIS_URL,
    token: process.env.UPSTASH_REDIS_TOKEN
  })
});`}</code>
              </pre>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground">
              © 2024 API Metering SDK. Built with ❤️ for developers.
            </p>
            <div className="flex gap-4">
              <Badge variant="outline">TypeScript</Badge>
              <Badge variant="outline">Zero-Knowledge</Badge>
              <Badge variant="outline">Web3</Badge>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
