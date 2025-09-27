require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ethers } = require("ethers");

// Import bb.js for verification
const { UltraHonkBackend } = require("@aztec/bb.js");

const app = express();
app.use(express.json());

// Configuration
const CIRCUIT_PATH = "../noir/api_metering";
const COMPILED_CIRCUIT_PATH = path.join(
  CIRCUIT_PATH,
  "target",
  "api_metering.json"
);

// Web3 Configuration
const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
const PRIVATE_KEY = process.env.PRIVATE_KEY; // Backend wallet private key
const ESCROW_ADDRESS = process.env.ESCROW_ADDRESS;
const PYUSD_ADDRESS = process.env.PYUSD_ADDRESS;

// Contract ABIs
const ESCROW_ABI = [
  {
    type: "function",
    name: "getUserBalance",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getProviderBalance",
    inputs: [{ name: "provider", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "processBatchPayment",
    inputs: [
      { name: "user", type: "address" },
      { name: "provider", type: "address" },
      { name: "amountCents", type: "uint256" },
      { name: "numCalls", type: "uint256" },
      { name: "proof", type: "bytes" },
      { name: "publicInputs", type: "uint256[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
];

// Simple in-memory storage
let backend = null;
let isInitialized = false;
let provider = null;
let wallet = null;
let escrowContract = null;
const transactions = new Map(); // transactionId -> transaction details

// Initialize the verification system
async function initializeSystem() {
  try {
    console.log("🔄 Initializing Payment Gateway...");

    // Initialize blockchain connection if addresses provided
    if (ESCROW_ADDRESS && PYUSD_ADDRESS && PRIVATE_KEY) {
      provider = new ethers.JsonRpcProvider(RPC_URL);
      wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      escrowContract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet);

      console.log(`📡 Connected to blockchain at ${RPC_URL}`);
      console.log(`🔐 Backend wallet: ${wallet.address}`);
      console.log(`📋 Escrow contract: ${ESCROW_ADDRESS}`);
      console.log(`💰 PYUSD contract: ${PYUSD_ADDRESS}`);

      // Test connection
      const blockNumber = await provider.getBlockNumber();
      console.log(`📊 Current block number: ${blockNumber}`);
    } else {
      console.log(
        "⚠️  Missing configuration (PRIVATE_KEY, ESCROW_ADDRESS, PYUSD_ADDRESS), running in demo mode"
      );
    }

    // Check if circuit exists
    if (!fs.existsSync(COMPILED_CIRCUIT_PATH)) {
      throw new Error(`Circuit not found at: ${COMPILED_CIRCUIT_PATH}`);
    }

    // Load circuit
    const circuitData = fs.readFileSync(COMPILED_CIRCUIT_PATH, "utf8");
    const circuit = JSON.parse(circuitData);

    // Initialize backend for verification
    backend = new UltraHonkBackend(circuit.bytecode);

    isInitialized = true;
    console.log("✅ Payment Gateway ready!");
  } catch (error) {
    console.error("❌ Initialization failed:", error.message);
    throw error;
  }
}

function extractRevertReason(error) {
  if (!error) return "Unknown error";

  if (error.reason) return error.reason;

  if (error.shortMessage) return error.shortMessage;

  if (error.error && error.error.message) {
    return error.error.message;
  }

  if (typeof error.message === "string") {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch (_) {
    return "Unparseable error";
  }
}

// Main endpoint: Verify proof and return verification result
app.post("/api/verify-and-pay-batch", async (req, res) => {
  if (!isInitialized) {
    return res.status(503).json({ error: "System not initialized" });
  }

  try {
    const {
      batchId,
      walletAddress,
      proof,
      publicInputs,
      endpoint,
      batchData,
      providerAddress,
    } = req.body;

    console.log(
      `🔄 Processing batch payment for wallet: ${walletAddress}, batch: ${batchId}`
    );
    console.log(
      `📦 Batch contains ${batchData.num_calls} calls with total usage ${batchData.total_claimed_usage}`
    );

    // Validate required fields
    if (!proof || !publicInputs || !batchData || !walletAddress) {
      return res.status(400).json({
        error:
          "Missing required fields: proof, publicInputs, batchData, walletAddress",
      });
    }

    // Validate addresses if provided
    if (walletAddress && !ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: "Invalid wallet address format" });
    }
    if (providerAddress && !ethers.isAddress(providerAddress)) {
      return res.status(400).json({ error: "Invalid provider address format" });
    }

    // Step 1: Verify the batch proof
    console.log("🔍 Verifying batch proof...");
    const verificationResult = await verifyProof(proof, publicInputs);

    if (!verificationResult.valid) {
      console.log("❌ Batch proof verification failed");
      return res.status(400).json({
        success: false,
        error: "Invalid batch proof",
        batchId,
      });
    }

    console.log(
      `✅ Batch proof verified in ${verificationResult.verificationTime}ms`
    );

    // Step 2: Get current balances from blockchain (if available)
    let userBalance = null;
    let providerBalance = null;

    if (escrowContract && walletAddress) {
      try {
        userBalance = await escrowContract.getUserBalance(walletAddress);
        userBalance = Number(userBalance);
        console.log(
          `💰 Current user balance: ${userBalance} cents ($${(
            userBalance / 100
          ).toFixed(2)})`
        );

        if (providerAddress) {
          providerBalance = await escrowContract.getProviderBalance(
            providerAddress
          );
          providerBalance = Number(providerBalance);
          console.log(
            `💼 Current provider balance: ${providerBalance} cents ($${(
              providerBalance / 100
            ).toFixed(2)})`
          );
        }
      } catch (contractError) {
        console.error(
          "⚠️  Failed to fetch blockchain balances:",
          contractError.message
        );
      }
    }

    // Step 3: Calculate payment based on total claimed usage
    const paymentAmount = batchData.total_claimed_usage;
    console.log(
      `💰 Batch payment calculated: ${paymentAmount} cents for ${batchData.num_calls} calls`
    );

    // Step 4: Check if user has sufficient balance (if we have balance info)
    if (userBalance !== null && userBalance < paymentAmount) {
      return res.status(402).json({
        success: false,
        error: "Insufficient balance",
        required: paymentAmount,
        available: userBalance,
        requiredUSD: (paymentAmount / 100).toFixed(2),
        availableUSD: (userBalance / 100).toFixed(2),
        batchId,
      });
    }

    // Step 4: Process the actual blockchain transaction
    if (!escrowContract) {
      // Demo mode response
      const transactionId = crypto.randomUUID();
      const transaction = {
        transactionId,
        batchId,
        userId: walletAddress,
        walletAddress,
        providerAddress: providerAddress || null,
        amount: paymentAmount,
        endpoint,
        batchInfo: {
          num_calls: batchData.num_calls,
          individual_usages: batchData.individual_usages,
          requestIds: batchData.requestIds,
        },
        verificationTime: verificationResult.verificationTime,
        timestamp: Date.now(),
        currentUserBalance: null,
        currentProviderBalance: null,
        type: "batch",
        proofVerified: true,
        mode: "demo",
      };

      transactions.set(transactionId, transaction);

      return res.json({
        success: true,
        transactionId,
        message:
          "Demo mode - proof verified but no blockchain transaction processed",
        proofValid: true,
        verificationTime: verificationResult.verificationTime,
        batchInfo: {
          num_calls: batchData.num_calls,
          total_usage: batchData.total_claimed_usage,
          individual_usages: batchData.individual_usages,
        },
      });
    }

    // Real blockchain transaction processing
    console.log("💳 Processing payment on blockchain...");

    try {
      const proofBytesLike =
        typeof proof === "string"
          ? proof.startsWith("0x")
            ? proof
            : `0x${proof}`
          : proof;

      const normalizedPublicInputs = (publicInputs || []).map(
        (value, index) => {
          if (typeof value === "bigint") return value;
          if (typeof value === "number") return BigInt(value);
          if (typeof value === "string") {
            try {
              return BigInt(value);
            } catch (err) {
              throw new Error(
                `Invalid public input at index ${index}: ${value}`
              );
            }
          }

          throw new Error(
            `Unsupported public input type at index ${index}: ${typeof value}`
          );
        }
      );

      const proofByteLength =
        typeof proofBytesLike === "string"
          ? proofBytesLike.startsWith("0x")
            ? (proofBytesLike.length - 2) / 2
            : proofBytesLike.length / 2
          : proofBytesLike.length;

      console.log(
        "📤 Sending proof to escrow contract (bytes length):",
        proofByteLength
      );

      console.log(
        "🧮 Normalized public inputs count:",
        normalizedPublicInputs.length
      );

      // Simulate the transaction first to surface revert reasons early
      try {
        const method = escrowContract.getFunction("processBatchPayment");
        await method.staticCall(
          walletAddress,
          providerAddress || wallet.address,
          paymentAmount,
          batchData.num_calls,
          proofBytesLike,
          normalizedPublicInputs,
          {
            gasLimit: 500000,
          }
        );
      } catch (simulationError) {
        const revertReason = extractRevertReason(simulationError);
        console.error(
          "❌ Contract simulation failed (callStatic):",
          revertReason
        );
        throw new Error(`Contract simulation failed: ${revertReason}`);
      }

      const tx = await escrowContract.processBatchPayment(
        walletAddress,
        providerAddress || wallet.address, // Use backend wallet as provider if not specified
        paymentAmount,
        batchData.num_calls,
        proofBytesLike,
        normalizedPublicInputs,
        {
          gasLimit: 500000, // Set appropriate gas limit
        }
      );

      console.log(`⏳ Transaction submitted: ${tx.hash}`);

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

      // Get updated balances
      const newUserBalance = await escrowContract.getUserBalance(walletAddress);
      const newProviderBalance = await escrowContract.getProviderBalance(
        providerAddress || wallet.address
      );

      // Record transaction
      const transactionId = crypto.randomUUID();
      const transaction = {
        transactionId,
        batchId,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        userId: walletAddress,
        walletAddress,
        providerAddress: providerAddress || wallet.address,
        amount: paymentAmount,
        endpoint,
        batchInfo: {
          num_calls: batchData.num_calls,
          individual_usages: batchData.individual_usages,
          requestIds: batchData.requestIds,
        },
        verificationTime: verificationResult.verificationTime,
        timestamp: Date.now(),
        balanceAfter: Number(newUserBalance),
        providerBalanceAfter: Number(newProviderBalance),
        gasUsed: receipt.gasUsed.toString(),
        type: "batch",
        proofVerified: true,
        mode: "blockchain",
      };

      transactions.set(transactionId, transaction);

      console.log(`✅ Batch payment processed successfully`);
      console.log(
        `💳 New user balance: ${(Number(newUserBalance) / 100).toFixed(2)}`
      );
      console.log(
        `💰 New provider balance: ${(Number(newProviderBalance) / 100).toFixed(
          2
        )}`
      );

      // Return success response
      res.json({
        success: true,
        transactionId,
        batchId,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        userId: walletAddress,
        walletAddress,
        providerAddress: providerAddress || wallet.address,
        amount: paymentAmount,
        amountUSD: (paymentAmount / 100).toFixed(2),
        newUserBalance: Number(newUserBalance),
        newUserBalanceUSD: (Number(newUserBalance) / 100).toFixed(2),
        newProviderBalance: Number(newProviderBalance),
        newProviderBalanceUSD: (Number(newProviderBalance) / 100).toFixed(2),
        proofValid: true,
        verificationTime: verificationResult.verificationTime,
        gasUsed: receipt.gasUsed.toString(),
        batchInfo: {
          num_calls: batchData.num_calls,
          total_usage: batchData.total_claimed_usage,
          individual_usages: batchData.individual_usages,
        },
        message: `Batch payment processed successfully for ${batchData.num_calls} API calls`,
      });
    } catch (contractError) {
      console.error("❌ Contract interaction failed:", contractError.message);

      // Check if it's a revert with reason
      let errorMessage = "Contract transaction failed";
      if (contractError.reason) {
        errorMessage = contractError.reason;
      } else if (contractError.message.includes("insufficient funds")) {
        errorMessage = "Insufficient gas or funds for transaction";
      } else {
        errorMessage = extractRevertReason(contractError);
      }

      return res.status(500).json({
        success: false,
        error: errorMessage,
        details: contractError.message,
        batchId,
      });
    }
  } catch (error) {
    console.error("❌ Batch payment processing failed:", error.message);
    res.status(500).json({
      success: false,
      error: "Batch payment processing failed",
      details: error.message,
    });
  }
});

// Verify proof using UltraHonkBackend
async function verifyProof(proofHex, publicInputs) {
  try {
    const startTime = Date.now();

    const normalizedProofHex = proofHex.startsWith("0x")
      ? proofHex.slice(2)
      : proofHex;

    // Convert hex proof to bytes
    const proofBytes = new Uint8Array(Buffer.from(normalizedProofHex, "hex"));

    const proofData = {
      proof: proofBytes,
      publicInputs: publicInputs,
    };

    // Verify proof with keccak for compatibility
    const isValid = await backend.verifyProof(proofData, { keccak: true });
    const verificationTime = Date.now() - startTime;

    return {
      valid: isValid,
      verificationTime,
    };
  } catch (error) {
    console.error("❌ Proof verification error:", error.message);
    return {
      valid: false,
      error: error.message,
    };
  }
}

// Get user balance from blockchain or return message
app.get("/api/balance/:userAddress", async (req, res) => {
  try {
    const { userAddress } = req.params;

    if (!ethers.isAddress(userAddress)) {
      return res.status(400).json({ error: "Invalid address format" });
    }

    if (!escrowContract) {
      return res.json({
        userAddress,
        message:
          "No contract configured - set ESCROW_ADDRESS environment variable",
        balance: null,
        balanceUSD: null,
      });
    }

    const balanceCents = await escrowContract.getUserBalance(userAddress);
    const balance = Number(balanceCents);

    res.json({
      userAddress,
      balance,
      balanceUSD: (balance / 100).toFixed(2),
      balanceFormatted: `$${(balance / 100).toFixed(2)}`,
    });
  } catch (error) {
    console.error("❌ Balance query failed:", error.message);
    res.status(500).json({
      error: "Failed to fetch balance",
      details: error.message,
    });
  }
});

// Get provider balance from blockchain
app.get("/api/provider-balance/:providerAddress", async (req, res) => {
  try {
    const { providerAddress } = req.params;

    if (!ethers.isAddress(providerAddress)) {
      return res.status(400).json({ error: "Invalid address format" });
    }

    if (!escrowContract) {
      return res.json({
        providerAddress,
        message:
          "No contract configured - set ESCROW_ADDRESS environment variable",
        balance: null,
        balanceUSD: null,
      });
    }

    const balanceCents = await escrowContract.getProviderBalance(
      providerAddress
    );
    const balance = Number(balanceCents);

    res.json({
      providerAddress,
      balance,
      balanceUSD: (balance / 100).toFixed(2),
      balanceFormatted: `$${(balance / 100).toFixed(2)}`,
    });
  } catch (error) {
    console.error("❌ Provider balance query failed:", error.message);
    res.status(500).json({
      error: "Failed to fetch provider balance",
      details: error.message,
    });
  }
});

// Get transaction history
app.get("/api/transactions", (req, res) => {
  const allTransactions = Array.from(transactions.values()).sort(
    (a, b) => b.timestamp - a.timestamp
  );
  res.json({
    transactions: allTransactions,
    total: allTransactions.length,
  });
});

// Get specific transaction
app.get("/api/transactions/:transactionId", (req, res) => {
  const { transactionId } = req.params;
  const transaction = transactions.get(transactionId);

  if (!transaction) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  res.json(transaction);
});

// System status endpoint
app.get("/api/status", async (req, res) => {
  try {
    let blockNumber = null;
    let networkName = null;

    if (provider) {
      blockNumber = await provider.getBlockNumber();
      const network = await provider.getNetwork();
      networkName = network.name;
    }

    res.json({
      initialized: isInitialized,
      blockchain: {
        connected: !!provider,
        rpcUrl: RPC_URL,
        networkName,
        currentBlock: blockNumber,
      },
      contracts: {
        escrow: ESCROW_ADDRESS || "Not configured",
        pyusd: PYUSD_ADDRESS || "Not configured",
      },
      transactions: {
        total: transactions.size,
      },
      mode: ESCROW_ADDRESS && PYUSD_ADDRESS ? "blockchain" : "demo",
    });
  } catch (error) {
    res.json({
      initialized: isInitialized,
      error: error.message,
      mode: "error",
    });
  }
});

const PORT = 3002;

async function startServer() {
  try {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Payment Gateway starting on port ${PORT}...`);
    });

    await initializeSystem();

    console.log(`🎉 Payment Gateway ready on port ${PORT}!`);
    console.log("");
    console.log("📋 Available endpoints:");
    console.log(`   POST /api/verify-and-pay-batch    - Verify ZK proofs`);
    console.log(`   GET  /api/balance/:userAddress     - Check user balance`);
    console.log(
      `   GET  /api/provider-balance/:addr   - Check provider balance`
    );
    console.log(
      `   GET  /api/transactions            - View transaction history`
    );
    console.log(
      `   GET  /api/transactions/:id        - Get specific transaction`
    );
    console.log(`   GET  /api/status                  - System status`);
    console.log("");
    console.log("🔧 Configuration:");
    console.log(`   RPC URL: ${RPC_URL}`);
    console.log(`   Escrow Contract: ${ESCROW_ADDRESS || "Not set"}`);
    console.log(`   PYUSD Contract: ${PYUSD_ADDRESS || "Not set"}`);
    console.log(`   Backend Wallet: ${wallet?.address || "Not set"}`);
    console.log("");
    if (!ESCROW_ADDRESS || !PYUSD_ADDRESS || !PRIVATE_KEY) {
      console.log(
        "⚠️  Missing configuration - set PRIVATE_KEY, ESCROW_ADDRESS and PYUSD_ADDRESS for full functionality"
      );
      console.log("🧪 Required environment variables:");
      console.log("   PRIVATE_KEY=your_backend_wallet_private_key");
      console.log("   ESCROW_ADDRESS=deployed_escrow_contract_address");
      console.log("   PYUSD_ADDRESS=pyusd_token_contract_address");
      console.log("   RPC_URL=your_rpc_endpoint (optional)");
    }
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
