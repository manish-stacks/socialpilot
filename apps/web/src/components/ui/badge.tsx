import { cn } from '@/lib/utils';
const tone: Record<string, string> = {
  DRAFT: 'bg-neutral-200 text-neutral-800', SCHEDULED: 'bg-blue-100 text-blue-800', PUBLISHING: 'bg-amber-100 text-amber-800', PROCESSING: 'bg-amber-100 text-amber-800',
  PUBLISHED: 'bg-green-100 text-green-800', PARTIALLY_PUBLISHED: 'bg-yellow-100 text-yellow-800', FAILED: 'bg-red-100 text-red-800', CANCELLED: 'bg-neutral-200 text-neutral-600',
  ACTIVE: 'bg-green-100 text-green-800', EXPIRED: 'bg-amber-100 text-amber-800', REVOKED: 'bg-red-100 text-red-800', ERROR: 'bg-red-100 text-red-800', PENDING: 'bg-neutral-200 text-neutral-700', UNCERTAIN: 'bg-orange-100 text-orange-800', QUEUED: 'bg-blue-100 text-blue-800',
};
export const Badge = ({ value, className }: { value: string; className?: string }) => (
  <span className={cn('inline-block rounded-full px-2 py-0.5 text-[11px] font-medium', tone[value] ?? 'bg-neutral-200 text-neutral-800', className)}>{value.replace(/_/g, ' ').toLowerCase()}</span>
);
