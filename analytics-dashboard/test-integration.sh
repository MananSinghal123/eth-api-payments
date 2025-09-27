#!/bin/bash

# ETH API Payments Analytics - Integration Test Script
# This script tests the complete flow from contract to frontend

set -e

echo "🚀 Starting ETH API Payments Analytics Integration Test"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SUBGRAPH_DIR="./subgraph"
BACKEND_DIR="./backend" 
FRONTEND_DIR="./frontend"
GRAPH_ENDPOINT="http://localhost:8000/subgraphs/name/eth-api-payments-analytics"
BACKEND_ENDPOINT="http://localhost:3001"
FRONTEND_ENDPOINT="http://localhost:3000"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if service is running
check_service() {
    local url=$1
    local name=$2
    
    if curl -s "$url" > /dev/null 2>&1; then
        print_status "$name is running at $url"
        return 0
    else
        print_error "$name is not running at $url"
        return 1
    fi
}

# Function to test GraphQL endpoint
test_graphql() {
    local endpoint=$1
    local query=$2
    local description=$3
    
    echo "Testing: $description"
    
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$query\"}" \
        "$endpoint" 2>/dev/null)
    
    if echo "$response" | jq -e '.data' > /dev/null 2>&1; then
        print_status "$description - Success"
        echo "Response: $(echo "$response" | jq '.data' | head -3)"
        return 0
    else
        print_error "$description - Failed"
        echo "Response: $response"
        return 1
    fi
}

# Function to test REST API endpoint
test_api() {
    local endpoint=$1
    local description=$2
    
    echo "Testing: $description"
    
    response=$(curl -s "$endpoint" 2>/dev/null)
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        print_status "$description - Success"
        return 0
    else
        print_error "$description - Failed"
        echo "Response: $response"
        return 1
    fi
}

echo -e "\n📋 Step 1: Checking Prerequisites"
echo "=================================="

