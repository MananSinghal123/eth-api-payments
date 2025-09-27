import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';

import { Redis } from '@upstash/redis';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { 
  generateBatchProof, 
  notifyPaymentGateway 
} from '@api-mertering-zk/zk-proof-utils';

// Import proof system utilities
import { 
    initializeProofSystem, 
    getNoir, 
    getBackend, 
    getIsInitialized 
} from './proof-system.js';

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

dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000', // Allow requests only from your client
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Specify the allowed methods
    credentials: true, // Allow cookies and authentication headers
}));

// Configuration
const PAYMENT_GATEWAY_URL = process.env.PAYMENT_GATEWAY_URL || 'http://localhost:3002';
const BATCH_SIZE = 4; // Process batch every 4 calls
const BATCH_CLEANUP_INTERVAL = 1000 * 60 * 10; // 10 minutes cleanup interval

// Initialize Upstash Redis with fallback
let redis: Redis | null = null;
const REDIS_ENABLED = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

if (REDIS_ENABLED) {
    redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
} else {
    console.warn('⚠️ Redis credentials not found. Running without Redis caching.');
}

// In-memory batch storage (in production, use Redis for persistence)
const batchStorage = new Map<string, BatchData>();

// Cache helper functions
async function getCachedWeather(city: string): Promise<WeatherData | null> {
    try {
        if (!redis) {
            return null; // No caching without Redis
        }
        const cached = await redis.get(`weather:${city.toLowerCase()}`);
        return cached as WeatherData | null;
    } catch (error: any) {
        console.error('Redis get error:', error.message);
        return null;
    }
}

async function setCachedWeather(city: string, data: WeatherData, ttl: number = 300): Promise<void> {
    try {
        if (!redis) {
            return; // No caching without Redis
        }
        await redis.setex(`weather:${city.toLowerCase()}`, ttl, JSON.stringify(data));
    } catch (error: any) {
        console.error('Redis set error:', error.message);
    }
}

async function incrementAPIUsage(userId: string): Promise<number> {
    try {
        if (!redis) {
            return 1; // Return default value without Redis
        }
        const key = `api_usage:${userId}:${new Date().toISOString().split('T')[0]}`;
        const count = await redis.incr(key);
        await redis.expire(key, 86400); // Expire after 24 hours
        return count;
    } catch (error: any) {
        console.error('Redis increment error:', error.message);
        return 1;
    }
}

// Calculate token usage based on response complexity - ideally in TEE
function calculateTokenUsage(weatherData: WeatherData): number {
    // Simple calculation based on data complexity
    const baseUsage = 20;
    const cityNameLength = weatherData.city.length;
    const conditionsLength = weatherData.conditions.length;
    return baseUsage + cityNameLength + conditionsLength;
}

// Add data to batch for a wallet address
function addToBatch(walletAddress: string, responseValue: number, tokenUsage: number, requestId: string): BatchData {
    const existingBatch = batchStorage.get(walletAddress);
    
    if (existingBatch) {
        // Append to existing batch
        existingBatch.response_data.push(responseValue);
        existingBatch.individual_usages.push(tokenUsage);
        existingBatch.num_calls += 1;
        existingBatch.total_claimed_usage += tokenUsage;
        existingBatch.requestIds.push(requestId);
        existingBatch.lastUpdated = Date.now();
        
        console.log(`📦 Added to existing batch for ${walletAddress}: call ${existingBatch.num_calls}/${BATCH_SIZE}`);
        return existingBatch;
    } else {
        // Create new batch
        const newBatch: BatchData = {
            walletAddress,
            expected_status: "1",
            nonce: "0x" + Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0'),
            response_data: [responseValue],
            status_code: "1",
            individual_usages: [tokenUsage],
            num_calls: 1,
            total_claimed_usage: tokenUsage,
            requestIds: [requestId],
            lastUpdated: Date.now()
        };
        
        batchStorage.set(walletAddress, newBatch);
        console.log(`🆕 Created new batch for ${walletAddress}: call 1/${BATCH_SIZE}`);
        return newBatch;
    }
}

// Check if batch is ready for processing
function isBatchReady(batchData: BatchData): boolean {
    return batchData.num_calls >= BATCH_SIZE;
}

