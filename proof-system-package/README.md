# @api-mertering-zk/proof-system

A zero-knowledge proof system package for API metering using Noir and bb.js. This package provides a simple interface for initializing and working with zero-knowledge proofs for API usage verification.

## 🚀 Features

- **Zero-knowledge proof generation and verification** using Noir circuits
- **Built on industry-standard libraries**: Noir and bb.js (UltraHonk backend)
- **API metering support** with pre-compiled circuits
- **Full TypeScript support** with type definitions
- **Dual API design**: Both class-based and functional interfaces
- **ES modules support** with proper module resolution
- **Error handling** with descriptive error messages

## 📦 Installation

```bash
npm install @api-mertering-zk/proof-system
```

## 🔧 Usage

### Class-based API (Recommended)

The class-based API provides better encapsulation and allows for multiple instances:

```typescript
import { ProofSystem } from '@api-mertering-zk/proof-system';

// Create a new proof system instance
const proofSystem = new ProofSystem();

// Initialize with default circuit path
await proofSystem.initialize();

// Get the initialized instances
const noir = proofSystem.getNoir();
const backend = proofSystem.getBackend();
const circuit = proofSystem.getCircuit();

console.log('Proof system ready!', proofSystem.getIsInitialized());
```

### Function-based API (Legacy Support)

For backward compatibility, a global function-based API is available:

```typescript
import { 
  initializeProofSystem, 
  getNoir, 
  getBackend, 
  getIsInitialized 
} from '@api-mertering-zk/proof-system';

// Initialize the global proof system
await initializeProofSystem();

// Access global instances
const noir = getNoir();
const backend = getBackend();
const isReady = getIsInitialized();

console.log('Global proof system ready!', isReady);
```

### Custom Circuit Path

You can specify a custom path to your compiled circuit:

```typescript
import { ProofSystem } from '@api-mertering-zk/proof-system';

const proofSystem = new ProofSystem({
  circuitPath: '/path/to/your/custom/circuit.json'
});

await proofSystem.initialize();
```

### Error Handling

The package provides proper error handling:

```typescript
import { ProofSystem } from '@api-mertering-zk/proof-system';

try {
  const proofSystem = new ProofSystem();
  await proofSystem.initialize();
  
  // Use the proof system
  const noir = proofSystem.getNoir();
  // ... your proof generation logic
  
} catch (error) {
  console.error('Failed to initialize proof system:', error.message);
}
```

### Integration Example

Here's a complete example of how to integrate the proof system:

```typescript
import { ProofSystem } from '@api-mertering-zk/proof-system';

class ApiMeteringService {
  private proofSystem: ProofSystem;

  constructor() {
    this.proofSystem = new ProofSystem();
  }

  async initialize() {
    await this.proofSystem.initialize();
    console.log('API metering service ready!');
  }

  async generateUsageProof(apiCalls: number, timestamp: number) {
    const noir = this.proofSystem.getNoir();
    const backend = this.proofSystem.getBackend();

    // Generate proof for API usage
    const input = { api_calls: apiCalls, timestamp };
    const { witness } = await noir.execute(input);
    const proof = await backend.generateProof(witness);

    return proof;
  }

  async verifyUsageProof(proof: Uint8Array, publicInputs: Uint8Array) {
    const backend = this.proofSystem.getBackend();
    return await backend.verifyProof(proof, publicInputs);
  }
}

// Usage
const meteringService = new ApiMeteringService();
await meteringService.initialize();

const proof = await meteringService.generateUsageProof(100, Date.now());
const isValid = await meteringService.verifyUsageProof(proof, publicInputs);
```

## 📋 Requirements

- **Node.js** >= 18.0.0
- **TypeScript** >= 5.0.0 (for TypeScript projects)
- The package includes a pre-compiled circuit (`api_metering.json`)

## 📖 API Reference

### ProofSystem Class

The main class for managing zero-knowledge proof operations.

#### `constructor(config?: ProofSystemConfig)`
Creates a new ProofSystem instance.

**Parameters:**
- `config` (optional): Configuration object with circuit path

**Example:**
```typescript
const proofSystem = new ProofSystem({
  circuitPath: './custom/circuit.json'
});
```

#### `initialize(): Promise<void>`
Initializes the proof system by loading and parsing the circuit file.

**Throws:**
- `Error` if circuit file is not found or invalid

#### `getNoir(): Noir`
Returns the Noir instance for proof generation.

**Throws:**
- `Error` if called before initialization

#### `getBackend(): UltraHonkBackend`
Returns the UltraHonk backend for proof verification.

**Throws:**
- `Error` if called before initialization

#### `getCircuit(): any`
Returns the loaded circuit object.

**Throws:**
- `Error` if called before initialization

#### `getIsInitialized(): boolean`
Returns whether the system has been initialized.

### Function-based API

Legacy functions for backward compatibility:

#### `initializeProofSystem(config?: ProofSystemConfig): Promise<void>`
Initializes the global proof system instance.

#### `getNoir(): Noir`
Returns the global Noir instance.

#### `getBackend(): UltraHonkBackend`  
Returns the global UltraHonk backend.

#### `getIsInitialized(): boolean`
Returns whether the global system is initialized.

### Types

#### `ProofSystemConfig`
Configuration interface for the proof system.

```typescript
interface ProofSystemConfig {
  circuitPath?: string; // Path to compiled circuit JSON file
}
```

#### Re-exported Types
- `Noir`: From `@noir-lang/noir_js`
- `UltraHonkBackend`: From `@aztec/bb.js`

## 🏗️ Circuit Structure

The package expects a compiled Noir circuit in JSON format with the following structure:

```json
{
  "bytecode": "...",      // Compiled circuit bytecode
  "abi": { ... },         // Circuit ABI definition  
  "debug_symbols": "..."  // Debug information
}
```

## 🚦 Error Handling

The package provides descriptive error messages:

- **Circuit not found**: `Compiled circuit not found at: [path]`
- **Not initialized**: `Proof system not initialized. Call initialize() first.`
- **JSON parse errors**: Standard JSON parsing error messages

## 🔍 Troubleshooting

### Common Issues

1. **Circuit file not found**
   - Ensure the circuit file exists at the specified path
   - Check file permissions

2. **Module resolution errors**
   - Ensure you're using Node.js >= 18.0.0
   - Check that your project supports ES modules

3. **TypeScript errors**
   - Make sure TypeScript is configured for ES modules
   - Update your `tsconfig.json` if needed

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
DEBUG=proof-system npm start
```

## 📄 Package Information

- **Package Name**: `@api-mertering-zk/proof-system`
- **Version**: 1.0.0
- **License**: MIT
- **Repository**: [eth-api-payments](https://github.com/MananSinghal123/eth-api-payments)

## 🤝 Contributing

Contributions are welcome! Please see the main repository for contribution guidelines.

## 📝 License

MIT License - see the LICENSE file for details.