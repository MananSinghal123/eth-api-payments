import { fileURLToPath } from 'url';
import path from 'path';

// Import from the published npm package
import { 
    ProofSystem, 
    initializeProofSystem as initProofSystem, 
    getNoir as getNoirInstance, 
    getBackend as getBackendInstance, 
    getIsInitialized as getInitStatus,
    type Noir,
    type UltraHonkBackend
} from '@api-mertering-zk/proof-system';

// Configuration for local api_metering.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Create a class instance for better control
const proofSystem = new ProofSystem();

// Initialize proof system
async function initializeProofSystem(): Promise<void> {
    await proofSystem.initialize();
}

// Getter functions that use the class instance
function getNoir(): any {
    const noir = proofSystem.getNoir();
    if (!noir) {
        throw new Error('Proof system not initialized. Call initializeProofSystem() first.');
    }
    return noir;
}

function getBackend(): any {
    const backend = proofSystem.getBackend();
    if (!backend) {
        throw new Error('Proof system not initialized. Call initializeProofSystem() first.');
    }
    return backend;
}

function getIsInitialized(): boolean {
    return proofSystem.getIsInitialized();
}

// Export both the class instance and the functions for flexibility
export {
    proofSystem,
    initializeProofSystem,
    getNoir,
    getBackend,
    getIsInitialized
};