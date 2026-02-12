# Setup Guide

## Prerequisites

- Node.js 18+ installed
- Microsoft 365 account with Teams access
- Ollama installed locally (for AI summarization)
- Azure account for app registration

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
   - Add: `Chat.Read`
   - Add: `ChannelMessage.Read.All`
   - Add: `Team.ReadBasic.All`
7. Click "Grant admin consent" if you have admin privileges

## Ollama Installation

Ollama runs locally and provides the AI summarization capabilities.

```bash
# Install Ollama (Linux/macOS)
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model (recommend llama3 for quality, mistral for speed)
ollama pull llama3

# Verify it's running
ollama serve
```

For Windows, download from [ollama.com](https://ollama.com).

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Microsoft Azure
AZURE_AD_CLIENT_ID=your_client_id
AZURE_AD_CLIENT_SECRET=your_client_secret
AZURE_AD_TENANT_ID=your_tenant_id

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_random_secret_here

# Ollama (local LLM)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# Database
DATABASE_PATH=./data/app.db
```

Generate a random `NEXTAUTH_SECRET`:
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
4. Verify you can see your Teams channels listed
