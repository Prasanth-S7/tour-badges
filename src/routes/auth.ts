import { Hono } from "hono";
import { googleAuth } from "@hono/oauth-providers/google";
import { githubAuth } from "@hono/oauth-providers/github";
import { msentraAuth } from "@hono/oauth-providers/msentra";
import { Bindings } from "../types/types";
import { cookieOptions } from "../constants/constants";
import {
  getCookie,
  setCookie,
} from 'hono/cookie'

export const auth = new Hono<{
  Bindings: Bindings
}>();

auth.get("/check", async (c) => {
  const userEmail = getCookie(c, 'user_email');
  
  if (!userEmail) {
    return c.json({ authenticated: false, user: null });
  }

  const user = await c.env.DB.prepare(
    'SELECT id, email, name FROM users WHERE email = ?'
  ).bind(userEmail).first();

  return c.json({ 
    authenticated: !!user,
    user: user ? {
      email: user.email,
      name: user.name
    } : null
  });
});

auth.get("/:provider", async (c, next) => {
  const provider = c.req.param("provider");
  const e = c.env;

  switch (provider) {
    case "google":
      return googleAuth({
        client_id: String(e.GOOGLE_CLIENT_ID),
        client_secret: String(e.GOOGLE_CLIENT_SECRET),
        scope: ["openid", "email", "profile"],
      })(c, next);
    case "github":
      return githubAuth({
        client_id: String(e.GITHUB_CLIENT_ID),
        client_secret: String(e.GITHUB_CLIENT_SECRET),
        scope: ["read:user", "user:email"],
        oauthApp: true
      })(c, next);
    case "microsoft":
      return msentraAuth({
        client_id: String(e.MICROSOFT_CLIENT_ID),
        client_secret: String(e.MICROSOFT_CLIENT_SECRET),
        scope: ["openid", "email", "profile"],
      })(c, next);
    default:
      return c.json({ error: "Unsupported provider" }, 400);
  }
}, async (c) => {
  const provider = c.req.param("provider");
  let user: any;
  let email = "";
  let name = "";
  let providerName = provider;

  switch (provider) {
    case "google":
      user = c.get("user-google");
      email = user?.email ?? "";
      name = user?.name ?? "";
      break;
    case "github":
      user = c.get("user-github");
      email = user?.email ?? "";
      name = user?.name ?? "";
      break;
    case "microsoft":
      user = c.get("user-msentra");
      email = user?.email ?? user?.mail ?? user?.userPrincipalName ?? "";
      name = user?.name ?? user?.displayName ?? "";
      break;
    default:
      console.log("Unsupported provider")
      return c.json({ error: "Unsupported provider" }, 400);
  }

  if (user && email && name && providerName) {
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO users (email, name, provider, badge_status) VALUES (?, ?, ?, ?)'
    ).bind(email, name, providerName, 'registered').run();
  }

  const token = c.get("token");
  const redirectUrl = new URL('/certificate', c.env.FRONTEND_URL);

  if (token) {
    setCookie(c, 'user_email', email, cookieOptions);
    redirectUrl.searchParams.set('cert', 'success');
    redirectUrl.searchParams.set('email', email);
    return c.redirect(redirectUrl.toString());
  }
  redirectUrl.searchParams.set('cert', 'error');
  return c.redirect(redirectUrl.toString());
});