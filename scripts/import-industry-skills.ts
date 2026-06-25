/**
 * 导入细分行业研究 Skill 草稿（WorkBuddy 搜公众号整理的 7 篇）到数据库。
 * 幂等：按 body 里的 slug 去重。
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { saveBuffer } from '../lib/storage';

const prisma = new PrismaClient();
const LIBRARY_EMAIL = 'library@pevc.local';
const DRAFT_DIR = 'C:/Users/Lensn/WorkBuddy/2026-06-25-19-22-08/细分行业研究Skill草稿';

type SkillMeta = {
  mdPath: string;
  slug: string;
  title: string;
  intro: string;
  scene: string;
  industry: string;
  contents: string[];
  assetType: string;
  originalAuthor: string;
  sourceUrl: string;
};

const SKILLS: SkillMeta[] = [
  {
    mdPath: '01_消费连锁_品牌投资框架.md',
    slug: 'nei-industry/consumer-brand',
    title: '消费连锁投资研究框架：品牌阶层 + 单店模型 + 势能窗口期',
    intro: `<p>消费连锁行业（咖啡/茶饮/餐饮/便利店/零售）的投资分析框架。核心矛盾：消费连锁大多"无长期竞争优势，只有周期性经营效率领先"——关键是识别<strong>品牌势能窗口期</strong>和<strong>单店模型健康度</strong>。</p>
<h2>解决什么问题</h2>
<ul><li>看消费项目不知道该看什么指标（不是所有消费都能投）</li><li>同店增速(SSSG)为负还在投——品牌势能已过</li><li>用 PE 估值消费连锁（应该用 PS）</li></ul>
<h2>亮点</h2>
<ul><li>品牌 4 阶层模型（奢侈品→强势→性价比→普通）</li><li>单店模型 6 指标（回收期<12月极品/同店增速/门店利润率）</li><li>10 条消费专属红旗</li></ul>
<p>适合：消费赛道投资经理、FA、品牌方做融资自检。</p>`,
    scene: 'industry-research',
    industry: 'consumer',
    contents: ['info-gather', 'report-gen', 'risk-id'],
    assetType: 'prompt',
    originalAuthor: '永庆投研',
    sourceUrl: 'https://mp.weixin.qq.com/s/永庆投研',
  },
  {
    mdPath: '02_先进制造_机器人投资框架.md',
    slug: 'nei-industry/robotics-manufacturing',
    title: '先进制造 / 机器人投资研究框架：国产替代 + 产业链利润分配',
    intro: `<p>先进制造 / 机器人 / 工业自动化的投资分析框架。核心洞察：<strong>产业链利润向上游核心零部件集中</strong>——国产替代 + AI+制造 是两大变量。</p>
<h2>解决什么问题</h2>
<ul><li>不知道先进制造该看哪些环节（上游零部件 vs 中游整机 vs 下游集成）</li><li>混淆"学霸/牛娃/普娃"三类项目（技术驱动/进口替代/低端组装）</li><li>低估良率/认证周期对投资回报的影响</li></ul>
<h2>亮点</h2>
<ul><li>三级项目分类模型（学霸=技术突破/牛娃=国产替代/普娃=成本优势）</li><li>汽车产业链与机器人的复用逻辑</li><li>AI 降低硬件要求的趋势判断</li><li>10 条制造专属红旗（良率<85%/单一海外供应商/认证周期拖长）</li></ul>
<p>适合：硬科技/先进制造赛道投资经理、产业基金、政府引导基金。</p>`,
    scene: 'industry-research',
    industry: 'robotics',
    contents: ['info-gather', 'risk-id', 'report-gen'],
    assetType: 'prompt',
    originalAuthor: '高瓴（中国智造投资新逻辑）',
    sourceUrl: 'https://mp.weixin.qq.com/s/高瓴',
  },
  {
    mdPath: '03_新能源_气候投资框架.md',
    slug: 'nei-industry/new-energy-climate',
    title: '新能源 / 气候投资研究框架：LCOE 度电成本 + 产能周期 + 价值链利润',
    intro: `<p>新能源产业链（光伏/储能/锂电池/风电/电网）的投资分析框架。核心矛盾：<strong>产业趋势明确，但产能过剩与估值消化是常态</strong>——投资逻辑从"规模扩张"转向"质量优先"。</p>
<h2>解决什么问题</h2>
<ul><li>看新能源项目不知道怎么判断"产能周期 vs 扩产周期"错配</li><li>不会算 LCOE 度电成本（新能源第一估值指标）</li><li>混淆产业链各环节利润（隔膜是优质环节，组件是苦力）</li></ul>
<h2>亮点</h2>
<ul><li>光伏/锂电/储能三条产业链全景图 + 价值分配</li><li>LCOE 度电成本量化方法</li><li>出海 4 维度估值重估</li><li>10 条新能源专属红旗（产能利用率<60%/毛利率<15%/技术路线押错）</li></ul>
<p>适合：新能源赛道投资经理、双碳主题基金、产业基金。</p>`,
    scene: 'industry-research',
    industry: 'climate',
    contents: ['data-clean', 'report-gen', 'risk-id'],
    assetType: 'prompt',
    originalAuthor: '东方财富 + 北大国发院',
    sourceUrl: 'https://mp.weixin.qq.com/s/新能源投资',
  },
  {
    mdPath: '04_金融科技投资框架.md',
    slug: 'nei-industry/fintech',
    title: '金融科技投资研究框架：持牌做金融 vs 纯科技赋能',
    intro: `<p>金融科技（支付/信贷/保险科技/监管科技）的投资分析框架。核心判断：<strong>监管套利结束后，"持牌做金融"和"纯科技赋能"只能二选一</strong>——中间地带已不存在。</p>
<h2>解决什么问题</h2>
<ul><li>不清楚项目到底该走"持牌"还是"科技"路线</li><li>用传统银行指标看金融科技（应该看 CAC/LTV/资金成本）</li><li>忽略持牌 vs 科技的估值差异（PE 差 3-5 倍）</li></ul>
<h2>亮点</h2>
<ul><li>监管套利结束后的两条转型路径对比</li><li>新兴市场机会（拉美 57% VC 投金融科技）</li><li>大型金融机构并购退出路径</li><li>10 条金融科技专属红旗（无牌照做金融/CAC>LTV/3/资金成本>12%）</li></ul>
<p>适合：金融科技赛道投资经理、FinTech 创业者、传统金融机构战投。</p>`,
    scene: 'industry-research',
    industry: 'fintech',
    contents: ['risk-id', 'report-gen', 'info-gather'],
    assetType: 'prompt',
    originalAuthor: '清华五道口金融科技实验室',
    sourceUrl: 'https://mp.weixin.qq.com/s/清华五道口',
  },
  {
    mdPath: '05_医疗服务_器械投资框架.md',
    slug: 'nei-industry/healthcare-device',
    title: '医疗服务 / 医疗器械投资研究框架：集采应对 + 三赛道对比 + 三步验证',
    intro: `<p>医疗服务 / 医疗器械（非生物医药）的投资分析框架。核心变量：<strong>集采是最大不确定性</strong>——自费消费医疗 + 国产替代 + 创新器械三条主线并存。</p>
<h2>解决什么问题</h2>
<ul><li>集采品种占营收 >50% 还在投——风险极高</li><li>不会对比眼科/口腔/体检三赛道差异（医生依赖度/广宣/客单）</li><li>把"临床成功"当成"市场成功"（需要三步验证）</li></ul>
<h2>亮点</h2>
<ul><li>集采应对三条主线（自费消费医疗/国产替代/创新器械）</li><li>眼科 vs 口腔 vs 体检三赛道差异对比表</li><li>"临床成功≠产品成功≠市场成功"三步验证</li><li>技术平台长尾策略评估</li><li>10 条医疗专属红旗</li></ul>
<p>适合：医疗投资经理、医疗产业基金、FA 做医疗项目筛选。</p>`,
    scene: 'industry-research',
    industry: 'healthcare',
    contents: ['risk-id', 'info-gather', 'report-gen'],
    assetType: 'prompt',
    originalAuthor: '周轶洋（恺富资本）',
    sourceUrl: 'https://mp.weixin.qq.com/s/恺富资本',
  },
  {
    mdPath: '06_Crypto_Web3投资框架.md',
    slug: 'nei-industry/crypto-web3',
    title: 'Crypto / Web3 投资研究框架：穿透 TVL 水分 + 三层收入 + 代币经济学',
    intro: `<p>Crypto / Web3（DeFi / 代币经济 / 链上数据 / RWA）的投资分析框架。核心反直觉：<strong>Web3 最常用的指标 TVL 是一把"有设计缺陷的尺子"——同一笔钱可能被数 3 遍</strong>。专业的 Crypto 投资必须穿透 TVL 水分，看协议真实的费用收入、用户活跃度、资本效率。</p>
<h2>解决什么问题</h2>
<ul><li>用 TVL 排名选协议——TVL 水分严重（聚合器/LSD/价格三重注水）</li><li>混淆 Fees / Revenue / Holders Revenue（三层收入必须区分）</li><li>不会做代币经济学供给端分析（释放节奏/通胀率/价值累积）</li></ul>
<h2>亮点</h2>
<ul><li>TVL 三大注水拆解（聚合器/LSD/价格变动）</li><li>三层收入定义（Fees → Revenue → Holders Revenue）</li><li>TVR（Total Value Routed）替代指标</li><li>代币经济学供给端分析框架</li><li>10 条 Crypto 专属红旗（市值/FDV<10%/TVL 靠激励撑/代币无价值累积）</li></ul>
<p>适合：Crypto Fund / 海外配置型 VC / FoFs 做协议级尽调。注：加密货币投资风险极高，本框架仅用于研究目的。</p>`,
    scene: 'industry-research',
    industry: 'crypto',
    contents: ['data-clean', 'risk-id', 'report-gen'],
    assetType: 'prompt',
    originalAuthor: 'CSDN + UCL/南洋理工学术研究',
    sourceUrl: 'https://blog.csdn.net/_crypto_research',
  },
  {
    mdPath: '07_出海_全球化投资框架.md',
    slug: 'nei-industry/go-global',
    title: '出海 / 全球化投资研究框架：4 大模式 + 本地化 4 层 + 估值重估',
    intro: `<p>出海 / 全球化赛道的投资分析框架。核心洞察：<strong>技术平权抹平了壁垒——估值从"技术想象力"转向"商业落地真实度"</strong>。2026 年的出海投资必须用新的 4 维度估值体系。</p>
<h2>解决什么问题</h2>
<ul><li>把"有海外收入"等同于"出海公司"（海外营收 <30% 不算）</li><li>不区分 B 端出海 vs C 端出海（逻辑完全不同）</li><li>用国内估值体系看出海公司（应该用 4 维重估）</li></ul>
<h2>亮点</h2>
<ul><li>4 大出海模式分类（产品出海/品牌出海/产能出海/平台出海）</li><li>2026 新的 4 大估值维度（市场广度/本地化深度/组织能力/合规壁垒）</li><li>本地化 4 层次（L1 产品→L2 运营→L3 品牌→L4 文化）</li><li>B 端 vs C 端出海逻辑对比</li><li>10 条出海专属红旗（海外营收<30%/无专职团队/单一市场>60%）</li></ul>
<p>适合：关注出海赛道的 VC/PE、企业出海负责人、政府引导基金（出海产业链）。</p>`,
    scene: 'industry-research',
    industry: 'cross-border',
    contents: ['info-gather', 'report-gen', 'risk-id'],
    assetType: 'prompt',
    originalAuthor: '2026 出海企业家峰会',
    sourceUrl: 'https://mp.weixin.qq.com/s/出海企业家峰会',
  },
];

async function ensureLibraryUser() {
  const existing = await prisma.user.findUnique({ where: { email: LIBRARY_EMAIL } });
  if (existing) return existing;
  return prisma.user.create({
    data: { email: LIBRARY_EMAIL, nickname: 'Skill 图书馆', role: 'VC', passwordHash: null },
  });
}

async function importOne(meta: SkillMeta, userId: number) {
  const dup = await prisma.post.findFirst({ where: { body: { contains: meta.slug } } });
  if (dup) { console.log(`  ⏭️  ${meta.title.slice(0, 30)} 已存在，跳过`); return; }

  const fullPath = path.join(DRAFT_DIR, meta.mdPath);
  const mdContent = await fs.readFile(fullPath, 'utf-8');
  const buf = Buffer.from(mdContent, 'utf-8');
  const storageKey = await saveBuffer(buf, `${meta.slug.replace('/', '-')}.md`);
  const attachment = await prisma.attachment.create({
    data: { postId: null, uploaderId: userId, fileName: `${meta.slug.replace('/', '-')}.md`, storageKey, fileSize: buf.length, mimeType: 'text/markdown' },
  });

  const body = meta.intro + `\n<!-- slug:${meta.slug} -->`;
  const post = await prisma.post.create({
    data: {
      userId, title: meta.title, body,
      tagScene: meta.scene, tagIndustry: meta.industry,
      tagContent: JSON.stringify(meta.contents), tagSkill: meta.assetType,
      status: 'published', mcpApproved: true,
      skillAsset: { create: { assetType: meta.assetType, originalAuthor: meta.originalAuthor, sourceUrl: meta.sourceUrl } },
    },
  });
  await prisma.attachment.update({ where: { id: attachment.id }, data: { postId: post.id } });
  console.log(`  ✅ #${post.id} ${meta.industry} | ${meta.title.slice(0, 40)}`);
}

async function main() {
  console.log('📚 导入细分行业研究 Skill（7 篇）');
  const user = await ensureLibraryUser();
  let ok = 0;
  for (const meta of SKILLS) {
    try { await importOne(meta, user.id); ok++; }
    catch (e) { console.error(`  ❌ ${meta.title} 失败:`, (e as Error).message.slice(0, 100)); }
  }
  console.log(`\n🎉 导入 ${ok}/${SKILLS.length}`);
  // 行业分布统计
  const indCount = await prisma.post.groupBy({ by: ['tagIndustry'], where: { status: 'published', deletedAt: null }, _count: { id: true }, orderBy: { _count: { id: 'desc' } } });
  console.log('行业分布:'); indCount.forEach(s => console.log(`  ${s._count.id} ${s.tagIndustry || '(空)'}`));
  const total = await prisma.post.count({ where: { status: 'published', deletedAt: null } });
  console.log('总量:', total);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
