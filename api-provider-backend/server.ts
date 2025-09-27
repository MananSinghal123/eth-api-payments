import express from "express";
import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import axios from "axios";
import { buildPoseidon } from "circomlibjs";
import { Redis } from "@upstash/redis";
import cors from "cors";
import * as dotenv from "dotenv";

// Import bb.js and Noir
import { UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";

// Types
interface WeatherData {
  city: string;
  temperature: number;
  humidity: number;
  conditions: string;
}

interface BatchData {
  walletAddress: string;
  expected_status: string;
  nonce: string;
  response_data: number[];
  status_code: string;
  individual_usages: number[];
  num_calls: number;
  total_claimed_usage: number;
  requestIds: string[]; // Track request IDs for this batch
  lastUpdated: number; // Timestamp for cleanup
}

interface ProofInputs {
  individual_usages: number[];
  num_calls: number;
  total_claimed_usage: number;
  [key: string]: string | number | string[] | number[] | boolean | boolean[];
}

interface ProofResult {
  proof: string;
  publicInputs: string[];
  inputs: ProofInputs;
}

interface PaymentData {
  batchId: string;
  walletAddress: string;
  proof: string;
  publicInputs: string[];
  endpoint: string;
  processingTime: number;
  batchData: PreparedBatchData;
  providerAddress?: string;
}

interface GenerateBatchProofParams {
  batchData: PreparedBatchData;
  batchId: string;
}

type PreparedBatchData = BatchData & {
  num_calls: number;
  total_claimed_usage: number;
  individual_usages: number[];
  response_data: number[];
  requestIds: string[];
};
dotenv.config();
// Initialize Express app
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000", // Allow requests only from your client
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // Specify the allowed methods
    credentials: true, // Allow cookies and authentication headers
  })
);
// Configuration
const CIRCUIT_PATH = "../noir/api_metering";
const COMPILED_CIRCUIT_PATH = path.join(
  CIRCUIT_PATH,
  "target",
  "api_metering.json"
);
const PAYMENT_GATEWAY_URL =
  process.env.PAYMENT_GATEWAY_URL || "http://localhost:3002";
const PAYMENT_PROVIDER_ADDRESS = process.env.PAYMENT_PROVIDER_ADDRESS;
const BATCH_SIZE = 4; // Process batch every 4 calls
const BATCH_CLEANUP_INTERVAL = 1000 * 60 * 10; // 10 minutes cleanup interval

// Initialize Upstash Redis with fallback
let redis: Redis | null = null;
const REDIS_ENABLED = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

if (REDIS_ENABLED) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
} else {
  console.warn(
    "⚠️ Redis credentials not found. Running without Redis caching."
  );
}

// Global variables for proof system
let circuit: any = null;
let noir: Noir | null = null;
let backend: UltraHonkBackend | null = null;
let isInitialized = false;
let poseidonHashFn: any = null;

// In-memory batch storage (in production, use Redis for persistence)
const batchStorage = new Map<string, BatchData>();

// Compute Poseidon hash using circomlibjs (same as Noir circuit)
function computePoseidonHash(inputs: (string | number)[]): string {
  if (!poseidonHashFn) {
    throw new Error("Poseidon not initialized");
  }
  try {
    // Convert inputs to BigInt field elements
    const bigIntInputs = inputs.map((input: string | number) => {
      if (typeof input === "string" && input.startsWith("0x")) {
        return BigInt(input);
      }
      return BigInt(input.toString());
    });
    const hash = poseidonHashFn(bigIntInputs);
    return poseidonHashFn.F.toString(hash);
  } catch (error: any) {
    console.error("Failed to compute Poseidon hash:", error.message);
    throw error;
  }
}

// Initialize proof system
async function initializeProofSystem(): Promise<void> {
  try {
    console.log("🔄 Initializing proof system...");

    if (!fs.existsSync(COMPILED_CIRCUIT_PATH)) {
      throw new Error(
        `Compiled circuit not found at: ${COMPILED_CIRCUIT_PATH}`
      );
    }

    const circuitData = fs.readFileSync(COMPILED_CIRCUIT_PATH, "utf8");
    circuit = JSON.parse(circuitData);

    noir = new Noir(circuit);
    backend = new UltraHonkBackend(circuit.bytecode);
    poseidonHashFn = await buildPoseidon();

    isInitialized = true;
    console.log("✅ Proof system ready!");

    // Test Redis connection if available
    if (redis) {
      await redis.ping();
      console.log("✅ Redis connection established!");
    }

    // Start batch cleanup timer
    startBatchCleanup();
  } catch (error: any) {
    console.error("❌ Failed to initialize proof system:", error.message);
    throw error;
  }
}

