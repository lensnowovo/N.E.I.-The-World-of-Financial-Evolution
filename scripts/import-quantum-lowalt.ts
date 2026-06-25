import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { saveBuffer } from '../lib/storage';

const prisma = new PrismaClient();
const DIR = 'C:/Users/Lensn/WorkBuddy/2026-06-25-19-22-08/细分行业研究Skill草稿_第二批';

const SKILLS: Array<{
  file: string; slug: string; title: string; intro: string;
  scene: string; industry: string | null; contents: string[];
  assetType: string; originalAuthor: string; sourceUrl: string;
}> = [
  {
    file: '14_量子科技投资框架.md',
    slug: 'nei-industry/quantum',
    title: '量子科技投资研究框架：5 条技术路线 + 卖铲子策略 + 三阶段时间表',
    intro: '<p>量子科技（量子计算/通信/传感/精密测量）的投资分析框架。典型的<strong>"硬科技长跑"赛道</strong>——战略方向确定，但商业化时间表充满不确定性。当前最佳投资窗口是<strong>产业链上游（稀释制冷机/激光器/测控设备），无论哪条技术路线胜出都受益</strong>。</p>\n<h2>解决什么问题</h2>\n<ul><li>不知道量子计算有哪几条技术路线、各自成熟度</li><li>用传统 VC 框架看量子项目（应该用实物期权法/卖铲子策略）</li><li>无法判断"近期商业化"宣称的可信度</li></ul>\n<h2>亮点</h2>\n<ul><li>5+ 条技术路线成熟度对比表（超导/离子阱/光量子/中性原子/拓扑/退火）</li><li>三阶段商业化时间表（NISQ→纠错→容错通用）</li><li>"卖铲子策略"：投上游（制冷机/激光器/测控），不赌路线</li><li>10 条量子科技专属红旗</li></ul>\n<p>适合：耐心资本、主权基金、战略配置型 LP、政府引导基金。</p>',
    scene: 'industry-research', industry: 'semiconductor',
    contents: ['risk-id', 'report-gen'], assetType: 'prompt',
    originalAuthor: 'IBM Quantum + 中科大 + 本源量子公开研究',
    sourceUrl: 'https://www.ibm.com/quantum',
  },
  {
    file: '15_低空经济_eVTOL投资框架.md',
    slug: 'nei-industry/low-altitude-evtol',
    title: '低空经济 / eVTOL 投资研究框架：适航取证 + 订单兑现 + 产业链复用',
    intro: '<p>低空经济（eVTOL/通用航空/工业无人机/低空运营）的投资分析框架。<strong>2026 年投资逻辑正从"概念炒作"转向"业绩兑现"</strong>——适航取证 + 商业化订单是核心分水岭。电池/电机/飞控复用新能源车产业链，适航/空管复用航空航天体系。预期 2030 年国内市场破 10 万亿。</p>\n<h2>解决什么问题</h2>\n<ul><li>用概念炒作期的逻辑投项目（应该看适航取证进度+真实订单）</li><li>混淆 eVTOL 整机 vs 无人机 vs 运营服务投资逻辑</li><li>不知道低空经济各环节产业化进度差异</li></ul>\n<h2>亮点</h2>\n<ul><li>产业链全景（上游零部件→中游整机→下游运营）</li><li>适航取证进度对比（中国 TC/PC vs FAA 认证节奏）</li><li>eVTOL vs 工业无人机 vs 载人无人机三条线差异</li><li>10 条低空经济专属红旗</li></ul>\n<p>适合：PE/VC 硬科技组、产业资本、地方政府低空基金。</p>',
    scene: 'industry-research', industry: 'aerospace',
    contents: ['risk-id', 'report-gen', 'info-gather'], assetType: 'prompt',
    originalAuthor: '亿航/峰飞/沃飞长盛公开信息 + 赛迪研究院',
    sourceUrl: 'https://www.ehang.com',
  },
];

async function main() {
  console.log('📚 导入量子+低空经济（2 篇）');
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
    console.log(`  ✅ #${post.id} ${meta.industry} | ${meta.title.slice(0, 45)}`);
    ok++;
  }
  console.log(`\n🎉 导入 ${ok}/${SKILLS.length}`);
  const total = await prisma.post.count({ where: { status: 'published', deletedAt: null } });
  console.log('🎯 总量:', total, total >= 50 ? '✅ 达标 50!' : `(差 ${50 - total})`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
