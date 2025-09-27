# eth-api-payments-proof-system

A zero-knowledge proof system package for API metering using Noir and bb.js.

## Installation

```bash
npm install eth-api-payments-proof-system
```

## Usage

### Class-based API (Recommended)

```typescript
import { ProofSystem } from 'eth-api-payments-proof-system';

const proofSystem = new ProofSystem();
await proofSystem.initialize();

const noir = proofSystem.getNoir();
const backend = proofSystem.getBackend();
```

### Function-based API (Legacy)

```typescript
import { 
  initializeProofSystem, 
  getNoir, 
  getBackend, 
  getIsInitialized 
} from 'eth-api-payments-proof-system';

await initializeProofSystem();

const noir = getNoir();
const backend = getBackend();
const isReady = getIsInitialized();
```

### Custom Circuit Path

```typescript
import { ProofSystem } from 'eth-api-payments-proof-system';

const proofSystem = new ProofSystem({
  circuitPath: '/path/to/your/circuit.json'
});

await proofSystem.initialize();
```

## Features

- Zero-knowledge proof generation and verification
- Built on Noir and bb.js
- Support for API metering circuits
- TypeScript support
- Both class-based and functional APIs

## Requirements

- Node.js >= 18.0.0
- The package includes the compiled circuit (`api_metering.json`)

## API Reference

### ProofSystem Class

#### constructor(config?: ProofSystemConfig)
Creates a new ProofSystem instance.

#### initialize(): Promise<void>
Initializes the proof system with the circuit.

#### getNoir(): Noir | null
Returns the Noir instance after initialization.

#### getBackend(): UltraHonkBackend | null
Returns the UltraHonk backend after initialization.

#### getIsInitialized(): boolean
Returns whether the system is initialized.

### Types

- `ProofSystemConfig`: Configuration interface
- `UltraHonkBackend`: Re-exported from @aztec/bb.js
- `Noir`: Re-exported from @noir-lang/noir_js

## License

MIT