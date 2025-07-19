import { Bindings as HonoBindings } from "hono/types";

export interface User {
  id: number;
  email: string;
  name: string;
  badge_received: number;
  badge_status: string;
  created_at: string;
}

export interface Bindings extends HonoBindings{
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  MICROSOFT_CLIENT_ID: string;
  MICROSOFT_CLIENT_SECRET: string;
  HOLOPIN_API_KEY: string;
  HOLOPIN_STICKER_ID: string;
  FRONTEND_URL: string;
  ENVIRONMENT: "development" | "production";
  ALLOWED_ORIGINS: string;
  SLACK_WEBHOOK_URL: string;
  DB: D1Database;
}

export interface HolopinSuccessResponse {
  message: string;
  data :{
    id: string;
    stickerId: string;
    metadata: string;
  }
}

export interface FailedUser extends User {
  error: string;
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

export interface SlackMessage {
  text?: string;
  blocks?: any[];
  attachments?: any[];
}

export interface BadgeError {
  email: string;
  name: string;
  error: string;
  timestamp: string;
}

export interface ErrorReport {
  totalProcessed: number;
  totalFailed: number;
  totalSuccess: number;
  failedUsers: BadgeError[];
  environment: string;
  timestamp: string;
  duration: number;
}