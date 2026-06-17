/**
 * 导入开源 Claude Skills 作为种子内容。
 *
 * 来源：anthropics/financial-services (Apache-2.0)
 * 定位：把高质量、对 PE/VC 群友有用的官方 skill 搬进社区，
 *       中文标题+介绍，SKILL.md 原文作为附件保留（不破坏 skill）。
 *
 * 用法（在 repo 根目录）：
 *   1. git clone --depth 1 https://github.com/anthropics/financial-services.git /tmp/fs-skills
 *   2. npx tsx scripts/import-skills.ts
 *
 * 幂等：按 sourceRepo + skillName 去重，重复运行不会重复灌。
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { saveBuffer } from '../lib/storage';

const prisma = new PrismaClient();

/** 搬运者账号 —— 所有导入 skill 的作者 */
const LIBRARY_USER = {
  email: 'library@pevc.local',
  nickname: 'Skill 图书馆',
  role: 'VC',
  avatarUrl: null,
};

/** Apache-2.0 NOTICE，每个帖子的来源标注 */
const SOURCE_NOTICE = (skillName: string, plugin: string) => `
<hr>
<p style="font-size:12px;color:#8b7355">
📦 <strong>来源</strong>：Anthropic 官方 <code>financial-services</code> 仓库的
<code>${skillName}</code> skill（<code>/plugins/${plugin}/</code>）<br>
📜 <strong>许可</strong>：Apache License 2.0 · 允许分享与修改，需保留来源声明<br>
🔧 <strong>用法</strong>：SKILL.md 是给 Claude Code 读的结构化指令，下载后放进
<code>~/.claude/skills/</code> 即可调用。不会用？看上方「怎么用」说明。
</p>`;

type SkillMeta = {
  /** SKILL.md 在本地 clone 的相对路径 */
  mdPath: string;
  /** skill 的内部 name（来自 frontmatter，用于幂等去重） */
  skillName: string;
  /** 所属插件路径段（用于来源标注 NOTICE），如 vertical-plugins/private-equity */
  plugin: string;
  /** 中文标题 */
  title: string;
  /** 中文介绍正文（HTML） */
  intro: string;
  /** 映射到 SCENE_TAGS 的 value */
  scene: string;
  /** 映射到 INDUSTRY_TAGS，可选 */
  industry?: string;
  /** 映射到 CONTENT_TAGS，可选 */
  contents?: string[];
  /** assetType（这些全是 agent-skill / SKILL.md） */
  assetType: string;
};

