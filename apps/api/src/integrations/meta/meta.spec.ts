import { classifyMeta, MetaError, MetaNetworkError, sanitize } from './meta.client';
const e = (o: Partial<{ http: number; code: number; sub: number; transient: boolean; body: boolean }>) =>
  new MetaError(o.http ?? 400, 'm', o.code, o.sub, o.transient ?? false, undefined, o.body ?? true);
describe('classifyMeta', () => {
  it('token errors are AUTH', () => { expect(classifyMeta(e({ code: 190 }), true)?.kind).toBe('AUTH'); expect(classifyMeta(e({ code: 100, sub: 463 }), true)?.kind).toBe('AUTH'); });
  it('rate limits', () => expect(classifyMeta(e({ code: 17 }), true)?.kind).toBe('RATE_LIMIT'));
  it('transient / not-ready are retryable', () => { expect(classifyMeta(e({ code: 2, transient: true }), true)?.kind).toBe('RETRYABLE'); expect(classifyMeta(e({ code: 9007 }), true)?.kind).toBe('RETRYABLE'); });
  it('param/permission errors are permanent', () => { expect(classifyMeta(e({ code: 100 }), true)?.kind).toBe('PERMANENT'); expect(classifyMeta(e({ code: 200 }), true)?.kind).toBe('PERMANENT'); });
  it('network failure on a mutating call is UNCERTAIN, on a read is RETRYABLE', () => {
    expect(classifyMeta(new MetaNetworkError('timeout', 't'), true)?.kind).toBe('UNCERTAIN');
    expect(classifyMeta(new MetaNetworkError('timeout', 't'), false)?.kind).toBe('RETRYABLE');
  });
  it('bodiless 5xx on a mutating call is UNCERTAIN', () => expect(classifyMeta(e({ http: 502, body: false }), true)?.kind).toBe('UNCERTAIN'));
  it('ignores non-Meta errors', () => expect(classifyMeta(new Error('x'), true)).toBeNull());
});
describe('sanitize', () => {
  it('redacts tokens and secrets', () => {
    const out = sanitize('bad access_token=EAAB1234567890123456789012345 and client_secret=abc');
    expect(out).not.toContain('EAAB'); expect(out).not.toContain('=abc');
  });
  it('caps length', () => expect(sanitize('x'.repeat(1000)).length).toBe(300));
});
