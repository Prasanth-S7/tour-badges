import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { auth } from "../src/routes/auth";
import { Bindings } from "../src/types/types";

describe("Auth Routes", () => {
  let executionContext: any;
  let mockEnv: Bindings;

  beforeAll(async () => {
    // Set up the database schema
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        badge_received INTEGER DEFAULT 0,
        provider TEXT NOT NULL,
        badge_status TEXT DEFAULT 'registered',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  });

  beforeEach(async () => {
    executionContext = createExecutionContext();
    
    await env.DB.prepare("DELETE FROM users").run();
    
    mockEnv = {
      DB: env.DB,
      GOOGLE_CLIENT_ID: "mock-google-id",
      GOOGLE_CLIENT_SECRET: "mock-google-secret",
      GITHUB_CLIENT_ID: "mock-github-id", 
      GITHUB_CLIENT_SECRET: "mock-github-secret",
      MICROSOFT_CLIENT_ID: "mock-microsoft-id",
      MICROSOFT_CLIENT_SECRET: "mock-microsoft-secret",
      HOLOPIN_API_KEY: "mock-holopin-key",
      HOLOPIN_STICKER_ID: "mock-sticker-id",
      FRONTEND_URL: "http://localhost:3000",
      ENVIRONMENT: "development" as const,
      ALLOWED_ORIGINS: "http://localhost:3000",
      SLACK_WEBHOOK_URL: "mock-slack-url"
    };
  });

  afterEach(async () => {
    await waitOnExecutionContext(executionContext);
  });

  describe("GET /check", () => {
    it("should return unauthenticated when no cookie is present", async () => {
      const request = new (globalThis as any).Request("http://localhost/check", {
        method: "GET"
      });

      const response = await auth.fetch(request, mockEnv, executionContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        authenticated: false,
        user: null
      });
    });

    it("should return unauthenticated when user does not exist in database", async () => {
      const request = new (globalThis as any).Request("http://localhost/check", {
        method: "GET",
        headers: {
          "Cookie": "user_email=nonexistent@example.com"
        }
      });

      const response = await auth.fetch(request, mockEnv, executionContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        authenticated: false,
        user: null
      });
    });

    it("should return authenticated user when valid cookie and user exists", async () => {
      await env.DB.prepare(`
        INSERT INTO users (email, name, provider, badge_status) 
        VALUES (?, ?, ?, ?)
      `).bind("existing@example.com", "Existing User", "google", "registered").run();

      const request = new (globalThis as any).Request("http://localhost/check", {
        method: "GET",
        headers: {
          "Cookie": "user_email=existing@example.com"
        }
      });

      const response = await auth.fetch(request, mockEnv, executionContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.authenticated).toBe(true);
      expect(data.user).toEqual({
        email: "existing@example.com",
        name: "Existing User"
      });
    });
  });

  describe("GET /:provider - Error handling", () => {
    it("should return error for unsupported provider", async () => {
      const request = new (globalThis as any).Request("http://localhost/unsupported", {
        method: "GET"
      });

      const response = await auth.fetch(request, mockEnv, executionContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: "Unsupported provider"
      });
    });
  });
}); 