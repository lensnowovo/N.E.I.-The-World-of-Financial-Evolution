import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { suggestPublish, isAiEnabled } from '@/lib/ai';
import { CONTRIBUTIONS_DISABLED_MESSAGE, PUBLIC_CONTRIBUTIONS_ENABLED } from '@/lib/community-features';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/assist —— 智能发布辅助
 *
 * Body: { title?, body, branch }
 *   - body: 纯文本正文（前端已去 HTML）
 *   - branch: 'prompt' | 'file' | 'method'
 *
 * 用项目级 GLM key，给发帖者建议 标题 / 场景 / 行业 / 内容标签 / 摘要 / 占位符。
 * 需登录 + 限流（防匿名 / 防滥用 AI 额度）。
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  if (!PUBLIC_CONTRIBUTIONS_ENABLED && !user.isAdmin) {
    return NextResponse.json({ error: CONTRIBUTIONS_DISABLED_MESSAGE }, { status: 403 });
  }
  const uid = user.id;

  if (!isAiEnabled()) {
    return NextResponse.json({ error: 'AI 辅助未启用（未配置 GLM_API_KEY）' }, { status: 503 });
  }

  // 限流：同一用户 10 次 / 10 分钟（足够写一篇帖子反复试），IP 维度兜底 20 次
  const ip = getClientIp(req);
  const ipRl = checkRateLimit(`ai-assist:ip:${ip}`, 20, 10 * 60_000);
  if (!ipRl.ok) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(ipRl.retryAfter / 1000)) } });
  }
  const userRl = checkRateLimit(`ai-assist:uid:${uid}`, 10, 10 * 60_000);
  if (!userRl.ok) {
    return NextResponse.json({ error: '你调用得太频繁了，休息一会儿再试' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(userRl.retryAfter / 1000)) } });
  }

  const body = await req.json().catch(() => ({}));
  const { title, body: rawBody, branch } = body as {
    title?: string;
    body?: string;
    branch?: string;
  };

  if (branch !== 'prompt' && branch !== 'file' && branch !== 'method') {
    return NextResponse.json({ error: '参数 branch 非法' }, { status: 400 });
  }
  if (typeof rawBody !== 'string' || rawBody.replace(/\s/g, '').length < 20) {
    return NextResponse.json({ error: '正文太短，先多写一点再让 AI 帮你补全' }, { status: 400 });
  }

  try {
    const suggestion = await suggestPublish({
      title: typeof title === 'string' ? title.slice(0, 200) : '',
      body: rawBody.slice(0, 12000),
      branch,
    });
    return NextResponse.json({ suggestion });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI 辅助失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