const SKILLS: SkillMeta[] = [
  {
    mdPath: 'plugins/vertical-plugins/private-equity/skills/deal-sourcing/SKILL.md',
    skillName: 'deal-sourcing',
    plugin: 'vertical-plugins/private-equity',
    title: 'PE 项目寻找：发现目标公司 + 起草创始人开发信',
    intro: `<p>这是 Anthropic 官方的 PE <strong>项目 sourcing</strong> skill，覆盖从"找公司"到"发开发信"的完整三步流程：</p>
<ul>
<li><strong>第一步·发现公司</strong>：按行业、收入规模、地区、股权类型（创始人持有 / PE 背景 / 大公司剥离）筛选目标，输出带"为什么契合"的候选清单</li>
<li><strong>第二步·CRM 核查</strong>：发信前先查公司/创始人是否已在你的关系网里（邮件、Slack），标注"新接触 / 老关系 / 之前 pass 过"</li>
<li><strong>第三步·起草开发信</strong>：个性化、简短（4-6 句）、有具体钩子，绝不套模板</li>
</ul>
<blockquote>适合：每周要 sourcing 一批新公司的投资人。把这套流程交给 Claude，你只管 review 候选清单和信。</blockquote>`,
    scene: 'sourcing',
    contents: ['info-gather', 'automation'],
    assetType: 'agent-skill',
  },
  {
    mdPath: 'plugins/vertical-plugins/private-equity/skills/deal-screening/SKILL.md',
    skillName: 'deal-screening',
    plugin: 'vertical-plugins/private-equity',
    title: '项目初筛：用投资标准快速判断要不要深看',
    intro: `<p>这是 Anthropic 官方的 PE <strong>项目初筛</strong> skill。收到一份 CIM / teaser 后，用你基金的投资标准做快速 pass/fail：</p>
<ul>
<li>抽取交易关键指标（规模、行业、财务、股权结构）</li>
<li>对照基金投资标准跑一遍打分框架</li>
<li>输出一页纸的初筛 memo：推荐 / 不推荐 + 理由</li>
</ul>
<blockquote>适合：deal flow 太多看不过来的投资人。先用 Claude 过一遍，把时间留给真正值得深看的项目。</blockquote>`,
    scene: 'screening',
    contents: ['memo', 'risk-id'],
    assetType: 'agent-skill',
  },
  {
    mdPath: 'plugins/vertical-plugins/private-equity/skills/dd-checklist/SKILL.md',
    skillName: 'dd-checklist',
    plugin: 'vertical-plugins/private-equity',
    title: '尽调清单生成器：按行业和交易类型定制核查清单',
    intro: `<p>这是 Anthropic 官方的 PE <strong>尽调清单</strong> skill。开尽调时，按目标公司的行业、交易类型、复杂度，自动生成覆盖所有工作流的核查清单：</p>
<ul>
<li><strong>财务尽调</strong>：盈利质量、营运资金、债务类项目、资本开支、税务</li>
<li><strong>商业尽调</strong>：市场规模、竞争定位、客户集中度、定价权、销售管线</li>
<li><strong>法律尽调</strong>：公司架构、合同、IP、劳动法、监管</li>
<li>每项带请求清单 + 状态跟踪 + 红旗升级</li>
</ul>
<blockquote>适合：刚拿到一个项目要开尽调、或者组织 data room review 的团队。不再从零列清单。</blockquote>`,
    scene: 'business-dd',
    contents: ['checklist', 'doc-parse'],
    assetType: 'agent-skill',
  },
  {
    mdPath: 'plugins/vertical-plugins/private-equity/skills/unit-economics/SKILL.md',
    skillName: 'unit-economics',
    plugin: 'vertical-plugins/private-equity',
    title: '单位经济模型：ARR cohort / LTV-CAC / 净留存分析',
    intro: `<p>这是 Anthropic 官方的 PE <strong>单位经济模型</strong> skill，专门分析 SaaS / 订阅类公司的收入质量：</p>
<ul>
<li><strong>ARR cohort 分析</strong>：按获客批次看留存和扩张</li>
<li><strong>LTV / CAC</strong>：客户生命周期价值 vs 获客成本</li>
<li><strong>净收入留存（NRR）</strong>：扩张 - 流失 - 降级</li>
<li><strong>回收期 + 收入质量 + 毛利瀑布</strong></li>
</ul>
<blockquote>适合：看软件 / SaaS 项目的投资人。单位经济是这类公司的命门，这套 skill 帮你把它拆透。</blockquote>`,
    scene: 'financial',
    industry: 'ai-saas',
    contents: ['data-clean', 'report-gen'],
    assetType: 'agent-skill',
  },
  {
    mdPath: 'plugins/vertical-plugins/private-equity/skills/ic-memo/SKILL.md',
    skillName: 'ic-memo',
    plugin: 'vertical-plugins/private-equity',
    title: 'IC 投委会 memo：把尽调结论写成投资建议书',
    intro: `<p>这是 Anthropic 官方的 PE <strong>投委会 memo</strong> skill。把尽调发现、财务分析、交易条款综合成一份结构化的 IC 投资建议书：</p>
<ul>
<li>投资逻辑 / 商业模式 / 市场机会</li>
<li>财务亮点与风险</li>
<li>估值与交易结构</li>
<li>投资建议与条件</li>
</ul>
<blockquote>适合：要把一个项目推向 IC 决策的投资人。让 Claude 出 memo 初稿，你做判断和润色。</blockquote>`,
    scene: 'ic',
    contents: ['memo', 'report-gen'],
    assetType: 'agent-skill',
  },

  // ===== financial-analysis 插件（建模实操）=====
  {
    mdPath: 'plugins/agent-plugins/model-builder/skills/lbo-model/SKILL.md',
    skillName: 'lbo-model',
    plugin: 'agent-plugins/model-builder',
    title: 'LBO 杠杆收购模型：搭一套完整的收购估值',
    intro: `<p>这是 Anthropic 官方的 <strong>LBO 杠杆收购模型</strong> skill。搭一套完整的杠杆收购模型：</p>
<ul>
<li>交易结构：资金来源（股权 + 各层债务）、收购价格</li>
<li>三大报表联动 + 债务偿还计划（SFP）</li>
<li>退出假设 + IRR / MOIC 收益测算</li>
<li>敏感性分析：进出倍数、债务成本对回报的影响</li>
</ul>
<blockquote>适合：做 PE 收购估值、考 LBO 建模 case 的人。配合 Excel 一起用。</blockquote>`,
    scene: 'financial',
    contents: ['report-gen', 'data-clean'],
    assetType: 'agent-skill',
  },
  {
    mdPath: 'plugins/agent-plugins/model-builder/skills/3-statement-model/SKILL.md',
    skillName: '3-statement-model',
    plugin: 'agent-plugins/model-builder',
    title: '三表联动模型：利润表 / 资产负债表 / 现金流量表',
    intro: `<p>这是 Anthropic 官方的 <strong>三表联动模型</strong> skill。搭一套三大报表互相联动的财务模型：</p>
<ul>
<li>利润表 → 留存收益 → 资产负债表</li>
<li>资产负债表 → 现金流量表</li>
<li>循环引用处理、配平检查（资产 = 负债 + 权益）</li>
<li>预测假设驱动：收入增长、毛利率、营运资金天数</li>
</ul>
<blockquote>适合：做公司财务预测、估值建模打底的人。三表联动是所有模型的基础。</blockquote>`,
    scene: 'financial',
    contents: ['report-gen', 'data-clean'],
    assetType: 'agent-skill',
  },
  {
    mdPath: 'plugins/agent-plugins/market-researcher/skills/competitive-analysis/SKILL.md',
    skillName: 'competitive-analysis',
    plugin: 'agent-plugins/market-researcher',
    title: '竞品分析：画清竞争格局和市场定位',
    intro: `<p>这是 Anthropic 官方的 <strong>竞品分析</strong> skill。系统梳理一个赛道或公司的竞争格局：</p>
<ul>
<li>竞品清单：直接 / 间接 / 潜在竞争者</li>
<li>多维度对比：产品、定价、客户、融资、市场份额</li>
<li>定位图：把玩家映射到二维矩阵，看空白和拥挤区</li>
<li>壁垒与护城河分析</li>
</ul>
<blockquote>适合：研究新赛道、评估项目竞争位置的人。投前尽调和行业研究都用得上。</blockquote>`,
    scene: 'industry-research',
    contents: ['info-gather', 'report-gen'],
    assetType: 'agent-skill',
  },
  {
    mdPath: 'plugins/agent-plugins/earnings-reviewer/skills/audit-xls/SKILL.md',
    skillName: 'audit-xls',
    plugin: 'agent-plugins/earnings-reviewer',
    title: 'Excel 模型审计：查硬编码、断链、不平的公式',
    intro: `<p>这是 Anthropic 官方的 <strong>Excel 模型审计</strong> skill。拿到一份别人的模型，快速查出问题：</p>
<ul>
<li>硬编码检测：哪些数字是手敲的、没链接到假设</li>
<li>公式追踪：断链、循环引用、错误值（#REF / #DIV）</li>
<li>配平检查：三表是否真的平衡</li>
<li>一致性检查：同一指标在不同 sheet 用不同算法</li>
</ul>
<blockquote>适合：接手别人模型、或自己模型出 bug 找不到原因的人。尽调时核查管理层模型也用得上。</blockquote>`,
    scene: 'financial',
    contents: ['data-clean', 'risk-id'],
    assetType: 'agent-skill',
  },

  // ===== investment-banking 插件（交易执行，FA/IB 核心）=====
  {
    mdPath: 'plugins/vertical-plugins/investment-banking/skills/cim-builder/SKILL.md',
    skillName: 'cim-builder',
    plugin: 'vertical-plugins/investment-banking',
    title: 'CIM 招股书撰写：把项目卖点写成买家愿看的备忘录',
    intro: `<p>这是 Anthropic 官方的 <strong>CIM（Confidential Information Memorandum）</strong> skill。FA 卖项目时写的那本招股书：</p>
<ul>
<li>执行摘要 · 投资亮点 · 公司概况</li>
<li>行业机会 · 商业模式 · 财务摘要</li>
<li>增长策略 · 交易结构</li>
<li>根据买家类型（战略 / 财务）调整叙事重点</li>
</ul>
<blockquote>适合：做 FA 卖方、或融资方整理给投资人的材料。CIM 是交易执行的核心交付物。</blockquote>`,
    scene: 'fundraising',
    contents: ['report-gen', 'memo'],
    assetType: 'agent-skill',
  },
  {
    mdPath: 'plugins/vertical-plugins/investment-banking/skills/teaser/SKILL.md',
    skillName: 'teaser',
    plugin: 'vertical-plugins/investment-banking',
    title: 'Teaser 匿名推介：一页纸勾起买家兴趣（不泄公司名）',
    intro: `<p>这是 Anthropic 官方的 <strong>Teaser（匿名推介）</strong> skill。卖项目第一阶段发的那页不具名材料：</p>
<ul>
<li>匿名描述：行业、规模、增长、地理，但不露公司名</li>
<li>一页纸突出 3-5 个核心卖点</li>
<li>引导买家签 NDA 才给完整 CIM</li>
<li>语调克制专业，避免过度承诺</li>
</ul>
<blockquote>适合：FA 做项目早期触达买家。Teaser 决定能拉到多少买家签 NDA 进下一轮。</blockquote>`,
    scene: 'fundraising',
    contents: ['report-gen'],
    assetType: 'agent-skill',
  },
  {
    mdPath: 'plugins/vertical-plugins/investment-banking/skills/buyer-list/SKILL.md',
    skillName: 'buyer-list',
    plugin: 'vertical-plugins/investment-banking',
    title: '买家清单：给一个项目列出潜在战略 + 财务买家',
    intro: `<p>这是 Anthropic 官方的 <strong>买家清单（Buyer List）</strong> skill。卖项目前列出所有潜在买家：</p>
<ul>
<li>战略买家：同业 / 上下游 / 跨界，按协同效应排序</li>
<li>财务买家：PE 基金，按行业偏好和基金规模筛选</li>
<li>每个买家标注：历史交易、当前持仓、接触难度</li>
<li>优先级排序：先碰谁、后碰谁</li>
</ul>
<blockquote>适合：FA 做卖方流程的起点。买家清单的质量直接决定交易能不能成。</blockquote>`,
    scene: 'fundraising',
    contents: ['info-gather', 'report-gen'],
    assetType: 'agent-skill',
  },
  {
    mdPath: 'plugins/vertical-plugins/investment-banking/skills/merger-model/SKILL.md',
    skillName: 'merger-model',
    plugin: 'vertical-plugins/investment-banking',
    title: '并购模型：测算收购的增厚 / 稀释效应',
    intro: `<p>这是 Anthropic 官方的 <strong>并购（Merger）模型</strong> skill。测算一笔收购对买方 EPS 的影响：</p>
<ul>
<li>交易对价：现金 / 股票 / 混合，及对应的控制权</li>
<li>购买价格分摊（PPA）：商誉、无形资产识别</li>
<li>协同效应量化：收入协同 / 成本协同</li>
<li>增厚 / 稀释分析：未来几年 accretion / dilution</li>
</ul>
<blockquote>适合：做并购估值、评估一笔收购划不划算的人。上市公司并购的核心分析工具。</blockquote>`,
    scene: 'financial',
    contents: ['report-gen', 'data-clean'],
    assetType: 'agent-skill',
  },
  {
    mdPath: 'plugins/vertical-plugins/investment-banking/skills/process-letter/SKILL.md',
    skillName: 'process-letter',
    plugin: 'vertical-plugins/investment-banking',
    title: 'Process Letter 流程信：给买家的竞标规则说明',
    intro: `<p>这是 Anthropic 官方的 <strong>Process Letter（流程信）</strong> skill。卖方拍卖流程中发给买家的规则说明：</p>
<ul>
<li>时间表：各轮报价截止日、管理层会面安排</li>
<li>报价要求：估值方法、对价结构、条件</li>
<li>尽调安排：数据室访问、Q&A 流程</li>
<li>规则约束：保密、禁止挖人、交易保护条款</li>
</ul>
<blockquote>适合：FA 组织竞标拍卖流程。流程信是拍卖有序进行的关键文档。</blockquote>`,
    scene: 'fundraising',
    contents: ['report-gen'],
    assetType: 'agent-skill',
  },

  // ===== equity-research 插件（研究）=====
  {
    mdPath: 'plugins/agent-plugins/earnings-reviewer/skills/earnings-analysis/SKILL.md',
    skillName: 'earnings-analysis',
    plugin: 'agent-plugins/earnings-reviewer',
    title: '财报分析：从业绩会 + 财报快速出点评',
    intro: `<p>这是 Anthropic 官方的 <strong>财报分析</strong> skill。公司发财报后快速出一份点评：</p>
<ul>
<li>核心指标：收入 / 利润 / 指引，对比预期和去年同期</li>
<li>分业务拆解：各板块增速、毛利率变化</li>
<li>电话会要点：管理层表态、前瞻信号</li>
<li>模型更新 + 关键问题清单</li>
</ul>
<blockquote>适合：跟踪持仓或目标公司财报、写点评的人。二级市场研究员和一级市场投后都用得上。</blockquote>`,
    scene: 'post-investment',
    contents: ['doc-parse', 'report-gen'],
    assetType: 'agent-skill',
  },
  {
    mdPath: 'plugins/agent-plugins/market-researcher/skills/sector-overview/SKILL.md',
    skillName: 'sector-overview',
    plugin: 'agent-plugins/market-researcher',
    title: '行业概览：快速摸清一个赛道的全景',
    intro: `<p>这是 Anthropic 官方的 <strong>行业概览</strong> skill。快速产出一份赛道的全景研究：</p>
<ul>
<li>市场规模与增速（TAM / SAM）</li>
<li>价值链与产业链上下游</li>
<li>主要玩家与竞争格局</li>
<li>关键驱动因素与风险</li>
<li>投资机会与值得关注的方向</li>
</ul>
<blockquote>适合：刚接触一个新赛道、要做行业研究的人。投前研究、LP 汇报都用得上。</blockquote>`,
    scene: 'industry-research',
    contents: ['info-gather', 'report-gen'],
    assetType: 'agent-skill',
  },
];

