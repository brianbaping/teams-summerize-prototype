# Teams AI Summarizer

AI-powered summarization for Microsoft Teams **chats** (1:1 and group conversations) with **dual LLM support** - choose between local Ollama (free, private) or Claude API (cloud, higher quality).

## ✅ Status: Code Complete

All features implemented and tested! The application is ready for development use with mock data or production use with Azure AD.

## 🎯 Latest Update: Dual LLM Provider Support

**NEW**: Switch between Ollama and Claude API instantly with a UI toggle - no server restart required!

## Features

✅ **Dual LLM Providers** - Switch between Ollama (local) and Claude API (cloud) with one click
✅ **Live Provider Toggle** - Change AI providers instantly via UI dropdown
✅ **Authentication** - Mock mode (for development) or Azure AD (for production)
✅ **Ollama Playground** - Direct chat interface with local LLM
✅ **Claude Playground** - Direct chat interface with Claude API
✅ **Chat Management** - Browse and select Teams chats to monitor (filtered to last 7 days, max 50)
✅ **Message Viewer** - View and refresh messages from monitored chats
✅ **AI Summarization** - Generate structured summaries with your chosen provider
✅ **Smart Caching** - SQLite database for messages and summaries
✅ **TypeScript** - Fully typed with strict mode
✅ **Tests** - 101 tests passing with 85%+ coverage

## Quick Start

### Choose Your AI Provider

The app supports two AI providers:

| Provider | Cost | Speed | Quality | Privacy |
|----------|------|-------|---------|---------|
| **Ollama** | Free | 5-30s | Good | 100% local |
| **Claude API** | ~$15-60/mo | 2-5s | Excellent | Cloud (Anthropic) |

**Recommendation**: Start with Ollama (free) to test, upgrade to Claude for higher quality.

### Setup with Ollama (Free, Local)

1. **Install Ollama** and pull a model:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull llama3
   ollama serve  # Keep running in a terminal
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment** (`.env.local` already configured):
   ```bash
   AI_PROVIDER=ollama
   NEXT_PUBLIC_AI_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

5. **Visit http://localhost:3000**
   - Click "Sign in (Mock)"
   - See Ollama Playground (purple theme)
   - Add chats, view messages, generate summaries

### Setup with Claude API (Paid, Cloud)

1. **Get Claude API key**:
   - Visit [console.anthropic.com](https://console.anthropic.com)
   - Sign up and create an API key
   - Add payment method

2. **Configure environment** (edit `.env.local`):
   ```bash
   AI_PROVIDER=claude
   NEXT_PUBLIC_AI_PROVIDER=claude
   ANTHROPIC_API_KEY=sk-ant-your-api-key-here
   CLAUDE_MODEL=claude-sonnet-4-20250514
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Visit http://localhost:3000**
   - Click "Sign in (Mock)"
   - See Claude Playground (blue theme)
   - Generate summaries with Claude API

### Switch Providers Instantly

**No restart required!** Use the dropdown in the dashboard header:

1. Select **🟣 Ollama (Local)** → Uses local Ollama
2. Select **🔵 Claude API** → Uses cloud Claude
3. Selection persists in browser localStorage
4. Each summary uses your selected provider

## Documentation

