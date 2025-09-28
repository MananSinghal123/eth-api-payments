// Simple WebSocket Test for Browser Console
// Copy and paste this into your browser console at http://localhost:3000

console.log('🔌 Testing WebSocket connection to ws://localhost:3001...');

const ws = new WebSocket('ws://localhost:3001');

ws.onopen = function() {
    console.log('✅ WebSocket connected successfully!');
};

ws.onmessage = function(event) {
    try {
        const parsed = JSON.parse(event.data);
        console.log('\n📡 Received message:');
        console.log('Type:', parsed.type);
        console.log('Timestamp:', new Date(parsed.timestamp).toLocaleTimeString());
        
        if (parsed.type === 'stats') {
            console.log('📊 Stats Update:');
            console.log('  - Total Users:', parsed.data.uniqueUsers);
            console.log('  - Total Providers:', parsed.data.uniqueProviders);
            console.log('  - Payment Volume:', (parseInt(parsed.data.totalPaymentVolume) / 100).toFixed(2), 'USD');
            console.log('  - Recent Events:', parsed.data.recentEvents.length);
        } else if (parsed.type === 'event') {
            console.log('🎉 New Event:');
            console.log('  - Type:', parsed.data.eventType);
            console.log('  - Amount:', (parseInt(parsed.data.amountCents) / 100).toFixed(2), 'USD');
            console.log('  - Block:', parsed.data.blockNumber);
            console.log('  - Tx Hash:', parsed.data.transactionHash.slice(0, 12) + '...');
        } else if (parsed.type === 'connected') {
            console.log('🚀 Sink service connected:', parsed.data.message);
        } else if (parsed.type === 'error') {
            console.log('❌ Error:', parsed.error);
        }
    } catch (e) {
        console.error('❌ Failed to parse message:', e.message);
    }
};

ws.onerror = function(err) {
    console.error('❌ WebSocket error:', err);
};

ws.onclose = function() {
    console.log('🔌 WebSocket connection closed');
};

// To stop the test, run: ws.close()