export const getCorsHeaders = (env: any) => {
  const origin = env.ENVIRONMENT === 'development' 
    ? 'http://localhost:3000'
    : env.ALLOWED_ORIGINS;

  return {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Cookie',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };
};

export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'Lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 // 7 days
};