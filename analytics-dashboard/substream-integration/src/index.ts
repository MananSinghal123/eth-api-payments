// src/index.ts
import { SubstreamService } from './services/SubstreamService';
import { GraphQLService } from './services/GraphQLService';
import { logger } from './utils/logger';
import { substreamConfig } from './config/substream';
import { networkConfig } from './config/network';

async function main() {
  try {
    // Initialize services
    const substreamService = new SubstreamService(substreamConfig);
    const graphQLService = new GraphQLService();

    // Connect to the blockchain network
    await substreamService.connect(networkConfig.rpcUrl);

    // Start the integration process
    await substreamService.startIntegration();

    logger.info('Substream integration started successfully.');
  } catch (error) {
    logger.error('Error starting substream integration:', error);
  }
}

// Execute the main function
main();