// Process batch (generate proof and send to payment gateway)
async function processBatch(walletAddress: string): Promise<void> {
    const batchData = batchStorage.get(walletAddress);
    if (!batchData || !isBatchReady(batchData)) {
        return;
    }
    
    try {
        const batchId = crypto.randomUUID();
        console.log(`🔄 Processing batch for wallet ${walletAddress} (ID: ${batchId})`);
        
        // Get the initialized Noir and backend instances
        const noir = getNoir();
        const backend = getBackend();
        
        // Generate ZK proof for the batch
        const proofResult = await generateBatchProof({
            batchData,
            batchId,
            noir,
            backend
        });
        
        // Send proof to payment gateway
        await notifyPaymentGateway({
            batchId,
            walletAddress,
            proof: proofResult.proof,
            publicInputs: proofResult.publicInputs,
            endpoint: '/api/weather/batch',
            processingTime: 0, // Will be calculated in payment gateway
            batchData
        }, PAYMENT_GATEWAY_URL);
        
        // Remove processed batch from storage
        batchStorage.delete(walletAddress);
        console.log(`✅ Batch processed and removed for wallet ${walletAddress}`);
        
    } catch (error: any) {
        console.error(`❌ Failed to process batch for ${walletAddress}:`, error.message);
    }
}

// Cleanup old batches that haven't reached batch size
function startBatchCleanup(): void {
    setInterval(() => {
        const now = Date.now();
        const timeout = 10 * 60 * 1000; // 10 minutes
        
        for (const [walletAddress, batchData] of batchStorage.entries()) {
            if (now - batchData.lastUpdated > timeout) {
                console.log(`🧹 Cleaning up stale batch for wallet ${walletAddress} (${batchData.num_calls} calls)`);
                batchStorage.delete(walletAddress);
            }
        }
    }, BATCH_CLEANUP_INTERVAL);
}

// Main API endpoint with batching flow
app.get('/api/weather/:city', async (req: Request, res: Response) => {
    if (!getIsInitialized()) {
        return res.status(503).json({ error: 'Proof system not initialized' });
    }
    
    const startTime = Date.now();
    const { city } = req.params;
    const requestId = crypto.randomUUID();
    const walletAddress = req.headers['wallet-address'] as string;
    
    // Validate required parameters
    if (!city) {
        return res.status(400).json({ error: 'City parameter is required' });
    }
    
    if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address header is required' });
    }
    
    try {
        console.log(`🌤️ Weather API request for ${city} from wallet ${walletAddress} (ID: ${requestId})`);
        
        // Check cache first
        let weatherData = await getCachedWeather(city);
        let fromCache = !!weatherData;
        
        if (!weatherData) {
            // Generate mock weather data
            const conditions = ['sunny', 'cloudy', 'rainy'];
            const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
            
            weatherData = {
                city: city,
                temperature: Math.floor(Math.random() * 30) + 10,
                humidity: Math.floor(Math.random() * 100),
                conditions: randomCondition || 'sunny'
            };
            
            // Cache the result
            await setCachedWeather(city, weatherData);
        }
        
        // Calculate token usage for this request
        const tokenUsage = calculateTokenUsage(weatherData);
        
        // Add to batch (use temperature as response value for simplicity)
        const batchData = addToBatch(walletAddress, weatherData.temperature, tokenUsage, requestId);
        
        // Check if batch is ready for processing
        if (isBatchReady(batchData)) {
            // Process batch asynchronously (don't wait for completion)
            processBatch(walletAddress).catch(error => {
                console.error(`Failed to process batch for ${walletAddress}:`, error);
            });
        }
        
        // Increment API usage
        const dailyUsage = await incrementAPIUsage(walletAddress);
        
        console.log(`✅ Weather API completed for ${city} in ${Date.now() - startTime}ms (${fromCache ? 'cached' : 'fresh'})`);
        
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
                batchReady: isBatchReady(batchData)
            },
            metadata: {
                processingTime: Date.now() - startTime,
                walletAddress
            }
        });
        
    } catch (error: any) {
        console.error(`❌ Weather API error for ${city}:`, error.message);
        res.status(500).json({ error: 'API request failed', details: error.message });
    }
});

// Health check endpoint for container orchestration
app.get('/health', (req: Request, res: Response) => {
    const healthCheck = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now(),
        proofSystemInitialized: getIsInitialized(),
        redisAvailable: REDIS_ENABLED
    };
    
    if (!getIsInitialized()) {
        return res.status(503).json({
            ...healthCheck,
            message: 'Service Unavailable - Proof system not initialized'
        });
    }
    
    res.status(200).json(healthCheck);
});

const PORT = parseInt(process.env.PORT || '3001', 10);

async function startServer(): Promise<void> {
    try {
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 API Provider Server starting on port ${PORT}...`);
        });
        
        await initializeProofSystem();
        
        // Test Redis connection if available
        if (redis) {
            await redis.ping();
            console.log('✅ Redis connection established!');
        }
        
        // Start batch cleanup timer
        startBatchCleanup();
        
        console.log(`🎉 Server ready on port ${PORT}!`);
        console.log(`🔗 Test API: http://localhost:${PORT}/api/weather/london`);
        console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
        console.log(`📦 Batch Size: ${BATCH_SIZE} calls per batch`);
        
    } catch (error: any) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

startServer();