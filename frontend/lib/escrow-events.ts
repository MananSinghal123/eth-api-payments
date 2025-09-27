export interface EscrowLogEvent {
  blockNumber: number | null;
  transactionHash: string | null;
  logIndex: number | null;
  address: string | null;
  topics: string[];
  data: string | null;
  timestamp: string | null;
}

export type EscrowStreamStatus = "idle" | "connecting" | "open" | "reconnecting" | "closed" | "error";

export interface EscrowStreamPayload {
  event: EscrowLogEvent;
  cursor?: string;
}

export const formatShortHash = (hash?: string | null, chars = 6): string => {
  if (!hash) return "-";
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
};
