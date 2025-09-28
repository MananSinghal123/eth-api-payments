# 0xPay-SDK

Per‑request crypto payments for any API. 0xPay-SDK lets developers focus on business logic while payments, settlement, analytics, and permanent records are handled by:
- The Graph Protocol Substreams for real‑time, low‑latency on‑chain analytics
- PayPal USD (PYUSD) for stable, predictable settlement
- Immutable transaction archiving on Akave Cloud (Filecoin/IPFS)
![WhatsApp Image 2025-09-28 at 00 03 29_e5776faf](https://github.com/user-attachments/assets/28fe446d-3b45-4714-9105-f9a0dbbf209e)

## Pillars

- The Graph Protocol Substreams
  - Live event streaming from Ethereum (Sepolia) via StreamingFast endpoints.
  - Deterministic, replayable analytics for dashboards and alerting.
- PayPal USD (PYUSD)
  - ERC‑20 stablecoin for deposits, batch settlement, and withdrawals.
  - Balances tracked in cents for precision and easy UX.
- Immutable archives on Akave Cloud (Filecoin/IPFS)
  - Persist escrow events and settlement snapshots as content‑addressed, tamper‑evident records (CIDs).
  - Verifiable history independent of any single service.

## Overview

- Chain: Ethereum Sepolia (11155111)
- Token: PYUSD (ERC‑20, 6 decimals)
- Metering: Noir ZK circuit + on‑chain verifier
- Settlement: Escrow smart contract + ZK‑verified batch processing
- Analytics: Substreams consumer + dashboards (Next.js)
- Frontends: Consumer and Provider portals (Next.js)
- Archives: Akave Cloud (Filecoin/IPFS)

## Monorepo Layout

- contracts/ — Solidity contracts (Escrow) + Foundry
- noir/api_metering — Noir circuit and generated Verifier.sol
- analytics-dashboard/
  - substream-integration/ — Node Substreams client (gRPC, StreamingFast)
  - frontend/ — Analytics dashboard (Next.js)
- frontend/ — Consumer app (Next.js)
- api-provider-frontend/ — Provider portal (Next.js)
- api-provider-backend/ — Provider backend (TypeScript/Node)
- backend/ — Batch settlement orchestrator (server integration)
- proof-system-package/ — Packaged proof tools/artifacts for metering

## Architecture

1. Users deposit PYUSD into Escrow.
2. API usage occurs; backend generates a Noir proof of metering.
3. Backend submits `processBatchPayment` with proof; Escrow moves funds from user to provider (in cents).
4. Provider withdraws PYUSD from Escrow.
5. Substreams emits on‑chain events for analytics and monitoring.
6. Batches and receipts are archived to Akave Cloud (Filecoin/IPFS) for immutable history.

## Contracts

Main: `contracts/src/Escrow.sol`
- Holds PYUSD and tracks balances in cents.
- ZK verifier interface `IVerifier`.
- Key functions:
  - `deposit(uint256 amountUSD)` / `withdraw(uint256 amountCents)`
  - `processBatchPayment(address user, address provider, uint256 amountCents, uint256 numCalls, bytes proof, uint256[] publicInputs)` (owner‑only; validates Noir proof)
  - `providerWithdraw(uint256 amountCents)` / `providerWithdrawAll()`
  - Admin: `setZkVerifier`, `pause`, `unpause`, `emergencyWithdraw`

### Foundry (WSL recommended)

```bash
cd ~/OneDrive/Documents/eth-api-payments/contracts
forge install
forge remappings > remappings.txt
forge build
forge test -vv
```

Deploy (example):

```bash
forge script script/DeployEscrow.s.sol:DeployEscrow \
  --rpc-url $FOUNDRY_ETH_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast --verify --etherscan-api-key $ETHERSCAN_API_KEY
```

Verify (example):

```bash
cast abi-encode "constructor(address,address)" \
  0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9 \
  0xd9145CCE52D386f254917e481eB44e9943F39138

forge verify-contract 0xAA7D40462658331898CFe6597012C495F6a76302 contracts/src/Escrow.sol:Escrow \
  --chain sepolia \
  --constructor-args 0x000000000000000000000000cac5...9138 \
  --compiler-version v0.8.28+commit.5bab2831 \
  --num-of-optimizations 200 \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --rpc-url $FOUNDRY_ETH_RPC_URL \
  --watch
```

Remapping required: `@openzeppelin/=lib/openzeppelin-contracts/`.

## Noir ZK Metering

- Circuit: `noir/api_metering`
- Output: `noir/api_metering/target/Verifier.sol`
- Deploy `Verifier.sol`, then set on Escrow via `setZkVerifier(address)`.
- `proof-system-package/` contains packaged tools/artifacts for proof generation in services.

## Substreams (The Graph Protocol)

- Client: `analytics-dashboard/substream-integration`
- Endpoint (gRPC over HTTP/2): `https://sepolia.eth.streamingfast.io`
- Auth: `SUBSTREAMS_API_TOKEN` (JWT)
- Package: local `substream.yaml`, module `map_escrow_events`

Run:

```bash
cd analytics-dashboard/substream-integration
cp .env.example .env 2>/dev/null || true
# SUBSTREAMS_API_TOKEN=<JWT>
# ESCROW_CONTRACT_ADDRESS=0xAA7D40462658331898CFe6597012C495F6a76302
# SUBSTREAMS_PACKAGE_URL=./substream.yaml
# SUBSTREAMS_MODULE=map_escrow_events
# START_BLOCK=<block>

npm install
node src/index.js
```

gRPC transport (snippet):

```ts
import { createConnectTransport } from "@connectrpc/connect-node";
import {
  createAuthInterceptor, createRegistry, fetchSubstream,
  createRequest, streamBlocks, unpackMapOutput
} from "@substreams/core";

const transport = createConnectTransport({
  baseUrl: "https://sepolia.eth.streamingfast.io",
  httpVersion: "2",
  interceptors: [createAuthInterceptor(process.env.SUBSTREAMS_API_TOKEN!)],
});
```

## Immutable Archives (Akave Cloud · Filecoin/IPFS)

- Persist event batches and settlement receipts to Akave Cloud for content‑addressed archives (CIDs).
- Typical flow:
  - Aggregate Substreams outputs per interval.
  - Serialize to JSON and upload to Akave (returns CID).
  - Reference CIDs in analytics for reproducible, verifiable replays.

## Frontends

- Consumer app: `frontend/`
- Provider portal: `api-provider-frontend/`
- Analytics dashboard: `analytics-dashboard/frontend/`

Run any app:

```bash
cd <app-folder>
npm install
npm run dev
```

Each app reads chain/contract config from `lib/` and `.env.local`:
- NEXT_PUBLIC_CHAIN_ID=11155111
- NEXT_PUBLIC_RPC_URL=https://ethereum-sepolia.publicnode.com
- NEXT_PUBLIC_ESCROW_ADDRESS=0xAA7D40462658331898CFe6597012C495F6a76302

## Backends

- api-provider-backend/ — validates usage, submits `processBatchPayment`, optionally archives to Akave.
- backend/ — batch settlement orchestrator and service integration.

Typical run:

```bash
cd api-provider-backend
npm install
npm run dev
```

## Environment

```bash
# analytics-dashboard/substream-integration/.env
SUBSTREAMS_API_TOKEN=eyJhbGciOi...
ESCROW_CONTRACT_ADDRESS=0xAA7D40462658331898CFe6597012C495F6a76302
SUBSTREAMS_PACKAGE_URL=./substream.yaml
SUBSTREAMS_MODULE=map_escrow_events
START_BLOCK=6800000
```

```bash
# contracts/.env
FOUNDRY_ETH_RPC_URL=https://ethereum-sepolia.publicnode.com
PRIVATE_KEY=0x...           # never commit
ETHERSCAN_API_KEY=...
PYUSD_SEPOLIA_CONTRACT_ADDRESS=0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9
DEPLOYED_ADDRESS=0xAA7D40462658331898CFe6597012C495F6a76302
```

## Quickstart

```bash
# 1) Contracts
cd ~/OneDrive/Documents/eth-api-payments/contracts
forge build && forge test

# 2) Substreams consumer
cd ../analytics-dashboard/substream-integration
npm install
node src/index.js

# 3) Frontends
cd ../../frontend && npm install && npm run dev
cd ../api-provider-frontend && npm install && npm run dev

# 4) Backends
cd ../api-provider-backend && npm install && npm run dev
```

## Security

- Do not commit private keys or API tokens.
- Rotate exposed credentials immediately.
- Use separate wallets for testnets.
