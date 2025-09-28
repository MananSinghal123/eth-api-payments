# Escrow Analytics Substream

This project provides real-time analytics for the Escrow smart contract using Substreams technology. It streams on-chain events directly to a dashboard for live monitoring and analytics.

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Ethereum      │    │   Substream      │    │  Sink Service   │
│   Escrow        │───▶│   (Rust WASM)    │───▶│  (Node.js/TS)   │
│   Contract      │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │   Frontend      │
                                               │   Analytics     │
                                               │   Dashboard     │
                                               └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

1. **Rust & Cargo** - [Install Rust](https://rustup.rs/)
2. **Node.js & npm** - [Install Node.js](https://nodejs.org/)
3. **Substreams CLI** - [Install Guide](https://docs.substreams.dev/reference-material/substreams-cli/installing-the-cli)
4. **WebAssembly target**:
   ```bash
   rustup target add wasm32-unknown-unknown
   ```

### Installation

1. **Clone and build everything:**
   ```bash
   cd analytics-dashboard/substream-integration
   ./build.sh
   ```

2. **Configure environment:**
   ```bash
   cd sink-service
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the sink service:**
   ```bash
   cd sink-service
   npm start
   ```

4. **Start the frontend dashboard:**
   ```bash
   cd ../frontend
   npm run dev
   ```

## 📋 Configuration

### Environment Variables

Create `sink-service/.env` with:

```env
# StreamingFast API Token (get from https://app.streamingfast.io/)
SUBSTREAMS_API_TOKEN=your_token_here

# Ethereum network endpoint
SUBSTREAMS_ENDPOINT=https://sepolia.eth.streamingfast.io

# Your deployed Escrow contract address
ESCROW_CONTRACT_ADDRESS=0xYourContractAddress

# Block to start streaming from
START_BLOCK=6000000

# Server configuration
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### Contract Address

Update the contract address in two places:

1. **substream.yaml** - Update network and initial block
2. **src/lib.rs** - Update `ESCROW_CONTRACT_ADDRESS` constant

## 📊 Tracked Events

The substream monitors these Escrow contract events:

- **UserDeposit** - When users deposit PYUSD
- **UserWithdraw** - When users withdraw their balance
- **BatchPayment** - When API payments are processed
- **ProviderWithdraw** - When providers withdraw earnings
- **ZkVerifierUpdated** - When the ZK verifier is updated

## 🛠️ Development

### Building the Substream

```bash
# Build the Rust WASM module
cargo build --target wasm32-unknown-unknown --release

# Validate the substream configuration
substreams info substream.yaml

# Test the substream locally
substreams run substream.yaml map_escrow_events -e sepolia.eth.streamingfast.io:443
```

### Building the Sink Service

```bash
cd sink-service
npm install
npm run build
npm start
```

### Testing the Integration

1. **Check sink service health:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Get current stats:**
   ```bash
   curl http://localhost:3001/api/stats
   ```

3. **WebSocket connection test:**
   ```javascript
   const ws = new WebSocket('ws://localhost:3001');
   ws.onmessage = (event) => console.log(JSON.parse(event.data));
   ```

## 🚀 Deployment

### Production Deployment

1. **Deploy to cloud provider** (Vercel, Railway, etc.)
2. **Set production environment variables**
3. **Update CORS origins for your frontend domain**
4. **Consider using a process manager like PM2 for the sink service**

### Docker Deployment

```dockerfile
# Dockerfile for sink service
FROM node:18-alpine

WORKDIR /app
COPY sink-service/package*.json ./
RUN npm ci --only=production

COPY sink-service/dist ./dist
COPY sink-service/.env ./.env

EXPOSE 3001
CMD ["node", "dist/server.js"]
```

### Environment-Specific Configurations

#### Mainnet
```env
SUBSTREAMS_ENDPOINT=https://mainnet.eth.streamingfast.io
START_BLOCK=18000000  # Recent block for faster sync
```

#### Sepolia Testnet
```env
SUBSTREAMS_ENDPOINT=https://sepolia.eth.streamingfast.io
START_BLOCK=4000000
```

## 🔧 Troubleshooting

### Common Issues

1. **"Failed to compile protos"**
   - Ensure you have `protoc` installed
   - Run `cargo clean` and rebuild

2. **"WebSocket connection failed"**
   - Check if sink service is running on correct port
   - Verify CORS configuration
   - Check firewall/network settings

3. **"Substream authentication failed"**
   - Verify your StreamingFast API token
   - Check token permissions and quotas

4. **"No events received"**
   - Verify contract address is correct
   - Check if contract has any recent activity
   - Ensure you're on the correct network

### Debug Mode

Enable detailed logging:

```bash
# Sink service debug
DEBUG=* npm start

# Substream debug
substreams run -v substream.yaml map_escrow_events
```

## 📚 Resources

- [Substreams Documentation](https://docs.substreams.dev/)
- [StreamingFast Platform](https://app.streamingfast.io/)
- [Ethereum Event Logs](https://ethereum.org/en/developers/docs/smart-contracts/anatomy/#events-and-logs)
- [WebSocket API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.