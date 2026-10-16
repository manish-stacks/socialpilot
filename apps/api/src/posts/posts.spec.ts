import { canTransition, isDeletable, isEditable } from './post-state';
import { composeText, PLATFORM_RULES } from '../common/platform-rules';
import { PostsService } from './posts.service';
import { BadRequestException } from '@nestjs/common';

describe('post state machine', () => {
  it('allows the main lifecycle', () => {
    expect(canTransition('DRAFT', 'SCHEDULED')).toBe(true);
    expect(canTransition('SCHEDULED', 'PUBLISHING')).toBe(true);
    expect(canTransition('PUBLISHING', 'PUBLISHED')).toBe(true);
  });
  it('blocks arbitrary jumps', () => {
    expect(canTransition('DRAFT', 'PUBLISHED')).toBe(false);
    expect(canTransition('PUBLISHED', 'DRAFT')).toBe(false);
    expect(canTransition('CANCELLED', 'SCHEDULED')).toBe(false);
    expect(canTransition('FAILED', 'PUBLISHING')).toBe(true); // manual retry
  });
  it('edit/delete rules', () => {
    expect(isEditable('PUBLISHING')).toBe(false);
    expect(isDeletable('SCHEDULED')).toBe(false);
    expect(isDeletable('DRAFT')).toBe(true);
  });
});
describe('composeText', () => {
  it('joins caption, cta and hashtags', () => expect(composeText(' Hi ', ['a', '#b'], 'Buy')).toBe('Hi\n\nBuy\n\n#a #b'));
  it('X limit is 280', () => expect(PLATFORM_RULES.X.maxCaption).toBe(280));
});
describe('schedule validation', () => {
  const svc: any = new PostsService({} as any, {} as any);
  const base = { caption: 'x'.repeat(300), hashtags: [], cta: null, media: [] };
  const target = (platform: string, status = 'ACTIVE') => ({ captionOverride: null, socialAccount: { platform, displayName: 'acc', status } });
  const future = new Date(Date.now() + 3_600_000);
  it('collects every problem', () => {
    try { svc.assertSchedulable({ ...base, targets: [target('X'), target('INSTAGRAM', 'EXPIRED')] }, new Date(0)); fail('should throw'); }
    catch (e: any) { expect(e).toBeInstanceOf(BadRequestException); const m = e.getResponse().message as string[];
      expect(m.some((s) => s.includes('future'))).toBe(true); expect(m.some((s) => s.includes('reconnecting'))).toBe(true);
      expect(m.some((s) => s.includes('/280'))).toBe(true); expect(m.some((s) => s.includes('requires an image'))).toBe(true); }
  });
  it('rejects no targets', () => expect(() => svc.assertSchedulable({ ...base, targets: [] }, future)).toThrow(BadRequestException));
  it('accepts a valid post', () => expect(() => svc.assertSchedulable({ ...base, caption: 'ok', targets: [target('LINKEDIN')] }, future)).not.toThrow());
});
