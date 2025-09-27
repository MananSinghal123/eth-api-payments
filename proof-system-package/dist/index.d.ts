import { UltraHonkBackend } from '@aztec/bb.js';
import { Noir } from '@noir-lang/noir_js';
export interface ProofSystemConfig {
    circuitPath?: string;
}
export declare class ProofSystem {
    private circuit;
    private noir;
    private backend;
    private isInitialized;
    private circuitPath;
    constructor(config?: ProofSystemConfig);
    initialize(): Promise<void>;
    getNoir(): Noir | null;
    getBackend(): UltraHonkBackend | null;
    getIsInitialized(): boolean;
    getCircuit(): any;
}
export declare function initializeProofSystem(config?: ProofSystemConfig): Promise<void>;
export declare function getNoir(): Noir | null;
export declare function getBackend(): UltraHonkBackend | null;
export declare function getIsInitialized(): boolean;
export type { UltraHonkBackend } from '@aztec/bb.js';
export type { Noir } from '@noir-lang/noir_js';
