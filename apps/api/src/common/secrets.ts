import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
/** AES-256-GCM. Key: TOKEN_ENCRYPTION_KEY = 32 random bytes, base64 (`openssl rand -base64 32`). Format: v1.iv.tag.ciphertext */
const key = () => {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  const k = raw ? Buffer.from(raw, 'base64') : Buffer.alloc(0);
  if (k.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes, base64-encoded');
  return k;
};
export function encryptJson(v: unknown): string {
  const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([c.update(JSON.stringify(v), 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), ct.toString('base64')].join('.');
}
export function decryptJson<T>(s: string): T {
  const [v, iv, tag, ct] = s.split('.');
  if (v !== 'v1' || !iv || !tag || !ct) throw new Error('Bad ciphertext');
  const d = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8'));
}
