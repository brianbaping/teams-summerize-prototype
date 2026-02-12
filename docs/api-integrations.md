# API Integrations

## Microsoft Graph API

### Authentication
Uses Microsoft OAuth 2.0 with delegated permissions:
- `Chat.Read` - Read user chat messages
- `ChannelMessage.Read.All` - Read all channel messages
- `Team.ReadBasic.All` - Read basic team information

### Key Endpoints

```javascript
// List all teams user has joined
GET /me/joinedTeams

// List channels in a team
GET /teams/{team-id}/channels

// Get channel messages
GET /teams/{team-id}/channels/{channel-id}/messages

// Get chat messages
GET /me/chats/{chat-id}/messages
```

### Critical Considerations

**Pagination**
- Messages are returned in pages
- Must follow `@odata.nextLink` to retrieve all messages
- Implement cursor-based pagination handling

**Rate Limiting & Retry Logic**
- Microsoft Graph API has throttling limits
- Implement exponential backoff for 429, 500, 503 responses
- **Retry Strategy**:
  ```typescript
  // Max 3 attempts with delays: 1s, 2s, 4s
  async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3
  ): Promise<T> {
    let lastError;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await sleep(delay);
        }
      }
    }
    throw lastError;
  }
  ```
- **Retry on**: 429 (rate limit), 500 (server error), 503 (service unavailable)
- **Don't retry on**: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found)
- Cache message data aggressively to minimize API calls

**Token Management**
- Access tokens expire after 1 hour
- NextAuth handles automatic token refresh
- Store tokens in httpOnly, secure, sameSite cookies
- Never log tokens or expose in error messages
- Handle token expiration gracefully in all API calls

**Security Considerations**
- Never log access tokens or refresh tokens
- Sanitize error messages before exposing to frontend
- Validate all API responses before processing
- Use environment variables for all credentials
- Implement CSRF protection via NextAuth

**Message Threading**
- Teams messages can have complex reply structures
- Message threads need special handling
- Consider flattening threads or preserving hierarchy based on summarization needs

**Incremental Fetching**
- Use delta queries to fetch only new messages since last sync
- Store last sync timestamp per channel
- Reduces API calls and processing time

## Ollama API (Local LLM)

### Endpoint
```
POST http://localhost:11434/api/generate
```

### Summarization Strategy

**Prompt Template**
```
Summarize the following Teams channel conversation from [date].

Focus on:
1. Key discussion topics and themes
2. Decisions that were made
3. Action items and who they're assigned to
4. Any blockers or concerns raised
5. Important links or resources mentioned

Messages:
[formatted messages with author, timestamp, content]

Provide a concise summary in the following format:
- Overview: (2-3 sentences)
- Key Decisions: (bullet points)
- Action Items: (bullet points with @mentions)
- Blockers: (if any)
- Resources: (links mentioned)
```

### Critical Considerations

**Connection & Timeout Handling**
- Default Ollama timeout may be short - set to 60s for long summaries
- Handle connection refused errors (Ollama not running)
- **Retry Strategy**:
  ```typescript
  // Max 2 attempts for timeout or connection errors
  async function generateWithRetry(prompt: string): Promise<string> {
    const maxAttempts = 2;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'llama3', prompt, stream: false }),
          signal: AbortSignal.timeout(60000) // 60s timeout
        });
        return await response.json();
      } catch (error) {
        if (attempt < maxAttempts - 1 && isRetriableError(error)) {
          await sleep(1000); // 1s delay before retry
          continue;
        }
        throw new OllamaError('Failed to generate summary', error);
      }
    }
  }
  ```

**Token/Context Limits**
- Very active channels may exceed model context window
- Implement message chunking for large conversations (>4000 messages)
- Consider summarizing in batches then creating daily rollup
- Preserve context across chunks when possible

**Error Handling**
- Validate Ollama is running before attempting generation
- Provide user-friendly error messages ("Check Ollama is running")
- Log detailed errors server-side for debugging
- Never expose internal error details to frontend
- Handle malformed responses gracefully

**Response Parsing**
- Parse structured output (decisions, action items) reliably
- Extract @mentions for action item assignments
- Validate response format before saving
- Provide fallback if parsing fails

**Performance**
- llama3 recommended for quality (slower)
- mistral recommended for speed (faster)
- Consider streaming responses for better UX (optional for MVP)
- Cache summaries aggressively to avoid regeneration

### Security Considerations
- Ollama runs locally - no external API key needed
- Sanitize user messages before sending to LLM
- Validate output before storing in database
- Don't log full message contents (may contain sensitive info)

## Claude API (Cloud LLM)

