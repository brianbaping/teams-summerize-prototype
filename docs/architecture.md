# Architecture

## System Overview

The application follows a standard three-tier web application pattern:

```
┌─────────────────┐
│   Web Browser   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Frontend      │
│   (React/Next)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Backend API   │
│   (Node/Express)│
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌─────────┐ ┌──────────────┐
│ Database│ │  External    │
│ (SQLite)│ │  APIs        │
└─────────┘ │              │
            │ - MS Graph   │
            │ - Claude API │
            └──────────────┘
```

## Components

### Frontend (React/Next.js)
- User interface for dashboard and configuration
- Authentication flow handling
- Display of summaries and search results
- Chat selection interface (1:1 and group conversations)

### Backend API (Node.js/Next.js API Routes)
- Business logic orchestration
- Microsoft Graph API client and token management
- Ollama client for local AI summarization
- Message caching and retrieval logic
- Summary generation workflow

### Error Handling Layer (lib/errors.ts)
- Custom error classes for different failure modes:
  - `GraphAPIError`: Microsoft Graph API failures (rate limits, token issues)
  - `OllamaError`: Local LLM connection/generation failures
  - `DatabaseError`: SQLite constraint violations, query failures
  - `ValidationError`: Invalid input data

### Validation Layer (lib/validation.ts)
- Zod schemas for input validation:
  - Chat selection payloads
  - Date range parameters
  - API request bodies
- Validates data at system boundaries (user input, API responses)

### Database (SQLite)
- Stores monitored chats configuration (1:1 and group conversations)
- Caches Teams messages to reduce API calls
- Persists generated summaries for search and historical access

### External APIs
- **Microsoft Graph API**: Fetches Teams chat messages and conversation information
- **Ollama**: Local LLM for AI summarization (llama3 or mistral)

## Database Schema

### monitored_chats
Tracks which Teams chats (1:1 and group conversations) to monitor.

```sql
CREATE TABLE monitored_chats (
  id INTEGER PRIMARY KEY,
  chat_id TEXT UNIQUE NOT NULL,
  chat_name TEXT,
  chat_type TEXT, -- 'oneOnOne' or 'group'
  status TEXT DEFAULT 'active', -- 'active' or 'ignored'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Note**: Chats don't have `team_id` since they exist independently of Teams channels.

### messages
Caches fetched Teams messages to reduce API calls.

```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  message_id TEXT UNIQUE NOT NULL,
  chat_id TEXT NOT NULL,
  author TEXT,
  content TEXT,
  created_at TIMESTAMP,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### summaries
Stores generated AI summaries.

```sql
CREATE TABLE summaries (
  id INTEGER PRIMARY KEY,
  chat_id TEXT NOT NULL,
  summary_type TEXT, -- 'daily' or 'monthly'
  period_start DATE,
  period_end DATE,
  summary_text TEXT,
  action_items TEXT, -- JSON array
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Data Flow

1. **Message Fetching**: Backend periodically calls Microsoft Graph API to fetch new messages from monitored chats
2. **Smart Filtering**: Only chats with activity in the last 7 days are shown by default (adjustable via advanced options)
3. **Caching**: Messages are stored in the database to minimize API calls
4. **Summarization**: On schedule (daily/monthly), messages are batched and sent to Ollama for summarization
5. **Storage**: Generated summaries are stored in the database
6. **Display**: Frontend queries backend API to retrieve and display summaries
7. **Search**: Full-text search queries the summaries table with date/chat filters

## Error Handling Flow

```
┌─────────────────┐
│   API Request   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Validation    │ ──── ValidationError ──────┐
│   (Zod schema)  │                             │
└────────┬────────┘                             │
         │                                       │
         ▼                                       ▼
┌─────────────────┐                    ┌─────────────────┐
│  Business Logic │                    │  Error Handler  │
└────────┬────────┘                    │  (API Route)    │
         │                              └────────┬────────┘
    ┌────┴────┐                                  │
    ▼         ▼                                  ▼
┌─────────┐ ┌──────────────┐          ┌─────────────────┐
│   DB    │ │ External API │          │ Structured JSON │
│         │ │  (Graph/     │          │ Error Response  │
│         │ │   Ollama)    │          └─────────────────┘
└────┬────┘ └──────┬───────┘
     │             │
     │ DatabaseError│ GraphAPIError
     │             │ OllamaError
     │             │
     └──────┬──────┘
            │
            ▼
   ┌─────────────────┐
   │  Retry Logic    │
   │  (Exponential   │
   │   Backoff)      │
   └────────┬────────┘
            │
            ▼
   Success or Final Error
```

## Testing Architecture

### Directory Structure
```
teams-summarizer/
├── __tests__/
│   ├── lib/
│   │   ├── db.test.ts
│   │   ├── microsoft-graph.test.ts
│   │   ├── ollama.test.ts
│   │   ├── workflow.test.ts
│   │   ├── errors.test.ts
│   │   └── validation.test.ts
│   └── api/
│       ├── channels.test.ts
│       ├── messages.test.ts
│       └── summarize.test.ts
```

### Test Strategy

**Unit Tests (lib/ modules)**
- Test individual functions in isolation
- Mock external dependencies (database, APIs)
- Use in-memory SQLite for database tests (`:memory:`)
- Target: 100% coverage for business logic

**Integration Tests (API routes)**
- Test full request/response cycle
- Mock authentication session
- Mock external API calls (Graph, Ollama)
- Validate input/output schemas
- Test error handling paths
- Target: 100% coverage for all endpoints

**Test Doubles**
- **Mock**: Graph API responses, Ollama responses
- **Stub**: Database connections for isolated tests
- **Fake**: In-memory SQLite database for testing

### TDD Workflow
1. Write failing test describing expected behavior
2. Implement minimal code to make test pass
3. Refactor while keeping tests green
4. Repeat for next feature
