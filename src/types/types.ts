export interface User {
  id: number;
  email: string;
  name: string;
  badge_received: number;
  badgr_username?: string;
  encrypted_bearer_token?: string;
  token_expires_at?: string;
  created_at: string;
}

export interface FailedUser extends User {
  error: string;
}

export interface AccessTokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	scope: string;
	refresh_token: string;
}

export interface BadgeIssuanceResult {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
}

export interface BadgeIssuanceError {
  email: string;
  name: string;
  error: string;
  timestamp: string;
  retryCount?: number;
}

export interface OAuthTokenData {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  user_id: string;
  username: string;
}

export interface BadgrUser {
  entityId: string;
  entityType: string;
  openBadgeId: string;
  createdAt: string;
  createdBy: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
}


export interface BatchResult {
  successfulUsers: User[];
  failedUsers: BadgeIssuanceError[];
}