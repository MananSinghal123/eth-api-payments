#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🔌 Testing WebSocket connection to sink service...');

const ws = new WebSocket('ws://localhost:3007');

ws.on('open', function open() {
  console.log('✅ WebSocket connected successfully!');
});

ws.on('message', function message(data) {
  console.log('📨 Received message:', JSON.parse(data.toString()));
});

ws.on('close', function close() {
  console.log('🔌 WebSocket connection closed');
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
});

// Keep the connection open for a few seconds
setTimeout(() => {
  console.log('🔌 Closing WebSocket connection...');
  ws.close();
  process.exit(0);
}, 5000);