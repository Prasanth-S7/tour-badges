import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { user } from "../src/routes/user";
import { Bindings } from "../src/types/types";

describe("User Routes", () => {
  let executionContext: any;
  let mockEnv: Bindings;

  beforeAll(async () => {
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

  describe("POST /claim", () => {
    it("should return error when no user_email cookie is present", async () => {
      const request = new (globalThis as any).Request("http://localhost/claim", {
        method: "POST"
      });

      const response = await user.fetch(request, mockEnv, executionContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: 'User email not found'
      });
    });

    it("should return error when user does not exist in database", async () => {
      const request = new (globalThis as any).Request("http://localhost/claim", {
        method: "POST",
        headers: {
          "Cookie": "user_email=nonexistent@example.com"
        }
      });

      const response = await user.fetch(request, mockEnv, executionContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        error: 'User not found'
      });
    });

    it("should update user status to pending when user is registered", async () => {
      await env.DB.prepare(`
        INSERT INTO users (email, name, provider, badge_status, badge_received) 
        VALUES (?, ?, ?, ?, ?)
      `).bind("registered@example.com", "Registered User", "google", "registered", 0).run();

      const request = new (globalThis as any).Request("http://localhost/claim", {
        method: "POST",
        headers: {
          "Cookie": "user_email=registered@example.com"
        }
      });

      const response = await user.fetch(request, mockEnv, executionContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('You will receive an email when your badge is ready');
      expect(data.user).toEqual({
        email: "registered@example.com",
        name: "Registered User",
        status: "pending"
      });

      const updatedUser = await env.DB.prepare(
        "SELECT badge_status FROM users WHERE email = ?"
      ).bind("registered@example.com").first();

      expect(updatedUser?.badge_status).toBe("pending");
    });

    it("should return error when badge is already claimed (pending status)", async () => {
      await env.DB.prepare(`
        INSERT INTO users (email, name, provider, badge_status, badge_received) 
        VALUES (?, ?, ?, ?, ?)
      `).bind("pending@example.com", "Pending User", "google", "pending", 0).run();

      const request = new (globalThis as any).Request("http://localhost/claim", {
        method: "POST",
        headers: {
          "Cookie": "user_email=pending@example.com"
        }
      });

      const response = await user.fetch(request, mockEnv, executionContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Badge already claimed');
      expect(data.message).toBe('Your badge is being processed. You will receive an email when it is ready.');
      expect(data.user).toEqual({
        email: "pending@example.com",
        name: "Pending User",
        status: "pending"
      });
    });

    it("should return error when badge is already received", async () => {
      await env.DB.prepare(`
        INSERT INTO users (email, name, provider, badge_status, badge_received) 
        VALUES (?, ?, ?, ?, ?)
      `).bind("received@example.com", "Received User", "google", "issued", 1).run();

      const request = new (globalThis as any).Request("http://localhost/claim", {
        method: "POST",
        headers: {
          "Cookie": "user_email=received@example.com"
        }
      });

      const response = await user.fetch(request, mockEnv, executionContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Badge already received');
      expect(data.message).toBe('You have already received your badge. Please check your email');
      expect(data.user).toEqual({
        email: "received@example.com",
        name: "Received User",
        status: "issued"
      });
    });
  });
});
