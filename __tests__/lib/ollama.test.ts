import { generateSummary, parseSummaryResponse } from '@/lib/ollama';
import { OllamaError } from '@/lib/errors';
import { Message } from '@/lib/microsoft-graph';

// Mock fetch
global.fetch = jest.fn();

describe('Ollama Integration', () => {
  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      from: { user: { displayName: 'Alice' } },
      body: { content: 'Lets discuss the new feature' },
      createdDateTime: '2024-01-15T10:00:00Z',
    },
    {
      id: 'msg-2',
      from: { user: { displayName: 'Bob' } },
      body: { content: 'I agree, we should start with the API design' },
      createdDateTime: '2024-01-15T10:05:00Z',
    },
    {
      id: 'msg-3',
      from: { user: { displayName: 'Alice' } },
      body: { content: '@Bob can you create a PR for this?' },
      createdDateTime: '2024-01-15T10:10:00Z',
    },
  ];

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('generateSummary', () => {
    it('should generate summary from messages', async () => {
      const mockResponse = {
        response: `Overview: Team discussed new feature implementation.
Key Decisions: Start with API design.
Action Items:
- @Bob: Create PR for new feature
Blockers: None
Resources: None`,
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const summary = await generateSummary(mockMessages, '2024-01-15');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(summary).toContain('Team discussed new feature');
      expect(summary).toContain('@Bob');
    });

    it('should handle empty message list', async () => {
      await expect(generateSummary([], '2024-01-15')).rejects.toThrow(
        OllamaError
      );
    });

    it('should retry on timeout', async () => {
      const timeoutError = new Error('Timeout');
      (timeoutError as any).name = 'AbortError';

      const mockResponse = {
        response: 'Overview: Summary after retry',
      };

      (fetch as jest.Mock)
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

      const summary = await generateSummary(mockMessages, '2024-01-15');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(summary).toContain('Summary after retry');
    });

    it('should retry on connection refused', async () => {
      const connError = new Error('ECONNREFUSED');

      const mockResponse = {
        response: 'Overview: Summary after connection retry',
      };

      (fetch as jest.Mock)
        .mockRejectedValueOnce(connError)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

      const summary = await generateSummary(mockMessages, '2024-01-15');

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const timeoutError = new Error('Timeout');

      (fetch as jest.Mock).mockRejectedValue(timeoutError);

      await expect(generateSummary(mockMessages, '2024-01-15')).rejects.toThrow(
        OllamaError
      );

      expect(fetch).toHaveBeenCalledTimes(2); // Max 2 attempts
    });

    it('should throw on non-retriable errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(generateSummary(mockMessages, '2024-01-15')).rejects.toThrow(
        OllamaError
      );

      expect(fetch).toHaveBeenCalledTimes(1); // No retry
    });

    it('should include model and prompt in request', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'Overview: Test' }),
      });

      await generateSummary(mockMessages, '2024-01-15');

      const callArg = (fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(callArg.body);

      expect(body.model).toBe('llama3');
      expect(body.prompt).toContain('Teams channel conversation');
      expect(body.prompt).toContain('Alice');
      expect(body.prompt).toContain('Bob');
      expect(body.stream).toBe(false);
    });
  });

  describe('parseSummaryResponse', () => {
    it('should parse well-formed summary', () => {
      const response = `Overview: Team discussed API design
Key Decisions:
- Use REST architecture
- Implement pagination

Action Items:
- @Alice: Review API spec
- @Bob: Create initial implementation

Blockers: None

Resources: https://api-docs.example.com`;

      const parsed = parseSummaryResponse(response);

      expect(parsed.overview).toContain('Team discussed API design');
      expect(parsed.decisions).toContain('REST architecture');
      expect(parsed.actionItems).toContain('@Alice');
      expect(parsed.actionItems).toContain('@Bob');
      expect(parsed.blockers).toContain('None');
      expect(parsed.resources).toContain('https://api-docs.example.com');
    });

    it('should handle missing sections', () => {
      const response = `Overview: Brief discussion`;

      const parsed = parseSummaryResponse(response);

      expect(parsed.overview).toContain('Brief discussion');
      expect(parsed.decisions).toBe('');
      expect(parsed.actionItems).toBe('');
      expect(parsed.blockers).toBe('');
      expect(parsed.resources).toBe('');
    });

    it('should extract action items with @mentions', () => {
      const response = `Action Items:
- @john.doe: Update documentation
- @jane: Review PR #123`;

      const parsed = parseSummaryResponse(response);

      expect(parsed.actionItems).toContain('@john.doe');
      expect(parsed.actionItems).toContain('@jane');
    });
  });
});
