import {
  createAuthInterceptor,
  createRegistry,
  createRequest,
  fetchSubstream,
  isEmptyMessage,
  streamBlocks,
  unpackMapOutput,
} from "@substreams/core";
import { createConnectTransport } from "@connectrpc/connect-node";
import { config } from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import dotenv from "dotenv";

// Get the current file's directory and go up one level to find .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../.env');

// Load environment variables from the parent directory
dotenv.config({ path: envPath });
config({ path: envPath });

// Configuration - exactly like the docs
const TOKEN = process.env.SUBSTREAMS_API_TOKEN;
const ENDPOINT = "https://sepolia.eth.streamingfast.io";
// Use a working example package for now
const SPKG_PATH = "https://github.com/streamingfast/substreams-eth-block-meta/releases/download/v0.5.1/substreams-eth-block-meta-v0.5.1.spkg";
const MODULE = "db_out"; // Use correct module name
const START_BLOCK =
  process.env.SUBSTREAMS_START_BLOCK || process.env.START_BLOCK || "6800000";
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
  return retryableCodes.includes(e?.code) || e?.message?.includes("connection");
};

// Handle block data from substream
const handleBlockData = (blockData) => {
  console.log("🎉 LIVE BLOCK DATA:", {
    blockNumber: blockData.number || 'N/A',
    hash: blockData.hash || 'N/A',
    timestamp: blockData.timestamp || 'N/A',
    data: blockData
  });

  console.log("📡 LIVE EVENT - Broadcasting to frontend dashboard!");

  // You could add WebSocket broadcasting here:
  // if (websocketConnections.length > 0) {
  //   broadcast(blockData);
  // }
};

// Handle block undo - from docs
const handleBlockUndoSignalMessage = (blockUndoSignal) => {
  console.log(`Block undo: ${blockUndoSignal.lastValidBlock}`);
};

// Handle progress - from docs
const handleProgressMessage = (progress) => {
  if (progress?.cursor) {
    setCursor(progress.cursor);
  }
};

// Stream function - like docs
const stream = async (substream, registry, transport) => {
  const request = createRequest({
    substreamPackage: substream,
    outputModule: MODULE,
    productionMode: true,
    startBlockNum: START_BLOCK,
    startCursor: getCursor() ?? undefined,
  });

  for await (const statefulResponse of streamBlocks(transport, request)) {
    const { response, progress } = statefulResponse;

    if (response?.message?.case === "blockScopedData") {
      const output = unpackMapOutput(response, registry);
      if (output && !isEmptyMessage(output)) {
        const json = output.toJson({ typeRegistry: registry });
        // Handle the block data
        handleBlockData(json);
      }
    } else if (response?.message?.case === "blockUndoSignal") {
      handleBlockUndoSignalMessage(response.message.value);
    }

    if (progress) {
      handleProgressMessage(progress);
    }
  }
};

// Main function - exactly like docs pattern
const main = async () => {
  // Validate environment variables
  if (!TOKEN) throw new Error("Missing SUBSTREAMS_API_TOKEN");
  
  console.log("🔄 Loading substream package...");
  const substream = await fetchSubstream(SPKG_PATH);
  const registry = createRegistry(substream);
  const transport = createConnectTransport({
    baseUrl: ENDPOINT,
    interceptors: [createAuthInterceptor(TOKEN)],
    httpVersion: "2",
    jsonOptions: { typeRegistry: registry },
  });

  console.log("🚀 Starting substream connection...");

  // Infinite loop handles disconnections - from docs
  while (true) {
    try {
      await stream(substream, registry, transport);
    } catch (error) {
      if (!isErrorRetryable(error)) throw error;
      console.error("Retryable error:", error);
      // Simple backoff
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

// Start - like docs
main().catch(console.error);
