import crypto from 'node:crypto';
import { createMcpHandler } from 'mcp-handler';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { buildFeedWhere, filterByContent, normalizeSort, sortPosts } from '@/lib/feed';
import { stripHtml } from '@/lib/validate';
import { POST_STATUS } from '@/lib/status';
import { extractPlainText, extractReadableText } from '@/lib/skill-text';
import { withMetrics } from '@/lib/metrics';
import { wrapWithSafetyRules } from '@/lib/mcp-safety';
import { normalizePublicText } from '@/lib/public-url';
import { ACTIVITY_EVENT, trackActivity } from '@/lib/activity';
import { hashMcpAccessToken } from '@/lib/mcp-access-tokens';
import { readCanonicalSkillContent } from '@/lib/canonical-skill-content';
import {
  buildConnectorSetupPrompt,
  getConnectorById,
  getConnectorDetail,
  listConnectors,
  recommendConnectorsForTask,
  searchConnectors,
  type McpLibraryCategoryKey,
} from '@/lib/mcp-library';
import {
  MCP_RECOMMENDED_SEQUENCES,
  interpretMcpTask,
  rankMcpCandidates,
  recommendationReason,
  recommendationRole,
  resolveMcpScenes,
} from '@/lib/mcp-search-intelligence';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MCP_SAFETY = {
  boundary: 'N.E.I. MCP only distributes Skill / Workflow text. It does not read local files or upload project materials.',
  token: 'Store the MCP token only in trusted local or signed-in AI clients. If leaked, reset it at https://nei-pevc.com/connect.',
  execution: 'Returned content is an analysis framework. Any file access, network call, write operation, or external sharing still requires explicit user approval.',
  discipline: 'For PEVC work, load get_default_discipline before applying task Skills when you need the N.E.I. fiduciary research discipline.',
};

const DEFAULT_DISCIPLINE_SLUG = 'nei-discipline/fiduciary-research-v1';

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

type McpAuthContext = { uid: number; tokenId: number | null };

