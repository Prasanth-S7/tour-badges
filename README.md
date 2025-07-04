# Tour Badges

A Cloudflare Workers-based API for managing tour enrollments and automated badge issuance with secure OAuth authentication.

## 📋 Table of Contents
- [Environment Setup](#environment-setup)
- [Secure OAuth Authentication](#secure-oauth-authentication)
- [Development](#development)
- [Testing Slack Notifications](#testing-slack-notifications)
- [Deployment](#deployment)

## 🛠️ Environment Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Cloudflare account with Workers and D1 enabled
- Badgr OAuth application credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tour-badges
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Create a cloudflare D1 instance**
   ```bash
   npx wrangler@latest d1 create db
   ```

4. **Run migrations**
   ```bash
   npx wrangler d1 migrations apply db --local
   npx wrangler d1 migrations apply db --remote
   ```

5. **Configure environment**
   ```bash
   cp wrangler.jsonc.example wrangler.jsonc
   # Edit wrangler.jsonc with your configurations and d1 credentials

   cp .dev.vars.development.example .dev.vars.development
   # Add the OAuth credentials and encryption key
   ```

## 🔐 Secure OAuth Authentication

This application uses a secure OAuth flow with encrypted token storage instead of storing username/password credentials.

### Security Features

- **🔒 Encrypted Token Storage**: Bearer tokens are encrypted using AES-GCM before storing in database
- **👤 User-Specific Tokens**: Each user has their own Badgr authentication token
- **⏰ Token Expiration**: Automatic handling of token expiration
- **🔄 OAuth Flow**: Proper OAuth 2.0 authorization code flow
- **🚫 No Hardcoded Credentials**: No username/password stored in environment variables

### OAuth Flow

1. **OAuth Authorization**: User authorizes with Badgr
2. **User Enrollment**: New users are automatically enrolled during OAuth callback
3. **Token Exchange**: Authorization code exchanged for access token
4. **Token Encryption**: Token encrypted and stored in database
5. **Badge Issuance**: Uses user-specific encrypted token

### Database Schema

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    badge_received INTEGER DEFAULT 0,
    badgr_username TEXT,                    -- Badgr username from OAuth
    encrypted_bearer_token TEXT,            -- Encrypted access token
    token_expires_at DATETIME,              -- Token expiration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Setting Up OAuth

1. **Create Badgr OAuth App**
   - Go to [Badgr Developer Portal](https://api.test.badgr.com/swagger-ui/index.html)
   - Create a new OAuth application
   - Set redirect URI to: `https://your-worker-domain.workers.dev/api/v1/oauth/callback`

2. **Generate Encryption Key**
   ```bash
   # Generate a secure encryption key
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. **Configure Environment Variables**
   ```bash
   # In .dev.vars.development
   BADGR_CLIENT_ID=your_client_id
   BADGR_CLIENT_SECRET=your_client_secret
   BADGR_REDIRECT_URI=https://your-worker-domain.workers.dev
   ENCRYPTION_KEY=your_generated_encryption_key
   ```

### OAuth Endpoints

- **GET `/api/v1/oauth/callback`**: Handles OAuth callback and user enrollment

### User Enrollment Process

1. **User visits Badgr OAuth URL**: `https://api.badgr.io/o/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=YOUR_REDIRECT_URI`
2. **User authorizes**: Grants permission to your application
3. **Badgr redirects**: To your callback URL with authorization code
4. **Automatic enrollment**: New users are created in database
5. **Token storage**: Encrypted token stored for future badge issuance

### Token Management

- **Encryption**: Uses AES-GCM with PBKDF2 key derivation
- **Storage**: Encrypted tokens stored in D1 database
- **Retrieval**: Decrypted on-demand for API calls
- **Expiration**: Automatic expiration checking and handling

## 🔧 Development

### Local Development
```bash
# Start local development server
npx wrangler dev
```

## 🧪 Testing Slack Notifications

### Setting Up Slack Webhook

1. **Create a Slack Webhook**
   - Go to your Slack workspace settings
   - Create a new app or use an existing one
   - Add an "Incoming Webhooks" integration
   - Copy the webhook URL

2. **Configure Environment Variables**
   ```bash
   # In .dev.vars.development
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```

### Testing Methods

#### Method 1: Local Node.js Test (Development)

**Option A: Using .env file (Recommended)**
```bash
# Create a .env file in the project root
echo "SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL" > .env

# Run the test script
node scripts/test-slack.js
```

**Option B: Export environment variable**
```bash
# Unix/Linux/macOS
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
node scripts/test-slack.js

# Windows Command Prompt
set SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
node scripts/test-slack.js

# PowerShell (Windows)
$env:SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
node scripts/test-slack.js
```

**Option C: Inline (one-liner)**
```bash
# Unix/Linux/macOS
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL node scripts/test-slack.js

# Windows Command Prompt
set SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL && node scripts/test-slack.js

# PowerShell
$env:SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"; node scripts/test-slack.js
```

#### Method 2: Cloudflare Workers Test (Recommended)
```bash
# Start the development server
npx wrangler dev

# In another terminal, test the endpoint
curl -X POST http://localhost:8787/api/v1/test-slack
```

The Workers test endpoint will:
- Test simple message sending
- Test success report notifications
- Test error report notifications
- Test critical error notifications
- Return detailed results for each test

### Expected Slack Messages

When testing, you should receive 4 different Slack messages:
1. **Simple Message**: Basic text notification
2. **Success Report**: Green notification with success metrics
3. **Error Report**: Red notification with error details
4. **Critical Error**: Red notification with stack trace

## 🚢 Deployment

### Deploy to Different Environments

```bash
# Deploy to development
npx wrangler deploy --env development

# Deploy to production
npx wrangler deploy
```

### Required Secrets

For production deployment, set these GitHub repository secrets:
- `BADGR_CLIENT_ID`: Your Badgr OAuth client ID
- `BADGR_CLIENT_SECRET`: Your Badgr OAuth client secret
- `ENCRYPTION_KEY`: Your encryption key
- `SLACK_WEBHOOK_URL`: Your Slack webhook URL (optional)