import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, getSessionUid } from '@/lib/session';
import { isNickname, hasSensitive } from '@/lib/validate';
import { isInvestorRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/users/me —— 更新当前登录用户资料
 * 可改字段：nickname, role, institution, bio, avatarUrl
 */
export async function PATCH(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const data = await req.json();
  if (data.apiKey !== undefined) {
    return NextResponse.json(
      {
        error: '网站内执行 Skill 已下线，不再保存个人 AI API Key。请通过 MCP 在你的 Agent 客户端中调用。',
        code: 'WEBSITE_EXECUTION_RETIRED',
      },
      { status: 410 },
    );
  }

  const nickname = typeof data.nickname === 'string' ? data.nickname.trim() : undefined;
  const role = typeof data.role === 'string' ? data.role : undefined;
  const institution = data.institution === undefined ? undefined : String(data.institution).trim() || null;
  const bio = data.bio === undefined ? undefined : String(data.bio).trim().slice(0, 200) || null;
  const avatarUrl = data.avatarUrl === undefined ? undefined : String(data.avatarUrl).trim() || null;

  const update: Record<string, unknown> = {};
  if (nickname !== undefined) {
    if (!isNickname(nickname)) return NextResponse.json({ error: '昵称需 2-20 字符' }, { status: 400 });
    if (hasSensitive(nickname)) return NextResponse.json({ error: '昵称包含敏感词' }, { status: 400 });
    const dup = await prisma.user.findFirst({ where: { nickname, NOT: { id: me.id } } });
    if (dup) return NextResponse.json({ error: '昵称已被使用' }, { status: 409 });
    update.nickname = nickname;
  }
  if (role !== undefined) {
    if (!isInvestorRole(role)) return NextResponse.json({ error: '身份无效' }, { status: 400 });
    update.role = role;
  }
  if (institution !== undefined) update.institution = institution;
  if (bio !== undefined) update.bio = bio;
  if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;

  if (Object.keys(update).length === 0) return NextResponse.json({ error: '没有要更新的字段' }, { status: 400 });

  await prisma.user.update({ where: { id: me.id }, data: update });
  return NextResponse.json({ ok: true });
}

/** GET /api/users/me —— 查询当前用户（不返回敏感字段） */
export async function GET() {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: {
      id: true,
      email: true,
      nickname: true,
      role: true,
      avatarUrl: true,
      institution: true,
      bio: true,
      createdAt: true,
      mcpTokenHash: true,
    },
  });
  if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  const { mcpTokenHash, ...safe } = user;
  return NextResponse.json({ ...safe, hasMcpToken: !!mcpTokenHash });
}

/** DELETE /api/users/me —— 旧 API Key 清除接口已下线 */
export async function DELETE() {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  return NextResponse.json(
    {
      error: '网站内执行 Skill 已下线，不再提供个人 AI API Key 管理。',
      code: 'WEBSITE_EXECUTION_RETIRED',
    },
    { status: 410 },
  );
}
