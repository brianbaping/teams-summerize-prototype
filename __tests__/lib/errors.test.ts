import {
  AppError,
  GraphAPIError,
  OllamaError,
  DatabaseError,
  ValidationError,
  AuthenticationError,
  isRetriableError,
} from '@/lib/errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with all properties', () => {
      const error = new AppError('Test error', 'TEST_CODE', 500, {
        extra: 'data',
      });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ extra: 'data' });
      expect(error.name).toBe('AppError');
    });

    it('should serialize to JSON correctly', () => {
      const error = new AppError('Test error', 'TEST_CODE', 500);
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'AppError',
        message: 'Test error',
        code: 'TEST_CODE',
        statusCode: 500,
        details: undefined,
      });
    });
  });

  describe('GraphAPIError', () => {
    it('should create with correct defaults', () => {
      const error = new GraphAPIError('Graph API failed');

      expect(error.message).toBe('Graph API failed');
      expect(error.code).toBe('GRAPH_API_ERROR');
      expect(error.statusCode).toBe(502);
      expect(error.name).toBe('GraphAPIError');
    });

    it('should include details', () => {
      const details = { statusCode: 429, endpoint: '/messages' };
      const error = new GraphAPIError('Rate limited', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('OllamaError', () => {
    it('should create with correct defaults', () => {
      const error = new OllamaError('Ollama connection failed');

      expect(error.message).toBe('Ollama connection failed');
      expect(error.code).toBe('OLLAMA_ERROR');
      expect(error.statusCode).toBe(503);
      expect(error.name).toBe('OllamaError');
    });
  });

  describe('DatabaseError', () => {
    it('should create with correct defaults', () => {
      const error = new DatabaseError('Query failed');

      expect(error.message).toBe('Query failed');
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('DatabaseError');
    });
  });

  describe('ValidationError', () => {
    it('should create with correct defaults', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('AuthenticationError', () => {
    it('should create with correct defaults', () => {
      const error = new AuthenticationError('Not authenticated');

      expect(error.message).toBe('Not authenticated');
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthenticationError');
    });
  });

  describe('isRetriableError', () => {
    it('should return true for Graph API rate limit', () => {
      const error = new GraphAPIError('Rate limited', { statusCode: 429 });
      expect(isRetriableError(error)).toBe(true);
    });

    it('should return true for Graph API server errors', () => {
      const error500 = new GraphAPIError('Server error', { statusCode: 500 });
      const error503 = new GraphAPIError('Unavailable', { statusCode: 503 });

      expect(isRetriableError(error500)).toBe(true);
      expect(isRetriableError(error503)).toBe(true);
    });

    it('should return false for Graph API client errors', () => {
      const error = new GraphAPIError('Bad request', { statusCode: 400 });
      expect(isRetriableError(error)).toBe(false);
    });

    it('should return true for Ollama timeout errors', () => {
      const error = new OllamaError('Request timeout');
      expect(isRetriableError(error)).toBe(true);
    });

    it('should return true for Ollama connection errors', () => {
      const error = new OllamaError('ECONNREFUSED');
      expect(isRetriableError(error)).toBe(true);
    });

    it('should return false for non-retriable errors', () => {
      const error = new DatabaseError('Query failed');
      expect(isRetriableError(error)).toBe(false);
    });
  });
});
