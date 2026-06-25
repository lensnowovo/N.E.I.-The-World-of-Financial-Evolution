import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { saveBuffer } from '../lib/storage';

const prisma = new PrismaClient();
const DIR = 'C:/Users/Lensn/WorkBuddy/2026-06-25-19-22-08/细分行业研究Skill草稿';
const LIBRARY_EMAIL = 'library@pevc.local';

const SKILLS = [
  {
    file: '08_生物医药_CGT投资框架.md',
    slug: 'nei-industry/biotech-cgt',
    title: '创新药 / CGT 投资研究框架：管线估值 + 临床成功率 + 监管节点',
    intro: '<p>创新药 / 生物药 / 细胞与基因治疗（CGT）的投资分析框架。PE/VC 医疗组的<strong>独立语言体系</strong>——超长周期(10-15年)、超高失败率(I期到上市仅9.6%)、监管驱动(IND/NDA/BLA)。</p>\n<h2>解决什么问题</h2>\n<ul><li>不会用 rNPV 风险调整净现值给管线估值</li><li>不知道临床各阶段成功率（II期是最大分水岭）</li><li>混淆 License-out 和自主商业化的估值差异</li></ul>\n<h2>亮点</h2>\n<ul><li>临床各阶段成功率 + 累计成功率表</li><li>药物研发全生命周期时间轴</li><li>CGT 特殊指标（载体产能/CMC复杂度）</li><li>License-out 出海变现路径</li><li>10 条创新药专属红旗</li></ul>\n<p>适合：医疗投资经理、医药产业基金、港股18A/科创板投资者。</p>',
    scene: 'industry-research', industry: 'biotech',
    contents: ['risk-id', 'report-gen', 'info-gather'], assetType: 'prompt',
    originalAuthor: 'N.E.I. 综合（BioPharma Dive + FDA + CDE 公开数据）',
    sourceUrl: 'https://www.bio-pharma.com',
  },
  {
    file: '09_AI_Native_SaaS投资框架.md',
    slug: 'nei-industry/ai-native-saas',
    title: 'AI Native SaaS 投资研究框架：2026 指标体系 + 算力经济 + 数据飞轮',
    intro: '<p>AI 原生 SaaS（AI Agent / AI 应用 / AI 基础设施）的投资分析框架。2026 关键变化：<strong>AI 对 SaaS 产生分化</strong>——按席位计费的传统 SaaS 受冲击，按使用量计费的 AI 基础设施 SaaS 受益于 Agent 浪潮。</p>\n<h2>解决什么问题</h2>\n<ul><li>用旧 SaaS 指标看 AI 项目（应该看推理成本/Token 经济/数据飞轮）</li><li>不知道 2026 SaaS 基准值（NRR>110%健康、CAC回收<12月优秀）</li><li>无法判断 AI 应用层有没有壁垒（大部分是套壳）</li></ul>\n<h2>亮点</h2>\n<ul><li>2026 版 SaaS 全指标体系（收入/获客/留存/资本效率 4 类 + 基准值）</li><li>Rule of 40 / Magic Number / Burn Multiple 估值速判</li><li>AI 对 SaaS 分化逻辑（席位计费 vs 使用量计费）</li><li>数据飞轮判断框架</li><li>10 条 AI SaaS 专属红旗</li></ul>\n<p>适合：AI 赛道投资经理、SaaS 投资人、AI 应用层创业者。</p>',
    scene: 'industry-research', industry: 'ai-saas',
    contents: ['data-clean', 'report-gen', 'risk-id'], assetType: 'prompt',
    originalAuthor: 'N.E.I. 综合（SaaStr / OpenView / Battery Ventures 公开研究）',
    sourceUrl: 'https://www.saastr.com',
  },
];

async function main() {
  console.log('📚 导入前沿赛道 Skill（2 篇）');
  const user = await prisma.user.findUnique({ where: { email: LIBRARY_EMAIL } });
  if (!user) throw new Error('library user not found');
  let ok = 0;
  for (const meta of SKILLS) {
    const dup = await prisma.post.findFirst({ where: { body: { contains: meta.slug } } });
    if (dup) { console.log(`  ⏭️  ${meta.title.slice(0, 30)} 已存在`); continue; }
    const md = fs.readFileSync(path.join(DIR, meta.file), 'utf-8');
    const buf = Buffer.from(md, 'utf-8');
    const storageKey = await saveBuffer(buf, meta.slug.replace('/', '-') + '.md');
    const att = await prisma.attachment.create({
      data: { postId: null, uploaderId: user.id, fileName: meta.slug.replace('/', '-') + '.md', storageKey, fileSize: buf.length, mimeType: 'text/markdown' },
    });
    const body = meta.intro + '\n<!-- slug:' + meta.slug + ' -->';
    const post = await prisma.post.create({
      data: {
        userId: user.id, title: meta.title, body,
        tagScene: meta.scene, tagIndustry: meta.industry,
        tagContent: JSON.stringify(meta.contents), tagSkill: meta.assetType,
        status: 'published', mcpApproved: true,
        skillAsset: { create: { assetType: meta.assetType, originalAuthor: meta.originalAuthor, sourceUrl: meta.sourceUrl } },
      },
    });
    await prisma.attachment.update({ where: { id: att.id }, data: { postId: post.id } });
    console.log(`  ✅ #${post.id} ${meta.industry} | ${meta.title.slice(0, 45)}`);
    ok++;
  }
  console.log(`\n🎉 导入 ${ok}/${SKILLS.length}`);
  const total = await prisma.post.count({ where: { status: 'published', deletedAt: null } });
  console.log('总量:', total);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
