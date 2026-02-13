# Development Workflow

## Development Commands

```bash
# Installation
npm install           # Install all dependencies

# Development
npm run dev          # Run development server with hot reload
npm run build        # Build for production
npm start            # Start production server

# Testing (TDD)
npm test             # Run tests in watch mode
npm run test:ci      # Run tests once (for CI/CD)
npm run test:coverage # Run tests with coverage report

# Code Quality
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

## Test-Driven Development (TDD) Workflow

### TDD Process
Follow this cycle for all new features:

1. **Red**: Write a failing test
   - Define expected behavior
   - Test should fail initially

2. **Green**: Write minimal code to pass test
   - Implement just enough to make test pass
   - Don't worry about optimization yet

3. **Refactor**: Improve code while keeping tests green
   - Clean up implementation
   - Remove duplication
   - Improve readability

4. **Repeat**: Move to next feature

### Example TDD Session
```typescript
// 1. RED: Write failing test
test('should fetch messages from Graph API', async () => {
  const client = new GraphAPIClient(mockToken);
  const messages = await client.getChatMessages('chat1');
  expect(messages).toHaveLength(5);
  expect(messages[0]).toHaveProperty('content');
});

// 2. GREEN: Implement minimal code
async getChatMessages(chatId: string) {
  const response = await this.client.api(`/me/chats/${chatId}/messages`).get();
  return response.value;
}

