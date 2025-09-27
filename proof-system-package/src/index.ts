import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import bb.js and Noir
import { UltraHonkBackend } from '@aztec/bb.js';
import { Noir } from '@noir-lang/noir_js';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ProofSystemConfig {
  circuitPath?: string;
}

export class ProofSystem {
  private circuit: any = null;
  private noir: Noir | null = null;
  private backend: UltraHonkBackend | null = null;
  private isInitialized = false;
  private circuitPath: string;

  constructor(config: ProofSystemConfig = {}) {
    // Default to looking for api_metering.json in the package root
    this.circuitPath = config.circuitPath || 
      path.join(path.dirname(__dirname), 'api_metering.json');
  }

  // Initialize proof system
  async initialize(): Promise<void> {
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
      
    } catch (error: any) {
      console.error('❌ Failed to initialize proof system:', error.message);
      throw error;
    }
  }

  // Getter functions to access the initialized instances
  getNoir(): Noir | null {
    if (!this.isInitialized) {
      throw new Error('Proof system not initialized. Call initialize() first.');
    }
    return this.noir;
  }

  getBackend(): UltraHonkBackend | null {
    if (!this.isInitialized) {
      throw new Error('Proof system not initialized. Call initialize() first.');
    }
    return this.backend;
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  getCircuit(): any {
    if (!this.isInitialized) {
      throw new Error('Proof system not initialized. Call initialize() first.');
    }
    return this.circuit;
  }
}

// Legacy function-based API for backward compatibility
let globalProofSystem: ProofSystem | null = null;

export async function initializeProofSystem(config?: ProofSystemConfig): Promise<void> {
  globalProofSystem = new ProofSystem(config);
  await globalProofSystem.initialize();
}

export function getNoir(): Noir | null {
  if (!globalProofSystem) {
    throw new Error('Proof system not initialized. Call initializeProofSystem() first.');
  }
  return globalProofSystem.getNoir();
}

export function getBackend(): UltraHonkBackend | null {
  if (!globalProofSystem) {
    throw new Error('Proof system not initialized. Call initializeProofSystem() first.');
  }
  return globalProofSystem.getBackend();
}

export function getIsInitialized(): boolean {
  return globalProofSystem ? globalProofSystem.getIsInitialized() : false;
}

// Export types
export type { UltraHonkBackend } from '@aztec/bb.js';
export type { Noir } from '@noir-lang/noir_js';