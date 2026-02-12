# Teams AI Summarizer

AI-powered summarization for Microsoft Teams channels using local LLM (Ollama).

## ✅ Status: Code Complete

All features implemented and tested! The application is ready for development use with mock data or production use with Azure AD.

## Features

✅ **Authentication** - Mock mode (for development) or Azure AD (for production)
✅ **Ollama Playground** - Direct chat interface with your local LLM
✅ **Channel Management** - Browse and select Teams channels to monitor
✅ **Message Viewer** - View and refresh messages from monitored channels
✅ **AI Summarization** - Generate structured summaries with Ollama (llama3)
✅ **Database** - SQLite for caching messages and storing summaries
✅ **TypeScript** - Fully typed with strict mode
✅ **Tests** - All passing with 85%+ coverage

## Quick Start

### For Development (No Azure AD Required)

1. **Install Ollama** and pull a model:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull llama3
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Use mock mode** (already configured in `.env.local`):
   - Mock authentication is enabled by default
   - Includes sample Teams channels and messages
   - No Azure AD setup required

4. **Run development server**:
   ```bash
   ollama serve  # In one terminal
   npm run dev   # In another terminal
   ```

5. **Visit http://localhost:3000**
   - Click "Sign in (Mock)"
   - Add a channel to monitor
   - View messages
   - Generate AI summaries
   - Chat with Ollama directly

### For Production (Azure AD Required)

See [PRODUCTION.md](PRODUCTION.md) for instructions on switching to real Azure AD authentication.

## Documentation

- **[MOCK_MODE_GUIDE.md](MOCK_MODE_GUIDE.md)** - Using mock authentication for development
- **[PRODUCTION.md](PRODUCTION.md)** - Switching to production with Azure AD
- **[CLAUDE.md](CLAUDE.md)** - Developer guidance for working with this codebase
- **[docs/setup.md](docs/setup.md)** - Complete setup instructions
- **[docs/architecture.md](docs/architecture.md)** - System design and database schema
- **[docs/api-integrations.md](docs/api-integrations.md)** - Microsoft Graph and Ollama details

## Development Commands

```bash
npm run dev           # Start development server (http://localhost:3000)
npm test              # Run tests in watch mode
npm run test:ci       # Run tests once (for CI)
npm run test:coverage # Run tests with coverage report
npm run lint          # Run ESLint
npm run format        # Format code with Prettier
npm run build         # Build for production
npm start             # Start production server
```

## Project Structure

```
teams-summerize/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/[...nextauth]/  # Authentication (NextAuth)
│   │   ├── channels/            # Channel management
│   │   ├── messages/            # Message fetching
│   │   └── summarize/           # AI summarization
│   ├── page.tsx           # Main dashboard with all features
│   ├── layout.tsx         # Root layout
│   └── providers.tsx      # Client-side providers
├── components/            # React components
│   ├── ChannelSelector.tsx     # Channel selection UI
│   ├── MessageViewer.tsx       # Message display UI
│   ├── SummarizePanel.tsx      # AI summarization UI
│   └── OllamaPlayground.tsx    # Direct Ollama chat
├── lib/                   # Core business logic
│   ├── auth.ts           # Authentication utilities
│   ├── db.ts             # Database operations (SQLite)
│   ├── errors.ts         # Custom error classes
│   ├── microsoft-graph.ts # Graph API client (with mock support)
│   ├── ollama.ts         # Ollama integration
│   ├── validation.ts     # Input validation (Zod)
│   └── mock-data.ts      # Sample data for development
├── __tests__/            # Jest tests (all passing)
├── data/                 # SQLite database (auto-created)
└── docs/                 # Detailed documentation
```

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite (better-sqlite3)
- **AI**: Ollama (local LLM - llama3/mistral)
- **Auth**: NextAuth with Azure AD or Mock provider
- **Testing**: Jest, React Testing Library (85%+ coverage)
- **Code Quality**: ESLint, Prettier, TypeScript (strict mode)

## Key Features Explained

### 🎮 Ollama Playground
Direct chat interface with your local LLM. Ask any question and see real-time AI responses with performance metrics.

### 📊 Channel Selector
Browse your Teams channels and select which ones to monitor. Supports multiple teams and channels with smart caching.

### 💬 Message Viewer
View messages from monitored channels with author names, timestamps, and formatted content. Refresh to fetch new messages.

### 🤖 AI Summarization
Generate structured summaries with:
- 📋 Overview - High-level summary
- ✅ Key Decisions - Important decisions made
- 🎯 Action Items - Tasks with @mentions
- 🚧 Blockers - Issues preventing progress
- 🔗 Resources - Links and references

### 💾 Smart Caching
All messages are cached in SQLite to minimize API calls and improve performance.

## Testing

The project has comprehensive test coverage:

```bash
# Run all tests
npm test

# Run specific test
npm test -- __tests__/lib/db.test.ts

# Check coverage
npm run test:coverage
```

All tests passing ✅ with 85%+ coverage on critical paths.

## Development vs Production

### Development Mode (Current)
- ✅ Mock authentication (no Azure AD needed)
- ✅ Sample Teams channels and messages
- ✅ Full Ollama integration
- ✅ All features working
- ✅ Perfect for UI development and testing

### Production Mode
- 🔐 Real Azure AD authentication
- 📡 Real Microsoft Graph API calls
- 💼 Your actual Teams channels and messages
- 🚀 See [PRODUCTION.md](PRODUCTION.md) for setup

## Common Tasks

### Test Ollama Connection
```bash
node test-ollama.js
```

### View Database
```bash
sqlite3 data/app.db
SELECT * FROM monitored_channels;
SELECT COUNT(*) FROM messages;
SELECT * FROM summaries ORDER BY generated_at DESC LIMIT 5;
```

### Clear Database
```bash
rm data/app.db
# Will be recreated on next run
```

### Kill Dev Server
```bash
pkill -f "next dev"
```

## Troubleshooting

### Ollama Not Working
- Ensure Ollama is running: `ollama serve`
- Check model is installed: `ollama list`
- Verify URL in `.env.local`: `OLLAMA_BASE_URL=http://localhost:11434`

### TypeScript Errors
- Clear cache: `rm -rf .next`
- Verify tsconfig.json has `"target": "es2018"`

### Mock Data Not Showing
- Check `.env.local` has `USE_MOCK_DATA=true`
- Restart dev server after changing environment variables

### Page Not Responding
- Kill all dev servers: `pkill -f "next dev"`
- Clear cache: `rm -rf .next`
- Restart: `npm run dev`

## License

Private project for personal use.

## Acknowledgments

Built with Claude Code following TDD principles with comprehensive error handling and type safety.
