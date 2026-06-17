export const POST_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
} as const;

export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS];