### Authentication
- API key-based authentication
- Get API key from [console.anthropic.com](https://console.anthropic.com)
- Store in `ANTHROPIC_API_KEY` environment variable
- Never commit API keys to version control

### Endpoint
```typescript
// Using Anthropic SDK
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  messages: [{ role: 'user', content: prompt }],
});
```

### Models

| Model | Context | Output | Cost (Input) | Cost (Output) | Use Case |
|-------|---------|--------|--------------|---------------|----------|
| `claude-opus-4-20250514` | 200k | 4k | $15/M tokens | $75/M tokens | Highest quality |
| `claude-sonnet-4-20250514` | 200k | 4k | $3/M tokens | $15/M tokens | **Recommended** |
| `claude-haiku-4-20250223` | 200k | 4k | $0.25/M tokens | $1.25/M tokens | Fastest, cheapest |

**Recommendation**: Use Sonnet 4 for best balance of quality and cost.

### Summarization Strategy

**Prompt Template** (identical to Ollama for consistency)
```
Summarize the following Teams channel conversation from [date].

Focus on:
1. Key discussion topics and themes
2. Decisions that were made
3. Action items and who they're assigned to
4. Any blockers or concerns raised
5. Important links or resources mentioned

Messages:
[formatted messages with author, timestamp, content]

Provide a concise summary in the following format:
Overview: (2-3 sentences)

Key Decisions: (bullet points)

Action Items: (bullet points with @mentions)

Blockers: (if any, otherwise "None")

Resources: (links mentioned, otherwise "None")
```

### Critical Considerations

**Rate Limiting & Retry Logic**
- Claude API has rate limits (varies by plan)
- Implement exponential backoff for 429 (rate limit), 529 (overload), 500, 503 responses
- **Retry Strategy**:
  ```typescript
  // Max 3 attempts with delays: 1s, 2s, 4s
  async function generateWithRetry(prompt: string): Promise<string> {
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        });
        return response.content[0].text;
      } catch (error) {
        if (attempt < maxAttempts - 1 && isRetriable(error)) {
          const delay = Math.pow(2, attempt) * 1000;
          await sleep(delay);
          continue;
        }
        throw new ClaudeAPIError('Failed to generate summary', error);
      }
    }
  }

  function isRetriable(error: any): boolean {
    const status = error.status || error.statusCode;
    return status === 429 || status === 529 || status === 500 || status === 503;
  }
  ```

**Token Limits**
- Context window: 200k tokens (very large)
- Output limit: 4k tokens (set via max_tokens parameter)
- Typical Teams conversation: 10k-50k input tokens
- Monitor token usage via `response.usage.input_tokens` and `response.usage.output_tokens`

**Error Handling**
- Validate API key exists before calls
- Handle authentication errors (401) - invalid API key
- Handle insufficient credits (402) - billing issue
- Provide user-friendly error messages
- Log token usage for cost tracking

**Response Parsing**
- Extract text from `response.content` array
- Parse structured output (same format as Ollama)
- Extract @mentions for action item assignments
- Validate response format before saving

**Performance**
- Claude typically responds in 2-5 seconds
- Much faster than local Ollama (typically 5-30s)
- No local hardware requirements
- Network latency is main factor

**Cost Management**
- Log all API calls with token counts
- Estimate: $0.50-2.00 per day for typical usage (5 channels)
- Monthly cost: ~$15-60
- Set up billing alerts in Anthropic console
- Consider caching summaries aggressively

### Security Considerations
- API key must be kept secure
- Don't expose API key in client-side code
- Teams messages are sent to Anthropic's cloud
- Anthropic doesn't train models on API data (as of 2025)
- Consider data residency requirements for sensitive conversations
- Validate API responses before storing

### Comparison: Ollama vs Claude

| Feature | Ollama (Local) | Claude API (Cloud) |
|---------|----------------|-------------------|
| **Cost** | Free | ~$15-60/month |
| **Speed** | 5-30s per summary | 2-5s per summary |
| **Quality** | Good | Excellent |
| **Privacy** | 100% local | Cloud (Anthropic) |
| **Setup** | Install Ollama, pull models | Just API key |
| **Hardware** | 16GB+ RAM recommended | None |
| **Internet** | Not required | Required |
| **Context Limit** | ~4k tokens | ~200k tokens |

**Recommendation**: Start with Ollama to test for free, upgrade to Claude for higher quality.

## Testing & Mocking Strategies

### Microsoft Graph API Mocking
```typescript
// Mock successful response
jest.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    init: jest.fn().mockReturnValue({
      api: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          value: [{ id: '1', content: 'Test message' }]
        })
      })
    })
  }
}));

// Mock pagination
const mockGraphResponse = {
  value: [/* messages */],
  '@odata.nextLink': 'https://graph.microsoft.com/...'
};

// Mock 429 rate limit for retry testing
mockApi.get.mockRejectedValueOnce({ statusCode: 429 });
```

### Ollama API Mocking
```typescript
// Mock successful generation
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    response: 'Overview: Test summary\nKey Decisions: None\n...'
  })
});

// Mock timeout
global.fetch = jest.fn().mockRejectedValueOnce(new Error('Timeout'));

// Mock connection refused
global.fetch = jest.fn().mockRejectedValueOnce(
  new Error('ECONNREFUSED')
);
```

### Database Mocking
```typescript
// Use in-memory SQLite for tests
const db = new Database(':memory:');

// Mock query errors
jest.spyOn(db, 'prepare').mockImplementation(() => {
  throw new Error('SQLITE_CONSTRAINT');
});
```
