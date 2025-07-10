export const getCorsHeaders = (env: any) => ({
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Origin': env.ENVIRONMENT === 'development' ? '*' : env.ALLOWED_ORIGINS,
  'Access-Control-Max-Age': '86400',
});

export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'Strict',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 // 7 days
};