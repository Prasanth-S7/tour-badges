export interface User {
  id: number;
  email: string;
  name: string;
  badge_received: number;
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


export interface BatchResult {
  successfulUsers: User[];
  failedUsers: BadgeIssuanceError[];
}