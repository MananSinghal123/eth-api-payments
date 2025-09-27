// contract-abi.ts
import { parseAbi } from 'viem';

// Use parseAbi for a cleaner, type-safe definition
export const myContractAbi = parseAbi([
  // Example Write Function (modifies state)
  'function deposit(uint256 amount) public payable',
  
  // Example Read Function (does not modify state)
  'function myValue() public view returns (uint256)',
  
  // Example Event
  'event Deposited(address indexed user, uint256 amount)',
])