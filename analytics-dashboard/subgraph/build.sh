#!/bin/bash

# Subgraph Build and Test Script
# This script builds the subgraph and checks for errors

set -e

echo "🔨 Building ETH API Payments Subgraph"
echo "====================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if we're in the subgraph directory
if [ ! -f "subgraph.yaml" ]; then
    print_error "Please run this script from the subgraph directory"
    exit 1
fi

# Check dependencies
echo "📦 Installing dependencies..."
if ! npm install; then
    print_error "Failed to install dependencies"
    exit 1
fi

print_status "Dependencies installed successfully"

# Check if graph CLI is installed
if ! command -v graph &> /dev/null; then
    print_warning "Graph CLI not found globally, using local version"
    if [ ! -f "node_modules/.bin/graph" ]; then
        print_error "Graph CLI not found locally either"
        exit 1
    fi
    GRAPH_CMD="npx graph"
else
    GRAPH_CMD="graph"
fi

# Generate code
echo "🔧 Generating AssemblyScript types..."
if ! $GRAPH_CMD codegen; then
    print_error "Code generation failed"
    exit 1
fi

print_status "Code generation completed"

# Build subgraph
echo "🏗️  Building subgraph..."
if ! $GRAPH_CMD build; then
    print_error "Build failed"
    exit 1
fi

print_status "Subgraph built successfully"

# Validate the build output
if [ -d "build" ]; then
    print_status "Build directory created"
    
    if [ -f "build/subgraph.yaml" ]; then
        print_status "Subgraph manifest built"
    else
        print_error "Subgraph manifest missing"
        exit 1
    fi
    
    if [ -f "build/Escrow/Escrow.wasm" ]; then
        print_status "Contract WASM module built"
    else
        print_error "Contract WASM module missing"
        exit 1
    fi
    
    if [ -f "build/schema.graphql" ]; then
        print_status "GraphQL schema built"
    else
        print_error "GraphQL schema missing"
        exit 1
    fi
    
else
    print_error "Build directory not created"
    exit 1
fi

# Check generated files
if [ -d "generated" ]; then
    print_status "Generated types directory created"
    
    if [ -f "generated/schema.ts" ]; then
        print_status "Schema types generated"
    else
        print_error "Schema types missing"
    fi
    
    if [ -d "generated/Escrow" ]; then
        print_status "Contract types generated"
    else
        print_error "Contract types missing"
    fi
else
    print_error "Generated directory not created"
    exit 1
fi

echo ""
echo "🎉 Subgraph build completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Deploy locally: npm run deploy-local (requires local Graph Node)"
echo "2. Deploy to Studio: npm run deploy (requires auth)"
echo "3. Test queries against the deployed endpoint"

# Show basic info about the subgraph
echo ""
echo "📊 Subgraph Info:"
echo "=================="
echo "Network: $(grep 'network:' subgraph.yaml | awk '{print $2}')"
echo "Contract: $(grep 'address:' subgraph.yaml | awk '{print $2}' | tr -d '\"')"
echo "Start Block: $(grep 'startBlock:' subgraph.yaml | awk '{print $2}')"
echo "Events Handled: $(grep -c 'handler:' subgraph.yaml)"

# List all event handlers
echo ""
echo "Event Handlers:"
grep -A1 "event:" subgraph.yaml | grep "handler:" | awk '{print "  - " $3}'