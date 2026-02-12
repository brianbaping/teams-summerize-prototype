# Production Deployment Guide

This guide explains how to switch from mock mode (development) to production mode with real Azure AD authentication and Microsoft Teams data.

## Prerequisites

Before deploying to production, ensure you have:

- ✅ Microsoft 365 account with Teams access
- ✅ Azure subscription (or Azure AD access)
- ✅ Ability to create Azure AD app registrations
- ✅ Ollama installed on production server (or accessible via network)
- ✅ Node.js 18.17+ on production server

## Step 1: Azure AD App Registration

### 1.1 Create App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations** → **New registration**
3. Configure:
   - **Name**: `Teams AI Summarizer`
   - **Supported account types**: "Accounts in this organizational directory only"
   - **Redirect URI**:
     - Platform: `Web`
     - URI: `https://your-domain.com/api/auth/callback/azure-ad`
     - For testing: `http://localhost:3000/api/auth/callback/azure-ad`
4. Click **Register**

### 1.2 Get Credentials

After registration:
1. Copy **Application (client) ID** → This is your `AZURE_AD_CLIENT_ID`
2. Copy **Directory (tenant) ID** → This is your `AZURE_AD_TENANT_ID`

### 1.3 Create Client Secret

1. Go to **Certificates & secrets** → **New client secret**
2. Add description: "Production Secret"
3. Choose expiration: 24 months (or as per your policy)
4. Click **Add**
5. **IMPORTANT**: Copy the **Value** immediately → This is your `AZURE_AD_CLIENT_SECRET`
   - ⚠️ You cannot retrieve this value later!

### 1.4 Configure API Permissions

1. Go to **API permissions** → **Add a permission**
2. Select **Microsoft Graph** → **Delegated permissions**
3. Add these permissions:
   - `Chat.Read` - Read user chat messages
   - `ChannelMessage.Read.All` - Read all channel messages
   - `Team.ReadBasic.All` - Read basic team information
   - `User.Read` - Sign in and read user profile (auto-added)
4. Click **Add permissions**
5. If you have admin privileges: Click **Grant admin consent for [Your Organization]**
   - If not, request admin approval

## Step 2: Configure Production Environment

### 2.1 Update Environment Variables

Create or update `.env.local` (or `.env.production` for deployment):

```env
# Switch to Production Mode
USE_MOCK_AUTH=false
USE_MOCK_DATA=false
NEXT_PUBLIC_USE_MOCK_AUTH=false

# Microsoft Azure (use real credentials from Step 1)
AZURE_AD_CLIENT_ID=your_application_client_id_here
AZURE_AD_CLIENT_SECRET=your_client_secret_value_here
AZURE_AD_TENANT_ID=your_directory_tenant_id_here

# NextAuth
NEXTAUTH_URL=https://your-domain.com  # Your production URL
NEXTAUTH_SECRET=your_generated_secret_here  # Generate with: openssl rand -base64 32

# Ollama (adjust for production server)
OLLAMA_BASE_URL=http://localhost:11434  # Or network URL if Ollama is remote
OLLAMA_MODEL=llama3

# Database
DATABASE_PATH=./data/app.db  # Or absolute path for production
```

### 2.2 Generate NextAuth Secret

```bash
openssl rand -base64 32
```

Copy the output to `NEXTAUTH_SECRET` in your `.env` file.

### 2.3 Security Checklist

- [ ] All secrets are stored securely (never commit to git)
- [ ] `.env.local` and `.env.production` are in `.gitignore`
- [ ] NEXTAUTH_SECRET is at least 32 characters
- [ ] Client secret expires and has renewal plan
- [ ] Redirect URI matches exactly (protocol, domain, path)

## Step 3: Set Up Production Server

### 3.1 Install Ollama on Server

```bash
# On Linux server
curl -fsSL https://ollama.com/install.sh | sh

# Pull the model
ollama pull llama3

# Start Ollama service (or configure as systemd service)
ollama serve
```

### 3.2 Deploy Application

#### Option A: Build and Run Locally

```bash
# Install dependencies
npm install --production

# Build for production
npm run build

# Start production server
npm start
```

#### Option B: Use PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Build the app
npm run build

# Start with PM2
pm2 start npm --name "teams-summarizer" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### Option C: Docker (if containerizing)

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 3.3 Configure Reverse Proxy (Nginx example)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Step 4: Verify Production Setup

### 4.1 Test Authentication

1. Visit your production URL: `https://your-domain.com`
2. Click "Sign in with Microsoft"
3. Verify OAuth redirect works
4. Check that you're signed in successfully

### 4.2 Test Microsoft Graph Integration

1. After signing in, go to Channel Selector
2. You should see your real Teams channels
3. Select a channel and add it
4. Verify it appears in "Currently Monitoring"

### 4.3 Test Message Fetching

1. In Message Viewer, select your monitored channel
2. Click "Refresh Messages"
3. Verify real Teams messages appear
4. Check database: `sqlite3 data/app.db`
   ```sql
   SELECT COUNT(*) FROM messages;
   ```

### 4.4 Test AI Summarization

