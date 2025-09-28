const { ethers } = require('ethers');
const { exec } = require('child_process');
const fs = require('fs').promises;
require('dotenv').config();

class PaymentEventListener {
    constructor() {
        console.log('🔧 Initializing Payment Event Listener...');
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        this.eventCount = 0;
    }

    async startListening() {
        console.log('🎯 Starting Payment Event Listener...');
        console.log('🌐 RPC URL:', process.env.RPC_URL);
        console.log('📦 Contract Address:', process.env.CONTRACT_ADDRESS);
        console.log('💾 Local Storage Bucket:', process.env.AKAVE_BUCKET);
        
        // Setup local storage bucket
        await this.setupLocalBucket();
        
        // Listen to ALL events from your specific contract
        const contractFilter = {
            address: process.env.CONTRACT_ADDRESS
        };

        this.provider.on(contractFilter, async (log) => {
            await this.handleContractEvent(log);
        });

        console.log('✅ Event listener ACTIVE!');
        console.log('🎯 Monitoring contract:', process.env.CONTRACT_ADDRESS);
        console.log('💾 Storing events locally');
        console.log('🔍 Waiting for contract events...');
    }

    async setupLocalBucket() {
        try {
            console.log('🏠 Setting up local storage bucket...');
            const createCommand = `akavecli bucket create "${process.env.AKAVE_BUCKET}" --node-address=${process.env.AKAVE_NODE}`;
            
            exec(createCommand, (error, stdout, stderr) => {
                if (error && !error.message.includes('already exists')) {
                    console.error('❌ Local bucket creation failed:', error.message);
                } else {
                    console.log('✅ Local storage bucket ready!');
                    if (stdout) console.log('📦', stdout.trim());
                }
            });
        } catch (error) {
            console.error('💥 Bucket setup error:', error);
        }
    }

    async handleContractEvent(log) {
        try {
            this.eventCount++;
            
            console.log('\n📥 CONTRACT EVENT DETECTED!');
            console.log('   Event #:', this.eventCount);
            console.log('   Contract:', log.address);
            console.log('   Transaction:', log.transactionHash);
            console.log('   Block:', log.blockNumber);
            console.log('   Topics:', log.topics.length, 'topic(s)');
            
            // Get transaction details for richer data
            let tx, receipt;
            try {
                [tx, receipt] = await Promise.all([
                    this.provider.getTransaction(log.transactionHash),
                    this.provider.getTransactionReceipt(log.transactionHash)
                ]);
            } catch (fetchError) {
                console.warn('⚠️ Could not fetch transaction details:', fetchError.message);
            }
            
            const eventData = {
                id: `${log.transactionHash}_${log.logIndex}`,
                eventNumber: this.eventCount,
                
                // Core Event Data
                contractAddress: log.address,
                topics: log.topics,
                data: log.data,
                
                // Block Information
                blockNumber: log.blockNumber,
                blockHash: log.blockHash,
                transactionIndex: log.transactionIndex,
                logIndex: log.logIndex,
                
                // Transaction Information
                transactionHash: log.transactionHash,
                from: tx?.from || 'unknown',
                to: tx?.to || log.address,
                value: tx?.value?.toString() || '0',
                gasUsed: receipt?.gasUsed?.toString() || 'unknown',
                gasPrice: tx?.gasPrice?.toString() || 'unknown',
                
                // Metadata
                timestamp: Date.now(),
                savedAt: new Date().toISOString(),
                network: 'sepolia',
                source: 'real_contract_event'
            };

            // Try to identify event type from topics
            if (log.topics.length > 0) {
                const eventSig = log.topics[0];
                eventData.eventSignature = eventSig;
                
                // Common event signatures
                const knownEvents = {
                    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': 'Transfer',
                    '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925': 'Approval',
                    // Add your contract's event signatures here
                };
                
                eventData.eventType = knownEvents[eventSig] || 'UnknownEvent';
                console.log('   Type:', eventData.eventType);
            }

            console.log('💾 Saving to local storage...');
            await this.saveToLocalStorage(eventData);
            
        } catch (error) {
            console.error('❌ Error handling contract event:', error);
        }
    }

    async saveToLocalStorage(eventData) {
        try {
            const fileName = `contract_event_${eventData.id}.json`;
            const tempFile = `/tmp/${fileName}`;
            
            // Write event data to temp file
            await fs.writeFile(tempFile, JSON.stringify(eventData, null, 2));
            console.log('📝 Created temp file:', fileName);
            
            // Upload to local storage using akavecli
            const command = `akavecli files-streaming upload "${process.env.AKAVE_BUCKET}" "${tempFile}" --node-address=${process.env.AKAVE_NODE}`;
            
            exec(command, async (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Local storage save failed:', error.message);
                    return;
                }
                
                if (stderr) {
                    console.warn('⚠️ Storage warning:', stderr);
                }
                
                console.log('✅ Event saved to local storage!');
                console.log('📦 Response:', stdout.trim());
                console.log('──────────────────────────────────');
                
                // Cleanup temp file
                try {
                    await fs.unlink(tempFile);
                } catch (cleanupErr) {
                    // Ignore cleanup errors
                }
            });
            
        } catch (error) {
            console.error('💥 Local storage save error:', error);
        }
    }
}

// Start listener if run directly
if (require.main === module) {
    const listener = new PaymentEventListener();
    listener.startListening();
    
    // Show status every minute
    setInterval(() => {
        console.log(`\n💓 Listener Status: ${listener.eventCount} events captured`);
        console.log(`🕒 Time: ${new Date().toLocaleTimeString()}`);
    }, 60000);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n👋 Shutting down event listener...');
        console.log(`📊 Total events captured: ${listener.eventCount}`);
        console.log('💾 All events saved to local storage');
        process.exit(0);
    });
}

module.exports = PaymentEventListener;
