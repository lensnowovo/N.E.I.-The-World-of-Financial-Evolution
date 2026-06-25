import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';
import { saveBuffer } from '@/lib/storage';

const MAX_SIZE = 20 * 1024 * 1024;

const ALLOWED_EXT = new Set([
  'pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt',
  'png', 'jpg', 'jpeg', 'gif', 'mp4', 'zip', 'md', 'txt',
]);

export async function POST(req: Request) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '未提交文件' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: '单文件不能超过 20 MB' }, { status: 400 });
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json({ error: '不支持的文件类型' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const key = await saveBuffer(buf, file.name);

  // 用 postId=null 表示尚未关联到帖子（发布时再回填）
  const att = await prisma.attachment.create({
    data: {
      postId: null,
      uploaderId: uid,
      fileName: file.name,
      storageKey: key,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
    },
  });

  return NextResponse.json({
    id: att.id,
    fileName: att.fileName,
    fileSize: att.fileSize,
    mimeType: att.mimeType,
  });
}
