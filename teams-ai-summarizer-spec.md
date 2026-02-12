# Teams AI Summarizer - Project Specification

## Project Overview

A personal web application for software engineering managers to automatically summarize Microsoft Teams conversations using AI. The app monitors selected Teams channels and chats, generating daily and monthly digests with key highlights, decisions, and action items.

## Problem Statement

As a software engineering manager, keeping up with multiple Teams channels and chats is challenging due to information overload. This app solves that by providing AI-generated summaries of important conversations, decisions, and tasks without requiring constant manual monitoring.

## Core Requirements

### Functional Requirements

1. **Channel/Chat Monitoring**
   - Connect to Microsoft Teams via Graph API
   - Allow user to select specific channels and chats to monitor
   - Pull messages for configurable time periods (daily/monthly)

2. **AI Summarization**
   - Generate end-of-day summaries for selected channels
   - Generate end-of-month rollup summaries
   - Extract and highlight:
     - Key discussion topics
     - Decisions made
     - Action items and task assignments (especially @mentions)
     - Blockers or concerns raised
     - Important links or resources shared

3. **Search Functionality**
   - Full-text search across all stored summaries
   - Filter by date range, channel, and keywords
   - Quick access to historical information

4. **User Interface**
   - Clean, simple dashboard view
   - Organized by channel/chat
   - Links back to original Teams messages
   - Configuration panel for channel selection

### Non-Functional Requirements

- Web-based application (accessible from any browser)
- Single-user application (no multi-user support needed initially)
- Secure authentication with Microsoft
- No specific privacy/security constraints (internal use only)

## Technical Stack

### Frontend
- **Framework**: React or Next.js
- **UI Library**: Tailwind CSS or Material-UI
- **State Management**: React Context or Redux (if needed)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js or Next.js API routes
- **Database**: PostgreSQL or SQLite (for configuration and cached summaries)

### Integrations
- **Microsoft Graph API**: Teams message access
- **Anthropic Claude API**: AI summarization (alternative: OpenAI GPT)

### Authentication
- Microsoft OAuth 2.0 with delegated permissions
- Scopes needed:
  - `Chat.Read`
  - `ChannelMessage.Read.All`
  - `Team.ReadBasic.All`

## Architecture Overview

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

## Implementation Phases

### Phase 1: MVP (Week 1-2)
**Goal**: Basic working prototype with single channel

- [ ] Set up project structure (Next.js or React + Express)
- [ ] Implement Microsoft Graph API authentication
- [ ] Create OAuth flow and token management
- [ ] Pull messages from one test channel
- [ ] Integrate Claude API for basic summarization
- [ ] Create simple UI to display summary
- [ ] Test end-to-end flow

**Deliverable**: Can authenticate, fetch messages from one channel, and display AI summary

### Phase 2: Core Features (Week 3-4)
**Goal**: Multi-channel support and daily digest automation

- [ ] Build configuration panel for channel selection
- [ ] Implement multi-channel message fetching
- [ ] Create task/action item extraction logic
- [ ] Build daily digest generation workflow
- [ ] Add date range filtering
- [ ] Implement basic search functionality
- [ ] Set up database schema for caching
- [ ] Create dashboard UI with channel organization

**Deliverable**: Can monitor multiple channels, generate daily digests, and search summaries

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

## Key Technical Considerations

### 1. Microsoft Graph API Integration

**Endpoint Examples:**
```javascript
// List all teams
GET /me/joinedTeams

// List channels in a team
GET /teams/{team-id}/channels

// Get channel messages
GET /teams/{team-id}/channels/{channel-id}/messages

// Get chat messages
GET /me/chats/{chat-id}/messages
```

**Challenges:**
- Pagination handling (messages returned in pages)
- Rate limiting (throttling from Microsoft)
- Threading/replies structure
- Token refresh management

### 2. AI Summarization Strategy

