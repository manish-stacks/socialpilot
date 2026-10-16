import { BadGatewayException, HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { BillingService, monthStartUtc } from '../billing/billing.service';
import { PLATFORM_RULES, PlatformCode } from '../common/platform-rules';
import { ideasSchema, parseModelJson, variantsSchema } from './ai.schemas';
import { GenerateDto } from './ai.dto';

const SYSTEM = 'You are a social media copywriter. Respond with JSON only, matching the requested shape exactly. Do not invent statistics, awards, prices or claims about the brand; if a fact is not provided, do not state it. Respect each platform\'s character limit.';

export function buildPrompt(d: GenerateDto): string {
  const ctx = Object.entries({
    Brand: d.brandName, 'Brand description': d.brandDescription, Audience: d.audience, Industry: d.industry,
    Objective: d.objective, Tone: d.tone, Language: d.language ?? 'English', 'Post type': d.postType, 'Call to action': d.cta,
    'Hashtag preferences': d.hashtagPrefs, 'Media brief': d.mediaBrief,
  }).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n');
  const plats = (d.platforms?.length ? d.platforms : ['INSTAGRAM']) as PlatformCode[];
  if (d.mode === 'ideas')
    return `${ctx}\nTopic: ${d.topic}\nGive ${d.count ?? 5} distinct post ideas.\nJSON shape: {"ideas": string[]}`;
  const limits = plats.map((p) => `${p}: max ${PLATFORM_RULES[p].maxCaption} characters`).join('; ');
  const task = d.mode === 'rewrite'
    ? `Rewrite this text (${d.instruction ?? 'improve'}):\n"""${d.text ?? d.topic}"""`
    : `Write one post per platform about: ${d.topic}`;
  return `${ctx}\n${task}\nPlatforms and limits: ${limits}\nHashtags must be words without the # symbol.\nJSON shape: {"variants": [{"platform": string, "caption": string, "hashtags": string[], "cta": string}]}`;
}

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService, private billing: BillingService, private settings: SettingsService) {}

  async generate(ws: string, userId: string, d: GenerateDto) {
    if (!(await this.settings.get<boolean>('ai_enabled'))) throw new ServiceUnavailableException('AI generation is currently disabled by the administrator.');
    const key = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL;
    if (!key || !model) throw new ServiceUnavailableException('AI is not configured. Set GEMINI_API_KEY and GEMINI_MODEL on the API server.');
    const { plan } = await this.billing.planFor(ws);
    const used = await this.prisma.aIGeneration.count({ where: { workspaceId: ws, createdAt: { gte: monthStartUtc() } } });
    if (used >= plan.aiCreditsPerMonth) throw new HttpException(`Monthly AI limit reached (${plan.aiCreditsPerMonth} on the ${plan.name} plan).`, 429);

    const prompt = buildPrompt(d);
    let text: string;
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const res = await ai.models.generateContent({ model, contents: prompt, config: { systemInstruction: (await this.settings.get<string>('ai_system_prompt')) || SYSTEM, responseMimeType: 'application/json' } });
      text = res.text ?? '';
    } catch (e: any) {
      if (e?.status === 429) throw new HttpException('The AI provider is rate-limiting requests. Try again shortly.', 429);
      throw new BadGatewayException('The AI provider request failed.');
    }
    let output: unknown;
    try { output = d.mode === 'ideas' ? parseModelJson(text, ideasSchema) : parseModelJson(text, variantsSchema); }
    catch { throw new BadGatewayException('The AI returned an unusable response. Please retry.'); }

    const row = await this.prisma.aIGeneration.create({ data: { workspaceId: ws, userId, mode: d.mode, prompt: d.topic.slice(0, 2000), output: output as object, model } });
    return { id: row.id, mode: d.mode, output, remaining: plan.aiCreditsPerMonth - used - 1 };
  }

  history(ws: string) {
    return this.prisma.aIGeneration.findMany({ where: { workspaceId: ws }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, mode: true, prompt: true, output: true, createdAt: true } });
  }
}
