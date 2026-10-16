export interface Env {
  DATABASE_URL: string; JWT_ACCESS_SECRET: string; ACCESS_TOKEN_TTL: string;
  REFRESH_TOKEN_DAYS: number; API_PORT: number; WEB_ORIGIN: string; NODE_ENV: string;
}
export function validateEnv(raw: Record<string, unknown>): Env {
  const need = (k: string) => {
    const v = raw[k];
    if (typeof v !== 'string' || !v) throw new Error(`Missing required env var ${k}`);
    return v;
  };
  const secret = need('JWT_ACCESS_SECRET');
  if (secret.length < 32) throw new Error('JWT_ACCESS_SECRET must be at least 32 characters');
  if (raw.NODE_ENV === 'production') {
    if (raw.ALLOW_MOCK_ACCOUNTS === 'true') throw new Error('ALLOW_MOCK_ACCOUNTS must not be true in production');
    if (/^change-me/i.test(secret)) throw new Error('JWT_ACCESS_SECRET still has the placeholder value');
    if (Buffer.from(String(raw.TOKEN_ENCRYPTION_KEY ?? ''), 'base64').length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY (32 bytes, base64) is required in production');
  }
  return {
    DATABASE_URL: need('DATABASE_URL'), JWT_ACCESS_SECRET: secret,
    ACCESS_TOKEN_TTL: (raw.ACCESS_TOKEN_TTL as string) || '15m',
    REFRESH_TOKEN_DAYS: Number(raw.REFRESH_TOKEN_DAYS ?? 30),
    API_PORT: Number(raw.API_PORT ?? 4000),
    WEB_ORIGIN: (raw.WEB_ORIGIN as string) || 'http://localhost:3000',
    NODE_ENV: (raw.NODE_ENV as string) || 'development',
  };
}
