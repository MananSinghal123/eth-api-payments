#!/bin/bash

set -e

echo "🏗️  Building Escrow Substream Package"

# Navigate to the substream directory
cd "$(dirname "$0")"

echo "📦 Installing dependencies..."
npm install

echo "🦀 Building Rust WASM module..."
cargo build --target wasm32-unknown-unknown --release

echo "📋 Validating substream.yaml..."
if ! command -v substreams &> /dev/null; then
    echo "⚠️  Substreams CLI not found. Install it with:"
    echo "   curl -sSf https://install.substreams.dev | bash"
    echo "   Or visit: https://docs.substreams.dev/reference-material/substreams-cli/installing-the-cli"
    echo "⚠️  Skipping substream validation..."
else
    echo "✅ Substreams CLI found, but skipping validation (may require auth/network)..."
    echo "   Run 'substreams info substream.yaml' manually if needed"
fi

echo "🌟 Building sink service..."
cd sink-service
npm install
npm run build
cd ..

echo "✅ Build completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Get a Substreams API token from StreamingFast"
echo "2. Update the contract address in substream.yaml"
echo "3. Set environment variables in sink-service/.env"
echo "4. Deploy to your preferred cloud provider"
echo ""
echo "🚀 Quick Start:"
echo "   # Start the sink service:"
echo "   cd sink-service && npm start"
echo ""
echo "   # Or use the real substream (requires token):"
echo "   substreams run substream.yaml map_escrow_events"