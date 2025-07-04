import { encryptData } from "../utils/encryption";
import { OAuthTokenData, BadgrUser } from "../types/types";

export const oauthCallback = async (request: Request, env: Env, createResponse: (data: any, status?: number) => Response) => {
  try {
    const { pathname, searchParams } = new URL(request.url);
    
    if (pathname === '/api/v1/oauth/callback') {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      
      if (error) {
        return createResponse({
          success: false,
          error: `OAuth error: ${error}`,
          error_description: searchParams.get('error_description')
        }, 400);
      }
      
      if (!code) {
        return createResponse({
          success: false,
          error: 'Authorization code not provided'
        }, 400);
      }
      
      // Exchange authorization code for access token
      const tokenResponse = await fetch(`${env.BADGR_API}/o/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          client_id: (env as any).BADGR_CLIENT_ID,
          client_secret: (env as any).BADGR_CLIENT_SECRET,
          redirect_uri: `${(env as any).BADGR_REDIRECT_URI}/api/v1/oauth/callback`,
        }),
      });
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        return createResponse({
          success: false,
          error: 'Failed to exchange authorization code for token',
          details: errorData
        }, 400);
      }
      
      const tokenData: OAuthTokenData = await tokenResponse.json();
      
      // Get user information from Badgr
      const userResponse = await fetch(`${env.BADGR_API}/v2/users/self`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!userResponse.ok) {
        return createResponse({
          success: false,
          error: 'Failed to get user information from Badgr'
        }, 400);
      }
      
      const badgrUser = await userResponse.json() as BadgrUser;
      
      // Check if user exists in our database by email
      const existingUserResult = await env.DB
        .prepare('SELECT * FROM users WHERE email = ? LIMIT 1')
        .bind(badgrUser.email)
        .all();
      
      let user;
      let isNewUser = false;
      
      if (existingUserResult.results.length === 0) {
        const insertResult = await env.DB
          .prepare(`
            INSERT INTO users (name, email, badge_received, badgr_username, encrypted_bearer_token, encrypted_refresh_token, token_expires_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            `${badgrUser.firstName} ${badgrUser.lastName}`,
            badgrUser.email,
            false,
            badgrUser.username,
            await encryptData(tokenData.access_token, (env as any).ENCRYPTION_KEY),
            await encryptData(tokenData.refresh_token, (env as any).ENCRYPTION_KEY),
            new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
          )
          .run();
        
        if (!insertResult.success) {
          return createResponse({
            success: false,
            error: 'Failed to create new user during enrollment'
          }, 500);
        }
        
        const newUserResult = await env.DB
          .prepare('SELECT * FROM users WHERE email = ? LIMIT 1')
          .bind(badgrUser.email)
          .all();
        
        user = newUserResult.results[0];
        isNewUser = true;
      } else {
        user = existingUserResult.results[0];
        
        const encryptedToken = await encryptData(tokenData.access_token, (env as any).ENCRYPTION_KEY);
        const encryptedRefreshToken = await encryptData(tokenData.refresh_token, (env as any).ENCRYPTION_KEY);
        
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
        
        const updateResult = await env.DB
          .prepare(`
            UPDATE users 
            SET badgr_username = ?, 
                encrypted_bearer_token = ?, 
                encrypted_refresh_token = ?,
                token_expires_at = ? 
            WHERE id = ?
          `)
          .bind(badgrUser.username, encryptedToken, encryptedRefreshToken, expiresAt, user.id)
          .run();
        
        if (!updateResult.success) {
          return createResponse({
            success: false,
            error: 'Failed to update user with Badgr credentials'
          }, 500);
        }
      }
      
      return createResponse({
        success: true,
        message: isNewUser ? 'User enrolled and OAuth authentication successful' : 'OAuth authentication successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          badgr_username: badgrUser.username,
          is_new_user: isNewUser
        }
      }, 200);
      
    } else {
      return createResponse({
        success: false,
        error: 'Endpoint not found'
      }, 404);
    }
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return createResponse({
      success: false,
      error: 'Internal server error during OAuth callback'
    }, 500);
  }
}; 