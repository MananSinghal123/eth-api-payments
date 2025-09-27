import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Import bb.js and Noir
import { UltraHonkBackend } from '@aztec/bb.js';
import { Noir } from '@noir-lang/noir_js';
// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class ProofSystem {
    circuit = null;
    noir = null;
    backend = null;
    isInitialized = false;
    circuitPath;
    constructor(config = {}) {
        // Default to looking for api_metering.json in the package root
        this.circuitPath = config.circuitPath ||
            path.join(path.dirname(__dirname), 'api_metering.json');
    }
    // Initialize proof system
    async initialize() {
        try {
            console.log('🔄 Initializing proof system...');
            if (!fs.existsSync(this.circuitPath)) {
                throw new Error(`Compiled circuit not found at: ${this.circuitPath}`);
            }
            const circuitData = fs.readFileSync(this.circuitPath, 'utf8');
            this.circuit = JSON.parse(circuitData);
            this.noir = new Noir(this.circuit);
            this.backend = new UltraHonkBackend(this.circuit.bytecode);
            this.isInitialized = true;
            console.log('✅ Proof system ready!');
        }
        catch (error) {
            console.error('❌ Failed to initialize proof system:', error.message);
            throw error;
        }
    }
    // Getter functions to access the initialized instances
    getNoir() {
        if (!this.isInitialized) {
            throw new Error('Proof system not initialized. Call initialize() first.');
        }
        return this.noir;
    }
    getBackend() {
        if (!this.isInitialized) {
            throw new Error('Proof system not initialized. Call initialize() first.');
        }
        return this.backend;
    }
    getIsInitialized() {
        return this.isInitialized;
    }
    getCircuit() {
        if (!this.isInitialized) {
            throw new Error('Proof system not initialized. Call initialize() first.');
        }
        return this.circuit;
    }
}
// Legacy function-based API for backward compatibility
let globalProofSystem = null;
export async function initializeProofSystem(config) {
    globalProofSystem = new ProofSystem(config);
    await globalProofSystem.initialize();
}
export function getNoir() {
    if (!globalProofSystem) {
        throw new Error('Proof system not initialized. Call initializeProofSystem() first.');
    }
    return globalProofSystem.getNoir();
}
export function getBackend() {
    if (!globalProofSystem) {
        throw new Error('Proof system not initialized. Call initializeProofSystem() first.');
    }
    return globalProofSystem.getBackend();
}
export function getIsInitialized() {
    return globalProofSystem ? globalProofSystem.getIsInitialized() : false;
}
