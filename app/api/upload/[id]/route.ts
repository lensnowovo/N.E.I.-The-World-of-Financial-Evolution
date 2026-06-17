import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';
import { removeKey } from '@/lib/storage';

// 仅允许删除未关联到帖子的附件（防止误删已发布内容的文件）
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const id = parseInt(params.id, 10);
  const att = await prisma.attachment.findUnique({ where: { id } });
  if (!att || att.uploaderId !== uid) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  if (att.postId !== null) {
    return NextResponse.json({ error: '已发布的附件请通过编辑帖子删除' }, { status: 400 });
  }

  await removeKey(att.storageKey);
  await prisma.attachment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
