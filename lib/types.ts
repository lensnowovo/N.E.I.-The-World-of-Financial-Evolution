/**
 * 全站共享的类型定义。
 *
 * PostCardData 同时被前端组件和 feed 查询用，放在这里避免 API（server）
 * 依赖 components/（client）造成的边界耦合。
 *
 * 公开 API（/api/v1/）的响应类型也定义在这里，明确暴露哪些字段。
 */

/** 前端卡片 + feed 查询共用的 Skill 数据（含用户态） */
export type PostCardData = {
  id: number;
  title: string;
  displayTitle: string;
  excerpt: string;
  tagScene: string;
  tagIndustry: string | null;
  tagContent: string[];
  tagSkill: string | null;
  createdAt: string; // ISO string
  viewCount: number;
  author: { id: number; nickname: string; role: string; avatarUrl: string | null };
  counts: { comments: number; stars: number; attachments: number };
  starred: boolean;
  mcpApproved: boolean;
  featured: boolean;
  assetType: string | null;
  displaySummary: string;
  displayUseCase: string;
  displayOutput: string;
  displaySteps: string[];
  displayTags: string[];
  inputExample: string;
  outputExample: string;
  usageBoundary: string;
  skillAsset: {
    id: number;
    assetType: string;
    originalAuthor?: string | null;
  } | null;
};

/* ============================================================
   公开只读 API（/api/v1/）响应类型
   去掉用户态（liked/favorited）和敏感字段（storageKey/uploaderId）
   ============================================================ */

/** 公开 API 列表项（去掉 liked/favorited） */
export type ApiSkillListItem = Omit<PostCardData, 'liked' | 'favorited'>;

/** 公开 API 附件（剥掉 storageKey / uploaderId，加 downloadUrl） */
export type ApiAttachment = {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  downloadCount: number;
  createdAt: string;
  downloadUrl: string;
};

/** 公开 API 完整 Skill 详情 */
export type ApiSkillDetail = {
  id: number;
  title: string;
  body: string; // 完整正文 HTML
  excerpt: string;
  tagScene: string;
  tagIndustry: string | null;
  tagContent: string[];
  tagSkill: string | null;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  author: { id: number; nickname: string; role: string; avatarUrl: string | null };
  counts: { comments: number; stars: number };
  skillAsset: {
    id: number;
    assetType: string;
    sourceUrl: string | null;
    originalAuthor: string | null;
    installHint: string | null;
    usageNotes: string | null;
  } | null;
  attachments: ApiAttachment[];
};

/** 统一分页响应 */
export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
};

/** 单项响应 */
export type SingleResponse<T> = {
  data: T;
};
