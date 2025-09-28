const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const util = require('util');
require('dotenv').config();

const app = express();
const execPromise = util.promisify(exec);

// Middleware
app.use(cors());
app.use(express.json());

console.log('🚀 Initializing Payment SDK Backend...');
console.log('💾 Local Storage Bucket:', process.env.AKAVE_BUCKET);
console.log('🏠 Local Storage Node:', process.env.AKAVE_NODE);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        storage: 'local',
        bucket: process.env.AKAVE_BUCKET,
        node: process.env.AKAVE_NODE
    });
});

// Get events with full data from local storage
app.get('/api/events-full', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        console.log('📊 Fetching events from local storage...');
        
        // List files in local bucket
        const listCommand = `akavecli files-streaming list "${process.env.AKAVE_BUCKET}" --node-address=${process.env.AKAVE_NODE}`;
        console.log('🔍 List command:', listCommand);
        
        const { stdout: fileListOutput, stderr } = await execPromise(listCommand);
        
        if (stderr) {
            console.warn('⚠️ List stderr:', stderr);
        }
        
        // Parse file list (each line is a filename)
        const fileLines = fileListOutput.trim().split('\n').filter(line => line.trim());
        const totalFiles = fileLines.length;
        const recentFiles = fileLines.slice(0, parseInt(limit));
        
        console.log(`📁 Found ${totalFiles} files, loading ${recentFiles.length}...`);
        
        const events = [];
        
        // Download each file from local storage
        for (const fileName of recentFiles) {
            if (!fileName.trim()) continue;
            
            try {
                console.log('📥 Loading:', fileName);
                const downloadCommand = `akavecli files-streaming download "${process.env.AKAVE_BUCKET}" "${fileName}" --node-address=${process.env.AKAVE_NODE}`;
                
                const { stdout: eventData } = await execPromise(downloadCommand);
                const event = JSON.parse(eventData);
                events.push(event);
                
            } catch (downloadError) {
                console.error(`⚠️ Failed to load ${fileName}:`, downloadError.message);
            }
        }
        
        // Sort by timestamp (newest first)
        events.sort((a, b) => b.timestamp - a.timestamp);
        
        console.log(`✅ Successfully loaded ${events.length} events from local storage`);
        
        res.json({ 
            events, 
            total: totalFiles,
            loaded: events.length,
            storage: 'local'
        });
        
    } catch (error) {
        console.error('❌ Error fetching events from local storage:', error);
        res.status(500).json({ 
            error: 'Failed to fetch events from local storage',
            details: error.message
        });
    }
});

// Get specific event by ID from local storage
app.get('/api/events/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        const fileName = `contract_event_${eventId}.json`;
        
        console.log('📄 Fetching specific event:', fileName);
        
        const downloadCommand = `akavecli files-streaming download "${process.env.AKAVE_BUCKET}" "${fileName}" --node-address=${process.env.AKAVE_NODE}`;
        const { stdout: eventData } = await execPromise(downloadCommand);
        
        const event = JSON.parse(eventData);
        res.json(event);
        
    } catch (error) {
        console.error('❌ Error fetching specific event:', error);
        res.status(404).json({ error: 'Event not found in local storage' });
    }
});

// Get storage statistics
app.get('/api/stats', async (req, res) => {
    try {
        console.log('📈 Fetching storage statistics...');
        
        const listCommand = `akavecli files-streaming list "${process.env.AKAVE_BUCKET}" --node-address=${process.env.AKAVE_NODE}`;
        const { stdout } = await execPromise(listCommand);
        
        const fileLines = stdout.trim().split('\n').filter(line => line.trim());
        
        // Get bucket info if available
        let bucketInfo = {};
        try {
            const infoCommand = `akavecli files-streaming info "${process.env.AKAVE_BUCKET}" --node-address=${process.env.AKAVE_NODE}`;
            const { stdout: infoOutput } = await execPromise(infoCommand);
            console.log('📊 Bucket info:', infoOutput);
        } catch (infoError) {
            // Info command might not be available, ignore
        }
        
        const stats = {
            totalEvents: fileLines.length,
            bucketName: process.env.AKAVE_BUCKET,
            storageProvider: 'Local Storage',
            storageLocation: '/tmp/akave-local-storage',
            lastUpdated: new Date().toISOString(),
            ...bucketInfo
        };
        
        console.log('📊 Stats:', stats);
        res.json(stats);
        
    } catch (error) {
        console.error('❌ Error fetching storage stats:', error);
        res.status(500).json({ 
            error: 'Failed to fetch storage statistics',
            details: error.message
        });
    }
});

// List all files endpoint
app.get('/api/files', async (req, res) => {
    try {
        const listCommand = `akavecli files-streaming list "${process.env.AKAVE_BUCKET}" --node-address=${process.env.AKAVE_NODE}`;
        const { stdout } = await execPromise(listCommand);
        
        const files = stdout.trim().split('\n').filter(line => line.trim());
        
        res.json({
            files: files,
            count: files.length,
            bucket: process.env.AKAVE_BUCKET
        });
        
    } catch (error) {
        console.error('❌ Error listing files:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log('🚀 Payment SDK Backend STARTED!');
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`💾 Using LOCAL storage system`);
    console.log(`📦 Bucket: ${process.env.AKAVE_BUCKET}`);
    console.log('');
    console.log('📊 API endpoints:');
    console.log(`   • GET /health - Health check`);
    console.log(`   • GET /api/events-full - Get events with data`);
    console.log(`   • GET /api/events/:id - Get specific event`);
    console.log(`   • GET /api/stats - Get storage statistics`);
    console.log(`   • GET /api/files - List all files`);
    console.log('');
    console.log('🔥 Ready to serve contract events from local storage!');
    console.log('🌐 CORS enabled for frontend at http://localhost:3000');
});