**Prompt Template Approach:**
```
Summarize the following Teams channel conversation from [date].

Focus on:
1. Key discussion topics and themes
2. Decisions that were made
3. Action items and who they're assigned to
4. Any blockers or concerns raised
5. Important links or resources mentioned

Messages:
[message data]

Provide a concise summary in the following format:
- Overview: (2-3 sentences)
- Key Decisions: (bullet points)
- Action Items: (bullet points with assignees)
- Blockers: (if any)
- Resources: (links mentioned)
```

**Considerations:**
- Token limits for very active channels (may need chunking)
- Context preservation across message threads
- Handling code snippets and formatted content
- Cost optimization (caching, selective summarization)

### 3. Data Storage Schema

**Tables:**

```sql
-- Channels being monitored
CREATE TABLE monitored_channels (
  id INTEGER PRIMARY KEY,
  team_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cached messages
CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  message_id TEXT UNIQUE NOT NULL,
  channel_id TEXT NOT NULL,
  author TEXT,
  content TEXT,
  created_at TIMESTAMP,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generated summaries
CREATE TABLE summaries (
  id INTEGER PRIMARY KEY,
  channel_id TEXT NOT NULL,
  summary_type TEXT, -- 'daily' or 'monthly'
  period_start DATE,
  period_end DATE,
  summary_text TEXT,
  action_items TEXT, -- JSON array
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Rate Limit Handling

Microsoft Graph API has throttling limits:
- Implement exponential backoff
- Cache message data to reduce API calls
- Batch requests where possible
- Consider incremental fetching (only new messages)

## Environment Variables Needed

```env
# Microsoft Azure App Registration
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_TENANT_ID=your_tenant_id
REDIRECT_URI=http://localhost:3000/auth/callback

# AI Service
ANTHROPIC_API_KEY=your_claude_api_key

# Database
DATABASE_URL=sqlite:./data.db

# App Config
PORT=3000
NODE_ENV=development
SESSION_SECRET=your_session_secret
```

## Getting Started Checklist

### Prerequisites
- [ ] Node.js 18+ installed
- [ ] Microsoft 365 account with Teams access
- [ ] Anthropic API account and key

### Azure Setup
- [ ] Create Azure App Registration
- [ ] Configure redirect URIs
- [ ] Set API permissions for Microsoft Graph
- [ ] Generate client secret

### Initial Development
- [ ] Clone/create project repository
- [ ] Install dependencies
- [ ] Set up environment variables
- [ ] Create basic project structure
- [ ] Test Microsoft authentication flow

## Potential Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Rate limits on Graph API | Implement caching, exponential backoff, and batch requests |
| Large message volumes | Chunk messages for AI processing, paginate UI |
| Token expiration | Implement automatic token refresh flow |
| Threading complexity | Flatten or structure threads hierarchically |
| Search performance | Index summaries, use full-text search capabilities |
| Cost of AI API calls | Cache summaries, only regenerate when needed |

## Future Enhancements (Post-MVP)

- Email digest delivery
- Slack integration (if team uses both)
- Custom summary templates
- Export summaries to PDF
- Mobile-responsive design
- Multi-user support
- Team-level insights and analytics
- Integration with task management tools (Jira, Azure DevOps)

## Resources

### Documentation Links
- [Microsoft Graph API - Teams](https://learn.microsoft.com/en-us/graph/api/resources/teams-api-overview)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Microsoft Authentication](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)

### Code Examples
- [Microsoft Graph SDK for JavaScript](https://github.com/microsoftgraph/msgraph-sdk-javascript)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

## Success Criteria

The project is successful when:
1. Can authenticate with Microsoft and access Teams data
2. Generates accurate, useful daily summaries
3. Extracts action items with correct assignees
4. Search functionality returns relevant results
5. Monthly rollups provide high-level insights
6. UI is clean and easy to navigate
7. App is stable and handles errors gracefully

---

## Next Steps for Claude Code

When starting this project in Claude Code:

1. **Start with authentication**: Get the Microsoft OAuth flow working first
2. **Test with one channel**: Fetch and display raw messages before summarizing
3. **Prototype summarization**: Test Claude API with sample Teams messages
4. **Build incrementally**: Get each phase working before moving to the next

Good luck with your build! This is a practical tool that will save you significant time once it's running.
