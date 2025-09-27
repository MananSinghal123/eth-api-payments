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
import { dirname, join } from "path";

// Load environment variables
config();

// Configuration - exactly like the docs
const TOKEN = process.env.SUBSTREAMS_API_TOKEN;
const ENDPOINT = "https://sepolia.eth.streamingfast.io";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SPKG_PATH = join(__dirname, "../substream.yaml"); // Use local substream instead of remote package
const MODULE = process.env.SUBSTREAMS_MODULE || "map_escrow_events"; // Use your custom module
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

// Handle escrow events from our custom substream
const handleEscrowEvents = (events) => {
  if (!events || !events.events) return;

  events.events.forEach((event) => {
    console.log("🎉 LIVE ESCROW EVENT:", {
      type: event.eventType,
      escrowId: event.escrowId,
      buyer: event.buyer,
      seller: event.seller,
      amount: event.amount,
      txHash: event.transactionHash,
      block: event.blockNumber,
      timestamp: new Date(event.timestamp * 1000).toISOString(),
      contract: event.contractAddress,
    });

    // This is where you'd send to your frontend via WebSocket, HTTP, etc.
    // For now, just log to console to show it's working
    console.log("📡 LIVE EVENT - Broadcasting to frontend dashboard!");

    // You could add WebSocket broadcasting here:
    // if (websocketConnections.length > 0) {
    //   broadcast(event);
    // }
  });
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
        // Handle our custom escrow events
        handleEscrowEvents(json);
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
  if (!ESCROW_CONTRACT) throw new Error("Missing ESCROW_CONTRACT_ADDRESS");

  let substream;
  if (SPKG.startsWith("http://") || SPKG.startsWith("https://")) {
    substream = await fetchSubstream(SPKG);
  } else {
    // Read local file
    const fs = require("fs");
    const path = require("path");
    const spkgPath = path.resolve(__dirname, SPKG);
    const substreamYaml = fs.readFileSync(spkgPath, "utf8");
    // If fetchSubstream can accept YAML content, pass it; otherwise, parse as needed
    substream = await fetchSubstream(substreamYaml);
  }
  const registry = createRegistry(substream);
  const transport = createConnectTransport({
    baseUrl: ENDPOINT,
    interceptors: [createAuthInterceptor(TOKEN)],
    httpVersion: "2",
    jsonOptions: { typeRegistry: registry },
  });

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
