import { NextResponse } from 'next/server';
import { getSessionUid } from '@/lib/session';
import { prisma } from '@/lib/db';
import { saveBuffer } from '@/lib/storage';
import { transcribeWithSource, isAiEnabled, isGitHubFileUrl } from '@/lib/ai';

/**
 * POST /api/ai/transcribe
 *
 * 给发布流用的 AI 转写：用户贴 GitHub 文件 URL → 服务端抓原文 → Claude 转成结构化字段 →
 * 返回给前端预填发布表单。用户 review + 改 + 点发布 → 走现有 POST /api/posts（零改动）。
 *
 * 需登录（防止匿名滥用 AI 额度）。
 * 若 shouldAttach，把抓来的原文存为附件（postId=null），返回 attachmentId 一并预填。
 */
export async function POST(req: Request) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  if (!isAiEnabled()) {
    return NextResponse.json({ error: 'AI 转写未启用（未配置 GLM_API_KEY）' }, { status: 503 });
  }

  const { url } = await req.json();
  if (typeof url !== 'string' || !url.trim()) {
    return NextResponse.json({ error: '请提供 URL' }, { status: 400 });
  }
  if (!isGitHubFileUrl(url.trim())) {
    return NextResponse.json({ error: '目前只支持 GitHub 文件链接（github.com/.../blob/... 或 raw URL）' }, { status: 400 });
  }

  let result;
  try {
    result = await transcribeWithSource(url.trim());
  } catch (e) {
    const msg = e instanceof Error ? e.message : '转写失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { skill, sourceContent } = result;

  // 若是文件型资产且抓到了原文，存为附件（postId=null，发布时回填）
  let attachmentId: number | null = null;
  let attachmentFileName: string | null = null;
  if (skill.shouldAttach && sourceContent) {
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
