import { z } from 'zod';
export const variantsSchema = z.object({
  variants: z.array(z.object({
    platform: z.string().min(1),
    caption: z.string().min(1),
    hashtags: z.array(z.string()).default([]),
    cta: z.string().optional().default(''),
  })).min(1),
});
export const ideasSchema = z.object({ ideas: z.array(z.string().min(1)).min(1) });
/** Models sometimes wrap JSON in fences; strip then validate. Throws on any mismatch. */
export function parseModelJson<T>(raw: string, schema: z.ZodType<T>): T {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return schema.parse(JSON.parse(cleaned));
}