- **[QUICK_START.md](QUICK_START.md)** - Get started in 5 minutes
- **[docs/claude-migration.md](docs/claude-migration.md)** - Switching between providers ⭐ NEW
- **[MOCK_MODE_GUIDE.md](MOCK_MODE_GUIDE.md)** - Using mock authentication
- **[PRODUCTION.md](PRODUCTION.md)** - Production deployment with Azure AD
- **[CLAUDE.md](CLAUDE.md)** - Developer guidance for this codebase
- **[docs/setup.md](docs/setup.md)** - Complete setup instructions
- **[docs/architecture.md](docs/architecture.md)** - System design and database schema
- **[docs/api-integrations.md](docs/api-integrations.md)** - LLM and Graph API details

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
│   │   ├── chats/               # Chat management
│   │   ├── claude/chat/         # Claude playground endpoint ⭐ NEW
│   │   ├── messages/            # Message fetching
│   │   └── summarize/           # AI summarization (dual provider)
│   ├── page.tsx           # Main dashboard with provider toggle
│   ├── layout.tsx         # Root layout
│   └── providers.tsx      # Client-side providers (incl. ProviderContext)
├── components/            # React components
│   ├── ChannelSelector.tsx     # Channel selection UI
│   ├── MessageViewer.tsx       # Message display UI
│   ├── SummarizePanel.tsx      # AI summarization UI
│   ├── OllamaPlayground.tsx    # Direct Ollama chat
│   ├── ClaudePlayground.tsx    # Direct Claude chat ⭐ NEW
│   └── ProviderToggle.tsx      # Provider selector dropdown ⭐ NEW
├── contexts/              # React contexts ⭐ NEW
│   └── ProviderContext.tsx     # AI provider state management
├── lib/                   # Core business logic
│   ├── auth.ts           # Authentication utilities
│   ├── db.ts             # Database operations (SQLite)
│   ├── errors.ts         # Custom error classes (incl. ClaudeAPIError)
│   ├── llm-provider.ts   # LLM provider abstraction ⭐ NEW
│   ├── claude.ts         # Claude API integration ⭐ NEW
│   ├── ollama.ts         # Ollama integration
│   ├── microsoft-graph.ts # Graph API client (with mock support)
│   ├── validation.ts     # Input validation (Zod)
│   └── mock-data.ts      # Sample data for development
├── __tests__/            # Jest tests (101 passing) ⭐ UPDATED
│   ├── lib/claude.test.ts       # Claude integration tests ⭐ NEW
│   └── lib/llm-provider.test.ts # Provider factory tests ⭐ NEW
├── data/                 # SQLite database (auto-created)
└── docs/                 # Detailed documentation
    └── claude-migration.md      # Provider migration guide ⭐ NEW
```

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite (better-sqlite3)
- **AI**: Dual LLM support
  - **Ollama** - Local LLM (llama3/mistral) - Free, private
  - **Claude API** - Anthropic's Claude Sonnet 4 - Paid, cloud
- **Auth**: NextAuth with Azure AD or Mock provider
- **Testing**: Jest, React Testing Library (101 tests, 85%+ coverage)
- **Code Quality**: ESLint, Prettier, TypeScript (strict mode)

## Key Features Explained

### 🎨 Live Provider Toggle
Switch between Ollama and Claude instantly with the dropdown in the dashboard header. Your choice is saved and persists across sessions.

### 🎮 Dual Playgrounds
- **Ollama Playground** (purple) - Direct chat with local LLM
- **Claude Playground** (blue) - Direct chat with Claude API
- Both show performance metrics and token usage

### 📊 Chat Selector
Browse your Teams chats (1:1 and group) and select which ones to monitor. Smart filtering shows only chats with activity in the **last 7 days** (max 50), making selection fast and relevant.

### 💬 Message Viewer
View messages from monitored chats with author names, timestamps, and formatted content. Refresh to fetch new messages.

### 🤖 AI Summarization
Generate structured summaries with your chosen provider:
- 📋 **Overview** - High-level summary of the conversation
- ✅ **Key Decisions** - Important decisions made
- 🎯 **Action Items** - Tasks with @mentions for assignees
- 🚧 **Blockers** - Issues preventing progress
- 🔗 **Resources** - Links and references mentioned

### 💾 Smart Caching
All messages are cached in SQLite to minimize API calls and improve performance.

### 📊 Cost Tracking
For Claude API users, token usage is logged with each request for accurate cost tracking.

## Testing

The project has comprehensive test coverage with **101 tests passing**:

```bash
# Run all tests
npm test

# Run specific test
npm test -- __tests__/lib/claude.test.ts

