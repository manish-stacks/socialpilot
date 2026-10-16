import { validateEnv } from './env';
describe('validateEnv', () => {
  const ok = { DATABASE_URL: 'mysql://x', JWT_ACCESS_SECRET: 'x'.repeat(32) };
  it('applies defaults', () => expect(validateEnv(ok).API_PORT).toBe(4000));
  it('rejects short secret', () => expect(() => validateEnv({ ...ok, JWT_ACCESS_SECRET: 'short' })).toThrow());
  it('rejects missing DATABASE_URL', () => expect(() => validateEnv({ JWT_ACCESS_SECRET: ok.JWT_ACCESS_SECRET })).toThrow());
});
describe('production hardening', () => {
  const prod = { DATABASE_URL: 'mysql://x', JWT_ACCESS_SECRET: 'a'.repeat(40), NODE_ENV: 'production', TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64') };
  it('accepts a sane production config', () => expect(() => validateEnv(prod)).not.toThrow());
  it('refuses mock accounts, placeholder secrets and a missing encryption key', () => {
    expect(() => validateEnv({ ...prod, ALLOW_MOCK_ACCOUNTS: 'true' })).toThrow();
    expect(() => validateEnv({ ...prod, JWT_ACCESS_SECRET: 'change-me-' + 'x'.repeat(30) })).toThrow();
    expect(() => validateEnv({ ...prod, TOKEN_ENCRYPTION_KEY: '' })).toThrow();
  });
});
