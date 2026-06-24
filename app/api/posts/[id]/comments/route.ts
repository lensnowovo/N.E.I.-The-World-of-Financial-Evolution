import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const postId = parseInt((await params).id, 10);
  const uid = await getSessionUid();

  const all = await prisma.comment.findMany({
    where: { postId },
    include: {
      author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // 当前登录用户对这些评论的点赞态（未登录则为空 Set）
  let likedIds = new Set<number>();
  if (uid && all.length > 0) {
    const likes = await prisma.commentLike.findMany({
      where: { userId: uid, commentId: { in: all.map((c) => c.id) } },
      select: { commentId: true },
    });
    likedIds = new Set(likes.map((l) => l.commentId));
  }

  // 树化：parentId 为 null 的是一级评论，其余作为 replies
  const map = new Map<number, any>();
  const roots: any[] = [];
  all.forEach((c) => {
    map.set(c.id, { ...c, liked: likedIds.has(c.id), replies: [] });
  });
  all.forEach((c) => {
    const node = map.get(c.id);
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId).replies.push(node);
    } else {
      roots.push(node);
    }
  });
  return NextResponse.json({ items: roots });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const postId = parseInt((await params).id, 10);
  if (Number.isNaN(postId)) return NextResponse.json({ error: '参数错误' }, { status: 400 });

  const { body, parentId } = await req.json();
  const text = String(body || '').trim();
  if (text.length < 1 || text.length > 1000) {
    return NextResponse.json({ error: '评论需 1-1000 字符' }, { status: 400 });
  }

  // 二级评论：parentId 必须属于同一 post，且本身是一级评论（不允许 3 级嵌套）
  let normalizedParent: number | null = null;
  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId } });
    if (!parent || parent.postId !== postId) {
      return NextResponse.json({ error: '父评论不存在' }, { status: 400 });
    }
    // 如果父评论本身是回复，则归到顶级父评论下，保持 2 级嵌套
    normalizedParent = parent.parentId ?? parent.id;
  }

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: '内容不存在' }, { status: 404 });

  const created = await prisma.comment.create({
    data: { postId, userId: uid, body: text, parentId: normalizedParent },
    include: {
      author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
    },
  });

  await prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });

  return NextResponse.json({ ...created, replies: [] });
}
