import { getPendingUsers } from "../utils/cronHelpers";
import { User, BadgeIssuanceError, BatchResult, Bindings } from "../types/types";
import { issueBadge } from "./issueBadge";
import { createSlackNotifier } from "../utils/slack";
import { ErrorReport } from "../types/types";

export async function processPendingUsers(env: Bindings): Promise<void> {
  const BATCH_SIZE = 10;
  const startTime = Date.now();
  
  try {
    // Get pending users
    const pendingUsers = await getPendingUsers();
    
    if (pendingUsers.length === 0) {
      console.log('No pending users to process');
      return;
    }
    
    console.log(`Starting to process ${pendingUsers.length} pending users`);
    
    // Process in batches
    const allFailedUsers: BadgeIssuanceError[] = [];
    const allSuccessfulUsers: User[] = [];
    
    for (let i = 0; i < pendingUsers.length; i += BATCH_SIZE) {
      const batch = pendingUsers.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(pendingUsers.length / BATCH_SIZE)}`);
      
      const batchResult = await processBatch(batch, env);
      allFailedUsers.push(...batchResult.failedUsers);
      allSuccessfulUsers.push(...batchResult.successfulUsers);
    }
    
    const duration = Date.now() - startTime;
    const totalProcessed = pendingUsers.length;
    const totalSuccess = allSuccessfulUsers.length;
    const totalFailed = allFailedUsers.length;
    
    // Create error report
    const errorReport: ErrorReport = {
      totalProcessed,
      totalFailed,
      totalSuccess,
      failedUsers: allFailedUsers.map(user => ({
        email: user.email,
        name: user.name,
        error: user.error,
        timestamp: user.timestamp
      })),
      environment: env.ENVIRONMENT,
      timestamp: new Date().toISOString(),
      duration
    };
    
    // Send notifications
    const slackNotifier = createSlackNotifier(env);
    
    if (slackNotifier) {
      if (totalFailed > 0) {
        await slackNotifier.sendErrorReport(errorReport);
        console.log(`Sent error report to Slack for ${totalFailed} failures`);
      } else if (totalSuccess > 0) {
        await slackNotifier.sendSuccessReport(totalProcessed, totalSuccess, duration);
        console.log(`Sent success report to Slack for ${totalSuccess} successful issuances`);
      }
    }
    
    // Log summary
    console.log(`Processing complete: ${totalSuccess}/${totalProcessed} successful (${duration}ms)`);
    if (totalFailed > 0) {
      console.log(`${totalFailed} failures occurred`);
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('Critical error in user processing:', error);
    
    // Send critical error notification
    const slackNotifier = createSlackNotifier(env);
    if (slackNotifier) {
      await slackNotifier.sendCriticalError(error, 'badge issuance processing');
      console.log('Sent critical error notification to Slack');
    }
  }
}

async function processBatch(batch: User[], env: Bindings): Promise<BatchResult> {
  const successfulUsers: User[] = [];
  const failedUsers: BadgeIssuanceError[] = [];

  // Process users in parallel with individual error handling
  const results = await Promise.allSettled(
    batch.map(async (user) => {
      try {
        const result = await issueBadge(user.email, user.name, env);
        return { user, result };
      } catch (error) {
        return { 
          user, 
          result: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            statusCode: 500
          }
        };
      }
    })
  );

  // Process results
  results.forEach((promiseResult) => {
    if (promiseResult.status === 'fulfilled') {
      const { user, result } = promiseResult.value;
      
      if (result.success) {
        successfulUsers.push(user);
      } else {
        failedUsers.push({
          ...user,
          error: result.error || 'Unknown error',
          timestamp: new Date().toISOString(),
          retryCount: 0
        });
      }
    } else {
      // Promise was rejected - this shouldn't happen with our try-catch
      const user = batch[results.indexOf(promiseResult)];
      failedUsers.push({
        ...user,
        error: promiseResult.reason instanceof Error ? promiseResult.reason.message : 'Promise rejected',
        timestamp: new Date().toISOString(),
        retryCount: 0
      });
    }
  });

  // Update successful users in database
  if (successfulUsers.length > 0) {
    try {
      const placeholders = successfulUsers.map(() => '?').join(',');
      const userIds = successfulUsers.map(user => user.id);
      
      await env.DB
        .prepare(`UPDATE users SET badge_received = ? WHERE id IN (${placeholders})`)
        .bind(true, ...userIds)
        .run();
        
      console.log(`Successfully updated ${successfulUsers.length} users in database`);
    } catch (dbError) {
      console.error('Failed to update successful users in database:', dbError);
      
      // Add database errors to failed users
      successfulUsers.forEach(user => {
        failedUsers.push({
          ...user,
          error: `Database update failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
          retryCount: 0
        });
      });
      
      // Clear successful users since database update failed
      successfulUsers.length = 0;
    }
  }

  // Log batch results
  if (successfulUsers.length > 0) {
    console.log(`✅ Batch completed: ${successfulUsers.length} successful, ${failedUsers.length} failed`);
  }
  
  if (failedUsers.length > 0) {
    failedUsers.forEach(user => {
      console.error(`❌ Failed to issue badge to ${user.email}: ${user.error}`);
    });
  }

  return { successfulUsers, failedUsers };
}
