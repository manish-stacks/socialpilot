import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingService } from '../../billing/billing.service';
import { randomToken, sha256 } from '../../common/crypto';
import { decryptJson, encryptJson } from '../../common/secrets';
import { graph, graphVersion } from './meta.client';

/** Instagram API with Facebook Login: Page-linked professional accounts. `business_management` is often needed to list Business-owned Pages. */
export const DEFAULT_SCOPES = 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish';
interface Candidate { pageId: string; name: string; accessToken: string; igId?: string; igUsername?: string }
const TTL = 10 * 60_000;

export const metaConfigured = () => !!(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.API_PUBLIC_URL && process.env.TOKEN_ENCRYPTION_KEY);
const redirectUri = () => `${process.env.API_PUBLIC_URL}/api/v1/oauth/meta/callback`;

@Injectable()
export class MetaOAuthService {
  constructor(private prisma: PrismaService, private billing: BillingService) {}

  private need() {
    if (!metaConfigured()) throw new ServiceUnavailableException('Meta integration is not configured. Set META_APP_ID, META_APP_SECRET, API_PUBLIC_URL and TOKEN_ENCRYPTION_KEY (see docs/integrations.md).');
  }

  async start(workspaceId: string, userId: string) {
    this.need();
    const state = randomToken();
    await this.prisma.oAuthState.create({ data: { stateHash: sha256(state), workspaceId, userId, platform: 'META', expiresAt: new Date(Date.now() + TTL) } });
    const q = new URLSearchParams({ client_id: process.env.META_APP_ID!, redirect_uri: redirectUri(), state, response_type: 'code', scope: process.env.META_SCOPES || DEFAULT_SCOPES });
    return { url: `https://www.facebook.com/${graphVersion()}/dialog/oauth?${q}` };
  }

  /** Returns where to send the browser. Never throws provider details into the URL. */
  async callback(q: { code?: string; state?: string; error?: string }): Promise<{ workspaceId?: string; stateId?: string; error?: string }> {
    if (!q.state) return { error: 'missing_state' };
    const row = await this.prisma.oAuthState.findUnique({ where: { stateHash: sha256(q.state) } });
    if (!row || row.usedAt || row.expiresAt < new Date()) return { error: 'invalid_state' };
    // Single use: a replayed callback matches zero rows.
    const used = await this.prisma.oAuthState.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
    if (used.count !== 1) return { error: 'invalid_state' };
    if (q.error || !q.code) return { workspaceId: row.workspaceId, error: 'denied' };
    try {
      const short = await graph<{ access_token: string }>('oauth/access_token', { params: { client_id: process.env.META_APP_ID, client_secret: process.env.META_APP_SECRET, redirect_uri: redirectUri(), code: q.code } });
      const long = await graph<{ access_token: string }>('oauth/access_token', { params: { grant_type: 'fb_exchange_token', client_id: process.env.META_APP_ID, client_secret: process.env.META_APP_SECRET, fb_exchange_token: short.access_token } });
      const cands: Candidate[] = [];
      let after: string | undefined;
      for (let i = 0; i < 5; i++) { // paginate /me/accounts
        const r = await graph<any>('me/accounts', { token: long.access_token, params: { fields: 'id,name,access_token,instagram_business_account{id,username}', limit: 50, after } });
        for (const p of r.data ?? []) cands.push({ pageId: p.id, name: p.name, accessToken: p.access_token, igId: p.instagram_business_account?.id, igUsername: p.instagram_business_account?.username });
        after = r.paging?.cursors?.after; if (!r.paging?.next) break;
      }
      await this.prisma.oAuthState.update({ where: { id: row.id }, data: { payloadEnc: encryptJson(cands) } });
      return { workspaceId: row.workspaceId, stateId: row.id };
    } catch { return { workspaceId: row.workspaceId, error: 'exchange_failed' }; }
  }

  private async load(workspaceId: string, userId: string, stateId: string) {
    const row = await this.prisma.oAuthState.findFirst({ where: { id: stateId, workspaceId, userId, platform: 'META', expiresAt: { gt: new Date(Date.now() + 0) } } });
    if (!row?.payloadEnc || !row.usedAt) throw new NotFoundException('Connection session expired. Start again.');
    return { row, cands: decryptJson<Candidate[]>(row.payloadEnc) };
  }