// Cache helper functions
async function getCachedWeather(city: string): Promise<WeatherData | null> {
  try {
    if (!redis) {
      return null; // No caching without Redis
    }
    const cached = await redis.get(`weather:${city.toLowerCase()}`);
    return cached as WeatherData | null;
  } catch (error: any) {
    console.error("Redis get error:", error.message);
    return null;
  }
}

async function setCachedWeather(
  city: string,
  data: WeatherData,
  ttl: number = 300
): Promise<void> {
  try {
    if (!redis) {
      return; // No caching without Redis
    }
    await redis.setex(
      `weather:${city.toLowerCase()}`,
      ttl,
      JSON.stringify(data)
    );
  } catch (error: any) {
    console.error("Redis set error:", error.message);
  }
}

async function incrementAPIUsage(userId: string): Promise<number> {
  try {
    if (!redis) {
      return 1; // Return default value without Redis
    }
    const key = `api_usage:${userId}:${new Date().toISOString().split("T")[0]}`;
    const count = await redis.incr(key);
    await redis.expire(key, 86400); // Expire after 24 hours
    return count;
  } catch (error: any) {
    console.error("Redis increment error:", error.message);
    return 1;
  }
}

// Calculate token usage based on response complexity
function calculateTokenUsage(weatherData: WeatherData): number {
  // Simple calculation based on data complexity
  const baseUsage = 20;
  const cityNameLength = weatherData.city.length;
  const conditionsLength = weatherData.conditions.length;
  return baseUsage + cityNameLength + conditionsLength;
}

// Add data to batch for a wallet address
function addToBatch(
  walletAddress: string,
  responseValue: number,
  tokenUsage: number,
  requestId: string
): BatchData {
  const existingBatch = batchStorage.get(walletAddress);

  if (existingBatch) {
    // Append to existing batch
    existingBatch.response_data.push(responseValue);
    existingBatch.individual_usages.push(tokenUsage);
    existingBatch.num_calls += 1;
    existingBatch.total_claimed_usage += tokenUsage;
    existingBatch.requestIds.push(requestId);
    existingBatch.lastUpdated = Date.now();

    console.log(
      `📦 Added to existing batch for ${walletAddress}: call ${existingBatch.num_calls}/${BATCH_SIZE}`
    );
    return existingBatch;
  } else {
    // Create new batch
    const newBatch: BatchData = {
      walletAddress,
      expected_status: "1",
      nonce:
        "0x" +
        Math.floor(Math.random() * 0xffff)
          .toString(16)
          .padStart(4, "0"),
      response_data: [responseValue],
      status_code: "1",
      individual_usages: [tokenUsage],
      num_calls: 1,
      total_claimed_usage: tokenUsage,
      requestIds: [requestId],
      lastUpdated: Date.now(),
    };

    batchStorage.set(walletAddress, newBatch);
    console.log(
      `🆕 Created new batch for ${walletAddress}: call 1/${BATCH_SIZE}`
    );
    return newBatch;
  }
}

// Check if batch is ready for processing
function isBatchReady(batchData: BatchData): boolean {
  return batchData.num_calls >= BATCH_SIZE;
}

