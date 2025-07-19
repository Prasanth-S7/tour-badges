import { CookieOptions } from "hono/utils/cookie";

export const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'Lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 // 7 days
};