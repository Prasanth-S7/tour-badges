import { Hono } from "hono";
import { googleAuth } from "@hono/oauth-providers/google";
import { githubAuth } from "@hono/oauth-providers/github";
import { msentraAuth } from "@hono/oauth-providers/msentra";
import { Bindings } from "../types/types";
import { cookieOptions, getCorsHeaders } from "../constants/cors";

export const auth = new Hono<{
  Bindings: Bindings
}>();

auth.options("*", (c) => {
  const corsHeaders = getCorsHeaders(c.env);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    c.header(key, value);
  });
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
});

auth.get("/check", async (c) => {
  const corsHeaders = getCorsHeaders(c.env);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    c.header(key, value);
  });

  const authCookie = c.req.header('Cookie');
  if (!authCookie) {
    return c.json({ authenticated: false });
  }

  const cookies = authCookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key.trim()] = value;
    return acc;
  }, {} as { [key: string]: string });

  const userEmail = cookies.user_email;
  if (!userEmail) {
    return c.json({ authenticated: false });
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
  // Add CORS headers
  const corsHeaders = getCorsHeaders(c.env);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    c.header(key, value);
  });

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
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();

    if (!existingUser) {
      await c.env.DB.prepare(
        'INSERT INTO users (email, name, provider, badge_status) VALUES (?, ?, ?, ?)'
      ).bind(email, name, providerName, 'registered').run();
    }
  }

  const token = c.get("token");

  c.header('Set-Cookie', `auth_token=${token ? String(token) : ''}; ${Object.entries(cookieOptions).map(([k, v]) => `${k}=${v}`).join('; ')}`);
  c.header('Set-Cookie', `user_email=${email}; ${Object.entries(cookieOptions).map(([k, v]) => `${k}=${v}`).join('; ')}`);

  if (c.env.FRONTEND_URL) {
    const redirectUrl = new URL('/certificate', c.env.FRONTEND_URL);
    redirectUrl.searchParams.set('cert', 'success');
    redirectUrl.searchParams.set('email', email);
    return c.redirect(redirectUrl.toString());
  } else {
    return c.redirect(`http://localhost:3000/?cert=error`);;
  }
});