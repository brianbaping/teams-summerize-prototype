# Mock Mode Development Guide

This guide explains how to develop the Teams AI Summarizer without Azure AD access.

## What's Been Set Up

### 1. Environment Variables
Your `.env.local` file now has:
```env
USE_MOCK_AUTH=true
USE_MOCK_DATA=true
NEXT_PUBLIC_USE_MOCK_AUTH=true
```

These flags enable mock mode for development.

### 2. Mock Data
Created `lib/mock-data.ts` with:
- **Mock User**: `developer@example.com`
- **Mock Teams**: 2 teams (Development Team, Agile Team)
- **Mock Channels**: 3 channels (Engineering Team, Product Planning, Sprint Retrospective)
- **Mock Messages**: 8 sample messages with realistic content, timestamps, and @mentions

### 3. Mock Authentication
Updated `app/api/auth/[...nextauth]/route.ts`:
- Uses `CredentialsProvider` instead of Azure AD in mock mode
- Auto-signs in with mock user credentials
- No real OAuth flow required

### 4. Mock API Responses
Updated `lib/microsoft-graph.ts`:
- Returns mock data when `USE_MOCK_DATA=true`
- All methods (`getJoinedTeams`, `getChannels`, `getChannelMessages`) use mock data
- No real Microsoft Graph API calls are made

## How to Use

### Starting Development
1. Make sure Ollama is running (for AI summarization):
   ```bash
   ollama serve
   ```

2. Start the Next.js development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000

4. Click "Sign in (Mock)" - you'll be automatically authenticated

### What You Can Do
- ✅ Develop and test the UI without Azure AD
- ✅ Test the Ollama AI summarization with mock Teams data
- ✅ Build out features like channel selection, message display, summary generation
- ✅ Run all tests with mock data

### What's Simulated
- Microsoft OAuth authentication flow
- Teams channels and messages
- User sessions and access tokens

### What Still Works
- Ollama AI summarization (uses real local LLM)
- SQLite database operations
- All UI components and interactions

## Switching to Real Azure AD

When you get Azure AD access, update `.env.local`:
```env
# Development Mode
USE_MOCK_AUTH=false
USE_MOCK_DATA=false
NEXT_PUBLIC_USE_MOCK_AUTH=false

# Microsoft Azure (use real credentials)
AZURE_AD_CLIENT_ID=your_real_client_id
AZURE_AD_CLIENT_SECRET=your_real_client_secret
AZURE_AD_TENANT_ID=your_real_tenant_id
```

## Mock Data Details

### Sample Channels
1. **Engineering Team** (channel-1) - 5 messages
   - Recent conversation about authentication implementation
   - Includes @mentions and deployment discussion

2. **Product Planning** (channel-2) - 2 messages
   - Q2 roadmap discussion
   - Feature prioritization

3. **Sprint Retrospective** (channel-3) - 1 message
   - Sprint 12 retrospective summary

### Testing AI Summarization
The mock messages are designed to test Ollama's summarization:
- Contains decisions ("should prioritize mobile app")
- Contains action items (implied: "review PR", "update docs")
- Contains @mentions for participant tracking
- Spans different timeframes for filtering tests

## Development Workflow

1. **Build UI Components**: Focus on the dashboard, channel selector, message viewer
2. **Test Summarization**: Use the mock messages to test Ollama integration
3. **Database Operations**: Save channels, cache messages, store summaries
4. **When Ready**: Switch to real Azure AD and test with actual Teams data

## Troubleshooting

**Issue**: "Sign in (Mock)" doesn't work
- **Solution**: Check that `NEXT_PUBLIC_USE_MOCK_AUTH=true` in `.env.local`
- Restart the dev server after changing environment variables

**Issue**: No channels showing up
- **Solution**: Check that `USE_MOCK_DATA=true` in `.env.local`
- Verify `lib/mock-data.ts` is imported correctly

**Issue**: Ollama summarization fails
- **Solution**: Ensure Ollama is running: `ollama serve`
- Verify llama3 model is installed: `ollama list`
