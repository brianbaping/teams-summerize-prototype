/**
 * Tests for Claude API integration
 */

import { generateSummary, parseSummaryResponse, getClaudeProvider } from '@/lib/claude';
import { ClaudeAPIError } from '@/lib/errors';
import type { Message } from '@/lib/microsoft-graph';

// Mock the Anthropic SDK
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  }));
});

describe('Claude API Integration', () => {
  const mockMessages: Message[] = [
    {
      id: '1',
      from: { user: { displayName: 'Alice' } },
      body: { content: 'We should deploy on Friday' },
      createdDateTime: '2025-01-15T10:00:00Z',
    },
    {
      id: '2',
      from: { user: { displayName: 'Bob' } },
      body: { content: 'Agreed. I will review the PR today' },
      createdDateTime: '2025-01-15T10:05:00Z',
    },
  ];

  const mockSummaryResponse = `Overview: Team discussed deployment timeline and code review.

Key Decisions: Deploy on Friday

Action Items: @Bob to review PR today

Blockers: None

Resources: None`;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
    process.env.CLAUDE_MODEL = 'claude-sonnet-4-20250514';
  });

  describe('generateSummary', () => {
    it('should generate summary successfully', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: mockSummaryResponse }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const result = await generateSummary(mockMessages, '2025-01-15');

      expect(result).toBe(mockSummaryResponse);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Summarize the following Teams channel conversation'),
          },
        ],
      });
    });

    it('should throw error on empty message list', async () => {
      await expect(generateSummary([], '2025-01-15')).rejects.toThrow(
        'Cannot generate summary from empty message list'
      );
    });

    it('should throw error if API key is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      await expect(generateSummary(mockMessages, '2025-01-15')).rejects.toThrow(
        'ANTHROPIC_API_KEY environment variable is not set'
      );
    });

    it('should retry on rate limit (429)', async () => {
      let attemptCount = 0;

      mockCreate.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          const error: any = new Error('Rate limit exceeded');
          error.status = 429;
          throw error;
        }
        return Promise.resolve({
          content: [{ type: 'text', text: mockSummaryResponse }],
          usage: { input_tokens: 100, output_tokens: 50 },
        });
      });

      const result = await generateSummary(mockMessages, '2025-01-15');

      expect(result).toBe(mockSummaryResponse);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should retry on server error (500)', async () => {
      let attemptCount = 0;

      mockCreate.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          const error: any = new Error('Server error');
          error.status = 500;
          throw error;
        }
        return Promise.resolve({
          content: [{ type: 'text', text: mockSummaryResponse }],
          usage: { input_tokens: 100, output_tokens: 50 },
        });
      });

      const result = await generateSummary(mockMessages, '2025-01-15');

      expect(result).toBe(mockSummaryResponse);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should retry on overload (529)', async () => {
      let attemptCount = 0;

      mockCreate.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          const error: any = new Error('Overloaded');
          error.status = 529;
          throw error;
        }
        return Promise.resolve({
          content: [{ type: 'text', text: mockSummaryResponse }],
          usage: { input_tokens: 100, output_tokens: 50 },
        });
      });

      const result = await generateSummary(mockMessages, '2025-01-15');

      expect(result).toBe(mockSummaryResponse);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries (3 attempts)', async () => {
      mockCreate.mockImplementation(() => {
        const error: any = new Error('Rate limit exceeded');
        error.status = 429;
        throw error;
      });

      await expect(generateSummary(mockMessages, '2025-01-15')).rejects.toThrow(
        'Failed to generate summary after retries'
      );

      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retriable errors', async () => {
      mockCreate.mockImplementation(() => {
        const error: any = new Error('Invalid API key');
        error.status = 401;
        throw error;
      });

      await expect(generateSummary(mockMessages, '2025-01-15')).rejects.toThrow(
        'Failed to generate summary after retries'
      );

      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('parseSummaryResponse', () => {
    it('should parse well-formed summary correctly', () => {
      const result = parseSummaryResponse(mockSummaryResponse);

      expect(result.overview).toBe('Team discussed deployment timeline and code review.');
      expect(result.decisions).toBe('Deploy on Friday');
      expect(result.actionItems).toBe('@Bob to review PR today');
      expect(result.blockers).toBe('None');
      expect(result.resources).toBe('None');
    });

    it('should handle missing sections gracefully', () => {
      const partial = 'Overview: Just an overview';
      const result = parseSummaryResponse(partial);

      expect(result.overview).toBe('Just an overview');
      expect(result.decisions).toBe('');
      expect(result.actionItems).toBe('');
      expect(result.blockers).toBe('');
      expect(result.resources).toBe('');
    });

    it('should extract @mentions from action items', () => {
      const withMentions = `Overview: Test

Key Decisions: None

Action Items:
- @Alice will finish feature X by EOD
- @Bob to review PR #123

Blockers: None

Resources: None`;

      const result = parseSummaryResponse(withMentions);

      expect(result.actionItems).toContain('@Alice');
      expect(result.actionItems).toContain('@Bob');
    });

    it('should handle multi-line sections', () => {
      const multiline = `Overview: This is a longer overview
that spans multiple lines.

Key Decisions:
- Decision 1
- Decision 2

Action Items: Multiple items

Blockers: None

Resources: None`;

      const result = parseSummaryResponse(multiline);

      expect(result.overview).toContain('multiple lines');
      expect(result.decisions).toContain('Decision 1');
      expect(result.decisions).toContain('Decision 2');
    });
  });

  describe('getClaudeProvider', () => {
    it('should return a provider with correct interface', () => {
      const provider = getClaudeProvider();

      expect(provider).toHaveProperty('generateSummary');
      expect(provider).toHaveProperty('parseSummaryResponse');
      expect(provider).toHaveProperty('getName');
      expect(provider.getName()).toBe('Claude');
    });

    it('should generate summaries through provider interface', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: mockSummaryResponse }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const provider = getClaudeProvider();
      const result = await provider.generateSummary(mockMessages, '2025-01-15');

      expect(result).toBe(mockSummaryResponse);
    });

    it('should parse responses through provider interface', () => {
      const provider = getClaudeProvider();
      const result = provider.parseSummaryResponse(mockSummaryResponse);

      expect(result.overview).toBe('Team discussed deployment timeline and code review.');
    });
  });
});
