import fs from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const APPLY_CHANGES = process.argv.includes('--apply');
const LIBRARY_EMAIL = 'library@pevc.local';
const TITLE = 'BP 快速拆解与项目事实卡';
const SLUG = 'nei-skill/bp-fact-card';
const FILE_NAME = 'nei-bp-fact-card.md';
const STORAGE_KEY = FILE_NAME;
const SOURCE_URL =
  'https://github.com/lensnowovo/N.E.I.-The-World-of-Financial-Evolution/blob/main/public/file-cache/nei-bp-fact-card.md';

const BODY = `<p>收到 BP 后，先把项目读清楚，再讨论投不投。这条 Skill 会把公司、产品、行业位置、客户、商业模式、经营数据、团队、融资和材料缺口整理成一张可追溯的项目事实卡。</p>
<h2>它会做什么</h2>
<ul>
  <li>用一句话说清公司通过什么产品，为谁解决什么问题，如何获得收入</li>
  <li>拆出公司、产品、客户、行业位置、商业模式、经营数据、团队和融资信息</li>
  <li>统一收入、订单、GMV、用户数等容易混淆的指标口径</li>
  <li>给重要事实标注文件、页码或章节来源</li>
  <li>区分材料披露、计算结果、合理推断、未披露和待外部验证</li>
  <li>根据真实缺口生成下一轮问题</li>
</ul>
<h2>使用边界</h2>
<p>本 Skill 只整理项目事实，不判断项目是否符合某家机构或基金，也不直接给出投资建议。基金策略匹配应在事实卡完成后，结合机构与基金记忆单独进行。</p>
<h2>输入示例</h2>
<p>把 BP、CIM、teaser、项目一页纸或会议材料交给你信任的 Agent，并要求“使用 BP 快速拆解与项目事实卡”。材料包含敏感信息时，请在本地客户端处理并先完成脱敏。</p>
<h2>输出预期</h2>
<p>一份带材料范围、项目速览、行业位置、关键数据、主张—证据表、信息冲突、缺失项和下一轮问题的结构化事实卡。</p>
<!-- slug:${SLUG} -->`;

async function ensureLibraryUser() {
  const existing = await prisma.user.findUnique({ where: { email: LIBRARY_EMAIL } });
  if (existing) return existing;

  if (!APPLY_CHANGES) {
    throw new Error(`Dry run cannot create missing library user: ${LIBRARY_EMAIL}`);
  }

  return prisma.user.create({
    data: {
      email: LIBRARY_EMAIL,
      nickname: 'N.E.I. Skill 图书馆',
      role: 'RESEARCH',
      passwordHash: null,
      institution: 'N.E.I.',
      bio: 'N.E.I. 官方整理的 PEVC Skill / Workflow。',
    },
  });
}

async function main() {
  const skillPath = path.join(process.cwd(), 'public', 'file-cache', FILE_NAME);
  const content = await fs.readFile(skillPath);
  if (content.length < 5_000) throw new Error('Canonical Skill file is unexpectedly short');

  const user = await ensureLibraryUser();
  const existing = await prisma.post.findFirst({
    where: {
      OR: [
        { title: TITLE },
        { body: { contains: `slug:${SLUG}` } },
      ],
      deletedAt: null,
    },
    include: {
      skillAsset: true,
      attachments: true,
    },
  });

  console.log(
    `${APPLY_CHANGES ? 'apply' : 'dry-run'}: ${existing ? `update post #${existing.id}` : 'create new post'} — ${TITLE}`,
  );
  if (!APPLY_CHANGES) return;

  const post = await prisma.$transaction(async (tx) => {
    const postData = {
      userId: user.id,
      title: TITLE,
      body: BODY,
      tagScene: 'screening',
      tagIndustry: null,
      tagContent: JSON.stringify(['doc-parse', 'company-profile', 'risk-id']),
      tagSkill: 'agent-skill',
      status: 'published',
      mcpApproved: true,
      reviewFlag: null,
      securityLevel: 'safe',
      featured: true,
    };

    const saved = existing
      ? await tx.post.update({
          where: { id: existing.id },
          data: {
            ...postData,
            version: { increment: 1 },
          },
        })
      : await tx.post.create({ data: postData });

    await tx.skillAsset.upsert({
      where: { postId: saved.id },
      update: {
        assetType: 'agent-skill',
        sourceUrl: SOURCE_URL,
        originalAuthor: 'N.E.I. Editorial',
        installHint: '收藏后可通过 N.E.I. MCP 调用；也可以下载 SKILL.md 放入可信 Agent 客户端。',
        usageNotes: '适合投资经理、FA、产业研究人员收到 BP、CIM 或 teaser 后，先形成不带基金偏好的项目事实底稿。',
      },
      create: {
        postId: saved.id,
        assetType: 'agent-skill',
        sourceUrl: SOURCE_URL,
        originalAuthor: 'N.E.I. Editorial',
        installHint: '收藏后可通过 N.E.I. MCP 调用；也可以下载 SKILL.md 放入可信 Agent 客户端。',
        usageNotes: '适合投资经理、FA、产业研究人员收到 BP、CIM 或 teaser 后，先形成不带基金偏好的项目事实底稿。',
      },
    });

    const attachment = existing?.attachments.find((item) => item.fileName === FILE_NAME);
    if (attachment) {
      await tx.attachment.update({
        where: { id: attachment.id },
        data: {
          storageKey: STORAGE_KEY,
          fileSize: content.length,
          mimeType: 'text/markdown',
        },
      });
    } else {
      await tx.attachment.create({
        data: {
          postId: saved.id,
          uploaderId: user.id,
          fileName: FILE_NAME,
          storageKey: STORAGE_KEY,
          fileSize: content.length,
          mimeType: 'text/markdown',
        },
      });
    }

    return saved;
  });

  console.log(`published post #${post.id}, MCP approved, canonical=${STORAGE_KEY}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

