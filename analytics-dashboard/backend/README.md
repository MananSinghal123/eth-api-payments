# ETH API Payments Analytics Backend

A comprehensive analytics backend service for the ETH API Payments platform, built for The Graph ETH Global bounty. This service provides real-time analytics, AI-driven insights, and comprehensive data APIs.

## 🚀 Features

### The Graph Integration
- **Subgraph Queries**: Real-time data from The Graph Protocol
- **Optimized Caching**: Redis-based caching for performance
- **Error Handling**: Robust error handling with fallbacks

### Analytics APIs
- **User Analytics**: Detailed user behavior and spending patterns
- **Provider Analytics**: Revenue tracking and performance metrics
- **Payment Flow Analysis**: Transaction patterns and relationships
- **Market Trends**: Time-series data and growth analytics

### AI-Powered Insights 🤖
- **Predictive Analytics**: Revenue and user growth predictions
- **Anomaly Detection**: Automated detection of unusual patterns  
- **User Segmentation**: Behavioral clustering and analysis
- **Recommendations**: Actionable insights for optimization

### Real-time Features
- **WebSocket Server**: Live updates and notifications
- **Streaming Data**: Real-time payment and user activity
- **Event Broadcasting**: Channel-based subscription system

### Performance & Reliability
- **Rate Limiting**: Configurable limits per endpoint type
- **Caching Strategy**: Multi-level caching with TTL
- **Health Monitoring**: Comprehensive service health checks
- **Error Recovery**: Graceful degradation and fallbacks

## 🛠️ Installation

### Prerequisites
```bash
# Node.js 18+ and npm
node --version
npm --version

# Redis (for caching)
redis-server --version

# The Graph CLI (for subgraph deployment)
npm install -g @graphprotocol/graph-cli
```

### Setup
```bash
# Clone and install dependencies
cd analytics-dashboard/backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Create logs directory
mkdir -p logs
```

### Start Services
```bash
# Start Redis (in separate terminal)
redis-server

# Start development server
npm run dev

# Or production
npm start
```

## 📊 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Analytics Endpoints

#### Global Overview
```http
GET /analytics/overview
```
Returns comprehensive system overview with key metrics.

#### Trends Analysis
```http
GET /analytics/trends?days=30&startDate=2024-01-01&endDate=2024-01-31
```
Get daily metrics and trends over time.

#### Payment Flow Analysis
```http
GET /analytics/payment-flows?user=0x123&provider=0x456&limit=20
```
Analyze payment relationships and patterns.

### User Analytics

#### User Details
```http
GET /users/0x1234567890123456789012345678901234567890
```

#### User Payments
```http
GET /users/0x123/payments?limit=20&offset=0
```

#### Spending Patterns
```http
GET /users/0x123/spending-patterns
```

#### User Search
```http
GET /users/search?q=0x123&limit=10
```

### Provider Analytics

#### Provider Details
```http
GET /providers/0x1234567890123456789012345678901234567890
```

#### Earnings Analysis
```http
GET /providers/0x123/earnings?limit=20
```

#### Performance Metrics
```http
GET /providers/0x123/performance
```

#### Market Share
```http
GET /providers/market-share?limit=20
```

### Metrics & Insights

#### Global Metrics
```http
GET /metrics/global
```

#### AI Insights
```http
GET /metrics/ai-insights
```

#### AI Query (Interactive)
```http
POST /metrics/ai-query
Content-Type: application/json

{
  "question": "What are the spending patterns of whale users?"
}
```

#### System Alerts
```http
GET /metrics/alerts
```

#### Export Data
```http
GET /metrics/export?format=csv&days=30
```

## 🔌 WebSocket API

### Connection
```javascript
const ws = new WebSocket('ws://localhost:3001');
```

### Subscribe to Channels
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  data: { channels: ['metrics', 'payments', 'insights'] }
}));
```

### Available Channels
- `metrics`: Global metrics updates
- `payments`: New payment notifications  
- `users`: User activity updates
- `providers`: Provider performance updates
- `insights`: AI insights updates

## 🤖 AI Insights Integration

### MCP Server Compatibility
The AI service is designed to work with Model Context Protocol (MCP) servers:

```javascript
// Query AI insights
const response = await aiInsightsService.query(
  "Analyze user retention patterns and suggest improvements"
);
```

### Supported Analysis Types
- **User Behavior**: Spending patterns, retention, segmentation
- **Payment Patterns**: Cost analysis, usage trends, peak times
- **Provider Performance**: Rankings, market share, growth
- **Market Trends**: Growth metrics, seasonality, predictions
- **Anomaly Detection**: Payment anomalies, user behavior anomalies
- **Predictions**: Revenue forecasting, user growth, API usage

## 📈 Caching Strategy

### Cache Keys
```javascript
// User analytics cache for 2 minutes
`user:analytics:${address.toLowerCase()}`

// Global metrics cache for 1 minute  
`metrics:global`

// Daily trends cache for 5 minutes
`metrics:daily:${startDate}:${endDate}`
```

### Cache Invalidation
- Automatic TTL expiration
- Manual cache clearing via API
- Pattern-based bulk invalidation

## 🔧 Configuration

### Environment Variables
```bash
# Core settings
NODE_ENV=production
PORT=3001
GRAPH_API_URL=https://api.studio.thegraph.com/query/your-subgraph

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Features
ENABLE_AI_INSIGHTS=true
ENABLE_WEBSOCKETS=true
ENABLE_CACHING=true
```

### Rate Limiting
- **General APIs**: 100 requests/minute
- **Analytics APIs**: 50 requests/minute  
- **AI APIs**: 10 requests/minute

## 🏥 Health Monitoring

### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "OK",
  "services": {
    "graph": true,
    "cache": true, 
    "websocket": true
  },
  "uptime": 3600
}
```

### Performance Monitoring
```http
GET /metrics/performance
```

### System Alerts
```http
GET /metrics/alerts
```

## 🚀 ETH Global Bounty Features

### The Graph Integration
- ✅ **Subgraph Queries**: Advanced GraphQL queries with filtering and pagination
- ✅ **Real-time Indexing**: Live data from Ethereum events
- ✅ **Performance Optimization**: Intelligent caching and query batching

### AI-Driven Analytics  
- ✅ **Predictive Models**: Revenue and growth forecasting
- ✅ **Pattern Recognition**: User behavior and spending analysis
- ✅ **Anomaly Detection**: Automated alerting for unusual activity
- ✅ **Natural Language Queries**: MCP-compatible AI interface

### Technical Innovation
- ✅ **WebSocket Streaming**: Real-time dashboard updates
- ✅ **Advanced Caching**: Multi-tier caching strategy
- ✅ **Rate Limiting**: Intelligent throttling by endpoint type
- ✅ **Export Capabilities**: JSON/CSV data export

## 🔗 Integration Examples

### Frontend Dashboard
```javascript
// Fetch analytics overview
const overview = await fetch('/api/analytics/overview').then(r => r.json());

// WebSocket for live updates
const ws = new WebSocket('ws://localhost:3001');
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  if (type === 'metrics_update') {
    updateDashboard(data);
  }
};
```

### AI Query Integration
```javascript
// Ask AI about user patterns
const aiResponse = await fetch('/api/metrics/ai-query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: "Which providers have the highest user retention?"
  })
}).then(r => r.json());
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Load testing
npm run test:load
```

## 📦 Production Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Setup
```bash
# Production environment
export NODE_ENV=production
export GRAPH_API_URL=https://api.studio.thegraph.com/query/your-deployed-subgraph
export REDIS_URL=redis://your-redis-instance
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details