import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';

// POST /api/users/[id]/follow —— toggle 关注 / 取关
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const followeeId = parseInt((await params).id, 10);
  if (Number.isNaN(followeeId)) return NextResponse.json({ error: '参数错误' }, { status: 400 });
  if (followeeId === uid) return NextResponse.json({ error: '不能关注自己' }, { status: 400 });

  const followee = await prisma.user.findUnique({ where: { id: followeeId } });
  if (!followee) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

  const exist = await prisma.userFollow.findUnique({
    where: { followerId_followeeId: { followerId: uid, followeeId } },
  });

  if (exist) {
    await prisma.userFollow.delete({ where: { id: exist.id } });
    const followers = await prisma.userFollow.count({ where: { followeeId } });
    return NextResponse.json({ following: false, followers });
  }

  try {
    await prisma.userFollow.create({ data: { followerId: uid, followeeId } });
  } catch {
    /* race; ignore */
  }
  const followers = await prisma.userFollow.count({ where: { followeeId } });
  return NextResponse.json({ following: true, followers });
}
