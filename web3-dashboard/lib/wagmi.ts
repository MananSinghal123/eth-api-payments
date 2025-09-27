import { createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// --- CONTRACT ADDRESSES AND DECIMALS (ADJUST THESE) ---
// **NOTE: These must be deployed on the Sepolia Testnet for our current configuration.**
export const CONTRACT_ADDRESS = '0xYourMainContractAddressOnSepolia'; 
export const PYUSD_TOKEN_ADDRESS = '0xYourPyusdTokenAddressOnSepolia'; 
export const PYUSD_DECIMALS = 6; // Standard stablecoin decimals (e.g., 6 for USDC/PYUSD)

// --- ABI Definitions ---

// Your Main Contract ABI (Escrow/Payment Contract)
export const myContractAbi = [
  // Write function for depositing funds
  { "type": "function", "name": "deposit", "inputs": [{ "name": "amountUSD", "type": "uint256", "internalType": "uint256" }], "stateMutability": "nonpayable" },
  // Read function to get the user's balance in the contract
  { "type": "function", "name": "getUserBalanceUSD", "inputs": [{ "name": "user", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" },
] as const; 

// Minimal ERC-20 ABI for PYUSD Token (needed for allowance and balance)
export const pyusdAbi = [
  { "type": "function", "name": "approve", "inputs": [{ "name": "spender", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" },
  { "type": "function", "name": "allowance", "inputs": [{ "name": "owner", "type": "address", "internalType": "address" }, { "name": "spender", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "balanceOf", "inputs": [{ "name": "account", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" },
] as const;

// --- Wagmi Configuration ---
export const config = createConfig({
  // Supports both mainnet (for reference) and Sepolia (for our testnet)
  chains: [mainnet, sepolia],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(), // Ensures Sepolia RPC is available
  },
});
