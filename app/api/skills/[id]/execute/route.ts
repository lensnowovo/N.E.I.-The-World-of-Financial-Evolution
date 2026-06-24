import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';
import { decryptApiKey } from '@/lib/crypto';
import { POST_STATUS } from '@/lib/status';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

/**
 * POST /api/skills/:id/execute —— 流式执行 Skill
 *
 * Body: { params: Record<string, string> }
 *
 * 用用户的 API key（从 DB 解密）调 Claude，流式返回。
 * SSE 格式：data: {"text":"xxx"}\n\n ... data: [DONE]\n\n
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await getSessionUid();
  if (!uid) {
    return Response.json({ error: '请先登录' }, { status: 401 });
  }

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return Response.json({ error: '无效的 id' }, { status: 400 });
  }

  // 查 post
  const post = await prisma.post.findUnique({
    where: { id },
    select: { body: true, status: true, title: true, deletedAt: true },
  });
  if (!post || post.status !== POST_STATUS.PUBLISHED || post.deletedAt) {
    return Response.json({ error: '内容不存在' }, { status: 404 });
  }

  // 查用户 API key
  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { apiKeyEnc: true },
  });
  if (!user?.apiKeyEnc) {
    return Response.json({ error: '请先在设置页配置 API key' }, { status: 403 });
  }

  let apiKey: string;
  try {
    apiKey = decryptApiKey(user.apiKeyEnc);
  } catch {
    return Response.json({ error: 'API key 解密失败，请重新配置' }, { status: 500 });
  }

  // 从 body 提取 prompt 纯文本（优先 <pre>）
  const body = await req.json();
  const userParams: Record<string, string> = body.params || {};

  const preMatch = post.body.match(/<pre[\s\S]*?>([\s\S]*?)<\/pre>/i);
  const rawPrompt = preMatch ? preMatch[1] : post.body;
  let promptText = rawPrompt
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .trim();

  // 替换占位符 [填入xxx] / [xxx] → 用户填的值
  for (const [key, value] of Object.entries(userParams)) {
    if (value) {
      // 转义 key 里的正则特殊字符
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      promptText = promptText.replace(new RegExp(escaped, 'g'), value);
    }
  }

  // 流式调用 Claude
  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messageStream = client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 8000,
          messages: [{ role: 'user', content: promptText }],
        });

        for await (const event of messageStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`),
            );
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err: any) {
        const msg = err?.status === 401
          ? 'API key 无效，请检查设置页的 key'
          : err?.message || '执行失败';
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
