# Claude API Migration Guide

This guide explains how to switch between Ollama (local LLM) and Claude API (cloud-based) for AI summarization in the Teams AI Summarizer.

## Overview

The application supports two LLM providers:

| Provider | Cost | Quality | Privacy | Setup Complexity |
|----------|------|---------|---------|------------------|
| **Ollama** | Free | Good | Local (100% private) | Medium (install Ollama) |
| **Claude API** | ~$15-60/month | Excellent | Cloud (data sent to Anthropic) | Easy (just API key) |

## When to Use Each Provider

### Use Ollama if you:
- Want zero cost for AI summarization
- Need complete data privacy (everything stays local)
- Have a capable machine to run local models
- Are okay with slightly lower summary quality

### Use Claude API if you:
- Need the highest quality summaries
- Want faster response times
- Don't mind $15-60/month cost (~$0.50-2/day)
- Are okay with sending Teams data to Anthropic's cloud

## Cost Estimates for Claude API

**Typical Daily Usage** (5 monitored channels):
- Input tokens: 10k-50k tokens/day
- Output tokens: 500-1000 tokens/day
- **Daily cost: $0.50 - $2.00**

**Monthly Cost**: ~$15-60

**Pricing (Claude Sonnet 4)**:
- Input: ~$3 per million tokens
- Output: ~$15 per million tokens

## Switching from Ollama to Claude

### Step 1: Get an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-ant-...`)

### Step 2: Update Environment Variables

Edit your `.env.local` file:

```bash
# Change AI provider
AI_PROVIDER=claude
NEXT_PUBLIC_AI_PROVIDER=claude

# Add Claude API credentials
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
CLAUDE_MODEL=claude-sonnet-4-20250514  # Optional, this is the default

# Ollama variables are no longer required (but you can keep them)
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=llama3
```

### Step 3: Restart the Application

```bash
npm run dev
```

The application will now:
- Use Claude API for all summarization
- Display "Claude API" badge in the dashboard
- Show the Claude Playground instead of Ollama Playground
- Log token usage for each API call

### Step 4: Verify It's Working

1. Open http://localhost:3000
2. Check the dashboard header shows "AI Provider: Claude API"
3. Try the Claude Playground to test direct API access
4. Generate a summary and check the logs for Claude API calls

## Switching from Claude to Ollama

### Step 1: Install Ollama (if not already installed)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull the llama3 model
ollama pull llama3

# Start Ollama service
ollama serve
```

### Step 2: Update Environment Variables

Edit your `.env.local` file:

```bash
# Change AI provider
AI_PROVIDER=ollama
NEXT_PUBLIC_AI_PROVIDER=ollama

# Add Ollama configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# Claude API key no longer required (but you can keep it)
# ANTHROPIC_API_KEY=sk-ant-...
# CLAUDE_MODEL=claude-sonnet-4-20250514
```

### Step 3: Restart the Application

```bash
npm run dev
```

The application will now:
- Use local Ollama for all summarization
- Display "Ollama (Local)" badge in the dashboard
- Show the Ollama Playground
- No API costs or external requests

## Testing Your Configuration

### Test the Playground

**For Ollama**:
1. Go to the dashboard
2. See "Ollama Playground" section
3. Enter a test prompt: "Write a haiku about coding"
4. Click "Ask Ollama"
5. Should see response with token/duration stats

**For Claude**:
1. Go to the dashboard
2. See "Claude Playground" section
3. Enter a test prompt: "Write a haiku about coding"
4. Click "Ask Claude"
5. Should see response with token usage stats

### Test Summarization

1. Monitor a Teams channel
2. Fetch messages for a date
3. Click "Generate Summary"
4. Check the logs:
   - Ollama: `[Ollama] Calling API at http://localhost:11434`
   - Claude: `[Claude] Calling API with model claude-sonnet-4-20250514`

## Troubleshooting

### "ANTHROPIC_API_KEY is required when AI_PROVIDER=claude"

**Problem**: You set `AI_PROVIDER=claude` but didn't provide an API key.

**Solution**:
```bash
# Add to .env.local
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

### "OLLAMA_BASE_URL is required when AI_PROVIDER=ollama"

**Problem**: You set `AI_PROVIDER=ollama` but didn't configure Ollama variables.

**Solution**:
```bash
# Add to .env.local
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

### "Failed to generate summary after retries"

**For Claude**:
- Check your API key is valid
- Check you have API credits available
- Check internet connection
- Look for rate limit errors (429)

**For Ollama**:
- Check Ollama is running (`ollama serve`)
- Check the model is pulled (`ollama pull llama3`)
- Check the URL is correct (http://localhost:11434)

### Playground shows wrong provider

**Problem**: Dashboard shows "Claude Playground" but you want Ollama.

**Solution**: Check `NEXT_PUBLIC_AI_PROVIDER` matches `AI_PROVIDER`:
```bash
AI_PROVIDER=ollama
NEXT_PUBLIC_AI_PROVIDER=ollama  # Must match!
```

## Comparison: Ollama vs Claude

### Response Quality

**Ollama (llama3)**:
- Good for basic summaries
- May miss subtle context
- Sometimes verbose

**Claude (Sonnet 4)**:
- Excellent at understanding context
- Concise, well-structured summaries
- Better at extracting action items

### Response Speed

**Ollama**:
- Depends on your hardware
- Typical: 5-30 seconds per summary
- No network latency

**Claude API**:
- Consistent 2-5 seconds per summary
- Network-dependent
- Generally faster

### Privacy

**Ollama**:
- 100% private, all processing local
- No data ever leaves your machine
- Ideal for sensitive Teams conversations

**Claude API**:
- Data sent to Anthropic's cloud
- Subject to Anthropic's privacy policy
- Anthropic doesn't train on API data (as of 2025)

### Cost

**Ollama**:
- $0 forever
- Requires capable hardware (16GB+ RAM recommended)
- Electricity costs negligible

**Claude API**:
- ~$0.50-2 per day for typical usage
- No hardware requirements
- Pay-as-you-go pricing

## Best Practices

1. **Start with Ollama** to test the application without costs
2. **Try Claude for a week** to compare summary quality
3. **Use Claude for critical channels** where quality matters
4. **Use Ollama for high-volume** channels to save costs
5. **Monitor your Claude API usage** at console.anthropic.com

## Rollback Plan

If you encounter issues with Claude API:

1. Switch back to Ollama immediately:
   ```bash
   AI_PROVIDER=ollama
   NEXT_PUBLIC_AI_PROVIDER=ollama
   ```

2. Restart the dev server:
   ```bash
   npm run dev
   ```

3. Verify Ollama is working in the playground

The application is designed for seamless switching - no data migration needed!