// 3. REFACTOR: Add error handling, pagination, etc.
async getChatMessages(chatId: string) {
  try {
    let allMessages = [];
    let url = `/me/chats/${chatId}/messages`;

    while (url) {
      const response = await this.client.api(url).get();
      allMessages.push(...response.value);
      url = response['@odata.nextLink'];
    }

    return allMessages;
  } catch (error) {
    throw new GraphAPIError('Failed to fetch messages', error);
  }
}
```

### Test Coverage Requirements
- **lib/ modules**: 100% coverage (business logic)
- **API routes**: 100% coverage (all endpoints)
- **UI components**: Optional for MVP

## Implementation Phases

### Phase 1: MVP (Week 1-2)
**Goal**: Basic working prototype with single chat using TDD

**Setup (Day 1)**
- [ ] Create Next.js project with TypeScript
- [ ] Install dependencies (Graph client, better-sqlite3, NextAuth, Jest, Zod)
- [ ] Configure Jest, ESLint, Prettier
- [ ] Setup environment variables (.env.local, .env.test)
- [ ] Verify: `npm run lint` passes, `npm test` runs

**Core Infrastructure (Day 2-3)**
- [ ] Write tests for error classes (lib/errors.test.ts)
- [ ] Implement custom error classes (GraphAPIError, OllamaError, DatabaseError, ValidationError)
- [ ] Write tests for database layer (db.test.ts) - use :memory: database
- [ ] Implement database with three tables (monitored_chats, messages, summaries)
- [ ] Write tests for validation schemas (validation.test.ts)
- [ ] Implement Zod schemas for input validation
- [ ] Verify: All tests pass, 100% coverage for lib/errors.ts, lib/db.ts, lib/validation.ts

**Authentication (Day 4)**
- [ ] Configure NextAuth with AzureADProvider
- [ ] Setup secure session cookies (httpOnly, secure, sameSite)
- [ ] Implement token refresh callback
- [ ] Test OAuth flow manually (no automated test for MVP)
- [ ] Verify: Can authenticate with Microsoft, tokens stored securely

**Microsoft Graph API Integration (Day 5-6)**
- [ ] Write tests for Graph client (microsoft-graph.test.ts) with mocked responses
- [ ] Test pagination handling
- [ ] Test retry logic with exponential backoff
- [ ] Test error handling (401, 429, 500)
- [ ] Implement Graph client (getChats, getChatMessages)
- [ ] Implement smart filtering (only chats with activity in last 7 days)
- [ ] Implement retry logic with exponential backoff
- [ ] Verify: All tests pass, 100% coverage for lib/microsoft-graph.ts

**Ollama Integration (Day 7)**
- [ ] Write tests for Ollama client (ollama.test.ts) with mocked fetch
- [ ] Test summary generation
- [ ] Test timeout and connection error handling
- [ ] Test retry logic
- [ ] Test response parsing
- [ ] Implement Ollama client (generateSummary function)
- [ ] Implement prompt template
- [ ] Verify: All tests pass, 100% coverage for lib/ollama.ts

**API Routes (Day 8-9)**
- [ ] Write tests for /api/chats route
- [ ] Implement /api/chats (GET: list chats, POST: save monitored chat)
- [ ] Write tests for /api/messages route
- [ ] Implement /api/messages (GET: fetch and cache messages)
- [ ] Write tests for /api/summarize route
- [ ] Implement /api/summarize (POST: generate summary)
- [ ] Verify: All API tests pass, 100% coverage for API routes

**Core Workflow (Day 10)**
- [ ] Write tests for workflow functions (workflow.test.ts)
- [ ] Implement syncMessages, generateDailySummary, getLatestSummary
- [ ] Verify: All tests pass, 100% coverage for lib/workflow.ts

**Frontend UI (Day 11-12)**
- [ ] Implement dashboard page (app/page.tsx) - show auth status, latest summary
- [ ] Implement setup page (app/setup/page.tsx) - select chat to monitor (ChatSelector component)
- [ ] Implement summaries history page (app/summaries/page.tsx)
- [ ] Add loading states and error handling
- [ ] Verify: UI displays correctly, handles errors gracefully

**End-to-End Testing (Day 13-14)**
- [ ] Run full test suite: `npm run test:ci`
- [ ] Check test coverage: `npm run test:coverage`
- [ ] Manual testing: authenticate, select chat, fetch messages, generate summary
- [ ] Test error scenarios (Ollama not running, invalid date ranges, etc.)
- [ ] Test smart filtering (only chats with recent activity shown)
- [ ] Verify all success criteria met

**Deliverable**: Can authenticate, fetch messages from one chat, generate AI summary locally, with 100% test coverage for business logic

### Phase 2: Core Features (Week 3-4)
**Goal**: Multi-chat support and daily digest automation

- [ ] Build configuration panel for chat selection with smart filtering
- [ ] Implement multi-chat message fetching
- [ ] Add status field to mark chats as "ignored"
- [ ] Create task/action item extraction logic
- [ ] Build daily digest generation workflow
- [ ] Add date range filtering
- [ ] Implement basic search functionality
- [ ] Set up database schema for caching
- [ ] Create dashboard UI with chat organization

**Deliverable**: Can monitor multiple chats, generate daily digests, and search summaries

### Phase 3: Polish (Week 5+)
**Goal**: Monthly rollups and production-ready features

- [ ] Implement monthly rollup summaries
- [ ] Add advanced search filters
- [ ] Improve UI/UX with better styling
- [ ] Optimize API performance and caching
- [ ] Handle historical data management
- [ ] Add error handling and retry logic
- [ ] Implement rate limit handling
- [ ] Add loading states and progress indicators

**Deliverable**: Production-ready app with all planned features

## Recommended Development Order (TDD)

This order ensures tests are written before implementation, following TDD principles:

1. **Error Classes & Validation** (TDD)
   - Write tests for custom errors (GraphAPIError, OllamaError, etc.)
   - Implement error classes
   - Write tests for Zod validation schemas
   - Implement validation schemas

2. **Database Layer** (TDD)
   - Write tests for database initialization and CRUD operations
   - Use in-memory SQLite (`:memory:`) for testing
   - Implement database functions with error handling
   - Verify 100% test coverage

3. **Authentication Setup** (Manual Testing)
   - Configure NextAuth with AzureADProvider
   - Test OAuth flow manually (browser testing)
   - Verify tokens stored securely in cookies
   - Verify API permissions granted

4. **Microsoft Graph Client** (TDD)
   - Write tests with mocked Graph API responses
   - Test pagination, retry logic, error handling
   - Implement Graph client functions (getChats, getChatMessages)
   - Implement smart filtering logic (only chats with recent activity)
   - Verify 100% test coverage

5. **Ollama Client** (TDD)
   - Write tests with mocked fetch responses
   - Test timeout, connection errors, retry logic
   - Implement Ollama client with prompt template
   - Test response parsing
   - Verify 100% test coverage

6. **API Routes** (TDD)
   - Write tests for each route with mocked dependencies
   - Test authentication, validation, error cases
   - Implement routes with structured error responses
   - Verify 100% test coverage

7. **Core Workflow Functions** (TDD)
   - Write tests for syncMessages, generateDailySummary, getLatestSummary
   - Mock database and external APIs
   - Implement workflow with error handling
   - Verify 100% test coverage

8. **Frontend UI** (Manual Testing)
   - Build React components with loading/error states
   - Test user flows manually in browser
   - Verify error messages are user-friendly

9. **End-to-End Verification**
   - Run full test suite
   - Check code coverage meets thresholds
   - Perform manual integration testing
   - Test error scenarios (Ollama down, invalid inputs, etc.)

## Development Best Practices

### Caching Strategy
- Cache Teams chat messages aggressively to minimize API calls
- Store generated summaries to avoid regeneration
- Implement cache invalidation for new messages
- Use incremental fetching with delta queries
- Smart filtering: Only show chats with activity in last 7 days by default

### Error Handling
- Implement exponential backoff for API rate limits
- Handle token expiration gracefully
- Add retry logic for transient failures
- Log errors with sufficient context for debugging

### Testing Approach
- Test OAuth flow with real Microsoft accounts
- Use sample Teams data for summarization testing
- Test with channels of varying activity levels
- Verify search functionality with diverse queries

### Performance Considerations
- Batch API requests where possible
- Use database indexes for search queries
- Implement lazy loading for large result sets
- Monitor Claude API token usage and costs

## Common Development Tasks

### Adding a New Summary Type
1. Update `summary_type` enum in database schema
2. Create new prompt template for the summary type
3. Add generation logic in summarization service
4. Update UI to display the new summary type

### Modifying Summary Format
1. Update prompt template in summarization service
2. Adjust parsing logic for structured output
3. Update database schema if new fields needed
4. Modify UI components to display new format

### Adding a New Microsoft Graph API Endpoint
1. Add endpoint configuration in Graph API client
2. Implement pagination handling
3. Add caching logic if applicable
4. Update error handling for endpoint-specific errors

## Verification & Testing Checklist

### Automated Testing
```bash
# Run all tests
npm run test:ci

