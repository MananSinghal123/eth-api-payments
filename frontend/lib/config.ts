// config.ts

import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';

// Import ABI file for Escrow contract
import Escrow from '../contracts/Escrow.json';

// Environment-based configuration for flexibility
const getContractAddress = (envKey: string, fallback: string): `0x${string}` => {
  const address = process.env[envKey] || fallback;
  if (!address.startsWith('0x')) {
    throw new Error(`Invalid contract address for ${envKey}: ${address}`);
  }
  return address as `0x${string}`;
};


// Contract configuration for Sepolia
export const contractConfig = {
  sepolia: {
    pyusdToken: {
      address: getContractAddress(
        'NEXT_PUBLIC_PYUSD_SEPOLIA', 
        '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9' // PYUSD contract address on Sepolia
      ),
      abi: [
        {
          "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
          "name": "balanceOf",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "decimals",
          "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "symbol",
          "outputs": [{"internalType": "string", "name": "", "type": "string"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "name",
          "outputs": [{"internalType": "string", "name": "", "type": "string"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"}
          ],
          "name": "transfer",
          "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {"internalType": "address", "name": "from", "type": "address"},
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"}
          ],
          "name": "transferFrom",
          "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {"internalType": "address", "name": "spender", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"}
          ],
          "name": "approve",
          "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {"internalType": "address", "name": "owner", "type": "address"},
            {"internalType": "address", "name": "spender", "type": "address"}
          ],
          "name": "allowance",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"}
          ],
          "name": "mint",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ],
      chainId: sepolia.id,
    },
    escrow: {
      address: getContractAddress(
        'NEXT_PUBLIC_ESCROW_SEPOLIA',
        '0x6E5559e7Cf01860416ff9CbEcC3bbdC1f05dB3D0' // Updated deployed Escrow contract address on Sepolia
      ),
      abi: Escrow.abi,
      chainId: sepolia.id,
    },
  },
};

// Contract exports for easy access
export const escrowContract = contractConfig.sepolia.escrow;
export const pyusdTokenContract = contractConfig.sepolia.pyusdToken;


// RPC Configuration - Multiple fallback endpoints for reliability
const SEPOLIA_RPC_URLS = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', 
  'https://rpc.sepolia.org',
  'https://rpc2.sepolia.org',
  'https://eth-sepolia.public.blastapi.io'
];

// Get RPC URL from environment or use fallbacks
const getSepoliaRpcUrl = () => {
  if (process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL) {
    return process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
  }
  return SEPOLIA_RPC_URLS[0]; // Use the first fallback
};

export const config = createConfig({
  chains: [sepolia],
  connectors: [injected(), metaMask()],
  transports: {
    [sepolia.id]: http(getSepoliaRpcUrl(), {
      timeout: 30_000, // 30 second timeout
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
  ssr: true,
  syncConnectedChain: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}