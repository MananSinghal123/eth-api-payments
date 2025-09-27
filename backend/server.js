require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ethers } = require('ethers'); // Add this import
// Import bb.js for verification
const { UltraHonkBackend } = require('@aztec/bb.js');

const app = express();
app.use(express.json());

// Configuration
const CIRCUIT_PATH = '../noir/api_metering';
const COMPILED_CIRCUIT_PATH = path.join(CIRCUIT_PATH, 'target', 'api_metering.json');

// Simple in-memory storage
let backend = null;
let isInitialized = false;
const userEscrows = new Map(); // userId -> balance in cents
const transactions = new Map(); // transactionId -> transaction details

// Pricing configuration
const API_PRICING = {
    basePrice: 5,        // 5 cents base price
    perSecond: 1,        // 1 cent per second of processing
    minimumPrice: 3      // Minimum 3 cents
};

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

let provider = null;
let wallet = null;
let escrowContract = null;

// Initialize the verification system
async function initializeSystem() {
    try {
        console.log('🔄 Initializing Payment Gateway...');
        
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
        const circuitData = fs.readFileSync(COMPILED_CIRCUIT_PATH, 'utf8');
        const circuit = JSON.parse(circuitData);
        
        // Initialize backend for verification
        backend = new UltraHonkBackend(circuit.bytecode);
        
        // Setup demo user accounts
        // userEscrows.set('demo-user', 10000);  // $100.00
        // userEscrows.set('alice', 5000);       // $50.00
        // userEscrows.set('bob', 2500);         // $25.00
        
        isInitialized = true;
        // console.log('✅ Payment Gateway ready!');
        // console.log(`💰 Demo accounts initialized:`);
        // for (const [userId, balance] of userEscrows) {
        //     console.log(`   ${userId}: $${(balance/100).toFixed(2)}`);
        // }
        
    } catch (error) {
        console.error('❌ Initialization failed:', error.message);
        throw error;
    }
}

// Main endpoint: Verify proof and process payment
app.post('/api/verify-and-pay-batch', async (req, res) => {
    if (!isInitialized) {
        return res.status(503).json({ error: 'System not initialized' });
    }
    
    try {
        const {
            batchId,
            walletAddress,
            proof,
            publicInputs,
            endpoint,
            batchData
        } = req.body;
        
        console.log(`🔄 Processing batch payment for wallet: ${walletAddress}, batch: ${batchId}`);
        console.log(`📦 Batch contains ${batchData.num_calls} calls with total usage ${batchData.total_claimed_usage}`);
        
        // Step 1: Verify the batch proof
        console.log('🔍 Verifying batch proof...');
        const verificationResult = await verifyProof(proof, publicInputs);
        
        if (!verificationResult.valid) {
            console.log('❌ Batch proof verification failed');
            return res.status(400).json({
                success: false,
                error: 'Invalid batch proof',
                batchId
            });
        }
        
        console.log(`✅ Batch proof verified in ${verificationResult.verificationTime}ms`);
        
        // Step 2: Calculate payment based on total claimed usage
        const paymentAmount = batchData.total_claimed_usage;
        console.log(`💰 Batch payment calculated: ${paymentAmount} cents for ${batchData.num_calls} calls`);
        
        // Step 3: Call processBatchPayment in smart contract
        if (escrowContract && ESCROW_ADDRESS) {
            try {
                console.log('🔗 Calling processBatchPayment on smart contract...');
                
                const tx = await escrowContract.processBatchPayment(
                    walletAddress,           // user address
                    "0x5bfe1b43CdAEf75Fd2705545EE4d6A7c12440f9d",          // provider address (backend wallet)
                    paymentAmount,           // amountCents
                    batchData.num_calls,     // numCalls
                    '0x' + proof,           // proof (ensure hex prefix)
                    publicInputs            // publicInputs array
                );
                
                console.log(`📝 Transaction submitted: ${tx.hash}`);
                console.log('⏳ Waiting for confirmation...');
                
                // Wait for transaction confirmation
                const receipt = await tx.wait();
                console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
                console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
                
                // Generate transaction record
                const transactionId = crypto.randomBytes(16).toString('hex');
                transactions.set(transactionId, {
                    id: transactionId,
                    batchId,
                    user: walletAddress,
                    provider: wallet.address,
                    amount: paymentAmount,
                    numCalls: batchData.num_calls,
                    txHash: tx.hash,
                    blockNumber: receipt.blockNumber,
                    gasUsed: receipt.gasUsed.toString(),
                    timestamp: new Date().toISOString(),
                    status: 'confirmed'
                });
                
                console.log(`✅ Batch payment completed: ${walletAddress} paid ${paymentAmount} cents for ${batchData.num_calls} API calls`);
                
                // Return success response with blockchain details
                res.json({
                    success: true,
                    message: `Batch payment processed successfully for ${batchData.num_calls} API calls via blockchain`,
                    transaction: {
                        id: transactionId,
                        txHash: tx.hash,
                        blockNumber: receipt.blockNumber,
                        gasUsed: receipt.gasUsed.toString(),
                        amount: paymentAmount,
                        numCalls: batchData.num_calls
                    },
                    batchId
                });
                
            } catch (contractError) {
                console.error('❌ Smart contract call failed:', contractError.message);
                
                // Handle specific contract errors
                let errorMessage = 'Blockchain payment failed';
                if (contractError.message.includes('Insufficient user balance')) {
                    errorMessage = 'Insufficient balance in escrow contract';
                } else if (contractError.message.includes('Invalid payment amount')) {
                    errorMessage = 'Invalid payment amount';
                } else if (contractError.message.includes('Invalid provider address')) {
                    errorMessage = 'Invalid provider address';
                }
                
                return res.status(400).json({
                    success: false,
                    error: errorMessage,
                    details: contractError.message,
                    batchId
                });
            }
        } else {
            // Fallback for demo mode (no blockchain connection)
            console.log('⚠️  Demo mode: Simulating blockchain payment...');
            
            const transactionId = crypto.randomBytes(16).toString('hex');
            transactions.set(transactionId, {
                id: transactionId,
                batchId,
                user: walletAddress,
                provider: 'demo-provider',
                amount: paymentAmount,
                numCalls: batchData.num_calls,
                txHash: 'demo-' + transactionId,
                timestamp: new Date().toISOString(),
                status: 'demo'
            });
            
            res.json({
                success: true,
                message: `Batch payment processed successfully for ${batchData.num_calls} API calls (demo mode)`,
                transaction: {
                    id: transactionId,
                    amount: paymentAmount,
                    numCalls: batchData.num_calls
                },
                batchId
            });
        }
        
    } catch (error) {
        console.error('❌ Batch payment processing failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Batch payment processing failed',
            details: error.message,
            batchId: req.body.batchId
        });
    }
});