  /** Page tokens are never sent to the browser: only names and ids. */
  async pending(workspaceId: string, userId: string, stateId: string) {
    const { cands } = await this.load(workspaceId, userId, stateId);
    return cands.map((c) => ({ pageId: c.pageId, name: c.name, instagram: c.igId ? { id: c.igId, username: c.igUsername ?? null } : null }));
  }

  async connect(workspaceId: string, userId: string, stateId: string, keys: string[]) {
    const { row, cands } = await this.load(workspaceId, userId, stateId);
    const wanted: { platform: 'FACEBOOK' | 'INSTAGRAM'; externalId: string; name: string; c: Candidate }[] = [];
    for (const k of new Set(keys)) {
      const [kind, id] = k.split(':');
      const c = cands.find((x) => (kind === 'fb' ? x.pageId : x.igId) === id);
      if (!c || (kind !== 'fb' && kind !== 'ig')) throw new BadRequestException(`Unknown selection ${k}`);
      wanted.push(kind === 'fb' ? { platform: 'FACEBOOK', externalId: c.pageId, name: c.name, c } : { platform: 'INSTAGRAM', externalId: c.igId!, name: `@${c.igUsername ?? c.igId}`, c });
    }
    if (!wanted.length) throw new BadRequestException('Select at least one account');
    const { plan } = await this.billing.planFor(workspaceId);
    const existing = await this.prisma.socialAccount.findMany({ where: { workspaceId }, select: { platform: true, externalId: true } });
    const fresh = wanted.filter((w) => !existing.some((e: any) => e.platform === w.platform && e.externalId === w.externalId)).length;
    if (existing.length + fresh > plan.maxAccounts) throw new ConflictException(`Your ${plan.name} plan allows ${plan.maxAccounts} connected accounts`);
    await this.prisma.$transaction(async (tx: any) => {
      for (const w of wanted) {
        const data = { displayName: w.name, status: 'ACTIVE', tokenExpiresAt: null, encryptedCredentials: encryptJson({ accessToken: w.c.accessToken, pageId: w.c.pageId }) };
        await tx.socialAccount.upsert({ where: { workspaceId_platform_externalId: { workspaceId, platform: w.platform, externalId: w.externalId } }, update: data, create: { workspaceId, platform: w.platform, externalId: w.externalId, ...data } });
      }
      await tx.oAuthState.delete({ where: { id: row.id } });
      await tx.auditLog.create({ data: { actorId: userId, workspaceId, action: 'account.connect', targetType: 'social_account', metadata: { provider: 'meta', count: wanted.length } } });
    });
    return { connected: wanted.length };
  }

  /** Re-checks that the stored token still works; marks the account EXPIRED on an auth error. */
  async revalidate(workspaceId: string, accountId: string) {
    const a = await this.prisma.socialAccount.findFirst({ where: { id: accountId, workspaceId } });
    if (!a) throw new NotFoundException('Account not found');
    if (!a.encryptedCredentials || (a.platform !== 'FACEBOOK' && a.platform !== 'INSTAGRAM')) throw new BadRequestException('Only Meta accounts can be revalidated');
    const { accessToken } = decryptJson<{ accessToken: string }>(a.encryptedCredentials);
    try {
      await graph(a.externalId, { token: accessToken, params: { fields: 'id' } });
      await this.prisma.socialAccount.update({ where: { id: a.id }, data: { status: 'ACTIVE' } });
      return { status: 'ACTIVE' };
    } catch (e: any) {
      const auth = [190, 102, 467].includes(e?.code) || [458, 459, 460, 463, 467].includes(e?.subcode);
      if (auth) { await this.prisma.socialAccount.update({ where: { id: a.id }, data: { status: 'EXPIRED' } }); return { status: 'EXPIRED' }; }
      throw new ServiceUnavailableException('Could not reach Meta to verify this account. Try again shortly.');
    }
  }
}