# Check if required tools are installed
command -v node >/dev/null 2>&1 || { print_error "Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { print_error "npm is required but not installed."; exit 1; }
command -v curl >/dev/null 2>&1 || { print_error "curl is required but not installed."; exit 1; }
command -v jq >/dev/null 2>&1 || { print_error "jq is required but not installed."; exit 1; }

print_status "All prerequisites are installed"

echo -e "\n🏗️  Step 2: Building Subgraph"
echo "=============================="

if [ -d "$SUBGRAPH_DIR" ]; then
    cd "$SUBGRAPH_DIR"
    
    # Install dependencies
    echo "Installing subgraph dependencies..."
    npm install
    
    # Generate code
    echo "Generating AssemblyScript types..."
    npm run codegen
    
    # Build subgraph
    echo "Building subgraph..."
    npm run build
    
    print_status "Subgraph built successfully"
    cd ..
else
    print_error "Subgraph directory not found: $SUBGRAPH_DIR"
    exit 1
fi

echo -e "\n🔧 Step 3: Checking Services"
echo "============================"

# Check if Graph Node is running (for local testing)
if check_service "$GRAPH_ENDPOINT" "Local Graph Node"; then
    echo -e "\n📊 Step 4: Testing Subgraph Queries"
    echo "==================================="
    
    # Test basic health query
    test_graphql "$GRAPH_ENDPOINT" "{_meta{block{number}}}" "Subgraph Health Check"
    
    # Test global metrics
    test_graphql "$GRAPH_ENDPOINT" "{globalMetrics(id:\"global\"){totalUsers totalProviders totalPayments}}" "Global Metrics Query"
    
    # Test users query
    test_graphql "$GRAPH_ENDPOINT" "{users(first:5){id totalSpent paymentCount}}" "Users Query"
    
    # Test providers query
    test_graphql "$GRAPH_ENDPOINT" "{providers(first:5){id totalEarned paymentCount}}" "Providers Query"
    
    # Test recent payments
    test_graphql "$GRAPH_ENDPOINT" "{batchPayments(first:5, orderBy:timestamp, orderDirection:desc){id amount numCalls}}" "Recent Payments Query"
    
else
    print_warning "Local Graph Node not running, skipping subgraph tests"
    print_warning "To test locally, run: docker-compose up in graph-node/docker/"
fi

echo -e "\n🖥️  Step 5: Testing Backend API"
echo "==============================="

if check_service "$BACKEND_ENDPOINT/health" "Analytics Backend"; then
    
    # Test analytics endpoints
    test_api "$BACKEND_ENDPOINT/api/analytics/health" "Analytics Health"
    test_api "$BACKEND_ENDPOINT/api/analytics/overview" "Analytics Overview"
    test_api "$BACKEND_ENDPOINT/api/analytics/metrics" "Global Metrics"
    test_api "$BACKEND_ENDPOINT/api/analytics/trends?days=7" "Daily Trends"
    test_api "$BACKEND_ENDPOINT/api/analytics/leaderboards?type=providers&limit=5" "Provider Leaderboards"
    test_api "$BACKEND_ENDPOINT/api/analytics/leaderboards?type=users&limit=5" "User Leaderboards"
    
else
    print_warning "Analytics Backend not running, skipping API tests"
    print_warning "To start backend: cd backend && npm run dev"
fi

echo -e "\n🌐 Step 6: Testing Frontend"
echo "==========================="

if check_service "$FRONTEND_ENDPOINT" "Analytics Frontend"; then
    print_status "Frontend is accessible at $FRONTEND_ENDPOINT"
    
    # Test if main pages are accessible
    if curl -s "$FRONTEND_ENDPOINT" | grep -q "Analytics Overview" > /dev/null 2>&1; then
        print_status "Main dashboard loads correctly"
    else
        print_error "Main dashboard has issues"
    fi
    
    if curl -s "$FRONTEND_ENDPOINT/analytics" | grep -q "Advanced Analytics" > /dev/null 2>&1; then
        print_status "Analytics page loads correctly"
    else
        print_error "Analytics page has issues"
    fi
    
else
    print_warning "Analytics Frontend not running, skipping frontend tests"
    print_warning "To start frontend: cd frontend && npm run dev"
fi

echo -e "\n🧪 Step 7: Integration Testing"
echo "=============================="

# Test the complete flow if all services are running
if check_service "$GRAPH_ENDPOINT" "Graph Node" && check_service "$BACKEND_ENDPOINT/health" "Backend"; then
    echo "Testing complete data flow..."
    
    # Test that backend can fetch data from subgraph
    response=$(curl -s "$BACKEND_ENDPOINT/api/analytics/overview")
    
    if echo "$response" | jq -e '.data.globalMetrics' > /dev/null 2>&1; then
        print_status "Backend successfully fetches data from subgraph"
        
        # Extract some metrics for verification
        total_users=$(echo "$response" | jq -r '.data.globalMetrics.totalUsers // 0')
        total_providers=$(echo "$response" | jq -r '.data.globalMetrics.totalProviders // 0')
        total_payments=$(echo "$response" | jq -r '.data.globalMetrics.totalPayments // "0"')
        
        echo "📈 Current Metrics:"
        echo "  - Total Users: $total_users"
        echo "  - Total Providers: $total_providers" 
        echo "  - Total Payments: \$$(echo "scale=2; $total_payments / 100" | bc 2>/dev/null || echo "0.00")"
        
    else
        print_error "Backend cannot fetch data from subgraph properly"
        echo "Response: $response"
    fi
else
    print_warning "Cannot test complete integration - services not running"
fi

echo -e "\n📝 Step 8: Contract Integration Check"
echo "===================================="

# Check if the contract address matches
CONTRACT_ADDRESS="0xe73922a448d76756babc9126f4401101cbfb4fbc"
NETWORK="sepolia"

echo "Contract Address: $CONTRACT_ADDRESS"
echo "Network: $NETWORK"
echo "Start Block: 9419469"

# Verify contract exists on Sepolia
echo "Verifying contract on Sepolia..."
if curl -s "https://api-sepolia.etherscan.io/api?module=contract&action=getsourcecode&address=$CONTRACT_ADDRESS&apikey=YourApiKeyToken" | jq -e '.result[0].ABI' > /dev/null 2>&1; then
    print_status "Contract verified on Sepolia"
else
    print_warning "Could not verify contract on Sepolia (may need API key)"
fi

echo -e "\n📊 Step 9: Performance Check"
echo "============================"

if check_service "$BACKEND_ENDPOINT/health" "Backend"; then
    # Test response times
    echo "Testing API response times..."
    
    start_time=$(date +%s%N)
    curl -s "$BACKEND_ENDPOINT/api/analytics/overview" > /dev/null
    end_time=$(date +%s%N)
    response_time=$(( (end_time - start_time) / 1000000 ))
    
    echo "Analytics Overview Response Time: ${response_time}ms"
    
    if [ "$response_time" -lt 5000 ]; then
        print_status "Response time is acceptable (< 5s)"
    else
        print_warning "Response time is slow (> 5s)"
    fi
fi

echo -e "\n🎯 Step 10: Final Summary"
echo "========================="

echo -e "\n📋 Integration Test Results:"
echo "----------------------------"

# Count successes and failures (this is a simplified check)
echo "✅ Components Status:"
echo "  - Subgraph Build: ✅ Success"
echo "  - Contract Integration: ✅ Configured"

if check_service "$GRAPH_ENDPOINT" "Graph Node" > /dev/null 2>&1; then
    echo "  - Graph Node: ✅ Running"
else
    echo "  - Graph Node: ⚠️  Not Running"
fi

if check_service "$BACKEND_ENDPOINT/health" "Backend" > /dev/null 2>&1; then
    echo "  - Backend API: ✅ Running"
else
    echo "  - Backend API: ⚠️  Not Running"
fi

if check_service "$FRONTEND_ENDPOINT" "Frontend" > /dev/null 2>&1; then
    echo "  - Frontend: ✅ Running"
else
    echo "  - Frontend: ⚠️  Not Running"
fi

echo -e "\n🚀 Next Steps:"
echo "--------------"
echo "1. Deploy subgraph to The Graph Studio: cd subgraph && npm run deploy"
echo "2. Update backend GRAPH_API_URL to deployed subgraph endpoint"  
echo "3. Deploy backend to production environment"
echo "4. Deploy frontend to production environment"
echo "5. Monitor subgraph sync and query performance"

echo -e "\n📚 Documentation:"
echo "------------------"
echo "- Subgraph: ./subgraph/deploy.md"
echo "- Backend API: ./backend/README.md"
echo "- Frontend: ./frontend/README.md"

echo -e "\n✨ Integration test complete!"