# Check coverage
npm run test:coverage
```

**Test Coverage**:
- `lib/claude.ts`: 100%
- `lib/llm-provider.ts`: 100%
- `lib/ollama.ts`: 96.61%
- Overall: 85%+ on critical paths

## Provider Comparison

### Ollama (Local)

**Pros**:
- ✅ Completely free
- ✅ 100% private (data never leaves your machine)
- ✅ Works offline
- ✅ No API key required

**Cons**:
- ❌ Requires 16GB+ RAM
- ❌ Slower (5-30s per summary)
- ❌ Slightly lower quality

**Best for**: Testing, high privacy requirements, cost-conscious users

### Claude API (Cloud)

**Pros**:
- ✅ Excellent summary quality
- ✅ Fast (2-5s per summary)
- ✅ No hardware requirements
- ✅ Larger context window (200k tokens)

**Cons**:
- ❌ Costs ~$15-60/month
- ❌ Requires internet
- ❌ Data sent to Anthropic's cloud

**Best for**: Production use, high-quality summaries, limited local resources

**Cost estimate**: ~$0.50-2/day for typical usage (5 monitored chats)

## Development vs Production

### Development Mode (Current)
- ✅ Mock authentication (no Azure AD needed)
- ✅ Sample Teams chats and messages
- ✅ Full dual LLM integration
- ✅ All features working
- ✅ Perfect for UI development and testing

### Production Mode
- 🔐 Real Azure AD authentication
- 📡 Real Microsoft Graph API calls
- 💼 Your actual Teams chats and messages
- 🚀 See [PRODUCTION.md](PRODUCTION.md) for setup

## Common Tasks

### Test Ollama Connection
```bash
curl http://localhost:11434/api/tags
```

### Test Claude API
Visit the Claude Playground in the app and try a test prompt.

### View Database
```bash
sqlite3 data/app.db
SELECT * FROM monitored_chats;
SELECT COUNT(*) FROM messages;
SELECT * FROM summaries ORDER BY generated_at DESC LIMIT 5;
```

### Clear Database
```bash
rm data/app.db
# Will be recreated on next run
```

### Switch Providers
Edit `.env.local` and change `AI_PROVIDER=ollama` to `AI_PROVIDER=claude` (or vice versa), then restart:
```bash
npm run dev
```

Or use the UI toggle (no restart needed)!

## Troubleshooting

### Ollama Not Working
- Ensure Ollama is running: `ollama serve`
- Check model is installed: `ollama list`
- Verify URL in `.env.local`: `OLLAMA_BASE_URL=http://localhost:11434`

### Claude API Not Working
- Check API key is set in `.env.local`: `ANTHROPIC_API_KEY=sk-ant-...`
- Verify you have API credits at [console.anthropic.com](https://console.anthropic.com)
- Check internet connection

### Provider Toggle Not Appearing
- Ensure `NEXT_PUBLIC_AI_PROVIDER` is set in `.env.local`
- Restart dev server after changing environment variables
- Clear browser cache

### TypeScript Errors
- Clear cache: `rm -rf .next`
- Verify tsconfig.json has `"target": "es2018"`

### Mock Data Not Showing
- Check `.env.local` has `USE_MOCK_DATA=true`
- Restart dev server after changing environment variables

## Environment Variables

See `.env.local.example` for a complete list. Key variables:

```bash
# AI Provider Selection
AI_PROVIDER=ollama                      # 'ollama' or 'claude'
NEXT_PUBLIC_AI_PROVIDER=ollama          # For client-side display

# Ollama (if AI_PROVIDER=ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# Claude API (if AI_PROVIDER=claude)
ANTHROPIC_API_KEY=sk-ant-your-key-here
CLAUDE_MODEL=claude-sonnet-4-20250514

# Mock mode (for development)
USE_MOCK_AUTH=true
USE_MOCK_DATA=true
NEXT_PUBLIC_USE_MOCK_AUTH=true
```

## License

Private project for personal use.

## Acknowledgments

Built with Claude Code following TDD principles with comprehensive error handling, type safety, and dual LLM provider support.

---

**Ready to try it?** Start with Ollama (free) and upgrade to Claude when you need higher quality summaries! 🚀
