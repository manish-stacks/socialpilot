import { BadRequestException, Global, Injectable, Module, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Def = { type: 'boolean' | 'string' | 'number'; default: boolean | string | number; label: string; description: string; max?: number; min?: number; email?: boolean };
/** Allow-list: only these keys can ever be stored, and none are secrets (secrets stay in env vars). */
export const SETTINGS: Record<string, Def> = {
  maintenance_mode: { type: 'boolean', default: false, label: 'Maintenance mode', description: 'Non-admin API access returns 503. Admins and login still work.' },
  signups_enabled: { type: 'boolean', default: true, label: 'Allow new registrations', description: 'Feature flag: turn off to close sign-ups.' },
  ai_enabled: { type: 'boolean', default: true, label: 'AI generation enabled', description: 'Feature flag: turn off to disable all AI Studio generation.' },
  media_uploads_enabled: { type: 'boolean', default: true, label: 'Media uploads enabled', description: 'Feature flag: turn off to block new uploads.' },
  usd_inr_rate: { type: 'number', default: 85, min: 1, max: 1000, label: 'INR per 1 USD', description: 'Used to show prices in ₹ to visitors in India. This is a manual, placeholder rate: update it to the current rate you want to charge at.' },
  support_email: { type: 'string', default: '', label: 'Support contact email', description: 'Shown to users; leave empty to hide.', max: 200, email: true },
  ai_system_prompt: { type: 'string', default: '', label: 'AI system prompt override', description: 'Replaces the built-in copywriting instruction. Empty = built-in default. Must still demand JSON-only output.', max: 4000 },
};
export function validateSetting(key: string, value: unknown): boolean | string | number {
  const d = SETTINGS[key];
  if (!d) throw new NotFoundException('Unknown setting');
  if (d.type === 'boolean') { if (typeof value !== 'boolean') throw new BadRequestException(`${key} must be true or false`); return value; }
  if (d.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < (d.min ?? 0) || value > (d.max ?? 1e9)) throw new BadRequestException(`${key} must be a number between ${d.min ?? 0} and ${d.max ?? 1e9}`);
    return value;
  }
  if (typeof value !== 'string') throw new BadRequestException(`${key} must be text`);
  const v = value.trim();
  if (v.length > (d.max ?? 500)) throw new BadRequestException(`${key} is too long (max ${d.max ?? 500})`);
  if (d.email && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new BadRequestException('Enter a valid email address');
  return v;
}

@Injectable()
export class SettingsService {
  private cache = new Map<string, { v: unknown; at: number }>();
  constructor(private prisma: PrismaService) {}
  async get<T = boolean | string | number>(key: string): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < 10_000) return hit.v as T;
    let v: unknown = SETTINGS[key]?.default;
    try { const row = await this.prisma.systemSetting.findUnique({ where: { key } }); if (row) v = row.value; } catch { /* DB blip: fall back to default */ }
    this.cache.set(key, { v, at: Date.now() });
    return v as T;
  }
  async all() {
    const rows: { key: string; value: unknown; updatedAt: Date }[] = await this.prisma.systemSetting.findMany();
    return Object.entries(SETTINGS).map(([key, d]) => { const r = rows.find((x) => x.key === key); return { key, ...d, value: r ? r.value : d.default, isDefault: !r, updatedAt: r?.updatedAt ?? null }; });
  }
  async set(key: string, value: unknown, actorId: string) {
    const v = validateSetting(key, value);
    const before = await this.get(key);
    await this.prisma.$transaction([
      this.prisma.systemSetting.upsert({ where: { key }, update: { value: v, updatedById: actorId }, create: { key, value: v, updatedById: actorId } }),
      this.prisma.auditLog.create({ data: { actorId, action: 'admin.setting.update', targetType: 'setting', targetId: key, metadata: { before, after: v } } }),
    ]);
    this.cache.delete(key);
    return { key, value: v };
  }
}
@Global() @Module({ providers: [SettingsService], exports: [SettingsService] })
export class SettingsModule {}
