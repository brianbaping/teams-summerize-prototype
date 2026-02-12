# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Teams AI Summarizer: A single-user web application for software engineering managers to automatically summarize Microsoft Teams conversations using AI. Monitors selected Teams channels and chats, generating daily and monthly digests with key highlights, decisions, and action items.

**Tech Stack**: Next.js 14 (App Router), React 18, TypeScript, better-sqlite3, NextAuth, Microsoft Graph API, Ollama (local LLM)

## Quick Reference

- **Setup & Configuration**: See [docs/setup.md](docs/setup.md)
- **Architecture & Database**: See [docs/architecture.md](docs/architecture.md)
- **API Integrations**: See [docs/api-integrations.md](docs/api-integrations.md)
- **Development Workflow**: See [docs/development-workflow.md](docs/development-workflow.md)
- **Full Specification**: See [teams-ai-summarizer-spec.md](teams-ai-summarizer-spec.md)

## Current Implementation Status

See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for detailed progress tracking and [QUICK_START.md](QUICK_START.md) for a condensed setup guide.

## Development Commands

```bash
npm install                 # Install dependencies
npm run dev                # Run development server (http://localhost:3000)
npm run build              # Build for production
npm start                  # Start production server
npm run lint               # Run ESLint
npm run format             # Format code with Prettier
npm test                   # Run tests in watch mode (interactive)
npm run test:ci            # Run tests once (for CI)
npm run test:coverage      # Run tests with coverage report
```

### Starting Development Environment
```bash
ollama serve      # In one terminal (if not running as service)
npm run dev       # In another terminal
```

**Note**: Ollama must be running before starting the dev server. Install with:
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3
```

### Running Specific Tests
```bash
npm test -- __tests__/lib/db.test.ts           # Run a single test file
npm test -- --testNamePattern="pattern"        # Run tests matching pattern
```

## Project Structure

```
teams-summerize/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth endpoints (login/logout/session)
│   │   ├── channels/route.ts            # GET monitored channels, POST to add channel
│   │   ├── messages/route.ts            # GET messages from Teams for a channel
│   │   └── summarize/route.ts           # POST to generate AI summary
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main dashboard
│   ├── providers.tsx      # Client-side providers
│   └── globals.css        # Global styles
├── lib/                   # Core business logic
│   ├── auth.ts           # Authentication utilities (requireAuth)
│   ├── db.ts             # Database layer (better-sqlite3)
│   ├── errors.ts         # Custom error classes
│   ├── microsoft-graph.ts # Graph API client with retry logic
│   ├── ollama.ts         # Ollama client for summarization
│   └── validation.ts     # Zod schemas for input validation
├── __tests__/            # Jest tests
│   ├── lib/              # Unit tests for lib modules
│   └── setup.test.ts     # Test setup
├── docs/                 # Documentation
└── data/                 # SQLite database (gitignored)
```

### Key Implementation Details

**Error Handling Layer** (lib/errors.ts)
- Custom error classes: `GraphAPIError`, `OllamaError`, `DatabaseError`, `ValidationError`, `AuthenticationError`
- All API calls wrapped in try-catch with appropriate error types
- Retry logic with exponential backoff for retriable errors (429, 500, 503)

**Database Layer** (lib/db.ts)
- Uses better-sqlite3 (synchronous API)
- Functions: `getDatabase()`, `initializeDatabase()`, `saveMonitoredChannel()`, `getMessages()`, etc.
- Path aliases: Use `@/lib/db` or `@/app/...` in imports (configured in tsconfig.json and jest.config.js)

**Validation Layer** (lib/validation.ts)
- Zod schemas validate at system boundaries (user input, API responses)
- Used in API routes before processing requests

**Authentication** (lib/auth.ts)
- `requireAuth()`: Helper for API routes to enforce authentication
- Uses NextAuth with Microsoft provider (@/app/api/auth/[...nextauth]/route.ts)

## Key Points for Claude Code

### Terminology Conventions

- Use **"code complete"** instead of "production ready" when referring to code that is finished and tested
- Example: "This feature is code complete" (not "production ready")

### Critical Integration Details

**Microsoft Graph API**
- Uses OAuth 2.0 with delegated permissions: `Chat.Read`, `ChannelMessage.Read.All`, `Team.ReadBasic.All`
- MUST handle pagination, rate limiting (429 responses), and token refresh
- Implement exponential backoff and aggressive caching from the start
- See [docs/api-integrations.md](docs/api-integrations.md) for endpoint details

**Ollama Summarization (Local LLM)**
- Uses local Ollama instance (default: http://localhost:11434) with llama3 or mistral models
- Generate structured summaries: overview, decisions, action items (with @mentions), blockers, resources
- Includes retry logic for timeouts and connection errors (60s timeout per request)
- Prompt format is defined in lib/ollama.ts:buildPrompt()
- See [docs/api-integrations.md](docs/api-integrations.md) for prompt templates

### Environment Setup

**Required Environment Variables** (see .env.local.example):
- `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID` - Microsoft Azure app credentials
- `NEXTAUTH_URL` - Application URL (http://localhost:3000 for dev)
- `NEXTAUTH_SECRET` - Secret for NextAuth (generate with `openssl rand -base64 32`)
- `OLLAMA_BASE_URL` - Ollama API endpoint (default: http://localhost:11434)
- `OLLAMA_MODEL` - LLM model to use (default: llama3)
- `DATABASE_PATH` - SQLite database path (default: ./data/app.db)

**Prerequisites**:
- Node.js 18.17+ (required for Next.js 14)
- Ollama installed and running locally (or update OLLAMA_BASE_URL)
- Microsoft Azure AD app registration with Graph API permissions

### Development Approach

1. **Start with authentication**: Get Microsoft OAuth flow working before anything else
2. **Test with one channel**: Verify message fetching and display before adding summarization
3. **Prototype summarization**: Test Ollama API with sample data to refine prompts (see lib/ollama.ts)
4. **Build incrementally**: Follow Phase 1 → Phase 2 → Phase 3 (see [docs/development-workflow.md](docs/development-workflow.md))
5. **Prioritize caching**: Implement message caching early to avoid rate limit issues
6. **Write tests first**: Project uses Jest with ts-jest (coverage threshold: 90% statements/functions, 85% branches)

### Database Schema

Three core tables (full schema in [docs/architecture.md](docs/architecture.md)):
- `monitored_channels`: Configuration for which channels to track
- `messages`: Cached Teams messages to reduce API calls
- `summaries`: Generated AI summaries (daily/monthly with action_items JSON)

### Testing Strategy

**Test Location**: __tests__/ directory (mirrors lib/ and api/ structure)

**Running Tests**:
- `npm test` - Watch mode for development
- `npm run test:ci` - Single run for CI
- `npm run test:coverage` - Generate coverage report

**Test Doubles**:
- Use in-memory SQLite (`:memory:`) for database tests
- Mock Microsoft Graph API responses
- Mock Ollama API responses
- Mock NextAuth session for API route tests

**Coverage Requirements** (jest.config.js):
- Statements: 90%
- Branches: 85%
- Functions: 90%
- Lines: 90%

### Common Pitfalls to Avoid

- Don't skip implementing token refresh - Microsoft tokens expire hourly
- Don't ignore pagination - large channels require multiple Graph API calls
- Don't call APIs without caching - rate limits are strict
- Don't send too many messages to Ollama at once - respect context limits
- Don't forget exponential backoff for 429 responses
- Don't use synchronous database operations in API routes without proper error handling
- Don't forget to validate all inputs with Zod schemas before processing
