# ETH API Payments Analytics Subgraph

This subgraph indexes the Escrow contract for the ETH API Payments system, providing comprehensive analytics and metrics for The Graph bounty at ETH Global New Delhi.

## 🚀 Features

- **Real-time Event Indexing**: Tracks all deposits, withdrawals, and batch payments
- **User Analytics**: Complete user journey from deposits to API usage
- **Provider Metrics**: Revenue tracking and performance analytics
- **Daily Aggregations**: Time-series data for trend analysis
- **Payment Flow Analysis**: User-provider interaction patterns
- **ZK Proof Tracking**: Monitor verifier updates and usage

## 📊 Data Model

### Entities
- `User`: User wallet metrics and balances
- `Provider`: API provider earnings and statistics  
- `UserDeposit/UserWithdraw`: Individual deposit/withdrawal records
- `ProviderWithdraw`: Provider earnings withdrawals
- `BatchPayment`: ZK-verified API payment batches
- `PaymentFlow`: User-provider relationship analytics
- `DailyMetrics`: Time-series aggregated data
- `GlobalMetrics`: System-wide statistics

### Key Metrics Tracked
- Total Value Locked (TVL)
- User retention and behavior
- API call volume and costs
- Provider revenue distribution
- Payment success rates

## 🛠️ Setup Instructions

### Prerequisites
```bash
npm install -g @graphprotocol/graph-cli
```

### Installation
```bash
cd subgraph
npm install
```

### Build and Deploy

1. **Generate code from schema**:
```bash
npm run codegen
```

2. **Build the subgraph**:
```bash
npm run build
```

3. **Authenticate with The Graph Studio**:
```bash
npm run auth
# Paste your deploy key when prompted
```

4. **Deploy to The Graph Studio**:
```bash
npm run deploy
```

### Local Development

For local testing with Graph Node:

```bash
# Start local Graph Node (requires Docker)
npm run create-local
npm run deploy-local
```

## 📈 Query Examples

### Get User Analytics
```graphql
query GetUserAnalytics($userAddress: Bytes!) {
  user(id: $userAddress) {
    totalDeposited
    totalSpent
    currentBalance
    paymentCount
    paymentsFrom(first: 10, orderBy: timestamp, orderDirection: desc) {
      amount
      provider {
        id
      }
      numCalls
      costPerCall
      timestamp
    }
  }
}
```

### Get Daily Metrics
```graphql
query GetDailyMetrics($startDate: String!, $endDate: String!) {
  dailyMetrics(
    where: { date_gte: $startDate, date_lte: $endDate }
    orderBy: date
    orderDirection: asc
  ) {
    date
    totalDeposits
    totalPayments
    totalApiCalls
    uniqueUsers
    uniqueProviders
  }
}
```

### Get Top Providers
```graphql
query GetTopProviders {
  providers(
    first: 10
    orderBy: totalEarned
    orderDirection: desc
  ) {
    id
    totalEarned
    paymentCount
    uniqueUsers
    currentBalance
  }
}
```

### Get Payment Flow Analysis
```graphql
query GetPaymentFlows($userAddress: Bytes!) {
  paymentFlows(where: { user: $userAddress }) {
    provider {
      id
    }
    totalAmount
    totalCalls
    paymentCount
    averageCostPerCall
    firstPaymentTimestamp
    lastPaymentTimestamp
  }
}
```

## 🏆 ETH Global Bounty Features

This subgraph demonstrates several key features for The Graph bounty:

1. **Innovative Use of Data Products**: Advanced analytics combining user behavior, payment patterns, and API usage metrics

2. **Real-world Utility**: Provides actionable insights for:
   - API providers to optimize pricing
   - Users to track spending patterns
   - Platform operators to monitor system health

3. **Technical Creativity**: 
   - Complex entity relationships
   - Calculated fields (cost per call, averages)
   - Time-series aggregations
   - Payment flow analysis

4. **AI-Ready Data Structure**: Clean, normalized data perfect for AI/ML analysis and MCP server integration

## 📊 Contract Details

- **Network**: Sepolia Testnet
- **Contract Address**: `0xe73922a448d76756babc9126f4401101cbfb4fbc`
- **Start Block**: 9419469

## 🔗 Integration

This subgraph is designed to work with:
- Analytics dashboard frontend
- AI MCP server for predictive insights
- Real-time notification systems
- Revenue optimization tools