import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DeleteObjectCommand, HeadObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

export const MEDIA_RULES: Record<string, number> = {
  'image/jpeg': 10, 'image/png': 10, 'image/webp': 10, 'image/gif': 10, 'video/mp4': 500, 'video/quicktime': 500,
};
export function validateUpload(mimeType: string, sizeBytes: number) {
  const maxMb = MEDIA_RULES[mimeType];
  if (!maxMb) throw new BadRequestException(`Unsupported file type. Allowed: ${Object.keys(MEDIA_RULES).join(', ')}`);
  if (!(sizeBytes > 0) || sizeBytes > maxMb * 1024 * 1024) throw new BadRequestException(`File too large (max ${maxMb} MB for ${mimeType})`);
}

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService, private settings: SettingsService) {}
  private _s3?: S3Client;
  private s3() {
    const e = process.env;
    if (!e.S3_BUCKET || !e.S3_ACCESS_KEY_ID || !e.S3_SECRET_ACCESS_KEY) throw new ServiceUnavailableException('Object storage is not configured (S3_* env vars).');
    return (this._s3 ??= new S3Client({ region: e.S3_REGION ?? 'us-east-1', endpoint: e.S3_ENDPOINT || undefined, forcePathStyle: e.S3_FORCE_PATH_STYLE === 'true',
      credentials: { accessKeyId: e.S3_ACCESS_KEY_ID, secretAccessKey: e.S3_SECRET_ACCESS_KEY } }));
  }
  private bucket = () => process.env.S3_BUCKET!;

  signedGetUrl(key: string, ttl = 900) { return getSignedUrl(this.s3(), new GetObjectCommand({ Bucket: this.bucket(), Key: key }), { expiresIn: ttl }); }

  async requestUpload(ws: string, userId: string, filename: string, mimeType: string, sizeBytes: number) {
    if (!(await this.settings.get<boolean>('media_uploads_enabled'))) throw new ServiceUnavailableException('Uploads are currently disabled by the administrator.');
    validateUpload(mimeType, sizeBytes);
    const s3 = this.s3();
    const key = `${ws}/${randomBytes(12).toString('hex')}`;
    const asset = await this.prisma.mediaAsset.create({ data: { workspaceId: ws, uploadedById: userId, key, filename: filename.slice(0, 200), mimeType, sizeBytes } });
    const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: this.bucket(), Key: key, ContentType: mimeType, ContentLength: sizeBytes }), { expiresIn: 600 });
    return { id: asset.id, uploadUrl: url };
  }

  async confirm(ws: string, id: string) {
    const a = await this.prisma.mediaAsset.findFirst({ where: { id, workspaceId: ws } });
    if (!a) throw new NotFoundException('Asset not found');
    try {
      const head = await this.s3().send(new HeadObjectCommand({ Bucket: this.bucket(), Key: a.key }));
      if (head.ContentLength !== a.sizeBytes) throw new Error('size mismatch');
    } catch { throw new BadRequestException('Upload not found or incomplete'); }
    return this.prisma.mediaAsset.update({ where: { id }, data: { status: 'READY' } });
  }

  async list(ws: string, q?: string, type?: string) {
    const where: any = { workspaceId: ws, status: 'READY' };
    if (q) where.filename = { contains: q };
    if (type === 'image' || type === 'video') where.mimeType = { startsWith: `${type}/` };
    const rows = await this.prisma.mediaAsset.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
    const s3 = this.s3();
    return Promise.all(rows.map(async (r: any) => ({
      id: r.id, filename: r.filename, mimeType: r.mimeType, sizeBytes: r.sizeBytes, createdAt: r.createdAt,
      url: await getSignedUrl(s3, new GetObjectCommand({ Bucket: this.bucket(), Key: r.key }), { expiresIn: 900 }),
    })));
  }

  async remove(ws: string, id: string) {
    const a = await this.prisma.mediaAsset.findFirst({ where: { id, workspaceId: ws } });
    if (!a) throw new NotFoundException('Asset not found');
    const inUse = await this.prisma.postMedia.count({ where: { mediaAssetId: id, post: { status: { in: ['SCHEDULED', 'PUBLISHING'] } } } });
    if (inUse) throw new ConflictException('Asset is used by scheduled posts');
    if (await this.prisma.postMedia.count({ where: { mediaAssetId: id } })) throw new ConflictException('Asset is attached to existing posts; remove it from them first');
    await this.s3().send(new DeleteObjectCommand({ Bucket: this.bucket(), Key: a.key }));
    await this.prisma.mediaAsset.delete({ where: { id } });
  }
}
