# Tour Badges

This project is a Cloudflare Workers-based API designed to automate the issuance of digital badges for participants of the [JSON Schema Tour](https://tour.json-schema.org/). It integrates secure user authentication via OAuth 2.0 (Google, GitHub, Microsoft), manages user data in Cloudflare D1, issues badges through the Holopin API, and provides real-time Slack notifications for operational reports and errors.

## 📋 Table of Contents
- [Features](#features)
- [API Endpoints](#api-endpoints)
- [Environment Setup](#environment-setup)
- [Development](#development)
- [Testing Slack Notifications](#testing-slack-notifications)
- [Deployment](#deployment)

## ✨ Features

* **Automated Badge Issuance:** Automatically issues digital badges upon JSON Schema Tour completion.
* **Multi-Provider OAuth 2.0:** Supports secure user authentication via Google, GitHub, and Microsoft.
* **Cloudflare D1 Integration:** Utilizes a serverless SQL database for robust user and badge status management.
* **Holopin API Integration:** Seamlessly connects with Holopin for badge creation and distribution.
* **Real-time Slack Notifications:** Provides success, error, and critical alerts to administrators.
* **Duplicate Handling:** Ensures unique badge issuance for each valid tour completion.

## 🚀 API Endpoints

Here are the main API endpoints for interacting with Tour Badges:

* `POST /api/v1/auth/:provider`: Initiates OAuth 2.0 authentication (e.g., `/api/v1/auth/google`).
* `GET /api/v1/auth/:provider/callback`: Handles the OAuth 2.0 callback after user authentication.
* `POST /api/v1/user/claim`: Allows authenticated users to claim their tour completion badge. This endpoint verifies the user's status, prevents duplicate claims, updates their badge status to 'pending' in Cloudflare D1, and queues the badge for issuance.

## 🛠️ Environment Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Cloudflare account with Workers and D1 enabled
- Holopin API credentials

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
   # Add the OAuth credentials and API key
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


## 🚢 Deployment

### Deploy to Different Environments

```bash
# Deploy to development
npx wrangler deploy --env development

# Deploy to production
npx wrangler deploy --env production
```