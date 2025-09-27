import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = err.details || err.message;
  } else if (err.name === 'UnauthorizedError' || err.message.includes('unauthorized')) {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.name === 'ForbiddenError' || err.message.includes('forbidden')) {
    statusCode = 403;
    message = 'Forbidden';
  } else if (err.name === 'NotFoundError' || err.message.includes('not found')) {
    statusCode = 404;
    message = 'Not Found';
  } else if (err.name === 'TimeoutError') {
    statusCode = 408;
    message = 'Request Timeout';
  } else if (err.name === 'GraphQLError') {
    statusCode = 502;
    message = 'Graph Service Error';
    details = 'Unable to fetch data from The Graph';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service Unavailable';
    details = 'Unable to connect to external service';
  } else if (err.code === 'ETIMEDOUT') {
    statusCode = 504;
    message = 'Gateway Timeout';
    details = 'External service request timed out';
  }

  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const errorResponse = {
    success: false,
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      requestId: req.id || generateRequestId()
    }
  };

  // Add additional details in development or for specific error types
  if (isDevelopment || details) {
    errorResponse.error.details = details || (isDevelopment ? err.message : undefined);
  }

  // Add stack trace only in development
  if (isDevelopment) {
    errorResponse.error.stack = err.stack;
  }

  // Set appropriate headers
  res.set({
    'Content-Type': 'application/json',
    'X-Error-Type': err.name || 'UnknownError'
  });

  res.status(statusCode).json(errorResponse);
}

// 404 handler for undefined routes
export function notFoundHandler(req, res) {
  const errorResponse = {
    success: false,
    error: {
      message: 'Endpoint Not Found',
      statusCode: 404,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
      suggestion: 'Check the API documentation for valid endpoints'
    }
  };

  logger.warn('404 - Route not found:', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(404).json(errorResponse);
}

// Async error handler wrapper
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Request validation error handler
export function validationErrorHandler(error, req, res, next) {
  if (error.isJoi) {
    const errorResponse = {
      success: false,
      error: {
        message: 'Validation Error',
        statusCode: 400,
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        })),
        timestamp: new Date().toISOString()
      }
    };

    logger.warn('Validation error:', {
      errors: errorResponse.error.details,
      url: req.url,
      method: req.method,
      body: req.body,
      query: req.query
    });

    return res.status(400).json(errorResponse);
  }

  next(error);
}

// Helper function to generate request ID
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Custom error classes
export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class NotFoundError extends Error {
  constructor(resource = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Access forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ServiceUnavailableError extends Error {
  constructor(service = 'External service') {
    super(`${service} is currently unavailable`);
    this.name = 'ServiceUnavailableError';
  }
}

export class TimeoutError extends Error {
  constructor(operation = 'Operation') {
    super(`${operation} timed out`);
    this.name = 'TimeoutError';
  }
}