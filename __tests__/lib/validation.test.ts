import {
  channelSelectionSchema,
  dateRangeSchema,
  summaryRequestSchema,
  messageFetchSchema,
  envSchema,
  validateEnv,
} from '@/lib/validation';

describe('Validation Schemas', () => {
  describe('channelSelectionSchema', () => {
    it('should validate correct channel selection', () => {
      const data = {
        teamId: 'team-123',
        channelId: 'channel-456',
        channelName: 'General',
      };

      const result = channelSelectionSchema.parse(data);
      expect(result).toEqual(data);
    });

    it('should validate without optional channelName', () => {
      const data = {
        teamId: 'team-123',
        channelId: 'channel-456',
      };

      const result = channelSelectionSchema.parse(data);
      expect(result).toEqual(data);
    });

    it('should reject missing teamId', () => {
      const data = {
        channelId: 'channel-456',
      };

      expect(() => channelSelectionSchema.parse(data)).toThrow();
    });

    it('should reject empty teamId', () => {
      const data = {
        teamId: '',
        channelId: 'channel-456',
      };

      expect(() => channelSelectionSchema.parse(data)).toThrow('Team ID is required');
    });
  });

  describe('dateRangeSchema', () => {
    it('should validate ISO datetime strings', () => {
      const data = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
      };

      const result = dateRangeSchema.parse(data);
      expect(result).toEqual(data);
    });

    it('should validate YYYY-MM-DD date strings', () => {
      const data = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const result = dateRangeSchema.parse(data);
      expect(result).toEqual(data);
    });

    it('should reject invalid date format', () => {
      const data = {
        startDate: '01/01/2024',
        endDate: '01/31/2024',
      };

      expect(() => dateRangeSchema.parse(data)).toThrow();
    });
  });

  describe('summaryRequestSchema', () => {
    it('should validate correct summary request', () => {
      const data = {
        channelId: 'channel-123',
        date: '2024-01-15',
      };

      const result = summaryRequestSchema.parse(data);
      expect(result).toEqual(data);
    });

    it('should reject invalid date format', () => {
      const data = {
        channelId: 'channel-123',
        date: '01-15-2024',
      };

      expect(() => summaryRequestSchema.parse(data)).toThrow(
        'Date must be in YYYY-MM-DD format'
      );
    });

    it('should reject missing channelId', () => {
      const data = {
        date: '2024-01-15',
      };

      expect(() => summaryRequestSchema.parse(data)).toThrow();
    });
  });

  describe('messageFetchSchema', () => {
    it('should validate with optional since parameter', () => {
      const data = {
        channelId: 'channel-123',
        since: '2024-01-01T00:00:00Z',
      };

      const result = messageFetchSchema.parse(data);
      expect(result).toEqual(data);
    });

    it('should validate without since parameter', () => {
      const data = {
        channelId: 'channel-123',
      };

      const result = messageFetchSchema.parse(data);
      expect(result).toEqual(data);
    });

    it('should reject invalid since datetime', () => {
      const data = {
        channelId: 'channel-123',
        since: 'invalid-date',
      };

      expect(() => messageFetchSchema.parse(data)).toThrow();
    });
  });

  describe('envSchema', () => {
    const validEnv = {
      AZURE_AD_CLIENT_ID: 'client-id',
      AZURE_AD_CLIENT_SECRET: 'client-secret',
      AZURE_AD_TENANT_ID: 'tenant-id',
      NEXTAUTH_URL: 'http://localhost:3000',
      NEXTAUTH_SECRET: 'a'.repeat(32),
      OLLAMA_BASE_URL: 'http://localhost:11434',
      OLLAMA_MODEL: 'llama3',
      DATABASE_PATH: './data/app.db',
    };

    it('should validate correct environment variables', () => {
      const result = envSchema.parse(validEnv);
      expect(result).toEqual(validEnv);
    });

    it('should reject missing required variables', () => {
      const { AZURE_AD_CLIENT_ID, ...incomplete } = validEnv;
      expect(() => envSchema.parse(incomplete)).toThrow();
    });

    it('should reject short NextAuth secret', () => {
      const invalidEnv = { ...validEnv, NEXTAUTH_SECRET: 'short' };
      expect(() => envSchema.parse(invalidEnv)).toThrow(
        'NextAuth secret must be at least 32 characters'
      );
    });

    it('should reject invalid URL formats', () => {
      const invalidEnv = { ...validEnv, OLLAMA_BASE_URL: 'not-a-url' };
      expect(() => envSchema.parse(invalidEnv)).toThrow('must be a valid URL');
    });
  });

  describe('validateEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should validate and return env config when all variables are present', () => {
      process.env = {
        ...originalEnv,
        AZURE_AD_CLIENT_ID: 'client-id',
        AZURE_AD_CLIENT_SECRET: 'client-secret',
        AZURE_AD_TENANT_ID: 'tenant-id',
        NEXTAUTH_URL: 'http://localhost:3000',
        NEXTAUTH_SECRET: 'a'.repeat(32),
        OLLAMA_BASE_URL: 'http://localhost:11434',
        OLLAMA_MODEL: 'llama3',
        DATABASE_PATH: './data/app.db',
      };

      const config = validateEnv();
      expect(config.AZURE_AD_CLIENT_ID).toBe('client-id');
      expect(config.OLLAMA_MODEL).toBe('llama3');
    });

    it('should throw detailed error when variables are missing', () => {
      process.env = { ...originalEnv };
      delete process.env.AZURE_AD_CLIENT_ID;

      expect(() => validateEnv()).toThrow('Environment variable validation failed');
    });
  });
});
