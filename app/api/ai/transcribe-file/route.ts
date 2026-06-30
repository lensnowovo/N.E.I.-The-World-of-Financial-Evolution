import { NextResponse } from 'next/server';
import { getSessionUid } from '@/lib/session';
import { prisma } from '@/lib/db';
import { saveBuffer } from '@/lib/storage';
import { transcribeUploadedWithSource, isAiEnabled } from '@/lib/ai';

// GLM 转写 .md（长正文 + 生成多字段）耗时较长，给到 Vercel hobby 上限 60s
// （lib/glm.ts TIMEOUT_MS=55s 留 5s 余量返回错误，避免被 Vercel 硬杀成 500）
export const maxDuration = 60;

/**
 * POST /api/ai/transcribe-file
 *
 * 发布流「上传 SKILL.md 自动填」的后端：前端用 FileReader 读本地 .md/.markdown/.txt
 * 文件得到文本内容后 POST { content, fileName } 到这里 → GLM 读内容生成结构化字段 →
 * 返回给前端预填发布表单（与 /api/ai/transcribe 同 shape，前端 PublishForm 已有消费逻辑）。
 * 用户 review + 改 + 点发布 → 走现有 POST /api/posts（零改动）。
 *
 * 需登录（防止匿名滥用 AI 额度）。
 * 若 shouldAttach，把原文存为附件（postId=null），返回 attachmentId 一并预填。
 */
export async function POST(req: Request) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  if (!isAiEnabled()) {
    return NextResponse.json({ error: 'AI 转写未启用（未配置 GLM_API_KEY）' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  const { content, fileName, skipAttachment } = body as {
    content?: unknown;
    fileName?: unknown;
    skipAttachment?: unknown;
  };
  if (typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: '文件内容为空' }, { status: 400 });
  }
  if (content.length > 200_000) {
    return NextResponse.json({ error: '文件过大（超过 200KB）' }, { status: 400 });
  }
  const safeFileName =
    typeof fileName === 'string' && fileName.trim() ? fileName.trim().slice(0, 200) : 'skill.md';

  let result;
  try {
    result = await transcribeUploadedWithSource(content, safeFileName);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '转写失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { skill, sourceContent } = result;

  // 若是文件型资产，把原文存为附件（postId=null，发布时回填），复刻 /api/ai/transcribe 的逻辑
  let attachmentId: number | null = null;
  let attachmentFileName: string | null = null;
  if (!skipAttachment && skill.shouldAttach && sourceContent) {
    const buf = Buffer.from(sourceContent.text, 'utf-8');
    const storageKey = await saveBuffer(buf, sourceContent.fileName);
    const att = await prisma.attachment.create({
      data: {
        postId: null,
        uploaderId: uid,
        fileName: sourceContent.fileName,
        storageKey,
        fileSize: buf.length,
        mimeType: 'text/markdown',
      },
    });
    attachmentId = att.id;
    attachmentFileName = att.fileName;
  }

  return NextResponse.json({
    skill,
    attachment: attachmentId ? { id: attachmentId, fileName: attachmentFileName } : null,
  });
}
