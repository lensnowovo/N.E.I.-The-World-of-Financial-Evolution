import crypto from 'node:crypto';
import { createMcpHandler } from 'mcp-handler';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { buildFeedWhere } from '@/lib/feed';
import { POST_STATUS } from '@/lib/status';
import { extractPlainText } from '@/lib/skill-text';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * N.E.I. MCP Server
 *
 * 让用户的 AI 客户端通过 MCP 协议搜索和获取 N.E.I. 上的 skill。
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
  return user?.id ?? null;
}

// 每次请求都新建 handler，把 uid 通过闭包传入 tool handlers，杜绝跨请求串号
function makeHandler(uid: number) {
  return createMcpHandler(
    async (server: McpServer) => {
      server.tool(
        'search_skills',
        '搜索 N.E.I. 上的公开 Skill（Prompt / 模板 / 工作流等）',
        {
          query: z.string().optional().describe('搜索关键词'),
          scene: z.string().optional().describe('工作场景'),
          skillType: z.string().optional().describe('Skill 类型'),
          limit: z.number().optional().default(10).describe('返回条数'),
        },
        async (args) => {
          // 记录调用日志（fire-and-forget）
          void prisma.mcpCallLog.create({ data: { userId: uid, tool: 'search_skills' } }).catch(() => {});

          const where = buildFeedWhere({
            q: args.query || '',
            scene: args.scene,
            skill: args.skillType,
          });
          const posts = await prisma.post.findMany({
            where,
            include: {
              author: { select: { nickname: true } },
              skillAsset: { select: { assetType: true, originalAuthor: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: Math.min(args.limit || 10, 20),
          });
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(posts.map((p) => ({
                id: p.id,
                title: p.title,
                scene: p.tagScene,
                type: p.skillAsset?.assetType ?? null,
                author: p.skillAsset?.originalAuthor || p.author.nickname,
                excerpt: p.body.replace(/<[^>]*>/g, '').slice(0, 100),
              })), null, 2),
            }],
          };
        },
      );

      server.tool(
        'get_skill',
        '获取某个 Skill 的完整 Prompt / 内容原文',
        { id: z.number().describe('Skill ID') },
        async (args) => {
          // 记录调用日志（fire-and-forget）
          void prisma.mcpCallLog.create({ data: { userId: uid, postId: args.id, tool: 'get_skill' } }).catch(() => {});

          const post = await prisma.post.findUnique({
            where: { id: args.id },
            select: { title: true, body: true, tagScene: true, status: true, deletedAt: true,
              skillAsset: { select: { assetType: true, sourceUrl: true } } },
          });
          if (!post || post.status !== POST_STATUS.PUBLISHED || post.deletedAt) {
            return { content: [{ type: 'text' as const, text: '未找到该 Skill' }] };
          }
          const text = extractPlainText(post.body);
          return {
            content: [{
              type: 'text' as const,
              text: `# ${post.title}\n场景：${post.tagScene}\n类型：${post.skillAsset?.assetType ?? '未知'}\n\n---\n\n${text}`,
            }],
          };
        },
      );

      server.tool(
        'list_my_skills',
        '列出你收藏的 Skill',
        {},
        async () => {
          // 记录调用日志（fire-and-forget）
          void prisma.mcpCallLog.create({ data: { userId: uid, tool: 'list_my_skills' } }).catch(() => {});

          const favs = await prisma.postFavorite.findMany({
            where: { userId: uid },
            include: {
              post: {
                include: {
                  author: { select: { nickname: true } },
                  skillAsset: { select: { assetType: true, originalAuthor: true } },
                },
              },
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
            take: 50,
          });
          const skills = favs
            .filter((f) => f.post.status === POST_STATUS.PUBLISHED)
            .map((f) => ({
              id: f.post.id,
              title: f.post.title,
              scene: f.post.tagScene,
              type: f.post.skillAsset?.assetType ?? null,
              author: f.post.skillAsset?.originalAuthor || f.post.author.nickname,
            }));
          return {
            content: [{
              type: 'text' as const,
              text: skills.length > 0
                ? `你收藏了 ${skills.length} 个 Skill：\n${JSON.stringify(skills, null, 2)}`
                : '你还没有收藏任何 Skill。请到 N.E.I. 网站发现并收藏。',
            }],
          };
        },
      );
    },
  );
}

function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

// 包装 handler：在调用前解析 token → 把 uid 通过闭包注入到 tool handlers
export async function POST(req: Request): Promise<Response> {
  const uid = await getUidFromRequest(req);
  if (!uid) return unauthorizedResponse();
  return makeHandler(uid)(req);
}

export async function GET(req: Request): Promise<Response> {
  const uid = await getUidFromRequest(req);
  if (!uid) return unauthorizedResponse();
  return makeHandler(uid)(req);
}

export async function DELETE(req: Request): Promise<Response> {
  const uid = await getUidFromRequest(req);
  if (!uid) return unauthorizedResponse();
  return makeHandler(uid)(req);
}
