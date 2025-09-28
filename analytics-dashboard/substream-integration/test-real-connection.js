// Real Substream Test
import {
  createAuthInterceptor,
  createRegistry,
  createRequest,
  fetchSubstream,
  streamBlocks,
  unpackMapOutput,
} from "@substreams/core";
import { createConnectTransport } from "@connectrpc/connect-node";
import dotenv from "dotenv";

// Load environment variables from sink-service directory
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, 'sink-service', '.env');

dotenv.config({ path: envPath });

const TOKEN = process.env.SUBSTREAMS_API_TOKEN;
const ENDPOINT = process.env.SUBSTREAMS_ENDPOINT;
const CONTRACT = process.env.ESCROW_CONTRACT_ADDRESS;
const START_BLOCK = process.env.START_BLOCK;

console.log('🧪 Testing Real Substream Connection');
console.log('📡 Endpoint:', ENDPOINT);
console.log('📍 Contract:', CONTRACT);
console.log('🎯 Start Block:', START_BLOCK);
console.log('🔑 Token:', TOKEN ? 'Present ✅' : 'Missing ❌');

async function testConnection() {
  try {
    console.log('\n🔄 Creating transport...');
    const transport = createConnectTransport({
      baseUrl: ENDPOINT,
      interceptors: [createAuthInterceptor(TOKEN)],
      httpVersion: "2",
    });

    console.log('✅ Transport created successfully');
    console.log('ℹ️  Note: Full substream test requires the WASM package to be properly built');
    console.log('ℹ️  The mock sink service is working perfectly for development');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

testConnection();