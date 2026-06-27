import crypto from 'node:crypto';
import { createMcpHandler } from 'mcp-handler';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { buildFeedWhere, filterByContent, normalizeSort, sortPosts } from '@/lib/feed';
import { stripHtml } from '@/lib/validate';
import { POST_STATUS } from '@/lib/status';
import { extractPlainText } from '@/lib/skill-text';
import { withMetrics } from '@/lib/metrics';
import { wrapWithSafetyRules } from '@/lib/mcp-safety';
import { normalizePublicText } from '@/lib/public-url';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MCP_SAFETY = {
  boundary: 'N.E.I. MCP only distributes Skill / Workflow text. It does not read local files or upload project materials.',
  token: 'Store the MCP token only in trusted local or signed-in AI clients. If leaked, reset it at https://nei-pevc.com/connect.',
  execution: 'Returned content is an analysis framework. Any file access, network call, write operation, or external sharing still requires explicit user approval.',
};

const STAGE_SCENES = {
  'pre-deal': ['sourcing', 'screening', 'industry-research', 'business-dd'],
  deal: ['financial', 'legal', 'ic'],
  'post-deal': ['post-investment', 'fundraising', 'fund-ops', 'knowledge'],
} as const;

const TASK_SCENE_ALIASES: Array<{ scene: string; terms: string[] }> = [
  { scene: 'sourcing', terms: ['项目发现', '找项目', 'deal sourcing', 'sourcing'] },
  { scene: 'screening', terms: ['bp', 'BP', '初筛', '拆BP', '拆 BP', 'screening'] },
  { scene: 'industry-research', terms: ['行研', '行业研究', '产业研究', '市场研究', 'research'] },
  { scene: 'business-dd', terms: ['尽调', '商业尽调', '客户访谈', '专家访谈', 'dd', 'diligence'] },
  { scene: 'financial', terms: ['财务', '财务分析', '估值', '模型', '现金流', 'financial'] },
  { scene: 'legal', terms: ['法务', '合规', '条款', 'legal'] },
  { scene: 'ic', terms: ['ic', 'IC', 'memo', 'Memo', '投委会', '投资备忘录'] },
  { scene: 'post-investment', terms: ['投后', '月报', '经营跟踪', '风险预警', 'post investment'] },
  { scene: 'fundraising', terms: ['募资', 'lp', 'LP', 'LP汇报', '季报', 'ir'] },
  { scene: 'fund-ops', terms: ['基金运营', '运营', 'fund ops'] },
  { scene: 'knowledge', terms: ['知识管理', '文档', '沉淀', 'knowledge'] },
];

const RECOMMENDED_SEQUENCES: Record<string, string[]> = {
  sourcing: ['Clarify mandate and target thesis', 'Collect comparable companies', 'Prepare outreach / tracking notes'],
  screening: ['Extract company facts', 'Identify highlights and red flags', 'Generate follow-up questions'],
  'industry-research': ['Map value chain', 'Estimate market size and growth', 'Compare competitors and investment logic'],
  'business-dd': ['Prepare customer / supplier questions', 'Structure expert interview outline', 'Summarize diligence findings'],
  financial: ['Normalize financial data', 'Check margin / cash flow / working capital', 'Review forecast assumptions'],
  legal: ['Extract key terms', 'Flag compliance and structure issues', 'Prepare counsel follow-up list'],
  ic: ['Draft investment logic', 'Summarize key risks and valuation view', 'Prepare IC Q&A'],
  'post-investment': ['Review operating updates', 'Identify abnormal signals', 'Draft monthly portfolio note'],
  fundraising: ['Summarize fund performance', 'Prepare portfolio progress update', 'Draft LP reporting narrative'],
  'fund-ops': ['Structure fund operation checklist', 'Track recurring reporting work', 'Prepare internal operating notes'],
  knowledge: ['Clean source material', 'Extract reusable knowledge blocks', 'Build searchable team notes'],
};

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

