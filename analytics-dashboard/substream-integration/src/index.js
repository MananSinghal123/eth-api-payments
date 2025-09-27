import {
  createAuthInterceptor,
  streamBlocks,
  createRequest,
  fetchSubstream,
  createRegistry,
} from "@substreams/core";
import { createConnectTransport } from "@connectrpc/connect-node";
import { config } from "dotenv";

// Load environment variables
config();

// Configuration - exactly like the docs
const TOKEN = process.env.SUBSTREAMS_API_TOKEN;
const ENDPOINT = "https://sepolia.eth.streamingfast.io";
const SPKG = "https://spkg.io/streamingfast/ethereum-explorer-v0.1.2.spkg";
const MODULE = "map_block_meta";
const START_BLOCK = "5000000";
const ESCROW_CONTRACT = process.env.ESCROW_CONTRACT_ADDRESS;

// Simple cursor storage - like the docs
let currentCursor = null;
const getCursor = () => currentCursor;
const setCursor = (cursor) => {
  currentCursor = cursor;
  console.log(`Cursor updated: ${cursor}`);
};

// Custom error retry logic - replaces isErrorRetryable
const isErrorRetryable = (e) => {
  const retryableCodes = [
    "UNAVAILABLE",
    "DEADLINE_EXCEEDED",
    "RESOURCE_EXHAUSTED",
  ];
  return retryableCodes.includes(e.code) || e.message?.includes("connection");
};

// Handle escrow events
const handleEscrowEvent = (log) => {
  if (
    !log.address ||
    log.address.toLowerCase() !== ESCROW_CONTRACT?.toLowerCase()
  ) {
    return;
  }

  console.log("📝 Escrow Event:", {
    address: log.address,
    topics: log.topics,
    block: log.blockNumber,
    tx: log.transactionHash,
  });

  // Stream to frontend
  console.log(`📡 Broadcasting to frontend`);
};

// Handle block scoped data - simplified from docs
export const handleBlockScopedDataMessage = (blockScopedData, registry) => {
  const output = blockScopedData.output;
  if (!output?.mapOutput) return;

  try {
    const decoded = registry.fromBinary(
      output.mapOutput.typeUrl.replace("type.googleapis.com/", ""),
      output.mapOutput.value
    );

    // Process logs for our contract
    if (decoded.logs) {
      decoded.logs.forEach(handleEscrowEvent);
    }
  } catch (error) {
    console.error("Decode error:", error);
  }
};

// Handle block undo - from docs
export const handleBlockUndoSignalMessage = (blockUndoSignal) => {
  console.log(`Block undo: ${blockUndoSignal.lastValidBlock}`);
};

// Handle response message - exactly like docs
export const handleResponseMessage = async (response, registry) => {
  switch (response.message.case) {
    case "blockScopedData":
      handleBlockScopedDataMessage(response.message.value, registry);
      break;
    case "blockUndoSignal":
      handleBlockUndoSignalMessage(response.message.value);
      break;
  }
};

// Handle progress - from docs
const handleProgressMessage = (progress) => {
  if (progress?.cursor) {
    setCursor(progress.cursor);
  }
};

// Stream function - like docs
const stream = async (pkg, registry, transport) => {
  const request = createRequest({
    substreamPackage: pkg,
    outputModule: MODULE,
    productionMode: true,
    startBlockNum: START_BLOCK,
    startCursor: getCursor() ?? undefined,
  });

  for await (const statefulResponse of streamBlocks(transport, request)) {
    await handleResponseMessage(statefulResponse.response, registry);
    handleProgressMessage(statefulResponse.progress, registry);
  }
};

// Main function - exactly like docs pattern
const main = async () => {
  const pkg = await fetchSubstream(SPKG);
  const registry = createRegistry(pkg);

  const transport = createConnectTransport({
    baseUrl: ENDPOINT,
    interceptors: [createAuthInterceptor(TOKEN)],
    useBinaryFormat: true,
    jsonOptions: {
      typeRegistry: registry,
    },
  });

  // Infinite loop handles disconnections - from docs
  while (true) {
    try {
      await stream(pkg, registry, transport);
    } catch (e) {
      if (!isErrorRetryable(e)) {
        console.log(`Fatal error: ${e}`);
        throw e;
      }
      console.log(`Retryable error (${e}), retrying...`);
      // Simple backoff
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

// Start - like docs
main().catch(console.error);
