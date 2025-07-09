import { Hono } from "hono";
import { googleAuth } from "@hono/oauth-providers/google";
import { githubAuth } from "@hono/oauth-providers/github";
import { msentraAuth } from "@hono/oauth-providers/msentra";
import { env } from "hono/adapter";
import { Bindings } from "../types/types";

export const auth = new Hono<{
  Bindings: Bindings
}>();

auth.get("/:provider", async (c, next) => {
    const provider = c.req.param("provider");
    const e = env(c);
    
    switch(provider){
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
        email = user?.mail ?? ""
        name = user?.userPrincipalName ?? user?.displayName ?? "";
        break;
      default:
        return c.json({ error: "Unsupported provider" }, 400);
    }
  
    if (user && email && name && providerName) {
      await env(c).DB.prepare(
        'INSERT INTO users (email, name, provider) VALUES (?, ?, ?)'
      ).bind(email, name, providerName).run();
    }
  
    const token = c.get("token");
    const grantedScopes = c.get("granted-scopes");
    return c.json({ token, grantedScopes, user });
  });