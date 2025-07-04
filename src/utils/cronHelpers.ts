import { User } from "../types/types";
import { decryptData, isValidEncryptedData } from "./encryption";

export const getPendingUsers = async(env: Env): Promise<User []> => {
    const { results }  = await env.DB
    .prepare('SELECT * FROM users WHERE badge_received = ?')
    .bind(false)
    .all<User>();
    return results;
}

export const getAccessToken = async (env: Env, badgrUsername: string): Promise<string> => {
    // Get user with encrypted token from database
    const userResult = await env.DB
        .prepare('SELECT * FROM users WHERE badgr_username = ? LIMIT 1')
        .bind(badgrUsername)
        .all<User>();
    
    if (userResult.results.length === 0) {
        throw new Error(`No user found with Badgr username: ${badgrUsername}`);
    }
    
    const user = userResult.results[0];
    
    if (!user.encrypted_bearer_token) {
        throw new Error(`No encrypted bearer token found for user: ${badgrUsername}`);
    }
    
    if (!isValidEncryptedData(user.encrypted_bearer_token)) {
        throw new Error(`Invalid encrypted token format for user: ${badgrUsername}`);
    }
    
    // Check if token is expired
    if (user.token_expires_at && new Date(user.token_expires_at) <= new Date()) {
        throw new Error(`Bearer token expired for user: ${badgrUsername}`);
    }
    
    try {
        // Decrypt the bearer token
        const decryptedToken = await decryptData(user.encrypted_bearer_token, (env as any).ENCRYPTION_KEY);
        return decryptedToken;
    } catch (error) {
        throw new Error(`Failed to decrypt bearer token for user: ${badgrUsername}`);
    }
};

export const getBadgeClassId = async (accessToken: string, env: Env) => {
	const response = await fetch(`${env.BADGR_API}/v2/badgeclasses?include_archived=false`, { 
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`,
		},
	});
	const data:any = await response.json();
	return data?.result[0]?.entityId; 
};