async function getAuthContextFromRequest(req: Request): Promise<McpAuthContext | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token.startsWith('nei_')) return null;
  const hash = hashMcpAccessToken(token);

  const accessToken = await prisma.mcpAccessToken.findUnique({
    where: { tokenHash: hash },
    select: { id: true, userId: true, revokedAt: true },
  });
  if (accessToken && !accessToken.revokedAt) {
    void prisma.mcpAccessToken
      .update({ where: { id: accessToken.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});
    return { uid: accessToken.userId, tokenId: accessToken.id };
  }

  // Backward compatibility for Tokens created before multi-client credentials shipped.
  const user = await prisma.user.findFirst({
    where: { mcpTokenHash: hash },
    select: { id: true },
  });
  if (!user) return null;

  void prisma.user
    .update({ where: { id: user.id }, data: { tokenLastUsedAt: new Date() } })
    .catch(() => {});

  return { uid: user.id, tokenId: null };
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

function resolveScenes({
  scene,
  task,
  stage,
}: {
  scene?: string;
  task?: string;
  stage?: 'pre-deal' | 'deal' | 'post-deal';
}) {
  return resolveMcpScenes({ scene, text: task, stage });
}

function buildMcpWhere(args: {
  scene?: string;
  task?: string;
  stage?: 'pre-deal' | 'deal' | 'post-deal';
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

async function findDefaultDiscipline() {
  return prisma.post.findFirst({
    where: {
      status: POST_STATUS.PUBLISHED,
      deletedAt: null,
      mcpApproved: true,
      OR: [
        { body: { contains: `slug:${DEFAULT_DISCIPLINE_SLUG}` } },
        { skillAsset: { is: { assetType: 'agent-discipline' } } },
      ],
    },
    include: {
      author: { select: { nickname: true } },
      skillAsset: { select: { assetType: true, originalAuthor: true, sourceUrl: true, usageNotes: true } },
      _count: { select: { stars: true, comments: true, attachments: true } },
    },
    orderBy: { id: 'asc' },
  });
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

function toolResultMessage(ok: boolean, message: string, extra: Record<string, unknown> = {}) {
  return jsonContent({ ok, message, ...extra, safety: MCP_SAFETY });
}

function makeHandler(uid: number, tokenId: number | null, clientName: string | null, requestId: string) {
  return createMcpHandler(
    async (server: McpServer) => {
      const logCall = (tool: string, start: number, postId?: number) => {
        const latencyMs = Date.now() - start;
        void prisma.mcpCallLog
          .create({
            data: {
              userId: uid,
              tokenId,
              tool,
              postId,
              clientName,
              requestId,
              latencyMs,
            },
          })
          .catch(() => {});
        trackActivity({
          type: ACTIVITY_EVENT.MCP_CALL,
          userId: uid,
          entityType: postId ? 'post' : null,
          entityId: postId ?? null,
          source: 'mcp',
          metadata: {
            tool,
            clientName: clientName ? clientName.slice(0, 80) : null,
            latencyMs,
          },
        });
      };

      server.tool(
        'search_skills',
        'Search the whole public MCP-ready N.E.I. Skill library by keyword, PEVC task, stage, type, industry, tags, author, and sort order. This does not require the user to favorite Skills first.',
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
            const interpretation = interpretMcpTask(query);

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
            const ranked = sort === 'relevance' && query
              ? rankMcpCandidates(posts, {
                  text: query,
                  explicitScene: args.scene,
                  explicitIndustry: args.industry,
                  interpretation,
                })
              : sortPosts(posts, sort, query).map((post) => ({
                  post,
                  score: 0,
                  semanticScore: 0,
                  matchedSignals: [] as string[],
                }));
            const pageItems = ranked.slice(0, cap);

            return jsonContent({
              summary: pageItems.length
                ? `Found ${pageItems.length} MCP-ready N.E.I. Skills.`
                : 'No MCP-ready Skill matched this request.',
              count: pageItems.length,
              nextCursor: ranked.length > cap ? pageItems[pageItems.length - 1]?.post.id ?? null : null,
              interpretedIntent: interpretation.interpretedIntent,
              inferredScenes: interpretation.inferredScenes,
              inferredIndustries: interpretation.inferredIndustries,
              inferredContentTags: interpretation.inferredContentTags,
              matchedSignals: interpretation.matchedSignals,
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
              items: pageItems.map(({ post, score, matchedSignals }) => ({
                ...postToMcpItem(post, query),
                relevanceScore: sort === 'relevance' ? score : null,
                matchedSignals,
              })),
              safety: MCP_SAFETY,
            });
          } finally {
            logCall('search_skills', start);
          }
        },
      );

      server.tool(
        'recommend_skills_for_task',
        'Recommend a short sequence from the whole public MCP-ready N.E.I. Skill library for a PEVC work task, such as BP screening, IC Memo, industry research, post-investment update, or LP reporting. Favorites are optional and only used to save useful Skills for later.',
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
            const interpretation = interpretMcpTask(`${args.task} ${args.industry ?? ''}`);
            const scenes = resolveScenes({ task: args.task, stage: args.stage });
            const inferredIndustry = args.industry ?? interpretation.inferredIndustries[0];
            const where = buildFeedWhere({
              scene: scenes.length === 1 ? scenes[0] : undefined,
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

            if (posts.length === 0 && scenes.length > 0) {
              const fallbackWhere = buildFeedWhere({ mcp: 'ready' });
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

            const ranked = rankMcpCandidates(posts, {
              text: `${args.task} ${args.industry ?? ''}`,
              explicitIndustry: args.industry,
              interpretation,
              includeZeroScore: true,
            })
              .slice(0, cap)
              .map((entry, index, entries) => ({
                ...postToMcpItem(entry.post, args.task),
                role: recommendationRole(index, entries.length),
                recommendedOrder: index + 1,
                reason: recommendationReason(entry),
                relevanceScore: entry.score,
                matchedSignals: entry.matchedSignals,
              }));

            const primaryScene = scenes[0] ?? 'industry-research';
            const suggestedConnectors = recommendConnectorsForTask(args.task, inferredIndustry, scenes);
            return jsonContent({
              summary: ranked.length
                ? `Recommended ${ranked.length} Skills for: ${args.task}.`
                : `No MCP-ready Skill is currently available for: ${args.task}.`,
              task: args.task,
              industry: args.industry ?? null,
              interpretedIntent: interpretation.interpretedIntent,
              inferredScenes: scenes,
              inferredIndustries: interpretation.inferredIndustries,
              inferredContentTags: interpretation.inferredContentTags,
              matchedSignals: interpretation.matchedSignals,
              suggestedSequence: MCP_RECOMMENDED_SEQUENCES[primaryScene] ?? [
                '明确任务、材料和交付要求',
                '调用最接近的 Skill',
                '复核结果并结合投资语境调整',
              ],
              items: ranked,
              suggestedConnectors:
                suggestedConnectors.length > 0
                  ? {
                      summary:
                        '基于本任务的行业 / 关键词，N.E.I. 建议补充以下外部数据源。用户确认后，调用 get_connector_setup_prompt 获取加载指令。',
                      items: suggestedConnectors,
                    }
                  : null,
              safety: MCP_SAFETY,
            });
          } finally {
            logCall('recommend_skills_for_task', start);
          }
        },
      );

      server.tool(
        'list_disciplines',
        'List MCP-ready N.E.I. Agent Disciplines. Disciplines are working rules that constrain how AI agents should handle PEVC research, diligence, modeling, memo, and reporting tasks.',
        {},
        async () => {
          const start = Date.now();
          try {
            const posts = await prisma.post.findMany({
              where: {
                status: POST_STATUS.PUBLISHED,
                deletedAt: null,
                mcpApproved: true,
                skillAsset: { is: { assetType: 'agent-discipline' } },
              },
              include: {
                author: { select: { nickname: true } },
                skillAsset: { select: { assetType: true, originalAuthor: true, usageNotes: true } },
                _count: { select: { stars: true, comments: true, attachments: true } },
              },
              orderBy: [{ featured: 'desc' }, { id: 'asc' }],
              take: 30,
            });

            return jsonContent({
              summary: posts.length
                ? `Found ${posts.length} MCP-ready N.E.I. Agent Discipline(s).`
                : 'No MCP-ready Agent Discipline is currently available.',
              defaultDisciplineSlug: DEFAULT_DISCIPLINE_SLUG,
              items: posts.map((post) => ({
                ...postToMcpItem(post),
                usageNotes: post.skillAsset?.usageNotes ?? null,
                loadingHint:
                  post.body.includes(`slug:${DEFAULT_DISCIPLINE_SLUG}`)
                    ? 'Recommended default: load this before applying PEVC Skills / Workflows.'
                    : 'Optional discipline: load when relevant to the task.',
              })),
              safety: MCP_SAFETY,
            });
          } finally {
            logCall('list_disciplines', start);
          }
        },
      );

      server.tool(
        'get_default_discipline',
        'Get the default N.E.I. Agent Discipline to load before PEVC Skill / Workflow execution.',
        {},
        async () => {
          const start = Date.now();
          let postId: number | undefined;
          try {
            const post = await findDefaultDiscipline();
            if (!post) {
              return toolResultMessage(false, 'Default N.E.I. Agent Discipline is not configured.');
            }
            postId = post.id;

            const text = normalizePublicText(extractReadableText(post.body));
            return {
              content: [
                {
                  type: 'text' as const,
                  text: wrapWithSafetyRules(
                    `# ${post.title}\nScene: ${post.tagScene}\nType: ${post.skillAsset?.assetType ?? 'agent-discipline'}\nDefault Discipline: true\nPost ID: ${post.id}\n\nLoading instruction:\nLoad and follow this discipline before executing PEVC Skills / Workflows unless the user explicitly overrides it.\n\n---\n\n${text}`,
                  ),
                },
              ],
            };
          } finally {
            logCall('get_default_discipline', start, postId);
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
                attachments: {
                  orderBy: { createdAt: 'asc' },
                  select: { fileName: true, mimeType: true, storageKey: true },
                },
              },
            });
            if (!post || post.status !== POST_STATUS.PUBLISHED || post.deletedAt || !post.mcpApproved) {
              return toolResultMessage(false, 'Skill not found or not available through MCP.', { id: args.id });
            }

            const fallbackText = normalizePublicText(
              post.skillAsset?.assetType === 'agent-discipline'
                ? extractReadableText(post.body)
                : extractPlainText(post.body),
            );
            const text = normalizePublicText(
              await readCanonicalSkillContent(post.attachments, fallbackText),
            );
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
              select: {
                title: true,
                body: true,
                status: true,
                deletedAt: true,
                mcpApproved: true,
                attachments: {
                  orderBy: { createdAt: 'asc' },
                  select: { fileName: true, mimeType: true, storageKey: true },
                },
              },
            });
            if (!post || post.status !== POST_STATUS.PUBLISHED || post.deletedAt || !post.mcpApproved) {
              return toolResultMessage(false, 'Skill not found or not available through MCP.', { id: args.id });
            }

            let promptText = normalizePublicText(
              await readCanonicalSkillContent(post.attachments, extractPlainText(post.body)),
            );
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
        'List your favorited MCP-ready Skills with structured metadata. Use search_skills or recommend_skills_for_task to search the whole public Skill library; favorites are only the user’s saved shortlist.',
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
                : 'Your favorite library is empty, but you can still use search_skills and recommend_skills_for_task to search the whole public MCP-ready N.E.I. Skill library.',
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
            if (!existing) {
              trackActivity({
                type: ACTIVITY_EVENT.FAVORITE_ADD,
                userId: uid,
                entityType: 'post',
                entityId: args.id,
                source: 'mcp',
              });
            }

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
            if (result.count > 0) {
              trackActivity({
                type: ACTIVITY_EVENT.FAVORITE_REMOVE,
                userId: uid,
                entityType: 'post',
                entityId: args.id,
                source: 'mcp',
              });
            }
            return toolResultMessage(true, result.count > 0 ? 'Skill unfavorited.' : 'Skill was not in your favorites.', {
              id: args.id,
              removedCount: result.count,
            });
          } finally {
            logCall('unfavorite_skill', start, args.id);
          }
        },
      );

      server.tool(
        'list_connectors',
        'List external MCP / API connectors in the N.E.I. directory. Browse by category / kind / status. Use this when the Agent wants to proactively survey available data sources instead of waiting for a task-based recommendation.',
        {
          category: z.enum(['search', 'research', 'biomed', 'ai', 'hard-tech', 'company', 'market']).optional().describe('Filter by category'),
          kind: z.enum(['MCP', 'API', 'MCP / API']).optional().describe('Filter by kind'),
          status: z.enum(['推荐试用', '适合自建', '需订阅验证', '观察']).optional().describe('Filter by status'),
          internalOnly: z.boolean().optional().describe('true = only N.E.I. own MCP; false = only external; omit = all'),
          limit: z.number().optional().default(50).describe('Max 100'),
        },
        async (args) => {
          const start = Date.now();
          try {
            const items = listConnectors({
              category: args.category as McpLibraryCategoryKey | undefined,
              kind: args.kind,
              status: args.status,
              internalOnly: args.internalOnly,
              limit: args.limit,
            });
            return jsonContent({
              summary: items.length
                ? `Found ${items.length} connector(s) in the N.E.I. directory.`
                : 'No connector matched the filters.',
              count: items.length,
              filters: {
                category: args.category ?? null,
                kind: args.kind ?? null,
                status: args.status ?? null,
                internalOnly: args.internalOnly ?? null,
              },
              items,
              safety: MCP_SAFETY,
            });
          } finally {
            logCall('list_connectors', start);
          }
        },
      );

      server.tool(
        'get_connector',
        'Get full metadata for a single connector (coverage, safety note, PEVC use cases). Does NOT return the setup prompt — for that, call get_connector_setup_prompt after user confirmation.',
        {
          connector_id: z.string().describe('Connector ID, e.g. biomcp / arxiv-mcp / nei-pevc'),
        },
        async (args) => {
          const start = Date.now();
          try {
            const detail = getConnectorDetail(args.connector_id);
            if (!detail) {
              return toolResultMessage(false, 'Connector not found in N.E.I. directory.', {
                connector_id: args.connector_id,
              });
            }
            return jsonContent({
              summary: `Connector: ${detail.name}`,
              connector: detail,
              nextStep: detail.internal
                ? 'This is the N.E.I. own MCP. Direct the user to /connect to generate a token and copy the setup prompt.'
                : `If the user wants to add this data source, call get_connector_setup_prompt(connector_id="${detail.id}", confirmed=true) after confirmation.`,
              safety: MCP_SAFETY,
            });
          } finally {
            logCall('get_connector', start);
          }
        },
      );

      server.tool(
        'search_connectors',
        'Search the N.E.I. connector directory by keyword (matches name / coverage / use cases). Use this when the Agent needs to find data sources by topic rather than by task.',
        {
          query: z.string().describe('Search keyword, e.g. "clinical trials" / "SEC filings" / "open source"'),
          limit: z.number().optional().default(10).describe('Max 30'),
        },
        async (args) => {
          const start = Date.now();
          try {
            const items = searchConnectors(args.query, args.limit);
            return jsonContent({
              summary: items.length
                ? `Found ${items.length} connector(s) matching "${args.query}".`
                : `No connector matched "${args.query}".`,
              count: items.length,
              query: args.query,
              items,
              safety: MCP_SAFETY,
            });
          } finally {
            logCall('search_connectors', start);
          }
        },
      );

      server.tool(
        'recommend_connectors_for_task',
        'Recommend external MCP / API data sources that complement N.E.I. Skills for a PEVC task. Returns connector metadata and a confirm hint; call get_connector_setup_prompt after the user confirms.',
        {
          task: z.string().describe('The investment work task to complete'),
          industry: z.string().optional().describe('Optional industry focus, e.g. biotech / semiconductor / ai-saas'),
          stage: z.enum(['pre-deal', 'deal', 'post-deal']).optional().describe('Optional stage hint'),
        },
        async (args) => {
          const start = Date.now();
          try {
            const scenes = resolveScenes({ task: args.task, stage: args.stage });
            const items = recommendConnectorsForTask(args.task, args.industry, scenes);
            return jsonContent({
              summary: items.length
                ? `N.E.I. recommends ${items.length} external data source(s) for: ${args.task}.`
                : 'No external data source is currently recommended for this task.',
              task: args.task,
              industry: args.industry ?? null,
              inferredScenes: scenes,
              items,
              nextStep:
                items.length > 0
                  ? 'For each recommended connector, ask the user to confirm, then call get_connector_setup_prompt(connector_id, confirmed=true) to fetch the install prompt. The Agent should install and connect the external MCP locally; N.E.I. does not proxy external calls.'
                  : null,
              safety: MCP_SAFETY,
            });
          } finally {
            logCall('recommend_connectors_for_task', start);
          }
        },
      );

      server.tool(
        'get_connector_setup_prompt',
        'Get the install / setup prompt for a specific external MCP / API connector from the N.E.I. library. Requires confirm=true to surface the full prompt (mirrors the unfavorite_skill confirmation pattern).',
        {
          connector_id: z.string().describe('Connector ID, e.g. biomcp / arxiv-mcp / exa-mcp'),
          confirmed: z.boolean().optional().default(false).describe('Must be true to receive the full setup prompt'),
        },
        async (args) => {
          const start = Date.now();
          try {
            const item = getConnectorById(args.connector_id);
            if (!item) {
              return toolResultMessage(false, 'Connector not found in N.E.I. library.', {
                connector_id: args.connector_id,
              });
            }

            if (!args.confirmed) {
              return toolResultMessage(false, 'Confirmation required. Ask the user whether to add this connector, then call again with confirmed=true.', {
                connector_id: item.id,
                name: item.name,
                reason: item.highlight,
                confirmationRequired: true,
              });
            }

            const promptText = buildConnectorSetupPrompt(item);
            return {
              content: [
                {
                  type: 'text' as const,
                  text: wrapWithSafetyRules(
                    `# Connector Setup Prompt: ${item.name}\n\nThis is a setup instruction for your trusted AI client to install and connect an external data source.\n\n---\n\n${promptText}`,
                  ),
                },
              ],
            };
          } finally {
            logCall('get_connector_setup_prompt', start);
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
  const auth = await getAuthContextFromRequest(req);
  if (!auth) return unauthorizedResponse();
  const { clientName, requestId } = perRequestCtx(req);
  return makeHandler(auth.uid, auth.tokenId, clientName, requestId)(req);
}

export async function GET(req: Request): Promise<Response> {
  const auth = await getAuthContextFromRequest(req);
  if (!auth) return unauthorizedResponse();
  const { clientName, requestId } = perRequestCtx(req);
  return makeHandler(auth.uid, auth.tokenId, clientName, requestId)(req);
}

export async function DELETE(req: Request): Promise<Response> {
  const auth = await getAuthContextFromRequest(req);
  if (!auth) return unauthorizedResponse();
  const { clientName, requestId } = perRequestCtx(req);
  return makeHandler(auth.uid, auth.tokenId, clientName, requestId)(req);
}
