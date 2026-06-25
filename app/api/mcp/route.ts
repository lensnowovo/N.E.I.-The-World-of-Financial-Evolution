import crypto from 'node:crypto';
import { createMcpHandler } from 'mcp-handler';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { buildFeedWhere } from '@/lib/feed';
import { stripHtml } from '@/lib/validate';
import { POST_STATUS } from '@/lib/status';
import { extractPlainText } from '@/lib/skill-text';
import { withMetrics } from '@/lib/metrics';
import { wrapWithSafetyRules } from '@/lib/mcp-safety';
import { normalizePublicText } from '@/lib/public-url';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * N.E.I. MCP Server
 *
 * 让用户的 AI 客户端通过 MCP 协议搜索、获取、应用、收藏 N.E.I. 上的 skill。
 * 鉴权：Authorization: Bearer nei_xxx
 *
 * 安全说明：uid 通过 per-request 闭包传入 tool handlers，避免模块级全局变量
 * 在并发请求间串号（US-001）。
 */

// 预构建 uid 查询（在每次请求入口处调用）
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
  // SEC-008: 鉴权成功后 fire-and-forget 更新 token 最后使用时间（不阻塞请求）；
  // 失败静默吞掉 —— 这只是可观测性字段，绝不能影响 MCP 主流程
  void prisma.user
    .update({ where: { id: user.id }, data: { tokenLastUsedAt: new Date() } })
    .catch(() => {});
  return user.id;
}

