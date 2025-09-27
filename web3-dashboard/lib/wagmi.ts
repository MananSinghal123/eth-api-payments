'use client'; 

import { http, createConfig } from 'wagmi';
import { 
  mainnet, 
  sepolia // 1. Import the Sepolia chain
} from 'wagmi/chains'; 
import { getDefaultConfig } from 'connectkit';

// 1. Get WalletConnect Project ID from https://cloud.walletconnect.com
export const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || '';

// if (!projectId) {
//   throw new Error("WalletConnect Project ID is not set in NEXT_PUBLIC_WC_PROJECT_ID");
// }

// 2. Define the supported chains, including Sepolia
const chains = [mainnet, sepolia] as const; 

// 3. Configure transports for the chains (viem requirement)
const transports = chains.reduce((acc, chain) => {
    acc[chain.id] = http();
    return acc;
}, {} as any);

export const config = createConfig(
  getDefaultConfig({
    // Required API Keys for ConnectKit's default connectors
    walletConnectProjectId: projectId, // Required: Your WalletConnect Project ID
    
    // Application settings
    appName: 'My Next.js Sepolia DApp',
    appDescription: 'ConnectKit Sepolia Example',
    appUrl: 'https://mydapp.com',
    appIcon: 'https://mydapp.com/icon.png',
    
    // Chains and transports
    chains, // This now includes Sepolia
    transports
  })
);