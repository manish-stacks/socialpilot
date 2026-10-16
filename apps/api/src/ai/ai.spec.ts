import { parseModelJson, variantsSchema, ideasSchema } from './ai.schemas';
import { buildPrompt } from './ai.service';
describe('AI output validation', () => {
  it('accepts fenced JSON', () => expect(parseModelJson('```json\n{"ideas":["a"]}\n```', ideasSchema).ideas).toEqual(['a']));
  it('defaults missing hashtags', () => expect(parseModelJson('{"variants":[{"platform":"X","caption":"hi"}]}', variantsSchema).variants[0].hashtags).toEqual([]));
  it('rejects wrong shape', () => expect(() => parseModelJson('{"variants":[]}', variantsSchema)).toThrow());
  it('rejects non-JSON', () => expect(() => parseModelJson('sorry', ideasSchema)).toThrow());
});
describe('buildPrompt', () => {
  it('includes platform limits', () => expect(buildPrompt({ mode: 'variants', topic: 't', platforms: ['X'] } as any)).toContain('X: max 280'));
});