function prepareBatchForProof(batchData: BatchData): {
  prepared: PreparedBatchData;
  remainder: BatchData | null;
} {
  const entriesToUse = Math.min(batchData.num_calls, BATCH_SIZE);

  const trimmedResponses = batchData.response_data.slice(0, BATCH_SIZE);
  const trimmedUsages = batchData.individual_usages.slice(0, BATCH_SIZE);
  const trimmedRequestIds = batchData.requestIds.slice(0, BATCH_SIZE);

  if (batchData.num_calls > BATCH_SIZE) {
    console.warn(
      `⚠️ Batch for ${batchData.walletAddress} exceeded circuit size. Trimming to ${BATCH_SIZE} entries.`
    );
  }

  if (trimmedUsages.length < BATCH_SIZE) {
    throw new Error(
      `Batch for ${batchData.walletAddress} does not have enough usage entries. Expected ${BATCH_SIZE}, got ${trimmedUsages.length}.`
    );
  }

  const recalculatedTotal = trimmedUsages
    .slice(0, entriesToUse)
    .reduce((sum, value) => sum + value, 0);

  const prepared: PreparedBatchData = {
    ...batchData,
    response_data: trimmedResponses.slice(0, entriesToUse),
    individual_usages: trimmedUsages.slice(0, entriesToUse),
    requestIds: trimmedRequestIds.slice(0, entriesToUse),
    num_calls: entriesToUse,
    total_claimed_usage: recalculatedTotal,
  };

  const leftoverCount =
    batchData.num_calls > entriesToUse ? batchData.num_calls - entriesToUse : 0;

  let remainder: BatchData | null = null;

  if (leftoverCount > 0) {
    const leftoverUsages = batchData.individual_usages.slice(entriesToUse);
    const leftoverResponses = batchData.response_data.slice(entriesToUse);
    const leftoverRequestIds = batchData.requestIds.slice(entriesToUse);
    remainder = {
      walletAddress: batchData.walletAddress,
      expected_status: batchData.expected_status,
      nonce:
        "0x" +
        Math.floor(Math.random() * 0xffff)
          .toString(16)
          .padStart(4, "0"),
      response_data: leftoverResponses,
      status_code: batchData.status_code,
      individual_usages: leftoverUsages,
      num_calls: leftoverCount,
      total_claimed_usage: leftoverUsages.reduce(
        (sum, value) => sum + value,
        0
      ),
      requestIds: leftoverRequestIds,
      lastUpdated: Date.now(),
    };
  }

  return { prepared, remainder };
}

// Process batch (generate proof and send to payment gateway)
async function processBatch(walletAddress: string): Promise<void> {
  const batchData = batchStorage.get(walletAddress);
  if (!batchData || !isBatchReady(batchData)) {
    return;
  }

  try {
    const batchId = crypto.randomUUID();
    console.log(
      `🔄 Processing batch for wallet ${walletAddress} (ID: ${batchId})`
    );

    const { prepared: preparedBatch, remainder } =
      prepareBatchForProof(batchData);

    // Store the prepared batch so retries reuse the normalized data
    batchStorage.set(walletAddress, {
      ...preparedBatch,
      lastUpdated: Date.now(),
    });

    // Generate ZK proof for the batch
    const proofResult = await generateBatchProof({
      batchData: preparedBatch,
      batchId,
    });

    // Send proof to payment gateway
    await notifyPaymentGateway({
      batchId,
      walletAddress,
      proof: proofResult.proof,
      publicInputs: proofResult.publicInputs,
      endpoint: "/api/weather/batch",
      processingTime: 0, // Will be calculated in payment gateway
      batchData: preparedBatch,
      ...(PAYMENT_PROVIDER_ADDRESS && {
        providerAddress: PAYMENT_PROVIDER_ADDRESS,
      }),
    });

    // Remove processed batch from storage
    if (remainder) {
      batchStorage.set(walletAddress, remainder);
      console.log(
        `♻️  Preserved ${remainder.num_calls} leftover call(s) for wallet ${walletAddress} to form the next batch.`
      );
    } else {
      batchStorage.delete(walletAddress);
      console.log(`✅ Batch processed and removed for wallet ${walletAddress}`);
    }
  } catch (error: any) {
    console.error(
      `❌ Failed to process batch for ${walletAddress}:`,
      error.message
    );
  }
}

// Cleanup old batches that haven't reached batch size
function startBatchCleanup(): void {
  setInterval(() => {
    const now = Date.now();
    const timeout = 10 * 60 * 1000; // 10 minutes

    for (const [walletAddress, batchData] of batchStorage.entries()) {
      if (now - batchData.lastUpdated > timeout) {
        console.log(
          `🧹 Cleaning up stale batch for wallet ${walletAddress} (${batchData.num_calls} calls)`
        );
        batchStorage.delete(walletAddress);
      }
    }
  }, BATCH_CLEANUP_INTERVAL);
}

