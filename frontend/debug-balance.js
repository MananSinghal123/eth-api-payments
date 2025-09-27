// Debug script to check PYUSD balance on different contract addresses
// Run with: node debug-balance.js YOUR_WALLET_ADDRESS

const { createPublicClient, http, formatUnits } = require('viem');
const { sepolia } = require('viem/chains');

// Common PYUSD addresses on Sepolia to test
const POSSIBLE_PYUSD_ADDRESSES = [
  '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9', // Current fallback
  '0x663DC15D3C1aC63ff12E45Ab68FeA3F0a883C251', // Another possible testnet PYUSD
  '0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97', // PayPal USD on some testnets
  // Add more addresses if you know them
];

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function decimals() view returns (uint8)',
];

async function checkBalances(walletAddress) {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  console.log(`Checking PYUSD balances for wallet: ${walletAddress}\n`);

  for (const contractAddress of POSSIBLE_PYUSD_ADDRESSES) {
    try {
      const [balance, symbol, name, decimals] = await Promise.all([
        client.readContract({
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [walletAddress],
        }),
        client.readContract({
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'symbol',
        }),
        client.readContract({
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'name',
        }),
        client.readContract({
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }),
      ]);

      const formattedBalance = formatUnits(balance, decimals);
      
      console.log(`📍 Contract: ${contractAddress}`);
      console.log(`   Name: ${name}`);
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Balance: ${formattedBalance}`);
      
      if (parseFloat(formattedBalance) > 0) {
        console.log(`   🎉 FOUND TOKENS! This might be your PYUSD contract!`);
      }
      console.log('');
      
    } catch (error) {
      console.log(`❌ Contract: ${contractAddress} - Error: ${error.message.split('\n')[0]}`);
      console.log('');
    }
  }
}

// Get wallet address from command line argument
const walletAddress = process.argv[2];

if (!walletAddress) {
  console.log('Usage: node debug-balance.js YOUR_WALLET_ADDRESS');
  console.log('Example: node debug-balance.js 0x1234...abcd');
  process.exit(1);
}

if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
  console.log('Please provide a valid Ethereum address starting with 0x');
  process.exit(1);
}

checkBalances(walletAddress).catch(console.error);