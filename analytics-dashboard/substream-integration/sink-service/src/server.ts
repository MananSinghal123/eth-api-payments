import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { EscrowSubstreamConsumer } from "./stream-consumer.js";
import type { StreamMessage, RealTimeStats, EscrowEvent } from "./types.js";

const app = express();
const server = createServer(app);
const PORT = parseInt(process.env.PORT || "3001");
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Initialize the substream consumer
const streamConsumer = new EscrowSubstreamConsumer();

// WebSocket server for real-time data
const wss = new WebSocketServer({ server });
const activeConnections = new Set<any>();

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket connection established');
  activeConnections.add(ws);
  
  // Send current stats immediately
  const currentStats = streamConsumer.getStats();
  const welcomeMessage: StreamMessage = {
    type: 'stats',
    data: currentStats,
    timestamp: Date.now()
  };
  
  ws.send(JSON.stringify(welcomeMessage));
  
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
    activeConnections.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    activeConnections.delete(ws);
  });
});

// Broadcast function for sending data to all connected clients
function broadcast(message: StreamMessage): void {
  const data = JSON.stringify(message);
  activeConnections.forEach((ws) => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(data);
    }
  });
}

// Set up event listeners for the substream consumer
streamConsumer.on('connected', () => {
  console.log('✅ Substream consumer connected');
  broadcast({
    type: 'connected',
    data: { status: 'connected', message: 'Substream consumer is now live' },
    timestamp: Date.now()
  });
});

streamConsumer.on('event', (event: EscrowEvent) => {
  console.log(`📊 New event: ${event.eventType}`);
  broadcast({
    type: 'event',
    data: event,
    timestamp: Date.now()
  });
});

streamConsumer.on('stats', (stats: RealTimeStats) => {
  broadcast({
    type: 'stats',
    data: stats,
    timestamp: Date.now()
  });
});

streamConsumer.on('error', (error: Error) => {
  console.error('❌ Substream consumer error:', error);
  broadcast({
    type: 'error',
    error: error.message || 'Unknown error occurred',
    timestamp: Date.now()
  });
});

streamConsumer.on('disconnected', () => {
  console.log('⚠️ Substream consumer disconnected');
  broadcast({
    type: 'error',
    error: 'Substream consumer disconnected',
    timestamp: Date.now()
  });
});

// REST API endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connections: activeConnections.size
  });
});

app.get('/api/stats', (req, res) => {
  const stats = streamConsumer.getStats();
  res.json({
    success: true,
    data: stats,
    timestamp: Date.now()
  });
});

app.get('/api/events/recent', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const stats = streamConsumer.getStats();
  const recentEvents = stats.recentEvents.slice(0, limit);
  
  res.json({
    success: true,
    data: recentEvents,
    total: stats.recentEvents.length,
    timestamp: Date.now()
  });
});

// Start the servers
async function startServer(): Promise<void> {
  try {
    // Start the substream consumer
    console.log('🚀 Starting substream consumer...');
    await streamConsumer.start();
    
    // Start the HTTP/WebSocket server
    server.listen(PORT, () => {
      console.log(`
🌟 Escrow Analytics Sink Service
📡 HTTP Server: http://localhost:${PORT}
🔌 WebSocket: ws://localhost:${PORT}
🎯 CORS Origin: ${CORS_ORIGIN}
💫 Ready to stream real-time data!
      `);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  streamConsumer.stop();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  streamConsumer.stop();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start the server
startServer().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});