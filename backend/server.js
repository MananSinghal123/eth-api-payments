const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

// Initialize the verification system
async function initializeSystem() {
    try {
        console.log('🔄 Initializing Payment Gateway...');
        
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
        userEscrows.set('demo-user', 10000);  // $100.00
        userEscrows.set('alice', 5000);       // $50.00
        userEscrows.set('bob', 2500);         // $25.00
        
        isInitialized = true;
        console.log('✅ Payment Gateway ready!');
        console.log(`💰 Demo accounts initialized:`);
        for (const [userId, balance] of userEscrows) {
            console.log(`   ${userId}: $${(balance/100).toFixed(2)}`);
        }
        
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
        
        // Validate required fields
        if (!proof || !publicInputs || !batchData) {
            return res.status(400).json({ 
                error: 'Missing required fields: proof, publicInputs, batchData' 
            });
        }
        
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
        
        // Step 3: Check user balance (use walletAddress as userId)
        const userId = walletAddress;
        const userBalance = userEscrows.get(userId) || 0;
        
        if (userBalance < paymentAmount) {
            return res.status(402).json({
                success: false,
                error: 'Insufficient balance',
                required: paymentAmount,
                available: userBalance,
                requiredUSD: (paymentAmount / 100).toFixed(2),
                availableUSD: (userBalance / 100).toFixed(2),
                batchId
            });
        }
        
        // Step 4: Process batch payment
        const transactionId = crypto.randomUUID();
        const newBalance = userBalance - paymentAmount;
        
        // Update user balance
        userEscrows.set(userId, newBalance);
        
        // Record batch transaction
        const transaction = {
            transactionId,
            batchId,
            userId,
            walletAddress,
            amount: paymentAmount,
            endpoint,
            batchInfo: {
                num_calls: batchData.num_calls,
                individual_usages: batchData.individual_usages,
                requestIds: batchData.requestIds
            },
            verificationTime: verificationResult.verificationTime,
            timestamp: Date.now(),
            balanceAfter: newBalance,
            type: 'batch'
        };
        
        transactions.set(transactionId, transaction);
        
        console.log(`✅ Batch payment processed: ${userId} paid ${paymentAmount} cents for ${batchData.num_calls} API calls`);
        console.log(`💳 New balance: $${(newBalance / 100).toFixed(2)}`);
        
        // Return success response
        res.json({
            success: true,
            transactionId,
            batchId,
            userId,
            walletAddress,
            amount: paymentAmount,
            amountUSD: (paymentAmount / 100).toFixed(2),
            newBalance,
            newBalanceUSD: (newBalance / 100).toFixed(2),
            proofValid: true,
            verificationTime: verificationResult.verificationTime,
            batchInfo: {
                num_calls: batchData.num_calls,
                total_usage: batchData.total_claimed_usage,
                individual_usages: batchData.individual_usages
            },
            message: `Batch payment processed successfully for ${batchData.num_calls} API calls`
        });
        
    } catch (error) {
        console.error('❌ Batch payment processing failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Batch payment processing failed',
            details: error.message
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
function calculatePayment(endpoint, processingTime) {
    let price = API_PRICING.basePrice;
    
    // Add processing time cost
    const timePrice = Math.ceil(processingTime / 1000) * API_PRICING.perSecond;
    price += timePrice;
    
    // Apply endpoint-specific multipliers
    if (endpoint && endpoint.includes('premium')) {
        price *= 2;
    } else if (endpoint && endpoint.includes('weather')) {
        price *= 1.0; // Standard rate
    }
    
    return Math.max(price, API_PRICING.minimumPrice);
}

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