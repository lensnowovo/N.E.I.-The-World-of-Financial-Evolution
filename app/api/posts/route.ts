import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUid } from '@/lib/session';
import { sanitizeHtml, stripHtml } from '@/lib/validate';
import { POST_STATUS } from '@/lib/status';
import { SCENE_TAGS, INDUSTRY_TAGS, CONTENT_TAGS, SKILL_TAGS } from '@/lib/tags';
import { buildFeedWhere, fetchUserStars, filterByContent, normalizeSort, sortPosts } from '@/lib/feed';

// Used by POST handler for validation
const sceneVals: string[] = SCENE_TAGS.map((t) => t.value);
const industryVals: string[] = INDUSTRY_TAGS.map((t) => t.value);
const contentVals: string[] = CONTENT_TAGS.map((t) => t.value);
const skillVals: string[] = SKILL_TAGS.map((t) => t.value);

// GET /api/posts?scene=&industry=&content=&skill=&role=&time=&q=&page=
export async function GET(req: Request) {
  const url = new URL(req.url);
  const scene = url.searchParams.get('scene') || undefined;
  const industry = url.searchParams.get('industry') || undefined;
  const contentList = url.searchParams.getAll('content');
  const skill = url.searchParams.get('skill') || undefined;
  const role = url.searchParams.get('role') || undefined;
  const time = url.searchParams.get('time') || undefined;
  const q = url.searchParams.get('q')?.trim() || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = 20;
  const sort = normalizeSort(url.searchParams.get('sort'));

  const where = buildFeedWhere({ scene, industry, skill, role, time, q });

  let posts = await prisma.post.findMany({
    where,
    include: {
      author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
      _count: { select: { comments: true, stars: true, attachments: true } },
      skillAsset: { select: { id: true, assetType: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  posts = filterByContent(posts, contentList);
  // 当前页内排序（跨页排序在内存分页模型下有限制，但热门排序下首页用 fetchFeed 全量取，此处够用）
  posts = sortPosts(posts, sort);

  const uid = await getSessionUid();
  const { starredIds } = await fetchUserStars(uid, posts.map((p) => p.id));

  return NextResponse.json({
    items: posts.map((p) => ({
      id: p.id,
      title: p.title,
      excerpt: stripHtml(p.body).slice(0, 160),
      tagScene: p.tagScene,
      tagIndustry: p.tagIndustry,
      tagContent: JSON.parse(p.tagContent || '[]'),
      tagSkill: p.tagSkill,
      createdAt: p.createdAt,
      viewCount: p.viewCount,
      author: p.author,
      counts: {
        comments: p._count.comments,
        stars: p._count.stars,
        attachments: p._count.attachments,
      },
      starred: starredIds.has(p.id),
      skillAsset: p.skillAsset
        ? { id: p.skillAsset.id, assetType: p.skillAsset.assetType }
        : null,
    })),
    page,
    hasMore: posts.length === pageSize,
  });
}

// POST /api/posts —— 发布
export async function POST(req: Request) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const data = await req.json();
  const title = String(data.title || '').trim();
  const body = String(data.body || '').trim();
  const tagScene = String(data.tagScene || '');
  const tagIndustry = data.tagIndustry ? String(data.tagIndustry) : null;
  const tagContentArr: string[] = Array.isArray(data.tagContent) ? data.tagContent.filter(Boolean) : [];
  const tagSkill = data.tagSkill ? String(data.tagSkill) : null;
  const attachmentIds: number[] = Array.isArray(data.attachmentIds) ? data.attachmentIds : [];

  // SkillAsset fields
  const sourceUrl = data.sourceUrl ? String(data.sourceUrl).trim() : null;
  const installHint = data.installHint ? String(data.installHint).trim() : null;
  const usageNotes = data.usageNotes ? String(data.usageNotes).trim() : null;
  const originalAuthor = data.originalAuthor ? String(data.originalAuthor).trim().slice(0, 100) : null;

  if (title.length < 5 || title.length > 100) {
    return NextResponse.json({ error: '标题需 5-100 字符' }, { status: 400 });
  }
  if (body.length < 1 || body.length > 50000) {
    return NextResponse.json({ error: '正文长度需 1-50000 字符' }, { status: 400 });
  }
  if (!sceneVals.includes(tagScene)) {
    return NextResponse.json({ error: '请选择工作场景标签' }, { status: 400 });
  }
  if (tagIndustry && !industryVals.includes(tagIndustry)) {
    return NextResponse.json({ error: '行业标签无效' }, { status: 400 });
  }
  if (tagSkill && !skillVals.includes(tagSkill)) {
    return NextResponse.json({ error: 'Skill 标签无效' }, { status: 400 });
  }
  if (tagContentArr.length > 3) {
    return NextResponse.json({ error: '工作内容标签最多 3 个' }, { status: 400 });
  }
  // Validate SkillAsset fields
  if (sourceUrl && !/^https?:\/\/.+/.test(sourceUrl)) {
    return NextResponse.json({ error: '来源链接须以 http:// 或 https:// 开头' }, { status: 400 });
  }
  if (installHint && installHint.length > 2000) {
    return NextResponse.json({ error: '安装说明最多 2000 字符' }, { status: 400 });
  }
  if (usageNotes && usageNotes.length > 2000) {
    return NextResponse.json({ error: '使用心得最多 2000 字符' }, { status: 400 });
  }

  const cleanContent = tagContentArr.filter((c) => contentVals.includes(c));

  const safeBody = sanitizeHtml(body);

  // Wrap Post + SkillAsset creation in a transaction
  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({
      data: {
        userId: uid,
        title,
        body: safeBody,
        tagScene,
        tagIndustry,
        tagContent: JSON.stringify(cleanContent),
        tagSkill,
        status: POST_STATUS.PUBLISHED, // MVP 跳过人工审核
      },
    });

    await tx.skillAsset.create({
      data: {
        postId: created.id,
        assetType: tagSkill || 'prompt',
        sourceUrl: sourceUrl || null,
        originalAuthor: originalAuthor || null,
        installHint: installHint || null,
        usageNotes: usageNotes || null,
      },
    });

    if (attachmentIds.length > 0) {
      await tx.attachment.updateMany({
        where: { id: { in: attachmentIds }, uploaderId: uid, postId: null },
        data: { postId: created.id },
      });
    }

    return created;
  });

  return NextResponse.json({ id: post.id });
}