async function ensureLibraryUser() {
  const existing = await prisma.user.findUnique({ where: { email: LIBRARY_USER.email } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      email: LIBRARY_USER.email,
      nickname: LIBRARY_USER.nickname,
      role: LIBRARY_USER.role,
      passwordHash: null, // 图书馆账号不可登录，只作为内容作者
    },
  });
}

async function importOne(meta: SkillMeta, userId: number, repoRoot: string) {
  const fullPath = path.join(repoRoot, meta.mdPath);

  // 幂等：按 sourceRepo + skillName 查是否已导入
  const slug = `anthropics-financial-services/${meta.skillName}`;
  const dup = await prisma.post.findFirst({
    where: { body: { contains: slug } },
  });
  if (dup) {
    console.log(`  ⏭️  ${meta.skillName} 已存在 (post #${dup.id})，跳过`);
    return;
  }

  // 读 SKILL.md
  const mdContent = await fs.readFile(fullPath, 'utf-8');

  // 上传为附件
  const buf = Buffer.from(mdContent, 'utf-8');
  const storageKey = await saveBuffer(buf, `${meta.skillName}.md`);
  const attachment = await prisma.attachment.create({
    data: {
      postId: null, // 先不绑，发帖后回填
      uploaderId: userId,
      fileName: `${meta.skillName}.md`,
      storageKey,
      fileSize: buf.length,
      mimeType: 'text/markdown',
    },
  });

  // 发帖：中文介绍 + 来源标注（含 slug 用于幂等）
  const body = meta.intro + SOURCE_NOTICE(meta.skillName, meta.plugin) + `\n<!-- slug:${slug} -->`;

  const post = await prisma.post.create({
    data: {
      userId,
      title: meta.title,
      body,
      tagScene: meta.scene,
      tagIndustry: meta.industry ?? null,
      tagContent: JSON.stringify(meta.contents ?? []),
      tagSkill: meta.assetType,
      status: 'published',
      skillAsset: {
        create: {
          assetType: meta.assetType,
          sourceUrl: `https://github.com/anthropics/financial-services/blob/main/${meta.mdPath}`,
          installHint:
            '下载 SKILL.md 后，在 Claude Code 里放到 ~/.claude/skills/ 目录即可。命令：/' +
            meta.skillName,
        },
      },
    },
  });

  // 回填附件的 postId
  await prisma.attachment.update({
    where: { id: attachment.id },
    data: { postId: post.id },
  });

  console.log(`  ✅ ${meta.skillName} → post #${post.id} （${meta.title}）`);
}

async function main() {
  const repoRoot = process.argv[2] || '/tmp/fs-skills';
  console.log(`📚 导入开源 skill，repo: ${repoRoot}`);

  // 校验 repo 存在
  try {
    await fs.access(path.join(repoRoot, 'plugins'));
  } catch {
    console.error(`❌ 找不到 repo，先 clone：git clone --depth 1 https://github.com/anthropics/financial-services.git ${repoRoot}`);
    process.exit(1);
  }

  const user = await ensureLibraryUser();
  console.log(`👤 作者账号：${user.nickname} (#${user.id})`);

  let ok = 0;
  let skip = 0;
  for (const meta of SKILLS) {
    try {
      await importOne(meta, user.id, repoRoot);
      ok++;
    } catch (e) {
      console.error(`  ❌ ${meta.skillName} 导入失败:`, (e as Error).message);
    }
  }

  console.log(`\n🎉 完成：导入 ${ok} 个，跳过 ${skip} 个`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
