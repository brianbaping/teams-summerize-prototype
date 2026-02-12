/**
 * Custom error classes for better error handling throughout the application
 */

/**
 * Base error class with additional context
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Error for Microsoft Graph API failures
 * Includes token errors, rate limits, and network issues
 */
export class GraphAPIError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'GRAPH_API_ERROR', 502, details);
  }
}

/**
 * Error for Ollama LLM failures
 * Includes connection failures and generation errors
 */
export class OllamaError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'OLLAMA_ERROR', 503, details);
  }
}

/**
 * Error for Claude API failures
 * Includes rate limits, overloads, and generation errors
 */
export class ClaudeAPIError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'CLAUDE_API_ERROR', 503, details);
  }
}

/**
 * Error for database operations
 * Includes constraint violations and query failures
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', 500, details);
  }
}

/**
 * Error for input validation failures
 * Thrown when user input doesn't match expected schema
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

/**
 * Error for authentication failures
 */
export class AuthenticationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
  }
}

/**
 * Check if an error is retriable (for retry logic)
 */
export function isRetriableError(error: any): boolean {
  if (error instanceof GraphAPIError) {
    // Retry on rate limit, server errors
    const status = error.details?.statusCode;
    return status === 429 || status === 500 || status === 503;
  }

  if (error instanceof OllamaError) {
    // Retry on timeout and connection errors
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('connection')
    );
  }

  if (error instanceof ClaudeAPIError) {
    // Retry on rate limit (429), overload (529), server errors (500, 503)
    const status = error.details?.statusCode;
    return status === 429 || status === 529 || status === 500 || status === 503;
  }

  return false;
}