1. In AI Summarization panel, select channel and date
2. Click "Generate Summary"
3. Verify Ollama generates summary
4. Check formatted output appears correctly
5. Verify summary is saved:
   ```sql
   SELECT * FROM summaries ORDER BY generated_at DESC LIMIT 1;
   ```

## Step 5: Production Monitoring

### 5.1 Application Logs

```bash
# If using PM2
pm2 logs teams-summarizer

# If using systemd
journalctl -u teams-summarizer -f
```

### 5.2 Database Maintenance

```bash
# Backup database regularly
cp data/app.db data/backups/app-$(date +%Y%m%d).db

# Check database size
du -h data/app.db

# Optional: Set up automatic cleanup of old messages
```

### 5.3 Monitor Ollama

```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Monitor Ollama logs
journalctl -u ollama -f  # if using systemd
```

## Troubleshooting Production Issues

### Authentication Fails

**Symptom**: Redirect loop or "invalid_request" error

**Solutions**:
1. Verify redirect URI in Azure matches exactly:
   - Azure: `https://your-domain.com/api/auth/callback/azure-ad`
   - Code: Same URL
2. Check NEXTAUTH_URL has correct protocol (https in production)
3. Ensure no trailing slashes in URLs
4. Clear browser cookies and try again

### No Teams Channels Appear

**Symptom**: Channel list is empty

**Solutions**:
1. Check admin consent was granted for Graph API permissions
2. Verify user has access to Teams channels
3. Check Graph API scopes in auth configuration
4. Test Graph API manually:
   ```bash
   # Get access token from Network tab
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://graph.microsoft.com/v1.0/me/joinedTeams
   ```

### Ollama Connection Fails

**Symptom**: "Failed to generate summary" with connection error

**Solutions**:
1. Verify Ollama is running: `curl http://localhost:11434/api/tags`
2. Check OLLAMA_BASE_URL in environment variables
3. If Ollama is remote, ensure network connectivity
4. Check firewall rules allow connection to Ollama port

### Database Lock Errors

**Symptom**: "database is locked" errors

**Solutions**:
1. Ensure only one app instance accesses database
2. Check for stale lock files
3. Consider using WAL mode:
   ```sql
   PRAGMA journal_mode=WAL;
   ```

## Security Best Practices

### 1. Environment Variables
- ✅ Never commit `.env` files to git
- ✅ Use environment variable injection in deployment platform
- ✅ Rotate secrets regularly (especially client secrets)

### 2. Network Security
- ✅ Use HTTPS in production (required for OAuth)
- ✅ Configure firewall to only allow necessary ports
- ✅ Consider IP whitelisting for Ollama if exposed

### 3. Data Protection
- ✅ Backup database regularly
- ✅ Encrypt database at rest if containing sensitive data
- ✅ Set up log rotation to prevent disk fill
- ✅ Review data retention policies

### 4. Access Control
- ✅ Limit Azure AD app permissions to minimum required
- ✅ Regularly review who has access
- ✅ Set up audit logging for admin actions

## Scaling Considerations

### Handling Large Teams

If your Teams channels have thousands of messages:

1. **Implement pagination limits**:
   ```typescript
   // In lib/microsoft-graph.ts
   const MAX_MESSAGES_PER_FETCH = 1000;
   ```

2. **Use background jobs** for message syncing:
   - Consider cron jobs or scheduled tasks
   - Avoid synchronous fetching during user requests

3. **Database optimization**:
   ```sql
   -- Add indexes for common queries
   CREATE INDEX idx_messages_channel_date ON messages(channel_id, created_at);
   CREATE INDEX idx_summaries_channel ON summaries(channel_id);
   ```

### Multiple Users

This app is designed for single-user use. For multi-user:

1. Add user ID column to all tables
2. Filter queries by user ID
3. Update authentication to support multiple users
4. Consider using PostgreSQL instead of SQLite

## Rollback Plan

If you need to revert to mock mode:

```bash
# Update .env.local
USE_MOCK_AUTH=true
USE_MOCK_DATA=true
NEXT_PUBLIC_USE_MOCK_AUTH=true

# Restart application
pm2 restart teams-summarizer  # if using PM2
# or
npm run dev  # for development
```

## Support & Maintenance

### Regular Tasks

- [ ] Weekly: Check application logs for errors
- [ ] Monthly: Review and rotate secrets if needed
- [ ] Monthly: Backup database
- [ ] Quarterly: Update dependencies (`npm outdated`)
- [ ] Yearly: Renew Azure AD client secret

### Getting Help

1. Check error logs first
2. Review troubleshooting section above
3. Check [docs/](docs/) for architecture details
4. Review test files for expected behavior

## Next Steps After Production

Once running in production, consider:

1. **Automated Summaries**: Set up cron jobs to auto-generate daily summaries
2. **Notifications**: Email or Slack notifications when summaries are ready
3. **Export**: Add PDF/Markdown export functionality
4. **Analytics**: Track which summaries are most useful
5. **Multi-Channel**: Support monitoring multiple channels simultaneously

---

**You're all set!** Your Teams AI Summarizer is now running in production with real Microsoft Teams data. 🚀
