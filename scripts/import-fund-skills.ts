import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { saveBuffer } from '../lib/storage';

const prisma = new PrismaClient();
const DIR = 'C:/Users/Lensn/WorkBuddy/2026-06-25-19-22-08/交付能力';
const LIBRARY_EMAIL = 'library@pevc.local';

const SKILLS = [
  {
    file: '07_投后管理与赋能方法论.md',
    slug: 'nei-skill/post-investment-management',
    title: '投后管理与赋能方法论：风险监控 + 增值赋能 + 退出准备（全周期）',
    intro: '<p>面向 PE/VC 的<strong>投后管理价值创造方法论</strong>。投后不是"投完就等退出"——麦肯锡研究显示，顶级 PE 通过主动投后管理创造的价值占整体回报的 <strong>40-60%</strong>。本 Skill 把投后拆成"风险监控 + 增值赋能 + 退出准备"三大模块，覆盖从交割 Day 1 到退出 Day N 的全周期。</p>\n<h2>解决什么问题</h2>\n<ul><li>把投后当成"董事会席位 + 月度报表 + 出问题才管"的被动监控</li><li>没有系统化的风险预警机制（等到爆雷才发现）</li><li>不主动做增值赋能（错过 EBITDA 提升 20-40% 的机会）</li></ul>\n<h2>亮点</h2>\n<ul><li>投后价值定位量化（保值降损 30-50% / 增值 EBITDA+20-40% / 退出 IRR+3-5pct）</li><li>风险监控体系（预警阈值 + Day 1 清单 + 分级响应）</li><li>增值赋能矩阵（战略/运营/人才/资本运作 4 维度）</li><li>退出准备时间轴（IPO/并购/S 基金/回购 4 路径推演）</li><li>10 条投后红旗信号</li></ul>\n<p>适合：PE/VC 投后团队、IR、基金管理人、被投企业战略部门。</p>',
    scene: 'post-investment', industry: null,
    contents: ['report-gen', 'risk-id', 'memo'], assetType: 'prompt',
    originalAuthor: '麦肯锡 PE 投后研究 + 高瓴 DVC 公开案例',
    sourceUrl: 'https://www.mckinsey.com/',
  },
  {
    file: '08_基金运营管理SOP.md',
    slug: 'nei-skill/fund-ops-sop',
    title: '基金运营管理 SOP：5 阶段全生命周期 + LP/GP/管理人/托管四方关系',
    intro: '<p>面向 GP/IR/运营人员的<strong>基金运营管理全流程 SOP</strong>——把基金当成一家公司来管。覆盖<strong>募（LP 开发/基金设计）→ 投（投决/风控）→ 管（投后/LP 报告/估值）→ 退（退出/S 交易/分配）→ 清（清算/合规归档）</strong>五大环节。</p>\n<h2>解决什么问题</h2>\n<ul><li>不清楚基金生命周期各阶段标准动作（设立/投资/退出/清算各有 SOP）</li><li>LP/GP/管理人/托管四方权利义务混乱（运营事故根源）</li><li>LP 报告/估值/合规缺乏标准化模板</li></ul>\n<h2>亮点</h2>\n<ul><li>基金生命周期 5 阶段表（设立 6-18 月 / 投资 3-5 年 / 退出 3-7 年 / 清算 1-2 年）</li><li>LP/GP/管理人/托管四方关系详解</li><li>LP 报告标准结构 + 频率 + 关键指标</li><li>估值方法选择（成本法/市场法/收益法）+ 估值调整触发</li><li>退出路径决策树（IPO/并购/S 基金/回购）</li><li>基金清算合规清单</li></ul>\n<p>适合：GP 合伙人、运营总监、IR、基金财务、法务合规。</p>',
    scene: 'fund-ops', industry: null,
    contents: ['report-gen', 'memo', 'automation'], assetType: 'workflow',
    originalAuthor: 'PE/VC 基金运营实务 + 中基协合规指引',
    sourceUrl: 'https://www.amac.org.cn/',
  },
  {
    file: '09_应对政府资金方法论.md',
    slug: 'nei-skill/gov-fund-strategy',
    title: '应对政府引导基金方法论：2025 国办 1 号文解读 + 返投松绑 + GP 谈判策略',
    intro: '<p>面向 GP/IR 的<strong>应对中国政府引导基金/国资 LP/产业基金的方法论</strong>。2025 年是政策拐点——国办发〔2025〕1 号文发布，返投比例大幅松绑、容错免责机制全面铺开。对 GP 而言，"拿政府钱"的逻辑彻底变了：从"戴着镣铐跳舞"到<strong>"主动拥抱新红利窗口"</strong>（低返投 + 容错免责 + 长期耐心资本）。</p>\n<h2>解决什么问题</h2>\n<ul><li>不了解 2025 国办 1 号文的具体松绑措施（返投/容错/让利）</li><li>不会和政府引导基金谈判（返投认定/让利机制/退出路径）</li><li>不知道各类国资 LP 的差异（国家级大基金 vs 省级 vs 市区级 vs 央企产业基金）</li></ul>\n<h2>亮点</h2>\n<ul><li>国办 1 号文深度解读（返投松绑 + 容错免责 + 让利机制 + 国资私募整顿）</li><li>国资 LP 4 大类型对比（谈判难度/诉求/流程差异）</li><li>GP 申报流程 6 步法（筛选→申报→尽调→谈判→签约→管理）</li><li>返投认定实操（直接投资/间接投资/招商引资 多种认定方式）</li><li>容错免责条款谈判要点</li><li>10 条政府资金红旗信号</li></ul>\n<p>适合：GP 合伙人、IR、政府资金对接负责人、国资基金管理人、政府引导基金管理机构。<strong>N.E.I. 差异化旗舰内容。</strong></p>',
    scene: 'fundraising', industry: null,
    contents: ['report-gen', 'memo', 'risk-id'], assetType: 'prompt',
    originalAuthor: '国办发〔2025〕1 号文 + 中基协 + 清科研究',
    sourceUrl: 'https://www.gov.cn/',
  },
];

async function main() {
  console.log('📚 导入投后/基金运营/政府资金（3 篇）');
  const user = await prisma.user.findUnique({ where: { email: LIBRARY_EMAIL } });
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
    console.log(`  ✅ #${post.id} ${meta.scene} | ${meta.title.slice(0, 50)}`);
    ok++;
  }
  console.log(`\n🎉 导入 ${ok}/${SKILLS.length}`);
  const total = await prisma.post.count({ where: { status: 'published', deletedAt: null } });
  const sceneCount = await prisma.post.groupBy({ by: ['tagScene'], where: { status: 'published', deletedAt: null }, _count: { id: true }, orderBy: { _count: { id: 'desc' } } });
  console.log('🎯 总量:', total);
  console.log('场景分布:'); sceneCount.forEach(s => console.log(`  ${s._count.id} ${s.tagScene}`));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
