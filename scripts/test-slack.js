#!/usr/bin/env node

/**
 * Test script for Slack notifications
 * Usage: node scripts/test-slack.js
 * 
 * Note: This script is for local testing. In Cloudflare Workers,
 * environment variables are accessed through the `env` parameter.
 */

// Try to load .env file if it exists
try {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '..', '.env');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    });
    console.log('📄 Loaded environment variables from .env file');
  }
} catch (error) {
  // Ignore errors if .env file doesn't exist or can't be read
}

// For local testing, we can still use process.env
// In Cloudflare Workers, this would be accessed via env.SLACK_WEBHOOK_URL
const webhookUrl = process.env.SLACK_WEBHOOK_URL;

if (!webhookUrl) {
  console.error('SLACK_WEBHOOK_URL environment variable is required');
  console.log('');
  console.log('Set it using one of these methods:');
  console.log('');
  console.log('1. Export (Unix/Linux/macOS):');
  console.log('   export SLACK_WEBHOOK_URL=your_webhook_url');
  console.log('');
  console.log('2. Set (Windows Command Prompt):');
  console.log('   set SLACK_WEBHOOK_URL=your_webhook_url');
  console.log('');
  console.log('3. PowerShell (Windows):');
  console.log('   $env:SLACK_WEBHOOK_URL="your_webhook_url"');
  console.log('');
  console.log('4. Create a .env file in the project root:');
  console.log('   SLACK_WEBHOOK_URL=your_webhook_url');
  console.log('');
  console.log('5. Inline (one-liner):');
  console.log('   SLACK_WEBHOOK_URL=your_webhook_url node scripts/test-slack.js');
  console.log('');
  console.log('For Cloudflare Workers:');
  console.log('1. Add SLACK_WEBHOOK_URL to your wrangler.toml or .dev.vars file');
  console.log('2. Access it in your code via env.SLACK_WEBHOOK_URL');
  process.exit(1);
}

async function testSlackNotification() {
  console.log('Testing Slack notification...');
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Test notification from Tour Badges system',
        attachments: [
          {
            color: '#36a64f',
            title: 'Slack Integration Test',
            text: 'This is a test message to verify Slack notifications are working correctly.',
            fields: [
              {
                title: 'Environment',
                value: process.env.NODE_ENV || 'test',
                short: true,
              },
              {
                title: 'Timestamp',
                value: new Date().toISOString(),
                short: true,
              },
            ],
            footer: 'Tour Badges System',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      }),
    });

    if (response.ok) {
      console.log('Slack notification sent successfully!');
      console.log('Check your Slack channel for the test message.');
    } else {
      console.error('Failed to send Slack notification:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error sending Slack notification:', error.message);
  }
}

testSlackNotification();