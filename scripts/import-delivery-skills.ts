import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { saveBuffer } from '../lib/storage';

const prisma = new PrismaClient();
const DIR = 'C:/Users/Lensn/WorkBuddy/2026-06-25-19-22-08/交付能力';
const LIBRARY_EMAIL = 'library@pevc.local';

type Meta = {
  file: string; slug: string; title: string; intro: string;
  scene: string; industry: string | null; contents: string[];
  assetType: string; originalAuthor: string; sourceUrl: string;
};

const SKILLS: Meta[] = [
  {
    file: '01_政策检索方法论.md',
    slug: 'nei-skill/policy-search',
    title: '政策检索方法论：4 层信息源 + 文号解读 + 政策信号排序 + 预警机制',
    intro: '<p>PE/VC/FA 做<strong>任何行业研究</strong>都会用到的横向能力——把政策查全、读懂、追踪。4 层信息源体系（国家级→部委→专项→地方）+ 政策文号解读（国发/中发/发改）+ 政策信号重要性排序（🔴中央 > 🟠国务院 > 🟡部委 > 🟢讲话）。</p>\n<h2>解决什么问题</h2>\n<ul><li>只看媒体报道不查政策原文（信息失真）</li><li>漏掉部委细则和征求意见稿（政策演变前兆）</li><li>不区分"现行有效/已废止"（引用过期政策）</li></ul>\n<h2>亮点</h2>\n<ul><li>高级搜索运算符速查表（site:/ filetype:/ intitle:）</li><li>政策解读 8 维度框架</li><li>政策信号重要性排序</li><li>4 要素预警机制（警素/警兆/警度/警限）</li><li>监测工具矩阵 + 监测清单模板</li></ul>\n<p>适合：所有 PE/VC/FA 投资经理、IR、政府引导基金。<strong>跨所有行业通用。</strong></p>',
    scene: 'industry-research', industry: null,
    contents: ['info-gather', 'report-gen'], assetType: 'prompt',
    originalAuthor: '何雨果《政策检索情报指南》',
    sourceUrl: 'https://mp.weixin.qq.com/',
  },
  {
    file: '02_论文与前沿动态检索方法论.md',
    slug: 'nei-skill/paper-frontier-search',
    title: '论文与前沿动态检索：5 领域数据库 + 顶会顶刊体系 + PI 追踪 + 真突破判断',
    intro: '<p>硬科技投资必备的横向能力——<strong>怎么追技术前沿、怎么判断"真突破 vs incremental"</strong>。核心洞察：<strong>追人比追关键词更重要</strong>（PI 追踪路径）。</p>\n<h2>解决什么问题</h2>\n<ul><li>只会百度搜论文（应该用 arXiv/PubMed/WoS）</li><li>不分顶会顶刊（NeurIPS vs random conference）</li><li>被"重大突破"新闻误导（要看预印本+被引+独立重复验证）</li></ul>\n<h2>亮点</h2>\n<ul><li>5 领域数据库选型（AI→arXiv / 生物→PubMed / 化学→WoS / 物理→APS / 综合→Google Scholar）</li><li>AI 顶会体系（NeurIPS/ICML/ICLR/CVPR/ACL）+ 生物医药顶刊（CNS/NEJM/Lancet）</li><li>PI 追踪路径（找对人比找对关键词重要）</li><li>Alert 设置清单（日级 arXiv / 周级 Scholar / 月级 PubMed / 年度顶会）</li><li>7 维度判断"真突破 vs incremental"</li></ul>\n<p>适合：硬科技/生物医药/AI 赛道投资经理、博士背景的研究团队。</p>',
    scene: 'industry-research', industry: null,
    contents: ['info-gather', 'report-gen'], assetType: 'prompt',
    originalAuthor: '知乎《如何查找领域内研究前沿》+ 顶会检索教学',
    sourceUrl: 'https://zhuanlan.zhihu.com/',
  },
  {
    file: '03_专利检索与分析方法论.md',
    slug: 'nei-skill/patent-analysis',
    title: '专利检索与分析：FTO 5 步法 + 同族/引证分析 + 专利布局模式',
    intro: '<p>硬科技投资尽调的<strong>核心能力</strong>——专利壁垒评估。从"只会搜公司名"升级到 FTO 自由实施评估、同族专利全球布局分析、引证追踪、专利到期追踪。</p>\n<h2>解决什么问题</h2>\n<ul><li>只会搜公司名（漏掉关联方专利、未授权专利）</li><li>不分发明/实用新型（实用新型几乎无壁垒）</li><li>不做 FTO 自由实施评估（硬科技投资核心尽调缺失）</li><li>只看数量不看质量（凑数专利/外围专利/无关专利）</li></ul>\n<h2>亮点</h2>\n<ul><li>4 类平台选型（官方/商业/学术/领域）</li><li>FTO 自由实施评估 5 步法（硬科技投资核心尽调）</li><li>4 大分析维度（活跃度/集中度/生命周期/被引）</li><li>同族专利分析（全球布局意图）</li><li>5 种专利布局模式（伞形最强）</li><li>核心专利到期追踪</li></ul>\n<p>适合：硬科技/半导体/生物医药投资经理、IP 尽调团队。</p>',
    scene: 'business-dd', industry: null,
    contents: ['risk-id', 'info-gather', 'report-gen'], assetType: 'prompt',
    originalAuthor: '《专利检索及分析全指南》(meritsip) + 智慧芽',
    sourceUrl: 'https://www.meritsip.com',
  },
  {
    file: '04_专家访谈方法论.md',
    slug: 'nei-skill/expert-interview',
    title: '专家访谈方法论：5 步流程 + 试金石原则 + 定量递进 + 隐私替代问法',
    intro: '<p>公开渠道找不到的信息怎么拿？<strong>专家访谈是 PE/VC/FA 尽调最高价值的信息获取方式</strong>——但绝大多数人做不好。本框架从挑选→备大纲→执行→整理→结算全流程标准化。</p>\n<h2>解决什么问题</h2>\n<ul><li>未做试金石就深聊（浪费时间和钱）</li><li>选在职高管（顾虑多、不敢说真话；应选离职 1-6 月中层）</li><li>直接问机密（应该用假设性问法）</li><li>单一专家定结论（应交叉验证 3+ 人）</li></ul>\n<h2>亮点</h2>\n<ul><li>专家筛选 4 标准（离职 1-6 月最佳 / 中层 / 对口部门 / 机构背景）</li><li>前 15 分钟试金石原则</li><li>5 段式大纲模板</li><li>隐私问题替代问法（假设性问法）</li><li>定量数据层层递进法</li><li>结算谈判权（数据有破绽可打折）</li></ul>\n<p>适合：所有 PE/VC/FA 投资经理、尽调团队。<strong>跨所有行业通用。</strong></p>',
    scene: 'business-dd', industry: null,
    contents: ['expert-call', 'info-gather', 'memo'], assetType: 'prompt',
    originalAuthor: '媛媛大王《专家访谈的方法与技巧》(人人都是产品经理)',
    sourceUrl: 'https://www.woshipm.com/',
  },
  {
    file: '05_招投标与订单信息检索方法论.md',
    slug: 'nei-skill/bid-tender-verification',
    title: '招投标与订单验证：收入验证 4 步法 + 竞争格局 4 维度 + 平台选型',
    intro: '<p>To B / To G 公司尽调的<strong>杀手锏</strong>——用公开招投标数据验证宣称收入真假。公开文章多从"供应商怎么投标"视角，本 Skill <strong>反转为"投资人怎么用招投标数据验证订单"</strong>——投研实战高频但少被系统讲的能力。</p>\n<h2>解决什么问题</h2>\n<ul><li>宣称收入 vs 招投标严重不符——收入造假</li><li>宣称的大客户在平台查不到——关联交易</li><li>多家关联公司投标——陪标嫌疑</li><li>单一客户占 >70%——依赖风险</li></ul>\n<h2>亮点</h2>\n<ul><li>按采购方类型的平台选型（政府/国企/军队/事业单位/民企）</li><li>7 类公告类型及投研价值（采购意向 5★前瞻 / 中标+合同 5★权威）</li><li>收入验证 4 步法（拆客户→反查招投标→找漏网订单→分析竞争）</li><li>验证结论 4 分类（✅吻合 / ⚠️部分 / 🔴严重不符 / 🚫查不到）</li><li>竞争格局分析 4 维度（集中度/价格趋势/新进入者/地域）</li></ul>\n<p>适合：To B / To G 公司尽调、收入核查、竞争格局分析。</p>',
    scene: 'business-dd', industry: null,
    contents: ['info-gather', 'risk-id', 'report-gen'], assetType: 'prompt',
    originalAuthor: '国家级招投标平台 + 寻标宝/标事通 + IPO 尽调实务',
    sourceUrl: 'https://www.bidcenter.com.cn',
  },
  {
    file: '06_用AI做投资研究SOP.md',
    slug: 'nei-skill/ai-research-sop',
    title: '用 AI 做投资研究 SOP：Claude Code 工具栈 + CLAUDE.md 模板 + 知识库结构',
    intro: '<p>把整套投研流程用 AI 自动化的<strong>操作手册</strong>。核心认知：<strong>Claude Code ≠ 聊天机器人</strong>——前者是能独立执行完整流程的 Agent。4 件套工具栈 + 知识库三目录结构 + CLAUDE.md 规则文件 + 日常工作四步流程。</p>\n<h2>解决什么问题</h2>\n<ul><li>把 Claude Code 当聊天机器人用（浪费 90% 能力）</li><li>不建知识库目录结构（信息散乱、无法复用）</li><li>不写 CLAUDE.md 规则文件（AI 不知道你的偏好和工作流）</li><li>把 AI 结论当权威（必须交叉核查）</li></ul>\n<h2>亮点</h2>\n<ul><li>4 件套工具栈（Claude Code + Cursor + Obsidian + Playwright/Firecrawl）</li><li>知识库三目录结构（raw/wiki/output）</li><li>CLAUDE.md 规则文件完整模板（13 条规则，可直接复制）</li><li>日常工作四步流程（剪藏→整理→查询→核查）</li><li>投研专属增强（把前 5 份检索方法论做成任务模板嵌入）</li><li>典型工作流（个股筛选/深度分析/行业研究/政策追踪/报告撰写）</li></ul>\n<p>适合：所有想用 AI 提效的 PE/VC/FA 从业者。<strong>N.E.I. 的 AI 方法论旗舰。</strong></p>',
    scene: 'crm', industry: null,
    contents: ['automation', 'report-gen', 'info-gather'], assetType: 'workflow',
    originalAuthor: '《金融从业者用 Claude Code 打造投资分析师的 60 天实践》(腾讯新闻)',
    sourceUrl: 'https://new.qq.com/',
  },
];

async function main() {
  console.log('📚 导入交付能力 Skill（6 篇横向通用能力）');
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
