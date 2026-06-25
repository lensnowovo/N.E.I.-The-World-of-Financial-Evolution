import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { saveBuffer } from '../lib/storage';

const prisma = new PrismaClient();
const DIR = 'C:/Users/Lensn/WorkBuddy/2026-06-25-19-22-08/细分行业研究Skill草稿_第二批';

const SKILLS = [
  {
    file: '16_半导体_芯片投资框架.md',
    slug: 'nei-industry/semiconductor-chip',
    title: '半导体 / 芯片投资研究框架：国产化率图谱 + 两条投资主线 + EDA/IP/设备/材料',
    intro: '<p>半导体/芯片产业（IC 设计/制造/设备/材料/封测/EDA）的投资分析框架。<strong>国家战略 + 周期 + 技术迭代</strong>三条线叠加的赛道。两条投资主线：<strong>国产替代</strong>（从"能用"到"好用"，政策红利 + 客户认证）+ <strong>技术迭代</strong>（AI 算力 / Chiplet / 第三代半导体）。大基金三期 3440 亿元重塑格局，设备与材料是国产化率最低、成长空间最大的环节。</p>\n<h2>解决什么问题</h2>\n<ul><li>不知道芯片产业链各环节国产化率（设备<20%、材料<30%、EDA<15%）</li><li>混淆"国产替代"和"技术迭代"两条线的投资逻辑</li><li>用传统估值看半导体（Fabless 看 PS + 增速、设备看订单簿、制造看产能利用率）</li><li>不知道大基金三期 3440 亿投向哪里</li></ul>\n<h2>亮点</h2>\n<ul><li>7 维度框架（产业链/国产化率/周期/技术迭代/估值/政策/退出）</li><li>产业链全景 + 各环节国产化率图谱（设计→制造→封测→设备→材料→EDA）</li><li>Fabless / Foundry / OSAT / 设备 / 材料 / EDA 六类公司估值逻辑对比</li><li>大基金三期投向 + MATCH 法案影响</li><li>10 条半导体专属红旗（单一海外供应商/良率<85%/无客户认证/估值靠对标 TSMC 叙事）</li></ul>\n<p>适合：PE/VC 硬科技组、产业资本、国家大基金、地方政府半导体基金。</p>',
    scene: 'industry-research', industry: 'semiconductor',
    contents: ['risk-id', 'report-gen', 'info-gather'], assetType: 'prompt',
    originalAuthor: '大基金/中芯国际/中微公司公开信息 + 国信证券研究',
    sourceUrl: 'https://www.ssicc.com.cn',
  },
  {
    file: '17_新材料投资框架.md',
    slug: 'nei-industry/new-materials',
    title: '新材料投资研究框架：第一性原理 + 量产壁垒 + 客户认证周期',
    intro: '<p>新材料产业（先进金属/高分子/无机非金属/复合材料/电子化学品/生物基）的投资分析框架。新材料是<strong>"所有制造业的上游"</strong>——半导体、新能源、航空、生物医药的瓶颈往往卡在材料端。第一性原理：<strong>材料性能决定产业上限、自主可控决定生存底线、工程化能力决定商业化成败</strong>。</p>\n<h2>解决什么问题</h2>\n<ul><li>"论文惊艳、量产艰难"——不知道怎么评估工程化能力</li><li>只看性能突破，忽略"性能 × 量产 × 成本"三者同时达标</li><li>低估客户认证周期（台积电/宁德/比亚迪认证要 2-3 年）</li></ul>\n<h2>亮点</h2>\n<ul><li>第一性原理框架（3 个底层问题决定值不值得投）</li><li>四大投资优先级（战略安全/国产替代确定性/客户认证进度/绿色低碳）</li><li>研发-中试-量产时间轴（实验室→中试线→小批量→吨级量产，5-10 年）</li><li>客户认证锁定效应（一旦进入供应链，切换成本极高 = 护城河）</li><li>半导体材料/锂电材料/结构材料三大应用分类</li><li>10 条新材料专属红旗</li></ul>\n<p>适合：PE/VC 硬科技组、产业资本、政府引导基金、CVC（产业方战略投资）。</p>',
    scene: 'industry-research', industry: 'materials',
    contents: ['risk-id', 'report-gen', 'info-gather'], assetType: 'prompt',
    originalAuthor: '新材料在线 + 国信证券 + 高瓴新材料研究',
    sourceUrl: 'https://www.xincailiao.com',
  },
];

async function main() {
  console.log('📚 导入半导体 + 新材料（2 篇旗舰）');
  const user = await prisma.user.findUnique({ where: { email: 'library@pevc.local' } });
  if (!user) throw new Error('library user not found');
  let ok = 0;
  for (const meta of SKILLS) {
    const dup = await prisma.post.findFirst({ where: { body: { contains: meta.slug } } });
    if (dup) { console.log(`  ⏭️  已存在`); continue; }
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
      }
    });
    await prisma.attachment.update({ where: { id: att.id }, data: { postId: post.id } });
    console.log(`  ✅ #${post.id} ${meta.industry} | ${meta.title.slice(0, 50)}`);
    ok++;
  }
  console.log(`\n🎉 导入 ${ok}/${SKILLS.length}`);
  const total = await prisma.post.count({ where: { status: 'published', deletedAt: null } });
  console.log('🎯 总量:', total);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
