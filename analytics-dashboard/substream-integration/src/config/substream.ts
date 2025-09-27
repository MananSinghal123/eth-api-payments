import { config } from 'dotenv';

// Load environment variables from .env file
config();

const SUBSTREAM_API_URL = process.env.SUBSTREAM_API_URL || 'https://api.example.com/substream';
const API_KEY = process.env.API_KEY || 'your-api-key';
const TIMEOUT = parseInt(process.env.TIMEOUT || '5000', 10); // Default timeout of 5000ms

// Configuration object for substream integration
const substreamConfig = {
  apiUrl: SUBSTREAM_API_URL,
  apiKey: API_KEY,
  timeout: TIMEOUT,
};

export default substreamConfig;