// Main API endpoint with batching flow
app.get("/api/weather/:city", async (req: Request, res: Response) => {
  if (!isInitialized) {
    return res.status(503).json({ error: "Proof system not initialized" });
  }

  const startTime = Date.now();
  const { city } = req.params;
  const requestId = crypto.randomUUID();
  const walletAddress = req.headers["wallet-address"] as string;

  // Validate required parameters
  if (!city) {
    return res.status(400).json({ error: "City parameter is required" });
  }

  if (!walletAddress) {
    return res.status(400).json({ error: "Wallet address header is required" });
  }

  try {
    console.log(
      `🌤️ Weather API request for ${city} from wallet ${walletAddress} (ID: ${requestId})`
    );

    // Check cache first
    let weatherData = await getCachedWeather(city);
    let fromCache = !!weatherData;

    if (!weatherData) {
      // Generate mock weather data
      const conditions = ["sunny", "cloudy", "rainy"];
      const randomCondition =
        conditions[Math.floor(Math.random() * conditions.length)];

      weatherData = {
        city: city,
        temperature: Math.floor(Math.random() * 30) + 10,
        humidity: Math.floor(Math.random() * 100),
        conditions: randomCondition || "sunny",
      };

      // Cache the result
      await setCachedWeather(city, weatherData);
    }

    // Calculate token usage for this request
    const tokenUsage = calculateTokenUsage(weatherData);

    // Add to batch (use temperature as response value for simplicity)
    const batchData = addToBatch(
      walletAddress,
      weatherData.temperature,
      tokenUsage,
      requestId
    );

    // Check if batch is ready for processing
    if (isBatchReady(batchData)) {
      // Process batch asynchronously (don't wait for completion)
      processBatch(walletAddress).catch((error) => {
        console.error(`Failed to process batch for ${walletAddress}:`, error);
      });
    }

    // Increment API usage
    const dailyUsage = await incrementAPIUsage(walletAddress);

    console.log(
      `✅ Weather API completed for ${city} in ${Date.now() - startTime}ms (${
        fromCache ? "cached" : "fresh"
      })`
    );

    res.json({
      success: true,
      data: weatherData,
      requestId: requestId,
      fromCache,
      dailyUsage,
      tokenUsage,
      batchInfo: {
        walletAddress,
        currentBatchSize: batchData.num_calls,
        maxBatchSize: BATCH_SIZE,
        totalClaimedUsage: batchData.total_claimed_usage,
        batchReady: isBatchReady(batchData),
      },
      metadata: {
        processingTime: Date.now() - startTime,
        walletAddress,
      },
    });
  } catch (error: any) {
    console.error(`❌ Weather API error for ${city}:`, error.message);
    res
      .status(500)
      .json({ error: "API request failed", details: error.message });
  }
});

// Get current batch status for a wallet
app.get("/api/batch-status/:walletAddress", (req: Request, res: Response) => {
  const { walletAddress } = req.params;

  if (!walletAddress) {
    return res
      .status(400)
      .json({ error: "Wallet address parameter is required" });
  }

  const batchData = batchStorage.get(walletAddress);

  if (!batchData) {
    return res.json({
      walletAddress,
      batchExists: false,
      message: "No active batch for this wallet",
    });
  }

  res.json({
    walletAddress,
    batchExists: true,
    expected_status: batchData.expected_status,
    nonce: batchData.nonce,
    response_data: batchData.response_data,
    status_code: batchData.status_code,
    individual_usages: batchData.individual_usages,
    num_calls: batchData.num_calls,
    total_claimed_usage: batchData.total_claimed_usage,
    batchReady: isBatchReady(batchData),
    requestIds: batchData.requestIds,
  });
});

// Force process batch (for testing)
app.post(
  "/api/force-batch/:walletAddress",
  async (req: Request, res: Response) => {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res
        .status(400)
        .json({ error: "Wallet address parameter is required" });
    }

    const batchData = batchStorage.get(walletAddress);

    if (!batchData) {
      return res
        .status(404)
        .json({ error: "No batch found for this wallet address" });
    }

    try {
      await processBatch(walletAddress);
      res.json({
        success: true,
        message: `Batch processed for wallet ${walletAddress}`,
        processedCalls: batchData.num_calls,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: "Failed to process batch", details: error.message });
    }
  }
);