# Check coverage (should be >90%)
npm run test:coverage

# Run linter
npm run lint

# Format code
npm run format
```

**Expected Results:**
- All tests pass
- Coverage >90% for lib/ files
- Coverage 100% for critical paths (auth, API integration, summarization)
- No ESLint errors
- Code formatted consistently

### Manual Testing Checklist

**Setup Phase**
- [ ] Ollama is running (`ollama serve`)
- [ ] Environment variables configured in `.env.local`
- [ ] Development server starts (`npm run dev`)

**Authentication Testing**
- [ ] Navigate to http://localhost:3000
- [ ] Click "Sign in with Microsoft"
- [ ] OAuth flow completes successfully
- [ ] Session persists on page reload
- [ ] Tokens stored in httpOnly cookies (check DevTools)

**Chat Selection Testing**
- [ ] Navigate to /setup
- [ ] Chats list loads from Graph API (only chats with activity in last 7 days shown)
- [ ] Select a test chat
- [ ] Configuration saved to database
- [ ] Check database: `sqlite3 data/app.db "SELECT * FROM monitored_chats;"`
- [ ] Test advanced options to adjust activity filter

**Message Fetching Testing**
- [ ] Trigger message sync (button or API call)
- [ ] Messages appear in database
- [ ] Pagination handled correctly (check logs)
- [ ] No duplicate messages (verify message_id uniqueness)
- [ ] Check database: `sqlite3 data/app.db "SELECT COUNT(*) FROM messages;"`

**Summary Generation Testing**
- [ ] Click "Generate Daily Summary" button
- [ ] Loading state displays
- [ ] Summary generated successfully
- [ ] Structured output (overview, decisions, action items) displays correctly
- [ ] Summary saved to database
- [ ] Check database: `sqlite3 data/app.db "SELECT * FROM summaries ORDER BY generated_at DESC LIMIT 1;"`

**Error Scenario Testing**
- [ ] Stop Ollama → try to generate summary
  - User-friendly error message displayed
  - App does not crash
- [ ] Try to access API routes without authentication
  - Returns 401 error
- [ ] Try invalid date ranges
  - Validation error displayed
- [ ] Test with empty channel (no messages)
  - Handles gracefully with appropriate message

### Security Verification
- [ ] Tokens not visible in DevTools → Application → Cookies (httpOnly flag set)
- [ ] No tokens logged in console or server logs
- [ ] API routes require authentication (test with unauthenticated requests)
- [ ] Error messages don't expose internal details
- [ ] Environment variables not exposed to client

### Performance Verification
- [ ] Pagination handles large channels (>100 messages)
- [ ] Retry logic works (test by temporarily stopping Ollama)
- [ ] Exponential backoff prevents API hammering
- [ ] Database queries are efficient (check SQLite EXPLAIN QUERY PLAN)

### Success Criteria
All checkboxes above should be checked before considering MVP complete.
