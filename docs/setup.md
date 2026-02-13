# Setup Guide

## Prerequisites

- Node.js 18+ installed
- Microsoft 365 account with Teams access
- **Either** Ollama (local, free) **or** Claude API key (cloud, $15-60/month)
- Azure account for app registration

## Choosing an AI Provider

The application supports two AI providers for summarization:

### Option 1: Ollama (Local, Free)

**Pros**:
- ✅ Completely free
- ✅ 100% private (data never leaves your machine)
- ✅ No API key required
- ✅ Works offline

**Cons**:
- ❌ Requires 16GB+ RAM
- ❌ Slower (5-30s per summary)
- ❌ Slightly lower quality summaries

**Best for**: Testing, high privacy requirements, or cost-conscious users

### Option 2: Claude API (Cloud, Paid)

**Pros**:
- ✅ Excellent summary quality
- ✅ Fast (2-5s per summary)
- ✅ No hardware requirements
- ✅ Larger context window (200k tokens)

**Cons**:
- ❌ Costs ~$15-60/month
- ❌ Requires internet connection
- ❌ Data sent to Anthropic's cloud

**Best for**: Production use, high-quality summaries, or when local resources are limited

**Cost Estimate**: Typical usage (5 monitored chats) costs $0.50-2.00 per day.

### Recommendation

1. **Start with Ollama** to try the application for free
2. **Upgrade to Claude** if you need higher quality summaries
3. **See [claude-migration.md](claude-migration.md)** for switching instructions

## Azure App Registration Setup

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to "Azure Active Directory" → "App registrations" → "New registration"
3. Configure the application:
   - Name: "Teams AI Summarizer"
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI: `http://localhost:3000/auth/callback` (for development)
4. After creation, note the **Application (client) ID** and **Directory (tenant) ID**
5. Go to "Certificates & secrets" → "New client secret"
   - Add description and expiration
   - Note the **secret value** (shown only once)
6. Go to "API permissions" → "Add a permission" → "Microsoft Graph" → "Delegated permissions"
   - Add: `Chat.Read` - Read user chat messages (1:1 and group conversations)
7. Click "Grant admin consent" if you have admin privileges

**Note**: This app focuses on Teams chats (not channels), so only `Chat.Read` permission is required. Permissions like `ChannelMessage.Read.All` and `Team.ReadBasic.All` are not needed.

## AI Provider Setup

Choose **one** of the following options:

### Option A: Ollama Setup (Free, Local)

Ollama runs locally and provides free AI summarization.

```bash
# Install Ollama (Linux/macOS)
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model (recommend llama3 for quality, mistral for speed)
ollama pull llama3

# Verify it's running
ollama serve
```

For Windows, download from [ollama.com](https://ollama.com).

### Option B: Claude API Setup (Paid, Cloud)

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to "API Keys" section
4. Click "Create Key"
5. Copy the API key (starts with `sk-ant-...`)
6. **Important**: Keep this key secure, never commit it to version control

**Set up billing**: Add a payment method in the console to avoid API call failures.

## Environment Variables

Create a `.env.local` file in the project root:

### For Ollama (Local, Free)

```env
# Microsoft Azure
AZURE_AD_CLIENT_ID=your_client_id
AZURE_AD_CLIENT_SECRET=your_client_secret
AZURE_AD_TENANT_ID=your_tenant_id

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_random_secret_here

# AI Provider
AI_PROVIDER=ollama
NEXT_PUBLIC_AI_PROVIDER=ollama

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# Database
DATABASE_PATH=./data/app.db
```

### For Claude API (Cloud, Paid)

```env
# Microsoft Azure
AZURE_AD_CLIENT_ID=your_client_id
AZURE_AD_CLIENT_SECRET=your_client_secret
AZURE_AD_TENANT_ID=your_tenant_id

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_random_secret_here

# AI Provider
AI_PROVIDER=claude
NEXT_PUBLIC_AI_PROVIDER=claude

# Claude API Configuration
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
CLAUDE_MODEL=claude-sonnet-4-20250514

# Database
DATABASE_PATH=./data/app.db
```

**Generate NEXTAUTH_SECRET**:
```bash
openssl rand -base64 32
```

For testing, create `.env.test`:
```env
DATABASE_PATH=:memory:
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

## Installation

```bash
# Install production dependencies
npm install @microsoft/microsoft-graph-client @azure/msal-node
npm install better-sqlite3 @types/better-sqlite3
npm install next-auth
npm install zod  # For input validation

# Install development dependencies
npm install -D jest @types/jest ts-jest
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D eslint-config-prettier prettier

# Initialize testing configuration
npx ts-jest config:init
```

Add to `package.json` scripts:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "jest --watch",
    "test:ci": "jest --ci",
    "test:coverage": "jest --ci --coverage",
    "lint": "next lint",
    "format": "prettier --write ."
  }
}
```

Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'app/api/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    }
  }
};
```

## Running the Application

```bash
# Ensure Ollama is running
ollama serve

# Run development server
npm run dev

# Run tests
npm test

# Run tests in CI mode
npm run test:ci

# Check code coverage
npm run test:coverage
```

## Verify Setup

1. Navigate to `http://localhost:3000`
2. Click "Sign in with Microsoft"
3. Complete OAuth flow
4. Verify you can see your Teams chats listed (1:1 and group conversations)

**Note**: By default, only chats with activity in the last 7 days are shown. Use advanced options to adjust this filter.
