import { decryptData, encryptData } from "./encryption";
import { OAuthTokenData } from "../types/types";

/**
 * Refresh an expired access token using the refresh token
 */
export async function refreshAccessToken(env: Env, badgrUsername: string): Promise<string> {
  // Get user with encrypted tokens from database
  const userResult = await env.DB
    .prepare('SELECT * FROM users WHERE badgr_username = ? LIMIT 1')
    .bind(badgrUsername)
    .all();
  
  if (userResult.results.length === 0) {
    throw new Error(`No user found with Badgr username: ${badgrUsername}`);
  }
  
  const user = userResult.results[0];
  
  if (!user.encrypted_refresh_token) {
    throw new Error(`No refresh token found for user: ${badgrUsername}`);
  }
  
  try {
    // Decrypt the refresh token
    const refreshToken = await decryptData(String(user.encrypted_refresh_token), env.ENCRYPTION_KEY);
    
    // Exchange refresh token for new access token
    const tokenResponse = await fetch(`${env.BADGR_API}/o/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: env.BADGR_CLIENT_ID,
        client_secret: env.BADGR_CLIENT_SECRET,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Token refresh failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }
    
    const tokenData: OAuthTokenData = await tokenResponse.json();
    
    // Ensure we have both tokens
    if (!tokenData.access_token || !tokenData.refresh_token) {
      throw new Error('Invalid token response: missing access_token or refresh_token');
    }
    
    // Encrypt the new tokens
    const encryptedAccessToken = await encryptData(tokenData.access_token, env.ENCRYPTION_KEY);
    const encryptedRefreshToken = await encryptData(tokenData.refresh_token, env.ENCRYPTION_KEY);
    
    // Calculate new expiration
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
    
    // Update user with new tokens
    const updateResult = await env.DB
      .prepare(`
        UPDATE users 
        SET encrypted_bearer_token = ?, 
            encrypted_refresh_token = ?,
            token_expires_at = ? 
        WHERE id = ?
      `)
      .bind(encryptedAccessToken, encryptedRefreshToken, expiresAt, user.id)
      .run();
    
    if (!updateResult.success) {
      throw new Error('Failed to update user with refreshed tokens');
    }
    
    console.log(`✅ Successfully refreshed token for user: ${badgrUsername}`);
    return tokenData.access_token;
    
  } catch (error) {
    console.error(`❌ Failed to refresh token for user: ${badgrUsername}`, error);
    throw error;
  }
}

/**
 * Check if a token is expired or will expire soon (within 5 minutes)
 */
export function isTokenExpired(expiresAt: string): boolean {
  const expirationTime = new Date(expiresAt).getTime();
  const currentTime = Date.now();
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  return currentTime >= (expirationTime - bufferTime);
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(env: Env, badgrUsername: string): Promise<string> {
  // Get user from database
  const userResult = await env.DB
    .prepare('SELECT * FROM users WHERE badgr_username = ? LIMIT 1')
    .bind(badgrUsername)
    .all();
  
  if (userResult.results.length === 0) {
    throw new Error(`No user found with Badgr username: ${badgrUsername}`);
  }
  
  const user = userResult.results[0];
  
  if (!user.encrypted_bearer_token) {
    throw new Error(`No access token found for user: ${badgrUsername}`);
  }
  
  // Check if token is expired or will expire soon
  if (user.token_expires_at && isTokenExpired(String(user.token_expires_at))) {
    console.log(`🔄 Token expired for user: ${badgrUsername}, refreshing...`);
    return await refreshAccessToken(env, badgrUsername);
  }
  
  // Token is still valid, decrypt and return
  try {
    const accessToken = await decryptData(String(user.encrypted_bearer_token), env.ENCRYPTION_KEY);
    return accessToken;
  } catch (error) {
    console.error(`❌ Failed to decrypt access token for user: ${badgrUsername}`, error);
    throw new Error(`Failed to decrypt access token for user: ${badgrUsername}`);
  }
} 