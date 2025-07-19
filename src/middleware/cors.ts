import { Context, Next } from "hono"
import { cors } from "hono/cors"
export const corsMiddleware = (c: Context, next: Next) => {
    const corsMiddlewareHandler = cors({
        origin: c.env.ENVIRONMENT === 'development' 
          ? 'http://localhost:3000'
          : c.env.ALLOWED_ORIGINS,
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
        credentials: true,
      })
    return corsMiddlewareHandler(c, next)
}