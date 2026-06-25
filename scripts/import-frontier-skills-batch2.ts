import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { saveBuffer } from '../lib/storage';

const prisma = new PrismaClient();
const DIR = 'C:/Users/Lensn/WorkBuddy/2026-06-25-19-22-08/细分行业研究Skill草稿_第二批';
const LIBRARY_EMAIL = 'library@pevc.local';

const SKILLS = [
  {
    file: '10_商业航天投资框架.md',
    slug: 'nei-industry/aerospace',
    title: '商业航天投资研究框架：发射成本曲线 + 运力供需 + 星座经济性',
    intro: '<p>商业航天（火箭/卫星/星座/应用）的投资分析框架。2026-2030 最具"工程经济学"独特性的赛道——<strong>发射成本曲线 + 运力供需 + 星座组网经济性</strong>构成无现成框架可套的判断逻辑。</p>\n<h2>解决什么问题</h2>\n<ul><li>不知道怎么判断发射成本下降对产业链利润的影响</li><li>混淆火箭/卫星/应用层投资逻辑（完全不同）</li><li>用传统制造业框架看商业航天（应该看发射$/kg + 运力供需）</li></ul>\n<h2>亮点</h2>\n<ul><li>发射成本曲线表（1-2万→3000→&lt;1000 美元/kg，每降一级打开一个商业场景）</li><li>受益时序：上游(材料/元器件)→中游(火箭/卫星)→下游(运营/应用)，3-5年时差</li><li>五大壁垒：系统工程/资本/客户认证/规模/牌照</li><li>SpaceX 占 80%+ 全球商业发射——中国对标的节奏差</li><li>10 条商业航天专属红旗</li></ul>\n<p>适合：硬科技 PE/VC、产业资本、国家队配套基金。</p>',
    scene: 'industry-research', industry: 'aerospace',
    contents: ['risk-id', 'report-gen', 'info-gather'], assetType: 'prompt',
    originalAuthor: '雪山千古冷（知乎）+ 全产业链盘点',
    sourceUrl: 'https://zhuanlan.zhihu.com/p/商业航天投资',
  },
  {
    file: '11_科学家创业_深科技投资框架.md',
    slug: 'nei-research/deeptech-scientist-founder',
    title: '科学家创业 / 深科技投资框架：创始人配置 + 学术 IP 5 层评估 + 选品策略',
    intro: '<p>覆盖 AI4S / 合成生物 / 量子 / 脑科学 / 光电芯片 / 新材料等<strong>所有"科学家创业"赛道</strong>的通用投资框架。核心命题不是某个具体技术，而是<strong>"如何评估学术 IP 的可商业化"</strong>。2025-2026 行业认知迭代：从"迷信教授光环"到"科学家 + 产业界 + 资本"组合配置。</p>\n<h2>解决什么问题</h2>\n<ul><li>教授兼职创业、留退路——投资打水漂</li><li>学术 IP 停在论文阶段（L1-L2），离产品（L4-L5）还很远</li><li>不知道怎么评估"科学家 + 产业界"团队配置的质量</li></ul>\n<h2>亮点</h2>\n<ul><li>获融资团队 4 共性（产业经验/科学家+产业界组合/全球首创/破釜沉舟）</li><li>学术 IP 商业化 5 层评估（L1 科学→L2 专利→L3 原型→L4 产品→L5 规模）</li><li>"科学家 + 资深产业界 + 资本"= 顶级配置</li><li>选品"命题作文"原则（先找需求再找技术，不是反过来）</li><li>10 条深科技创业专属红旗</li></ul>\n<p>适合：PE/VC 早期组、孵化器、高校技术转移办公室、科技成果转化基金。<strong>跨所有深科技赛道通用。</strong></p>',
    scene: 'business-dd', industry: null,
    contents: ['risk-id', 'memo', 'info-gather'], assetType: 'prompt',
    originalAuthor: '动脉网 + 投中网 + 界面新闻综合',
    sourceUrl: 'https://www.vbdata.cn/news/科学家创业',
  },
  {
    file: '12_合成生物_生物制造投资框架.md',
    slug: 'nei-industry/synthetic-bio',
    title: '合成生物 / 生物制造投资框架：选品生死 + 生物基定价 + 四类资本结构',
    intro: '<p>合成生物学（生物制造/工业生物技术）的投资分析框架。横跨"制造业"和"生物科技"的跨界赛道。核心矛盾：<strong>技术想象力巨大但商业化兑现难</strong>——2024-2026 认知迭代：从"讲故事"到"看产品"。</p>\n<h2>解决什么问题</h2>\n<ul><li>选品错误（赌新分子 vs 卷旧大宗，怎么选）</li><li>不会算生物基 vs 石油基的平价点（1x/2-3x/3x+ 三档定价）</li><li>纯研发无收入但估值 &gt; 10 亿——泡沫信号</li></ul>\n<h2>亮点</h2>\n<ul><li>选品"平衡点"原则（赌新 vs 卷旧的决策框架）</li><li>生物基 vs 石油基定价逻辑（1x 平价/2-3x 高端/3x+ 概念）</li><li>麦角硫因案例（15 万→3 万/公斤，成本曲线下降验证）</li><li>四类资本结构（纯 VC / 产业+VC / 产业独立 / 招商落地）</li><li>BD 出海新趋势</li><li>10 条合成生物专属红旗</li></ul>\n<p>适合：PE/VC 早期组、产业资本（招商局/国投/国药/中粮）、地方政府引导基金。</p>',
    scene: 'industry-research', industry: 'biotech',
    contents: ['risk-id', 'report-gen', 'data-clean'], assetType: 'prompt',
    originalAuthor: '投中网 + 动脉网综合',
    sourceUrl: 'https://www.chinaventure.com.cn',
  },
  {
    file: '13_核聚变_超长周期科技投资框架.md',
    slug: 'nei-research/fusion-ultralong-cycle',
    title: '核聚变 / 超长周期前沿科技投资框架：TRL 评估 + 战略卡位 + 替代工具',
    intro: '<p>可控核聚变（及类似超长周期、政府/慈善资本主导的前沿科技）的投资分析框架。<strong>传统 VC 方法论在此完全失效</strong>——商业化 20-40 年、退出路径不明、传统 IPO/并购几乎无案例。本框架的核心价值是帮 GP 决定<strong>"什么钱该投、什么钱不该投"</strong>，以及"如果投，该用什么工具"。</p>\n<h2>解决什么问题</h2>\n<ul><li>GP 被投委会问"核聚变能不能投"——需要结构化判断</li><li>私营聚变公司宣称 2030-2035 商业化——怎么验证可信度</li><li>LP 要求配置前沿科技——除了"不投"还有什么替代方案</li></ul>\n<h2>亮点</h2>\n<ul><li>4 条技术路线 TRL 成熟度对比表（磁约束/仿星器/惯性/紧凑私有）</li><li>官方时间表 vs 私营宣称（2045 示范堆 vs 2030-2035 商业化）</li><li>"传统 VC 不该投"的明确判断 + 替代评估工具（使命投资/实物期权法/阶段化承诺）</li><li>2026 IPO 潮真相（SPAC/并购是叙事交易，非技术突破）</li><li>产业链受益顺序（当前只能投"卖铲子"：超导材料/射频/真空/控制系统）</li><li>10 条超长周期科技红旗</li></ul>\n<p>适合：主权基金/政府引导基金/战略配置型 LP/耐心资本。传统财务 VC 慎入。</p>',
    scene: 'industry-research', industry: null,
    contents: ['risk-id', 'report-gen'], assetType: 'prompt',
    originalAuthor: '中核集团段旭如 + 雪球 + 爱股票综合',
    sourceUrl: 'https://xueqiu.com/',
  },
];

async function main() {
  console.log('📚 导入第二批前沿赛道 Skill（4 篇）');
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
    console.log(`  ✅ #${post.id} ${meta.industry || '通用'} | ${meta.title.slice(0, 45)}`);
    ok++;
  }
  console.log(`\n🎉 导入 ${ok}/${SKILLS.length}`);
  const total = await prisma.post.count({ where: { status: 'published', deletedAt: null } });
  const indCount = await prisma.post.groupBy({ by: ['tagIndustry'], where: { status: 'published', deletedAt: null }, _count: { id: true }, orderBy: { _count: { id: 'desc' } } });
  console.log('总量:', total);
  console.log('行业分布:'); indCount.forEach(s => console.log(`  ${s._count.id} ${s.tagIndustry || '(通用/无)'}`));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