// Verify proof using UltraHonkBackend
async function verifyProof(proofHex, publicInputs) {
    try {
        const startTime = Date.now();
        
        // Convert hex proof to bytes
        const proofBytes = new Uint8Array(Buffer.from(proofHex, 'hex'));
        
        const proofData = {
            proof: proofBytes,
            publicInputs: publicInputs
        };
        
        // Verify proof with keccak for compatibility
        const isValid = await backend.verifyProof(proofData, { keccak: true });
        const verificationTime = Date.now() - startTime;
        
        return {
            valid: isValid,
            verificationTime
        };
        
    } catch (error) {
        console.error('❌ Proof verification error:', error.message);
        return {
            valid: false,
            error: error.message
        };
    }
}

// Simple payment calculation
// function calculatePayment(endpoint, processingTime) {
//     let price = API_PRICING.basePrice;
    
//     // Add processing time cost
//     const timePrice = Math.ceil(processingTime / 1000) * API_PRICING.perSecond;
//     price += timePrice;
    
//     // Apply endpoint-specific multipliers
//     if (endpoint && endpoint.includes('premium')) {
//         price *= 2;
//     } else if (endpoint && endpoint.includes('weather')) {
//         price *= 1.0; // Standard rate
//     }
    
//     return Math.max(price, API_PRICING.minimumPrice);
// }

// Get user balance
app.get('/api/balance/:userId', (req, res) => {
    const { userId } = req.params;
    const balance = userEscrows.get(userId) || 0;
    
    res.json({
        userId,
        balance,
        balanceUSD: (balance / 100).toFixed(2),
        exists: userEscrows.has(userId)
    });
});



const PORT = 3002;

async function startServer() {
    try {
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Simplified Payment Gateway starting on port ${PORT}...`);
        });
        
        await initializeSystem();
        
        console.log(`🎉 Payment Gateway ready on port ${PORT}!`);
        console.log('');
        console.log('📋 Available endpoints:');
        console.log(`   POST /api/verify-and-pay    - Main endpoint (verify proof + pay)`);
        console.log(`   GET  /api/balance/:userId   - Check user balance`);
        console.log(`   POST /api/add-funds         - Add funds to user account`);
        console.log(`   GET  /api/transactions      - View transaction history`);
        console.log(`   GET  /api/status           - System status`);
        console.log('');
        console.log('🧪 Test with your API provider:');
        console.log('   1. curl http://localhost:3001/api/weather/london');
        console.log('   2. Extract requestId, proof, publicInputs from response');
        console.log('   3. curl -X POST http://localhost:3002/api/verify-and-pay \\');
        console.log('      -H "Content-Type: application/json" \\');
        console.log('      -d \'{"requestId":"...", "proof":"...", "publicInputs":[...]}\'');
        
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

startServer();