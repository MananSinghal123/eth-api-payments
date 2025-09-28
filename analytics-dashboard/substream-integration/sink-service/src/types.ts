// Types for Escrow events based on our protobuf schema
export interface EscrowEvent {
  eventType: string;
  userAddress: string;
  providerAddress: string;
  amountCents: string;
  numCalls: number;
  oldVerifier: string;
  newVerifier: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  contractAddress: string;
  gasUsed: number;
  gasPrice: string;
}

export interface StreamMessage {
  type: 'event' | 'stats' | 'error' | 'connected';
  data?: any;
  error?: string;
  timestamp: number;
}

export interface RealTimeStats {
  totalDeposits: number;
  totalDepositAmount: string;
  totalWithdrawals: number;
  totalWithdrawalAmount: string;
  totalBatchPayments: number;
  totalPaymentVolume: string;
  uniqueUsers: number;
  uniqueProviders: number;
  totalApiCalls: number;
  recentEvents: EscrowEvent[];
  lastBlockProcessed: number;
}

export interface SubstreamConfig {
  token: string;
  endpoint: string;
  contractAddress: string;
  startBlock: string;
  moduleName: string;
}