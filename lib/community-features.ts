/**
 * Public community writes are intentionally restricted for the current phase.
 * Historical rows are preserved. Favorites remain active; only administrators may
 * create or edit public library content.
 */
export const PUBLIC_SOCIAL_INTERACTIONS_ENABLED = false;
export const PUBLIC_CONTRIBUTIONS_ENABLED = false;

export const SOCIAL_INTERACTIONS_DISABLED_MESSAGE =
  '公开评论、点赞和关注功能当前已暂停；历史数据仍保留。';

export const CONTRIBUTIONS_DISABLED_MESSAGE =
  '公开投稿功能当前已暂停；Skill Library 由管理员统一维护。';
