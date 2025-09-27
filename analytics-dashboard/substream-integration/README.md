# substream-integration/README.md

# Substream Integration Project

This project is designed to facilitate the integration of substream services for Ethereum payments. It provides a structured approach to handle payment events, metrics, and interactions with the substream API and GraphQL services.

## Project Structure

- **src/**: Contains the source code for the integration.
  - **index.ts**: Entry point for the application. Initializes the integration process and configurations.
  - **config/**: Configuration files for the integration.
    - **substream.ts**: Contains API keys, endpoints, and constants for the substream service.
    - **network.ts**: Defines network-related configurations, including network IDs and RPC URLs.
  - **services/**: Contains service classes for handling API interactions.
    - **SubstreamService.ts**: Manages interactions with the substream API, including data fetching and event processing.
    - **GraphQLService.ts**: Handles GraphQL queries and mutations for data interaction.
  - **handlers/**: Contains classes for processing specific events.
    - **PaymentHandler.ts**: Processes payment-related events and triggers actions based on incoming data.
    - **MetricsHandler.ts**: Aggregates and stores metrics data from the integration.
  - **types/**: TypeScript interfaces and types for the integration.
    - **substream.ts**: Defines types related to the substream API.
    - **payment.ts**: Defines types specific to payment data.
    - **index.ts**: Re-exports all types for easy access.
  - **utils/**: Utility functions and helpers for the application.
    - **logger.ts**: Provides logging functionality for consistent message and error logging.
    - **helpers.ts**: Contains common utility functions for data formatting and validation.
  - **generated/**: Contains generated Protocol Buffers definitions for data serialization.
    - **substream_pb.ts**: Protocol Buffers definitions used in the integration.

- **proto/**: Contains Protocol Buffers schema definitions.
  - **eth_payments.proto**: Defines the structure of messages exchanged for Ethereum payments.

- **substreams.yaml**: Configuration settings for the substreams integration.

- **package.json**: npm configuration file listing dependencies and scripts.

- **tsconfig.json**: TypeScript configuration file specifying compiler options.

- **.env.example**: Example environment variables template for the project.

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   cd substream-integration
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.example` template and fill in the required values.

4. Build the project:
   ```
   npm run build
   ```

5. Run the application:
   ```
   npm start
   ```

## Usage Guidelines

- Ensure that the necessary environment variables are set in the `.env` file.
- Use the provided services and handlers to manage payment events and metrics.
- Refer to the individual service and handler files for specific methods and functionalities.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.