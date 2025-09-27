import { NetworkConfig } from '../types/network';

const networkConfig: NetworkConfig = {
  networkId: process.env.NETWORK_ID || '1', // Default to Ethereum Mainnet
  rpcUrl: process.env.RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID',
  blockExplorerUrl: process.env.BLOCK_EXPLORER_URL || 'https://etherscan.io',
};

export default networkConfig;