import { SlackMessage, ErrorReport, BadgeError } from "../types/types";
import pRetry from "p-retry";
export class SlackNotifier {
  private webhookUrl: string;
  private environment: string;
  private retryOptions = {
    retries: 3,
    minTimeout: 1000,
    maxTimeout: 8000
  };

  constructor(webhookUrl: string, environment: string) {
    this.webhookUrl = webhookUrl;
    this.environment = environment;
  }

  private getRetryOptions(operationType: string) {
    return {
      ...this.retryOptions,
      onFailedAttempt: (error: any) => {
        console.log(`Retrying Slack ${operationType}, attempt ${error.attemptNumber}: ${error.message}`);
      }
    };
  }

  /**
   * Send a simple text message to Slack
   */
  async sendMessage(message: string): Promise<boolean> {
    try {
      const response = await pRetry(async () => fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message,
        }),
      }), this.getRetryOptions('message'));

      return response.ok;
    } catch (error) {
      console.error('Failed to send Slack message:', error);
      return false;
    }
  }

  /**
   * Send a detailed error report for badge issuance failures
   */
  async sendErrorReport(report: ErrorReport): Promise<boolean> {
    try {
      const message = this.createErrorReportMessage(report);
      
      const response = await pRetry(async () => fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }), this.getRetryOptions('error report'));

      return response.ok;
    } catch (error) {
      console.error('Failed to send error report to Slack:', error);
      return false;
    }
  }

  /**
   * Send a critical error notification
   */
  async sendCriticalError(error: Error, context: string): Promise<boolean> {
    try {
      const message = this.createCriticalErrorMessage(error, context);
      
      const response = await pRetry(async () => fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }), this.getRetryOptions('critical error'));

      return response.ok;
    } catch (error) {
      console.error('Failed to send critical error to Slack:', error);
      return false;
    }
  }

  /**
   * Send a success notification
   */
  async sendSuccessReport(totalProcessed: number, totalSuccess: number, duration: number): Promise<boolean> {
    try {
      const message = this.createSuccessMessage(totalProcessed, totalSuccess, duration);
      
      const response = await pRetry(async () => fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }), this.getRetryOptions('success report'));

      return response.ok;
    } catch (error) {
      console.error('Failed to send success report to Slack:', error);
      return false;
    }
  }

  private createErrorReportMessage(report: ErrorReport): SlackMessage {
    const color = report.totalFailed > 0 ? '#ff0000' : '#00ff00';
    const emoji = report.totalFailed > 0 ? '🚨' : '✅';
    
    const fields = [
      {
        title: 'Environment',
        value: report.environment,
        short: true,
      },
      {
        title: 'Total Processed',
        value: report.totalProcessed.toString(),
        short: true,
      },
      {
        title: 'Successful',
        value: report.totalSuccess.toString(),
        short: true,
      },
      {
        title: 'Failed',
        value: report.totalFailed.toString(),
        short: true,
      },
      {
        title: 'Duration',
        value: `${report.duration}ms`,
        short: true,
      },
    ];

    if (report.failedUsers.length > 0) {
      const failedList = report.failedUsers
        .slice(0, 10) // Limit to first 10 failures
        .map(user => `• ${user.name} (${user.email}): ${user.error}`)
        .join('\n');

      fields.push({
        title: 'Failed Users',
        value: failedList + (report.failedUsers.length > 10 ? '\n... and more' : ''),
        short: false,
      });
    }

    return {
      attachments: [
        {
          color: color,
          title: `${emoji} Badge Issuance Report`,
          text: `Badge issuance completed with ${report.totalFailed} failures`,
          fields: fields,
          footer: 'Tour Badges System',
          ts: Math.floor(new Date(report.timestamp).getTime() / 1000),
        },
      ],
    };
  }

  private createCriticalErrorMessage(error: Error, context: string): SlackMessage {
    return {
      attachments: [
        {
          color: '#ff0000',
          title: '🚨 Critical Error in Tour Badges System',
          text: `A critical error occurred during ${context}`,
          fields: [
            {
              title: 'Environment',
              value: this.environment,
              short: true,
            },
            {
              title: 'Error Type',
              value: error.name,
              short: true,
            },
            {
              title: 'Error Message',
              value: error.message,
              short: false,
            },
            {
              title: 'Stack Trace',
              value: error.stack || 'No stack trace available',
              short: false,
            },
          ],
          footer: 'Tour Badges System',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };
  }

  private createSuccessMessage(totalProcessed: number, totalSuccess: number, duration: number): SlackMessage {
    return {
      attachments: [
        {
          color: '#00ff00',
          title: '✅ Badge Issuance Success',
          text: `Successfully processed ${totalSuccess} out of ${totalProcessed} users`,
          fields: [
            {
              title: 'Environment',
              value: this.environment,
              short: true,
            },
            {
              title: 'Success Rate',
              value: `${((totalSuccess / totalProcessed) * 100).toFixed(1)}%`,
              short: true,
            },
            {
              title: 'Duration',
              value: `${duration}ms`,
              short: true,
            },
          ],
          footer: 'Tour Badges System',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };
  }
}

/**
 * Create a Slack notifier instance from environment variables
 */
export function createSlackNotifier(env: any): SlackNotifier | null {
  const webhookUrl = env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not configured, Slack notifications disabled');
    return null;
  }

  return new SlackNotifier(webhookUrl, env.ENVIRONMENT);
} 