// Health check endpoint
app.get("/health", async (req: Request, res: Response) => {
  try {
    const redisStatus = redis ? await redis.ping() : null;
    res.json({
      status: "healthy",
      proofSystem: isInitialized,
      redis: redisStatus === "PONG",
      redisEnabled: REDIS_ENABLED,
      activeBatches: batchStorage.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// API usage stats endpoint
app.get("/api/usage/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const today = new Date().toISOString().split("T")[0];
    const key = `api_usage:${userId}:${today}`;

    let usage = 0;
    if (redis) {
      usage = (await redis.get(key)) || 0;
    }

    res.json({
      userId,
      date: today,
      requests: Number(usage),
      limit: 1000, // Example limit
      redisEnabled: REDIS_ENABLED,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: "Failed to fetch usage stats", details: error.message });
  }
});

// Generate ZK proof for batch
async function generateBatchProof({
  batchData,
  batchId,
}: GenerateBatchProofParams): Promise<ProofResult> {
  try {
    console.log(`🔄 Generating batch proof for ${batchId}...`);

    // Prepare hash inputs for Poseidon (adjust order based on your circuit)
    const hashInputs = [
      batchData.status_code.toString(),
      batchData.response_data[0]?.toString() || "0",
      batchData.response_data[1]?.toString() || "0",
      batchData.response_data[2]?.toString() || "0",
      batchData.response_data[3]?.toString() || "0",
      batchData.nonce.toString(),
    ];

    // Compute Poseidon hash
    const expectedCommitment = computePoseidonHash(hashInputs);
    console.log("Batch Commitment:", expectedCommitment);

    const inputs: ProofInputs = {
      // response_data: batchData.response_data,
      // status_code: batchData.status_code,
      // nonce: batchData.nonce,
      // expected_commitment: expectedCommitment,
      // expected_status: batchData.expected_status,
      individual_usages: batchData.individual_usages,
      num_calls: batchData.num_calls,
      total_claimed_usage: batchData.total_claimed_usage,
    };

    console.log("Proof Inputs:", inputs);

    const proofStartTime = Date.now();

    // Generate witness and proof
    if (!noir || !backend) {
      throw new Error("Proof system not initialized");
    }

    const { witness } = await noir.execute(inputs);
    console.log("Witness:", witness);
    const proofData = await backend.generateProof(witness, { keccak: true });

    console.log(
      `✅ Batch proof generated for ${batchId} in ${
        Date.now() - proofStartTime
      }ms`
    );

    return {
      proof: Buffer.from(proofData.proof).toString("hex"),
      publicInputs: proofData.publicInputs,
      inputs: inputs,
    };
  } catch (error: any) {
    console.error(
      `❌ Batch proof generation failed for ${batchId}:`,
      error.message
    );
    throw error;
  }
}

// Send batch proof to payment gateway
async function notifyPaymentGateway(paymentData: PaymentData): Promise<void> {
  try {
    const payload: Record<string, any> = {
      batchId: paymentData.batchId,
      walletAddress: paymentData.walletAddress,
      proof: paymentData.proof,
      publicInputs: paymentData.publicInputs,
      endpoint: paymentData.endpoint,
      batchData: {
        num_calls: paymentData.batchData.num_calls,
        total_claimed_usage: paymentData.batchData.total_claimed_usage,
        individual_usages: paymentData.batchData.individual_usages,
        response_data: paymentData.batchData.response_data,
        requestIds: paymentData.batchData.requestIds,
      },
    };

    if (paymentData.providerAddress) {
      payload.providerAddress = paymentData.providerAddress;
    }

    console.log(
      `🚀 Sending batch payment request to gateway ${PAYMENT_GATEWAY_URL}`,
      {
        walletAddress: paymentData.walletAddress,
        batchId: paymentData.batchId,
        providerAddress: paymentData.providerAddress,
        numCalls: paymentData.batchData.num_calls,
        totalUsage: paymentData.batchData.total_claimed_usage,
      }
    );

    const startedAt = Date.now();
    const response = await axios.post(
      `${PAYMENT_GATEWAY_URL}/api/verify-and-pay-batch`,
      payload,
      {
        timeout: Number(process.env.PAYMENT_GATEWAY_TIMEOUT_MS || 15000),
      }
    );

    const duration = Date.now() - startedAt;
    console.log(`✅ Payment gateway responded in ${duration}ms`, {
      status: response.status,
      statusText: response.statusText,
      transactionId: response.data?.transactionId,
      mode: response.data?.mode,
      proofValid: response.data?.proofValid,
      amountUSD: response.data?.amountUSD,
    });
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const statusText = error.response?.statusText;
      const responseData = error.response?.data;
      console.error(`❌ Payment gateway request failed`, {
        walletAddress: paymentData.walletAddress,
        batchId: paymentData.batchId,
        status,
        statusText,
        data: responseData,
        message: error.message,
      });
    } else {
      console.error(`❌ Payment gateway call crashed:`, error);
    }
    // Continue operation even if payment fails
  }
}

const PORT = parseInt(process.env.PORT || "3001", 10);

async function startServer(): Promise<void> {
  try {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 API Provider Server starting on port ${PORT}...`);
    });

    await initializeProofSystem();

    console.log(`🎉 Server ready on port ${PORT}!`);
    console.log(`🔗 Test API: http://localhost:${PORT}/api/weather/london`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
    console.log(`📦 Batch Size: ${BATCH_SIZE} calls per batch`);
  } catch (error: any) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
