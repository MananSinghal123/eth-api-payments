import { createLogger, format, transports } from 'winston';

// Create a logger instance with specific settings
const logger = createLogger({
  level: 'info', // Default logging level
  format: format.combine(
    format.timestamp(), // Add timestamp to logs
    format.json() // Format logs as JSON
  ),
  transports: [
    new transports.Console(), // Log to console
    new transports.File({ filename: 'error.log', level: 'error' }), // Log errors to a file
    new transports.File({ filename: 'combined.log' }) // Log all messages to a file
  ],
});

// Export the logger for use in other parts of the application
export default logger;