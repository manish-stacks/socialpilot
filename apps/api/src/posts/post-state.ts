export type PostStatusCode = 'DRAFT' | 'AWAITING_APPROVAL' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'PARTIALLY_PUBLISHED' | 'FAILED' | 'CANCELLED';
const T: Record<PostStatusCode, PostStatusCode[]> = {
  DRAFT: ['SCHEDULED', 'AWAITING_APPROVAL'],
  AWAITING_APPROVAL: ['DRAFT', 'SCHEDULED'],
  SCHEDULED: ['SCHEDULED', 'CANCELLED', 'PUBLISHING'], // SCHEDULED->SCHEDULED = reschedule
  PUBLISHING: ['PUBLISHED', 'PARTIALLY_PUBLISHED', 'FAILED'],
  FAILED: ['SCHEDULED', 'DRAFT', 'PUBLISHING'], // PUBLISHING = manual per-target retry
  CANCELLED: ['DRAFT'],
  PUBLISHED: [],
  PARTIALLY_PUBLISHED: ['PUBLISHING'],
};
export const canTransition = (from: PostStatusCode, to: PostStatusCode) => T[from].includes(to);
export const isEditable = (s: PostStatusCode) => s === 'DRAFT' || s === 'SCHEDULED' || s === 'CANCELLED';
export const isDeletable = (s: PostStatusCode) => s === 'DRAFT' || s === 'CANCELLED';
