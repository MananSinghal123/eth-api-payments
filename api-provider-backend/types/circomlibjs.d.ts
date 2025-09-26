declare module "circomlibjs" {
  export function buildPoseidon(): Promise<{
    (inputs: bigint[]): any;
    F: {
      toString(value: any): string;
    };
  }>;
  
  export function buildMiMC7(): Promise<any>;
  export function buildBabyjub(): Promise<any>;
  export function buildPedersenHash(): Promise<any>;
  export function buildMimcSponge(): Promise<any>;
}