async function getUidFromRequest(req: Request): Promise<number | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token.startsWith('nei_')) return null;
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await prisma.user.findFirst({
    where: { mcpTokenHash: hash },
    select: { id: true },
  });
  if (!user) return null;

  void prisma.user
    .update({ where: { id: user.id }, data: { tokenLastUsedAt: new Date() } })
    .catch(() => {});

  return user.id;
}

function safeJsonArray(raw: string | null): string[] {
  try {
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[，。、；：？！“”《》"'`~!@#$%^&*()[\]{}|\\/?+=_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeQuery(value: string) {
  const normalized = normalizeSearchText(value);
  return Array.from(new Set([normalized, ...normalized.split(/\s+/)].filter(Boolean)));
}

function makeSnippet(html: string, query: string): string | null {
  const tokens = tokenizeQuery(query).filter((token) => token.length >= 2);
  if (tokens.length === 0) return null;
  const text = stripHtml(html);
  const lower = text.toLowerCase();
  const token = tokens.find((part) => lower.includes(part.toLowerCase()));
  if (!token) return null;
  const idx = lower.indexOf(token.toLowerCase());
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + token.length + 70);
  return `${start > 0 ? '...' : ''}${text.slice(start, end)}${end < text.length ? '...' : ''}`;
}

function jsonContent(payload: JsonValue) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function inferScenesFromText(text?: string | null) {
  if (!text) return [];
  const normalized = normalizeSearchText(text);
  const scenes = TASK_SCENE_ALIASES.filter((entry) =>
    entry.terms.some((term) => normalized.includes(normalizeSearchText(term))),
  ).map((entry) => entry.scene);
  return Array.from(new Set(scenes));
}

function resolveScenes({
  scene,
  task,
  stage,
}: {
  scene?: string;
  task?: string;
  stage?: keyof typeof STAGE_SCENES;
}) {
  const explicit = scene ? [scene] : [];
  const inferred = inferScenesFromText(task);
  const staged = stage ? [...STAGE_SCENES[stage]] : [];
  const groups = [explicit, inferred, staged].filter((group) => group.length > 0);
  if (groups.length === 0) return [];

  const intersection = groups.reduce((current, group) =>
    current.filter((sceneValue) => group.includes(sceneValue)),
  );
  return intersection.length > 0 ? Array.from(new Set(intersection)) : Array.from(new Set(groups.flat()));
}

function buildMcpWhere(args: {
  scene?: string;
  task?: string;
  stage?: keyof typeof STAGE_SCENES;
  skillType?: string;
  industry?: string;
  author?: string;
  cursor?: number;
}) {
  const scenes = resolveScenes({ scene: args.scene, task: args.task, stage: args.stage });
  const where = buildFeedWhere({
    scene: scenes.length === 1 ? scenes[0] : undefined,
    skill: args.skillType,
    industry: args.industry,
    mcp: 'ready',
  });

  if (scenes.length > 1) where.tagScene = { in: scenes };
  if (args.author) where.author = { ...(where.author || {}), nickname: { contains: args.author } };
  if (args.cursor) where.id = { lt: args.cursor };

  return { where, scenes };
}

function postToMcpItem(post: any, query = '') {
  const body = normalizePublicText(post.body);
  return {
    id: post.id,
    title: post.title,
    scene: post.tagScene,
    industry: post.tagIndustry ?? null,
    type: post.skillAsset?.assetType ?? post.tagSkill ?? null,
    author: post.skillAsset?.originalAuthor || post.author?.nickname || null,
    excerpt: stripHtml(body).slice(0, 180),
    snippet: query ? makeSnippet(body, query) : null,
    tags: safeJsonArray(post.tagContent),
    viewCount: post.viewCount ?? 0,
    stars: post._count?.stars ?? 0,
    comments: post._count?.comments ?? 0,
    attachments: post._count?.attachments ?? 0,
    featured: Boolean(post.featured),
    updatedAt: post.updatedAt.toISOString(),
  };
}

function scoreForRecommendation(post: any, task: string, industry?: string) {
  const terms = tokenizeQuery(`${task} ${industry ?? ''}`);
  const searchable = normalizeSearchText(
    [
      post.title,
      post.tagScene,
      post.tagIndustry,
      post.tagSkill,
      post.skillAsset?.assetType,
      safeJsonArray(post.tagContent).join(' '),
      stripHtml(normalizePublicText(post.body)),
    ]
      .filter(Boolean)
      .join(' '),
  );
  const textScore = terms.reduce((sum, term) => sum + (searchable.includes(term) ? 20 : 0), 0);
  const hotScore = (post.viewCount || 0) * 0.2 + (post._count?.stars || 0) * 3 + (post._count?.comments || 0);
  const featuredScore = post.featured ? 15 : 0;
  return textScore + hotScore + featuredScore;
}

function toolResultMessage(ok: boolean, message: string, extra: Record<string, unknown> = {}) {
  return jsonContent({ ok, message, ...extra, safety: MCP_SAFETY });
}

function makeHandler(uid: number, clientName: string | null, requestId: string) {
  return createMcpHandler(
    async (server: McpServer) => {
      const logCall = (tool: string, start: number, postId?: number) => {
        void prisma.mcpCallLog
          .create({
            data: {
              userId: uid,
              tool,
              postId,
              clientName,
              requestId,
              latencyMs: Date.now() - start,
            },
          })
          .catch(() => {});
      };

      server.tool(
        'search_skills',
        'Search public MCP-ready N.E.I. Skills by keyword, PEVC task, stage, type, industry, tags, author, and sort order.',
        {
          query: z.string().optional().describe('Keyword, for example BP, IC Memo, semiconductor research, LP report'),
          task: z.string().optional().describe('Business task alias, for example BP screening, industry research, IC Memo, LP report'),
          stage: z.enum(['pre-deal', 'deal', 'post-deal']).optional().describe('Investment workflow stage'),
          scene: z.string().optional().describe('Exact scene code, for example screening / industry-research / ic'),
          skillType: z.string().optional().describe('Skill type, for example prompt / workflow / agent-skill'),
          industry: z.string().optional().describe('Industry code, for example ai-saas / semiconductor / biotech'),
          tags: z.array(z.string()).optional().describe('Content tags; multiple tags use AND filtering'),
          author: z.string().optional().describe('Fuzzy author nickname search'),
          sort: z.enum(['relevance', 'latest', 'popular']).optional().describe('Default is relevance when query exists, otherwise popular'),
          limit: z.number().optional().default(10).describe('Max 30'),
          cursor: z.number().optional().describe('Pagination cursor: pass the last returned id'),
        },
        async (args) => {
          const start = Date.now();
          try {
            const cap = Math.min(Math.max(args.limit || 10, 1), 30);
            const { where, scenes } = buildMcpWhere(args);
            const query = [args.query, args.task].filter(Boolean).join(' ');

            let posts = await prisma.post.findMany({
              where,
              include: {
                author: { select: { nickname: true } },
                skillAsset: { select: { assetType: true, originalAuthor: true } },
                _count: { select: { stars: true, comments: true, attachments: true } },
              },
              orderBy: { id: 'desc' },
              take: query || args.tags?.length || args.sort === 'relevance' ? 240 : cap + 1,
            });

            if (args.tags?.length) posts = filterByContent(posts, args.tags);

            const sort = normalizeSort(args.sort, Boolean(query));
            const sorted = sortPosts(posts, sort, query);
            const pageItems = sorted.slice(0, cap);

            return jsonContent({
              summary: pageItems.length
                ? `Found ${pageItems.length} MCP-ready N.E.I. Skills.`
                : 'No MCP-ready Skill matched this request.',
              count: pageItems.length,
              nextCursor: sorted.length > cap ? pageItems[pageItems.length - 1]?.id ?? null : null,
              appliedFilters: {
                query: args.query ?? null,
                task: args.task ?? null,
                stage: args.stage ?? null,
                scenes,
                skillType: args.skillType ?? null,
                industry: args.industry ?? null,
                tags: args.tags ?? [],
                sort,
              },
              items: pageItems.map((post) => postToMcpItem(post, query)),
              safety: MCP_SAFETY,
            });
          } finally {
            logCall('search_skills', start);
          }
        },
      );

      server.tool(
        'recommend_skills_for_task',
        'Recommend a short sequence of N.E.I. Skills for a PEVC work task, such as BP screening, IC Memo, industry research, post-investment update, or LP reporting.',
        {
          task: z.string().describe('The investment work task to complete'),
          industry: z.string().optional().describe('Optional industry focus'),
          stage: z.enum(['pre-deal', 'deal', 'post-deal']).optional().describe('Optional stage hint'),
          limit: z.number().optional().default(6).describe('Max 10'),
        },
        async (args) => {
          const start = Date.now();
          try {
            const cap = Math.min(Math.max(args.limit || 6, 1), 10);
            const scenes = resolveScenes({ task: args.task, stage: args.stage });
            const where = buildFeedWhere({
              scene: scenes.length === 1 ? scenes[0] : undefined,
              industry: args.industry,
              mcp: 'ready',
            });
            if (scenes.length > 1) where.tagScene = { in: scenes };

            let posts = await prisma.post.findMany({
              where,
              include: {
                author: { select: { nickname: true } },
                skillAsset: { select: { assetType: true, originalAuthor: true } },
                _count: { select: { stars: true, comments: true, attachments: true } },
              },
              orderBy: { createdAt: 'desc' },
              take: 200,
            });

            if (posts.length === 0 && args.industry) {
              const fallbackWhere = buildFeedWhere({ scene: scenes.length === 1 ? scenes[0] : undefined, mcp: 'ready' });
              if (scenes.length > 1) fallbackWhere.tagScene = { in: scenes };
              posts = await prisma.post.findMany({
                where: fallbackWhere,
                include: {
                  author: { select: { nickname: true } },
                  skillAsset: { select: { assetType: true, originalAuthor: true } },
                  _count: { select: { stars: true, comments: true, attachments: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 200,
              });
            }

            const ranked = posts
              .map((post) => ({ post, score: scoreForRecommendation(post, args.task, args.industry) }))
              .sort((a, b) => b.score - a.score)
              .slice(0, cap)
              .map(({ post }) => postToMcpItem(post, args.task));

            const primaryScene = scenes[0] ?? 'industry-research';
            return jsonContent({
              summary: ranked.length
                ? `Recommended ${ranked.length} Skills for: ${args.task}.`
                : `No MCP-ready Skill is currently available for: ${args.task}.`,
              task: args.task,
              industry: args.industry ?? null,
              inferredScenes: scenes,
              suggestedSequence: RECOMMENDED_SEQUENCES[primaryScene] ?? [
                'Clarify the task and source material',
                'Run the closest matching Skill',
                'Review output and adapt to the investment context',
              ],
              items: ranked,
              safety: MCP_SAFETY,
            });
          } finally {
            logCall('recommend_skills_for_task', start);
          }
        },
      );

      server.tool(
        'get_skill',
        'Get the full Prompt / content of a single MCP-ready Skill.',
        { id: z.number().describe('Skill ID') },
        async (args) => {
          const start = Date.now();
          try {
            const post = await prisma.post.findUnique({
              where: { id: args.id },
              select: {
                title: true,
                body: true,
                tagScene: true,
                status: true,
                deletedAt: true,
                mcpApproved: true,
                skillAsset: { select: { assetType: true, sourceUrl: true } },
              },
            });
            if (!post || post.status !== POST_STATUS.PUBLISHED || post.deletedAt || !post.mcpApproved) {
              return toolResultMessage(false, 'Skill not found or not available through MCP.', { id: args.id });
            }

            const text = normalizePublicText(extractPlainText(post.body));
            const placeholders = [
              ...new Set(
                [...text.matchAll(/\[([^\]]{2,30})\]/g)]
                  .map((m) => `[${m[1]}]`)
                  .filter((s) => !/^\[\s*\]$/.test(s)),
              ),
            ];

            return {
              content: [
                {
                  type: 'text' as const,
                  text: wrapWithSafetyRules(
                    `# ${post.title}\nScene: ${post.tagScene}\nType: ${post.skillAsset?.assetType ?? 'unknown'}\n\n---\n\n${text}` +
                      (placeholders.length
                        ? `\n\n---\n\nPlaceholders for apply_skill:\n${placeholders.join('  ')}`
                        : ''),
                  ),
                },
              ],
            };
          } finally {
            logCall('get_skill', start, args.id);
          }
        },
      );

      server.tool(
        'apply_skill',
        'Fill a Skill Prompt template with provided context and return the completed prompt for the trusted AI client to execute.',
        {
          id: z.number().describe('Skill ID'),
          context: z
            .record(z.string(), z.string())
            .optional()
            .describe('Mapping from placeholders to values, for example {"[行业]":"半导体","[阶段]":"Pre-A"}'),
        },
        async (args) => {
          const start = Date.now();
          try {
            const post = await prisma.post.findUnique({
              where: { id: args.id },
              select: { title: true, body: true, status: true, deletedAt: true, mcpApproved: true },
            });
            if (!post || post.status !== POST_STATUS.PUBLISHED || post.deletedAt || !post.mcpApproved) {
              return toolResultMessage(false, 'Skill not found or not available through MCP.', { id: args.id });
            }

            let promptText = normalizePublicText(extractPlainText(post.body));
            for (const [key, value] of Object.entries(args.context || {})) {
              if (!value) continue;
              const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              promptText = promptText.replace(new RegExp(escaped, 'g'), value);
            }

            const unfilled = [...promptText.matchAll(/\[([^\]]{2,30})\]/g)]
              .map((m) => m[1])
              .filter((s) => !/^\s*$/.test(s));
            const hint =
              unfilled.length > 0
                ? `\n\nNote: ${unfilled.length} placeholders are still unfilled: ${[...new Set(unfilled)]
                    .slice(0, 8)
                    .map((s) => `[${s}]`)
                    .join(' ')}.`
                : '';

            return {
              content: [
                {
                  type: 'text' as const,
                  text: wrapWithSafetyRules(
                    `# ${post.title}\n\nCompleted prompt for your trusted AI client:\n\n---\n\n${promptText}${hint}`,
                  ),
                },
              ],
            };
          } finally {
            logCall('apply_skill', start, args.id);
          }
        },
      );

      server.tool(
        'list_my_skills',
        'List your favorited MCP-ready Skills with structured metadata.',
        {},
        async () => {
          const start = Date.now();
          try {
            const favs = await prisma.postFavorite.findMany({
              where: { userId: uid },
              include: {
                post: {
                  include: {
                    author: { select: { nickname: true } },
                    skillAsset: { select: { assetType: true, originalAuthor: true } },
                    _count: { select: { stars: true, comments: true, attachments: true } },
                  },
                },
              },
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
              take: 80,
            });

            const visible = favs.filter(
              (f) =>
                f.post.status === POST_STATUS.PUBLISHED &&
                !f.post.deletedAt &&
                f.post.mcpApproved,
            );
            const hiddenBecauseNotMcpApprovedCount = favs.length - visible.length;
            const items = visible.map((f) => ({
              ...postToMcpItem(f.post),
              favoritedAt: f.createdAt.toISOString(),
            }));

            return jsonContent({
              summary: items.length
                ? `You have ${items.length} MCP-ready favorited Skills.`
                : 'You do not have any MCP-ready favorited Skills yet.',
              visibleCount: items.length,
              hiddenBecauseNotMcpApprovedCount,
              warnings:
                hiddenBecauseNotMcpApprovedCount > 0
                  ? [
                      `${hiddenBecauseNotMcpApprovedCount} favorite(s) are hidden because they are unpublished, deleted, or not approved for MCP.`,
                    ]
                  : [],
              items,
              safety: MCP_SAFETY,
            });
          } finally {
            logCall('list_my_skills', start);
          }
        },
      );

      server.tool(
        'favorite_skill',
        'Favorite a Skill into your N.E.I. Skill Library. This operation is idempotent.',
        { id: z.number().describe('Skill ID') },
        async (args) => {
          const start = Date.now();
          try {
            const post = await prisma.post.findUnique({
              where: { id: args.id },
              select: { id: true, title: true, status: true, deletedAt: true, mcpApproved: true },
            });
            if (!post || post.status !== POST_STATUS.PUBLISHED || post.deletedAt || !post.mcpApproved) {
              return toolResultMessage(false, 'Skill not found or not available through MCP.', { id: args.id });
            }

            const existing = await prisma.postFavorite.findUnique({
              where: { userId_postId: { userId: uid, postId: args.id } },
              select: { id: true },
            });
            await prisma.postFavorite.upsert({
              where: { userId_postId: { userId: uid, postId: args.id } },
              create: { userId: uid, postId: args.id },
              update: {},
            });

            return toolResultMessage(true, existing ? 'Skill was already favorited.' : 'Skill favorited.', {
              id: post.id,
              title: post.title,
              alreadyFavorited: Boolean(existing),
            });
          } finally {
            logCall('favorite_skill', start, args.id);
          }
        },
      );

      server.tool(
        'unfavorite_skill',
        'Remove a Skill from your N.E.I. Skill Library. Requires confirm=true to avoid accidental deletion.',
        {
          id: z.number().describe('Skill ID'),
          confirm: z.boolean().optional().default(false).describe('Must be true to remove the favorite'),
        },
        async (args) => {
          const start = Date.now();
          try {
            if (!args.confirm) {
              return toolResultMessage(false, 'Confirmation required. Call unfavorite_skill again with confirm=true to remove this favorite.', {
                id: args.id,
                confirmationRequired: true,
              });
            }

            const result = await prisma.postFavorite.deleteMany({
              where: { userId: uid, postId: args.id },
            });
            return toolResultMessage(true, result.count > 0 ? 'Skill unfavorited.' : 'Skill was not in your favorites.', {
              id: args.id,
              removedCount: result.count,
            });
          } finally {
            logCall('unfavorite_skill', start, args.id);
          }
        },
      );
    },
    undefined,
    { basePath: '/api' },
  );
}

function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: 'invalid_token', message: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function perRequestCtx(req: Request): { clientName: string | null; requestId: string } {
  const ua = req.headers.get('user-agent');
  const clientName = ua ? ua.slice(0, 256) : null;
  return { clientName, requestId: crypto.randomUUID() };
}

export const POST = withMetrics('POST /api/mcp', mcpPost);

async function mcpPost(req: Request): Promise<Response> {
  const uid = await getUidFromRequest(req);
  if (!uid) return unauthorizedResponse();
  const { clientName, requestId } = perRequestCtx(req);
  return makeHandler(uid, clientName, requestId)(req);
}

export async function GET(req: Request): Promise<Response> {
  const uid = await getUidFromRequest(req);
  if (!uid) return unauthorizedResponse();
  const { clientName, requestId } = perRequestCtx(req);
  return makeHandler(uid, clientName, requestId)(req);
}

export async function DELETE(req: Request): Promise<Response> {
  const uid = await getUidFromRequest(req);
  if (!uid) return unauthorizedResponse();
  const { clientName, requestId } = perRequestCtx(req);
  return makeHandler(uid, clientName, requestId)(req);
}
