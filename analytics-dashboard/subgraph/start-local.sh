#!/bin/bash

# ETH API Payments - Local Graph Node Setup
set -e

echo "🚀 Setting up local Graph Node for ETH API Payments Analytics..."

# Create data directories
mkdir -p data/postgres data/ipfs

echo "📦 Starting Docker services..."
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 10

echo "🔍 Checking service health..."
echo "Graph Node: http://localhost:8000"
echo "IPFS: http://localhost:5001"
echo "PostgreSQL: localhost:5432"

# Check if services are running
echo "📊 Service Status:"
docker-compose ps

echo "✅ Local Graph Node setup complete!"
echo ""
echo "Next steps:"
echo "1. Update the Ethereum RPC endpoint in docker-compose.yml"
echo "2. Run: npm run create-local"
echo "3. Run: npm run deploy-local"
echo ""
echo "To stop services: docker-compose down"