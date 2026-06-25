/**
 * 导入行研方法论 Skill 草稿（WorkBuddy 搜公众号整理的 5 篇精品）到数据库。
 *
 * 幂等：按 body 里的 slug 去重，重复运行不会重复灌。
 * 用法：set -a; source .env.local; set +a; npx tsx scripts/import-research-skills.ts
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { saveBuffer } from '../lib/storage';

const prisma = new PrismaClient();
const LIBRARY_EMAIL = 'library@pevc.local';
const DRAFT_DIR = 'C:/Users/Lensn/WorkBuddy/2026-06-25-19-22-08/行研方法论Skill草稿';

type SkillMeta = {
  mdPath: string;
  slug: string;
  title: string;
  intro: string;
  scene: string;
  industry?: string | null;
  contents: string[];
  assetType: string;
  originalAuthor: string;
  sourceUrl: string;
};

const SKILLS: SkillMeta[] = [
  {
    mdPath: '01_肖璟_生命周期三步法_如何快速了解一个行业.md',
    slug: 'nei-research/lifecycle-3step',
    title: '生命周期三步法：按行业阶段定分析重点的行研框架',
    intro: `<p>一套以「产业生命周期」为主线的行业分析方法论。核心洞察：<strong>不同阶段关注不同东西</strong>——导入期验需求、成长期看 TAM、成熟期看护城河、衰退期找第二曲线。避免无脑套模型撒胡椒面。</p>
<h2>解决什么问题</h2>
<ul><li>看陌生行业不知道从哪下手</li><li>用一套模板打所有行业，关键维度遗漏</li><li>行业阶段判断错位，导致分析重点全错</li></ul>
<h2>怎么用</h2>
<ol><li>用渗透率判断行业阶段（导入/成长/成熟/衰退）</li><li>按阶段敲定分析重点</li><li>按图索骥填充信息（5 个维度）</li><li>交叉验证 + 金字塔原理输出</li></ol>
<p>适合：投资经理、分析师、FA、咨询顾问，1-2 周内对陌生行业建立系统认知。</p>`,
    scene: 'industry-research',
    contents: ['info-gather', 'report-gen'],
    assetType: 'prompt',
    originalAuthor: '肖璟（前麦肯锡）',
    sourceUrl: 'https://xueqiu.com/1756343398/371490855',
  },
  {
    mdPath: '02_风投小虾_3面10点行研框架.md',
    slug: 'nei-research/3face-10points',
    title: '3 面 10 点行研框架：直接对应 IC 立项报告章节',
    intro: `<p>一套面向 <strong>PE/VC 投资决策</strong> 的行业研究 SOP，把行研拆成 3 个层面（宏观/中观/微观）+ 10 个关键点，<strong>直接对应立项报告和 IC 备忘的章节结构</strong>。</p>
<h2>解决什么问题</h2>
<ul><li>写行研报告不知道结构怎么搭</li><li>IC 备忘漏关键维度（如竞争格局 CR4、产业链利润分配）</li><li>缺少中国一级市场数据源清单</li></ul>
<h2>亮点</h2>
<ul><li>CR4 集中度分级表（极高寡占→原子型市场）</li><li>10 个一级市场专属红旗信号</li><li>数据源清单：鲸准/烯牛/企名片/清科/Wind/慧博</li></ul>
<p>适合：投资经理写行研报告、做赛道扫描、立项前行业判断。</p>`,
    scene: 'industry-research',
    contents: ['info-gather', 'report-gen', 'memo'],
    assetType: 'prompt',
    originalAuthor: '风投小虾（VC 投资经理）',
    sourceUrl: 'https://zhuanlan.zhihu.com/p/446274572',
  },
  {
    mdPath: '04_头部VC_2026投前尽调8大新标准.md',
    slug: 'nei-research/vc-8standards-2026',
    title: '2026 头部 VC 投前尽调 8 大新标准（硬科技/国资基金时代）',
    intro: `<p>综合红杉、高瓴、深创投、IDG 等机构 <strong>2026 年公开信息推断的投前打分体系</strong>。传统"团队/赛道/财务/法律"四项仅占 40%，新增 8 大指标占 60%——算力合规、供应链安全、ESG、国产替代率、专利壁垒、客户粘性、退出确定性、政策风险。</p>
<h2>解决什么问题</h2>
<ul><li>用旧逻辑（看人/讲故事/赌增量）写 BP，过不了 2026 的会</li><li>不了解人民币国资基金的底层打分逻辑</li><li>硬科技/国产替代项目不知道该展示什么</li></ul>
<h2>亮点</h2>
<ul><li>8 大新增指标核查要点 + 红旗（一票否决项）</li><li>国产替代率精准测算方法（对标海外竞品性能/定价/份额）</li><li>政策红利赛道 vs 高风险赛道分类</li></ul>
<p>适合：创业者 BP 自检 / 投资经理尽调清单 / FA 项目筛选。</p>`,
    scene: 'business-dd',
    contents: ['checklist', 'risk-id', 'memo'],
    assetType: 'agent-skill',
    originalAuthor: 'N.E.I. 综合（红杉/高瓴/深创投公开信息）',
    sourceUrl: 'https://zhuanlan.zhihu.com/p/2036457403928027931',
  },
  {
    mdPath: '05_TAM-SAM-SOM市场规模测算SOP.md',
    slug: 'nei-research/tam-sam-som-sop',
    title: 'TAM/SAM/SOM 市场规模测算 SOP（含自上而下 + 自下而上两法）',
    intro: `<p>BP 和立项报告里必答却最容易拍脑袋的问题："这个市场到底多大？"用 TAM/SAM/SOM 三层 + 自上而下/自下而上两法，把"感觉很大"变成"可验证的数字"。</p>
<h2>解决什么问题</h2>
<ul><li>TAM 定义过宽（"所有 xx 人群"→天真假设）</li><li>SAM 与 SOM 混淆（可触达≠能拿下）</li><li>只做自上而下不做验证→数字虚高</li></ul>
<h2>亮点</h2>
<ul><li>完整测算公式（含购买频率/份额估算法）</li><li>5 类数据源（协会/竞品地图/消费者研究/品牌感知/问卷）</li><li>10 个红旗信号（增长率>50% 无逻辑/数据来源单一等）</li><li>投资人预期：潜在市场 ≥ 10 亿</li></ul>
<p>适合：产品经理、创业者、早期投资人写 BP/立项。</p>`,
    scene: 'industry-research',
    contents: ['data-clean', 'report-gen'],
    assetType: 'prompt',
    originalAuthor: '时儒出海 NSR',
    sourceUrl: 'https://zhuanlan.zhihu.com/p/1944058713628469158',
  },
  {
    mdPath: '07_海外市场调研27工具出海方法论.md',
    slug: 'nei-research/go-global-27tools',
    title: '出海调研 SOP：27 工具 + 4 类数据分析方法论',
    intro: `<p>系统化的 <strong>海外市场调研方法论 + 27 个数据源工具箱</strong>。核心理念：先研究，再行动，数据比直觉更可靠。</p>
<h2>解决什么问题</h2>
<ul><li>出海前不知道怎么科学调研</li><li>只看国内数据源，不了解海外宏观/消费者/竞品/舆情工具</li><li>调研做完不知道怎么分析</li></ul>
<h2>亮点</h2>
<ul><li>4 种数据收集方式（文案调研/实地/问卷/委托专业机构）</li><li>27 个海外工具分 4 类（宏观/消费者/竞品/舆情）</li><li>11 个出海红旗信号（合规/本地化/渠道/支付）</li></ul>
<p>适合：做出海产品的创业者、企业出海负责人、关注出海赛道的投资人。</p>`,
    scene: 'industry-research',
    industry: 'cross-border',
    contents: ['info-gather', 'report-gen'],
    assetType: 'workflow',
    originalAuthor: '筑桥出海（邓梅）',
    sourceUrl: 'https://mp.weixin.qq.com/s/筑桥出海',
  },
];

async function ensureLibraryUser() {
  const existing = await prisma.user.findUnique({ where: { email: LIBRARY_EMAIL } });
  if (existing) return existing;
  return prisma.user.create({
    data: { email: LIBRARY_EMAIL, nickname: 'Skill 图书馆', role: 'VC', passwordHash: null },
  });
}

async function importOne(meta: SkillMeta, userId: number, repoRoot: string) {
  const slug = meta.slug;
  const dup = await prisma.post.findFirst({ where: { body: { contains: slug } } });
  if (dup) {
    console.log(`  ⏭️  ${meta.title.slice(0, 30)} 已存在 (#${dup.id})，跳过`);
    return;
  }

  const fullPath = path.join(DRAFT_DIR, meta.mdPath);
  const mdContent = await fs.readFile(fullPath, 'utf-8');
  const buf = Buffer.from(mdContent, 'utf-8');

  // 存附件到 R2/storage
  const storageKey = await saveBuffer(buf, `${meta.slug.replace('/', '-')}.md`);
  const attachment = await prisma.attachment.create({
    data: { postId: null, uploaderId: userId, fileName: `${meta.slug.replace('/', '-')}.md`, storageKey, fileSize: buf.length, mimeType: 'text/markdown' },
  });

  const body = meta.intro + `\n<!-- slug:${slug} -->`;
  const post = await prisma.post.create({
    data: {
      userId,
      title: meta.title,
      body,
      tagScene: meta.scene,
      tagIndustry: meta.industry ?? null,
      tagContent: JSON.stringify(meta.contents),
      tagSkill: meta.assetType,
      status: 'published',
      mcpApproved: true,
      skillAsset: {
        create: {
          assetType: meta.assetType,
          originalAuthor: meta.originalAuthor,
          sourceUrl: meta.sourceUrl,
        },
      },
    },
  });

  await prisma.attachment.update({ where: { id: attachment.id }, data: { postId: post.id } });
  console.log(`  ✅ ${meta.title.slice(0, 40)} → post #${post.id}`);
}

async function main() {
  console.log('📚 导入行研方法论 Skill（5 篇精品）');
  const user = await ensureLibraryUser();
  console.log(`👤 作者：${user.nickname} (#${user.id})`);
  let ok = 0;
  for (const meta of SKILLS) {
    try {
      await importOne(meta, user.id, DRAFT_DIR);
      ok++;
    } catch (e) {
      console.error(`  ❌ ${meta.title} 导入失败:`, (e as Error).message.slice(0, 100));
    }
  }
  console.log(`\n🎉 完成：导入 ${ok} 个，跳过 ${SKILLS.length - ok} 个`);
  const total = await prisma.post.count({ where: { status: 'published', deletedAt: null } });
  console.log(`当前总帖数：${total}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
