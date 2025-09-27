# Subgraph Deployment Guide

This guide covers deploying the ETH API Payments Analytics subgraph to The Graph Network.

## Prerequisites

1. Install The Graph CLI:
```bash
npm install -g @graphprotocol/graph-cli
```

2. Create account on [The Graph Studio](https://thegraph.com/studio/)

## Deployment Steps

### 1. Authenticate with The Graph Studio

```bash
graph auth --studio <DEPLOY_KEY>
```

Get your deploy key from The Graph Studio dashboard.

### 2. Generate Code and Build

```bash
# Generate AssemblyScript types
npm run codegen

# Build the subgraph
npm run build
```

### 3. Deploy to The Graph Studio

```bash
# Deploy to Studio (testnet)
npm run deploy

# Or specify version
graph deploy --studio eth-api-payments-analytics --version-label v1.0.0
```

### 4. Publish to The Graph Network (Mainnet)

Once tested on testnet:

1. Go to The Graph Studio
2. Click "Publish" on your subgraph
3. Follow the publishing flow
4. Signal GRT to your subgraph

## Local Development

For local development and testing:

### 1. Start Local Graph Node

```bash
# Clone graph-node repository
git clone https://github.com/graphprotocol/graph-node
cd graph-node/docker
docker-compose up
```

### 2. Deploy Locally

```bash
# Create local subgraph
npm run create-local

# Deploy to local node
npm run deploy-local
```

### 3. Query Local Endpoint

Local GraphQL endpoint: `http://localhost:8000/subgraphs/name/eth-api-payments-analytics`

## Configuration

### Network Configuration

Update `subgraph.yaml` for different networks:

**Sepolia Testnet (Current):**
```yaml
network: sepolia
source:
  address: "0xe73922a448d76756babc9126f4401101cbfb4fbc"
  startBlock: 9419469
```

**Ethereum Mainnet:**
```yaml
network: mainnet
source:
  address: "YOUR_MAINNET_CONTRACT_ADDRESS"
  startBlock: YOUR_DEPLOYMENT_BLOCK
```

### Environment Variables

Create `.env` file:
```bash
GRAPH_DEPLOY_KEY=your_deploy_key_here
SUBGRAPH_NAME=eth-api-payments-analytics
CONTRACT_ADDRESS=0xe73922a448d76756babc9126f4401101cbfb4fbc
START_BLOCK=9419469
```

## Testing Queries

### Example Queries

**Get Global Metrics:**
```graphql
{
  globalMetrics(id: "global") {
    totalUsers
    totalProviders
    totalPayments
    totalApiCalls
    totalValueLocked
  }
}
```

**Get Top Users:**
```graphql
{
  users(first: 10, orderBy: totalSpent, orderDirection: desc) {
    id
    totalSpent
    paymentCount
    currentBalance
  }
}
```

**Get Recent Payments:**
```graphql
{
  batchPayments(first: 10, orderBy: timestamp, orderDirection: desc) {
    id
    user { id }
    provider { id }
    amount
    numCalls
    costPerCall
    timestamp
  }
}
```

**Get Daily Metrics:**
```graphql
{
  dailyMetrics(
    where: { date_gte: "2024-01-01", date_lte: "2024-01-31" }
    orderBy: date
    orderDirection: asc
  ) {
    date
    totalPayments
    totalApiCalls
    uniqueUsers
  }
}
```

## Monitoring

### Health Checks

Monitor subgraph sync status:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"query": "{_meta{block{number}}}"}' \
  https://api.thegraph.com/subgraphs/name/YOUR_GITHUB_USERNAME/eth-api-payments-analytics
```

### Metrics to Monitor

- Sync status and latest block
- Query performance
- Error rates
- Indexing speed

## Troubleshooting

### Common Issues

1. **Build Failures:**
   - Check AssemblyScript syntax
   - Ensure all entities are properly defined
   - Verify event signatures match contract ABI

2. **Deployment Failures:**
   - Check network configuration
   - Verify contract address and start block
   - Ensure sufficient GRT balance for gas

3. **Sync Issues:**
   - Monitor for reorg handling
   - Check for missing events
   - Verify block range

### Debug Commands

```bash
# Check subgraph status
graph status --node http://localhost:8020/

# View logs
docker logs graph-node-graph-node-1

# Test specific handlers
npm run test
```

## Production Considerations

1. **Decentralization:** Use multiple indexers
2. **Curation:** Maintain adequate curation signal
3. **Monitoring:** Set up alerts for sync issues
4. **Updates:** Plan for schema changes and migrations
5. **Backup:** Keep copies of historical data

## Support

- [The Graph Discord](https://discord.gg/graphprotocol)
- [Documentation](https://thegraph.com/docs/)
- [Forum](https://forum.thegraph.com/)