/** 把 tagContent（JSON string）安全解析成 string[] */
function safeJsonArray(raw: string | null): string[] {
  try {
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** 从 body 里截取 query 命中片段（去 HTML，前后各带一点上下文），像搜索 snippet */
function makeSnippet(html: string, query: string): string | null {
  if (!query) return null;
  const text = stripHtml(html);
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return null;
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 60);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

// 每次请求都新建 handler，把 uid + clientName + requestId 通过闭包传入 tool handlers，
// 杜绝跨请求串号（US-001）并支持同请求多 tool 共享 requestId（SEC-009）
function makeHandler(uid: number, clientName: string | null, requestId: string) {
  return createMcpHandler(
    async (server: McpServer) => {
      /**
       * SEC-009: 记录 MCP 调用日志（fire-and-forget），含溯源维度：
       * - clientName: 调用方 User-Agent，识别客户端（Cursor / Claude Desktop / curl 等）
       * - latencyMs:  tool 执行耗时（finally 测得，含异常路径）
       * - requestId:  同一次 HTTP 请求内所有 tool 调用共享，便于回放批量调用
       * 绝不记录 post body / prompt 全文 / token 明文（只记 userId / postId / tool 名）
       */
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
      // ============ search_skills（增强：多筛选 + 排序 + 游标 + 富返回 + snippet）============
      server.tool(
        'search_skills',
        '搜索 N.E.I. 上的公开 Skill（Prompt / 模板 / 工作流等）。返回带摘要、热度、标签和命中片段。',
        {
          query: z.string().optional().describe('搜索关键词（标题 / 正文 / 作者）'),
          scene: z.string().optional().describe('工作场景，如 screening / financial / ic'),
          skillType: z.string().optional().describe('Skill 类型，如 prompt / workflow / agent-skill'),
          industry: z.string().optional().describe('行业赛道，如 ai-saas / biotech'),
          tags: z.array(z.string()).optional().describe('工作内容标签（多选，AND 关系）'),
          author: z.string().optional().describe('作者昵称（模糊匹配）'),
          sort: z.enum(['latest', 'popular']).optional().describe('排序：latest 最新 / popular 最热（默认）'),
          limit: z.number().optional().default(10).describe('返回条数（最大 30）'),
          cursor: z.number().optional().describe('游标分页：传入上一页最后一条的 id'),
        },
        async (args) => {
          const start = Date.now();
          try {
            const where = buildFeedWhere({
              q: args.query || '',
              scene: args.scene,
              skill: args.skillType,
              industry: args.industry,
            });
            // SEC-003: MCP 只返回审核通过的 skill（mcpApproved=true），未审核的社区投稿不进 MCP
            where.mcpApproved = true;
            if (args.author) {
              where.author = { ...(where.author || {}), nickname: { contains: args.author } };
            }
            if (args.cursor) {
              where.id = { lt: args.cursor };
            }

            const cap = Math.min(args.limit || 10, 30);
            // 多取一些以便 tags 内存过滤后仍有 cap 条
            let posts = await prisma.post.findMany({
              where,
              include: {
                author: { select: { nickname: true } },
                skillAsset: { select: { assetType: true, originalAuthor: true } },
                _count: { select: { stars: true, comments: true } },
              },
              orderBy: { id: 'desc' },
              take: args.tags?.length ? cap + 20 : cap,
            });

            // tags（tagContent）内存 AND 过滤
            if (args.tags && args.tags.length > 0) {
              posts = posts.filter((p) => {
                const arr = safeJsonArray(p.tagContent);
                return args.tags!.every((t) => arr.includes(t));
              });
            }

            // 排序
            const score = (p: (typeof posts)[number]) =>
              (p.viewCount || 0) + p._count.stars * 5 + p._count.comments * 3;
            const sorted =
              args.sort === 'latest'
                ? posts
                : [...posts].sort((a, b) => score(b) - score(a));

            const items = sorted.slice(0, cap).map((p) => ({
              id: p.id,
              title: p.title,
              scene: p.tagScene,
              type: p.skillAsset?.assetType ?? null,
              author: p.skillAsset?.originalAuthor || p.author.nickname,
              excerpt: stripHtml(normalizePublicText(p.body)).slice(0, 120),
              snippet: args.query ? makeSnippet(normalizePublicText(p.body), args.query) : null,
              tags: safeJsonArray(p.tagContent),
              viewCount: p.viewCount,
              stars: p._count.stars,
              updatedAt: p.updatedAt.toISOString(),
            }));

            const nextCursor = items.length === cap ? items[items.length - 1]?.id ?? null : null;

            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({ items, nextCursor, count: items.length }, null, 2),
                },
              ],
            };
          } finally {
            logCall('search_skills', start);
          }
        },
      );

      // ============ get_skill（不变）============
      server.tool(
        'get_skill',
        '获取某个 Skill 的完整 Prompt / 内容原文',
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
              return { content: [{ type: 'text' as const, text: '未找到该 Skill' }] };
            }
            const text = normalizePublicText(extractPlainText(post.body));
            // 提取占位符（apply_skill 用这些 key 做精确替换，显式列出避免调用方猜错 key）
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
                  // SEC-004: 在 skill 内容前注入安全规则前缀，降低 prompt injection 风险
                  text: wrapWithSafetyRules(
                    `# ${post.title}\n场景：${post.tagScene}\n类型：${post.skillAsset?.assetType ?? '未知'}\n\n---\n\n${text}` +
                      (placeholders.length
                        ? `\n\n---\n\n**占位符**（apply_skill 时传这些 key 做精确替换）：\n${placeholders.join('  ')}`
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

      // ============ apply_skill（新：填好 context 的 prompt，客户端执行，平台零成本）============
      server.tool(
        'apply_skill',
        '把 Skill 的 Prompt 模板填入你给的上下文，返回「填好的完整 Prompt」交给你的 AI 客户端直接执行。平台不消耗 AI 额度，执行用你自己客户端的模型。',
        {
          id: z.number().describe('Skill ID'),
          context: z
            .record(z.string(), z.string())
            .optional()
            .describe('占位符到值的映射，例如 {"[填入赛道名]": "合成生物学", "[阶段]": "Pre-A"}。key 通常是 prompt 里的 [填入xxx] / [xxx]'),
        },
        async (args) => {
          const start = Date.now();
          try {
            const post = await prisma.post.findUnique({
              where: { id: args.id },
              select: { title: true, body: true, status: true, deletedAt: true, mcpApproved: true },
            });
            if (!post || post.status !== POST_STATUS.PUBLISHED || post.deletedAt || !post.mcpApproved) {
              return { content: [{ type: 'text' as const, text: '未找到该 Skill' }] };
            }

            let promptText = normalizePublicText(extractPlainText(post.body));
            const ctx = args.context || {};
            for (const [key, value] of Object.entries(ctx)) {
              if (value) {
                const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                promptText = promptText.replace(new RegExp(escaped, 'g'), value);
              }
            }

            const unfilled = [...promptText.matchAll(/\[([^\]]{2,30})\]/g)]
              .map((m) => m[1])
              .filter((s) => !/^\s*$/.test(s));
            const hint =
              unfilled.length > 0
                ? `\n\n（提示：仍有 ${unfilled.length} 处占位符未填：${[...new Set(unfilled)].slice(0, 8).map((s) => `[${s}]`).join(' ')}。可再调用 apply_skill 补全。）`
                : '';

            return {
              content: [
                {
                  type: 'text' as const,
                  // SEC-004: 在填好的 prompt 前注入安全规则，apply 出来的内容直接给客户端 AI 执行，更需边界声明
                  text: wrapWithSafetyRules(
                    `# ${post.title}\n\n以下是填好你上下文的 Prompt，请直接用你的 AI 执行：\n\n---\n\n${promptText}${hint}`,
                  ),
                },
              ],
            };
          } finally {
            logCall('apply_skill', start, args.id);
          }
        },
      );

      // ============ list_my_skills（增强：摘要 / 热度 / 标签 / 更新时间 / 收藏时间）============
      server.tool(
        'list_my_skills',
        '列出你收藏的 Skill（带摘要、热度、标签和更新时间，方便区分每条是干嘛的）',
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
                    _count: { select: { stars: true, comments: true } },
                  },
                },
              },
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
              take: 50,
            });

            const skills = favs
              .filter(
                (f) =>
                  f.post.status === POST_STATUS.PUBLISHED &&
                  !f.post.deletedAt &&
                  f.post.mcpApproved,
              )
              .map((f) => ({
                id: f.post.id,
                title: f.post.title,
                scene: f.post.tagScene,
                type: f.post.skillAsset?.assetType ?? null,
                author: f.post.skillAsset?.originalAuthor || f.post.author.nickname,
                excerpt: stripHtml(normalizePublicText(f.post.body)).slice(0, 120),
                tags: safeJsonArray(f.post.tagContent),
                viewCount: f.post.viewCount,
                stars: f.post._count.stars,
                updatedAt: f.post.updatedAt.toISOString(),
                favoritedAt: f.createdAt.toISOString(),
              }));

            return {
              content: [
                {
                  type: 'text' as const,
                  // SEC-004: 收藏列表也注入安全规则前缀（列表里含 excerpt/title，且用户会继续 get/apply 其中某个）
                  text: wrapWithSafetyRules(
                    skills.length > 0
                      ? `你收藏了 ${skills.length} 个 Skill：\n${JSON.stringify(skills, null, 2)}`
                      : '你还没有收藏任何 Skill。请到 N.E.I. 网站发现并收藏，或用 favorite_skill 工具收藏。',
                  ),
                },
              ],
            };
          } finally {
            logCall('list_my_skills', start);
          }
        },
      );

      // ============ favorite_skill（新：写）============
      server.tool(
        'favorite_skill',
        '收藏一个 Skill（加入你的 Skill Library，list_my_skills 可见）。重复收藏幂等。',
        { id: z.number().describe('Skill ID') },
        async (args) => {
          const start = Date.now();
          try {
            const post = await prisma.post.findUnique({
              where: { id: args.id },
              select: { id: true, title: true, status: true, deletedAt: true, mcpApproved: true },
            });
            if (
              !post ||
              post.status !== POST_STATUS.PUBLISHED ||
              post.deletedAt ||
              !post.mcpApproved
            ) {
              return { content: [{ type: 'text' as const, text: '未找到该 Skill，无法收藏' }] };
            }
            await prisma.postFavorite.upsert({
              where: { userId_postId: { userId: uid, postId: args.id } },
              create: { userId: uid, postId: args.id },
              update: {},
            });
            return {
              content: [
                { type: 'text' as const, text: `✓ 已收藏《${post.title}》（#${args.id}）` },
              ],
            };
          } finally {
            logCall('favorite_skill', start, args.id);
          }
        },
      );

      // ============ unfavorite_skill（新：写）============
      server.tool(
        'unfavorite_skill',
        '取消收藏一个 Skill',
        { id: z.number().describe('Skill ID') },
        async (args) => {
          const start = Date.now();
          try {
            await prisma.postFavorite.deleteMany({
              where: { userId: uid, postId: args.id },
            });
            return {
              content: [{ type: 'text' as const, text: `已取消收藏 Skill #${args.id}` }],
            };
          } finally {
            logCall('unfavorite_skill', start, args.id);
          }
        },
      );
    },
    // N.E.I. 的 MCP 路由挂在 /api/mcp，必须把 basePath 设为 /api，
    // 否则 mcp-handler 默认 endpoint 是 /mcp，与实际 pathname /api/mcp 不匹配 → 404
    // 签名 createMcpHandler(initialize, serverOptions?, config?)：basePath 属于 config（第 3 参）
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

/**
 * SEC-009: 为每次 HTTP 请求生成溯源维度：
 * - clientName: 截断 User-Agent（256 上限避免长 UA 撑爆 DB），缺失时 null
 * - requestId:  crypto.randomUUID()，同请求内多 tool 调用共享
 */
function perRequestCtx(req: Request): { clientName: string | null; requestId: string } {
  const ua = req.headers.get('user-agent');
  const clientName = ua ? ua.slice(0, 256) : null;
  return { clientName, requestId: crypto.randomUUID() };
}

// 包装 handler：在调用前解析 token → 把 uid 通过闭包注入到 tool handlers
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
