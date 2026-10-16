import { randomBytes } from 'crypto';
import { decryptJson, encryptJson } from './secrets';
describe('secrets', () => {
  beforeAll(() => { process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64'); });
  it('round-trips and never stores plaintext', () => {
    const c = encryptJson({ accessToken: 'EAAsecret' });
    expect(c).not.toContain('EAAsecret');
    expect(decryptJson<{ accessToken: string }>(c).accessToken).toBe('EAAsecret');
  });
  it('detects tampering', () => {
    const p = encryptJson({ a: 1 }).split('.'); p[3] = Buffer.from('xxxx').toString('base64');
    expect(() => decryptJson(p.join('.'))).toThrow();
  });
  it('rejects a bad key', () => {
    const k = process.env.TOKEN_ENCRYPTION_KEY; process.env.TOKEN_ENCRYPTION_KEY = 'short';
    expect(() => encryptJson({})).toThrow(); process.env.TOKEN_ENCRYPTION_KEY = k;
  });
});
