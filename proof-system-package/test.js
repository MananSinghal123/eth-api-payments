import { ProofSystem, initializeProofSystem, getIsInitialized } from './src/index.js';

async function testProofSystem() {
  console.log('Testing ProofSystem class...');
  
  try {
    const proofSystem = new ProofSystem();
    await proofSystem.initialize();
    
    console.log('✅ Class-based API works!');
    console.log('Initialized:', proofSystem.getIsInitialized());
  } catch (error) {
    console.log('❌ Class-based API failed:', error.message);
  }
  
  console.log('\nTesting function-based API...');
  
  try {
    await initializeProofSystem();
    console.log('✅ Function-based API works!');
    console.log('Initialized:', getIsInitialized());
  } catch (error) {
    console.log('❌ Function-based API failed:', error.message);
  }
}

testProofSystem();