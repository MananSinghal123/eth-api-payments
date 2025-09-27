// config.ts

import { http, createConfig } from 'wagmi';
import { sepolia, polygonAmoy } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';

// Import ABI files for both contracts
import Escrow from '../../deployments/amoy/Escrow.json';
import WrappedPYUSD from '../../deployments/amoy/WrappedPYUSD.json';
import WrappedPYUSDAdapter from "../../deployments/sepolia/WrappedPYUSDAdapter.json"

// Environment-based configuration for flexibility
const getContractAddress = (envKey: string, fallback: string): `0x${string}` => {
  const address = process.env[envKey] || fallback;
  if (!address.startsWith('0x')) {
    throw new Error(`Invalid contract address for ${envKey}: ${address}`);
  }
  return address as `0x${string}`;
};


// Dynamic contract configuration based on environment
export const contractConfig = {
  // Sepolia contracts
  sepolia: {
    pyusdToken: {
      address: getContractAddress(
        'NEXT_PUBLIC_PYUSD_SEPOLIA', 
        '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9' // Updated PYUSD contract address
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
    wrappedPyusdAdapter: {
      address: getContractAddress(
        'NEXT_PUBLIC_WPYUSD_ADAPTER_SEPOLIA',
        '0x6B0F37d709a9c344233fb4082102400dBeDA5d1F'
      ),
      abi: WrappedPYUSDAdapter.abi,
      chainId: sepolia.id,
    },
  },
  // Polygon Amoy contracts
  amoy: {
    escrow: {
      address: getContractAddress(
        'NEXT_PUBLIC_ESCROW_AMOY',
        '0xAC6a80da31d9D32f453332A9d6184c8b2376430E'
      ),
      abi: Escrow.abi,
      chainId: polygonAmoy.id,
    },
    wrappedPyusd: {
      address: getContractAddress(
        'NEXT_PUBLIC_WPYUSD_AMOY',
        '0xDCD5c55a144E325274508eC3bEf0d8e29E2F1cfE'
      ),
      abi: WrappedPYUSD.abi,
      chainId: polygonAmoy.id,
    },
  },
};

// Legacy exports for backward compatibility
export const escrowContract = contractConfig.amoy.escrow;
export const wrappedPyusdAdapterContract = contractConfig.sepolia.wrappedPyusdAdapter;
export const pyusdTokenContract = contractConfig.sepolia.pyusdToken;
export const wrappedPyusdAmoyContract = contractConfig.amoy.wrappedPyusd;


export const config = createConfig({
  chains: [sepolia, polygonAmoy],
  connectors: [injected(), metaMask()],
  transports: {
    [sepolia.id]: http(),
    [polygonAmoy.id]: http(),
  },
  ssr: true,
  syncConnectedChain: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}