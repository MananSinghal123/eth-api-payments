# Local Development Setup - ETH API Payments Subgraph

This guide explains how to set up and run the ETH API Payments Analytics subgraph locally for development and testing.

## Quick Start

### 1. Fixed Import Issues ✅

The import errors in `mapping.ts` have been resolved by:
- Replacing the malformed ABI file with proper JSON format
- Running `npm run codegen` to generate TypeScript types
- The `generated/` directory now contains the required modules

### 2. Local Graph Node Setup ✅

A complete Docker-based setup has been configured:

```bash
# Start local Graph Node, IPFS, and PostgreSQL
./start-local.sh

# Or manually:
docker-compose up -d
```

**Services running:**
- Graph Node: http://localhost:8000 (GraphQL queries)
- Graph Node Admin: http://localhost:8020 (deployment endpoint)
- IPFS: http://localhost:5001
- PostgreSQL: localhost:5432

### 3. Local Deployment ✅

The subgraph has been successfully deployed:

```bash
# Generate types and build
npm run codegen
npm run build

# Create and deploy locally
npm run create-local
npm run deploy-local
```

**Local GraphQL Endpoint:** 
`http://localhost:8000/subgraphs/name/eth-api-payments-analytics`

## Testing Queries

You can now test GraphQL queries against your local endpoint:

### Example: Get meta information
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"query": "{ _meta { block { number } } }"}' \
  http://localhost:8000/subgraphs/name/eth-api-payments-analytics
```

### Example: Query global metrics
```graphql
{
  globalMetrics(id: "0x676c6f62616c") {
    totalUsers
    totalProviders
    totalPayments
    totalApiCalls
    totalValueLocked
  }
}
```

### Example: Get recent payments
```graphql
{
  batchPayments(first: 5, orderBy: timestamp, orderDirection: desc) {
    id
    user { id }
    provider { id }
    amount
    numCalls
    timestamp
  }
}
```

## Configuration

### Network Configuration
- **Network:** Sepolia testnet
- **Contract:** 0xe73922a448d76756babc9126f4401101cbfb4fbc
- **Start Block:** 7000000 (adjusted for local development)
- **RPC Endpoint:** https://sepolia.drpc.org

### File Structure
```
subgraph/
├── src/mapping.ts              # Event handlers (fixed imports)
├── schema.graphql             # GraphQL schema
├── subgraph.yaml             # Subgraph configuration
├── abis/Escrow.json          # Contract ABI (corrected)
├── generated/                # Generated types (auto-created)
├── docker-compose.yml        # Local services
└── start-local.sh           # Setup script
```

## Development Workflow

1. **Make changes** to `mapping.ts`, `schema.graphql`, or `subgraph.yaml`

2. **Regenerate and rebuild:**
   ```bash
   npm run codegen
   npm run build
   ```

3. **Redeploy:**
   ```bash
   npm run deploy-local
   ```

4. **Test queries** using GraphQL playground or curl commands

## Troubleshooting

### Services not starting
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs graph-node
docker-compose logs postgres
docker-compose logs ipfs
```

### Subgraph sync issues
```bash
# Check sync status
curl -X POST -H "Content-Type: application/json" \
  -d '{"query": "{ _meta { block { number } hasIndexingErrors } }"}' \
  http://localhost:8000/subgraphs/name/eth-api-payments-analytics
```

### Reset local environment
```bash
# Stop services and clean up
docker-compose down -v
rm -rf data/

# Restart
./start-local.sh
npm run create-local
npm run deploy-local
```

## Next Steps

1. **Add test data:** Deploy a test contract or use existing events
2. **Verify mappings:** Test all event handlers with real blockchain data
3. **Optimize queries:** Add indexes and improve query performance
4. **Production deployment:** Use The Graph Studio when ready

## Useful Commands

```bash
# Start local development environment
./start-local.sh

# Full rebuild and deploy
npm run codegen && npm run build && npm run deploy-local

# Stop local services
docker-compose down

# Clean shutdown with data removal
docker-compose down -v && rm -rf data/
```

Your local subgraph is now ready for development! 🚀