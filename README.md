# Tour Badges

A Cloudflare Workers-based API for managing tour enrollments and automated badge issuance.

## 📋 Table of Contents
- [Environment Setup](#environment-setup)
- [Development](#development)
- [Testing Slack Notifications](#testing-slack-notifications)
- [Deployment](#deployment)

## 🛠️ Environment Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Cloudflare account with Workers and D1 enabled

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
   # Add the Badgr username and password
   ```

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