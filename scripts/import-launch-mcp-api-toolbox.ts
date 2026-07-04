import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { removeKey, saveBuffer } from '../lib/storage';

const prisma = new PrismaClient();

const DIR = 'C:/Users/Lensn/WorkBuddy/2026-06-25-19-22-08/交付能力';
const LIBRARY_EMAIL = 'library@pevc.local';

type LaunchSkill = {
  file: string;
  slug: string;
  title: string;
  body: string;
  tagScene: string;
  tagIndustry: string | null;
  tagContent: string[];
  assetType: string;
  originalAuthor: string;
  sourceUrl: string;
  installHint: string;
  usageNotes: string;
};

const SKILLS: LaunchSkill[] = [
  {
    file: '10_访谈提纲生成器_客户专家供应商竞品.md',
    slug: 'nei-skill/interview-guide-generator',
    title: '访谈提纲生成器：客户、供应商、竞品、专家四类尽调问题库',
    tagScene: 'business-dd',
    tagIndustry: null,
    tagContent: ['expert-call', 'info-gather', 'risk-id'],
    assetType: 'prompt',
    originalAuthor: 'N.E.I. / WorkBuddy 交付能力整理',
    sourceUrl: 'https://nei-pevc.com',
    installHint: '网页可直接复制 Prompt；也可以收藏后通过 N.E.I. MCP 在 Agent 客户端里调用。',
    usageNotes: '适合商业尽调、专家访谈、客户访谈、供应商访谈和竞品访谈前准备。涉及竞品或在职员工时，应遵守合规边界，避免询问商业秘密。',
    body: `<p>PE/VC 尽调里，访谈质量经常决定项目判断质量。这份 Skill 把访谈对象拆成客户、供应商、竞品、专家四类，按“暖场与背景验证 → 核心验证 → 风险探针 → 量化打分 → 开放结尾”生成可直接拿去打电话的问题清单。</p>
<h2>解决什么问题</h2>
<ul>
  <li>问题太泛，只问出“还不错”“挺好的”这类低密度回答。</li>
  <li>只问公司安排的友好客户，遗漏流失客户、供应商、竞品和专家视角。</li>
  <li>访谈没有红旗探针，无法验证收入真实性、关联交易、供应链依赖和技术路线风险。</li>
</ul>
<h2>适合场景</h2>
<ul>
  <li>客户访谈：验证收入真实性、复购意愿、替代风险和定价权。</li>
  <li>供应商访谈：验证成本结构、账期、供应稳定性和现金流压力。</li>
  <li>竞品访谈：验证竞争格局、差异化真实性和行业公开秘密。</li>
  <li>专家访谈：验证行业阶段、技术趋势、政策走向和管理层评价。</li>
</ul>
<h2>输出</h2>
<p>输入访谈对象类型、标的公司、行业、核心产品和时间限制后，输出一份结构化访谈提纲，包含必问问题、可选问题、风险探针、量化打分和交叉验证点。</p>
<pre><code>访谈对象类型：客户 / 供应商 / 竞品 / 专家
标的公司：[公司名称]
行业：[行业]
核心产品：[产品/服务]
特殊关注点：[收入真实性 / 技术壁垒 / 管理层 / 供应链 / 竞争格局]
时间限制：[30 / 60 / 90 分钟]

请生成一份可直接执行的尽调访谈提纲：
1. 先列出本次访谈要验证的 3 个核心假设。
2. 按“暖场与背景验证 / 核心验证 / 风险探针 / 量化打分 / 开放结尾”组织问题。
3. 标记 ★ 必问、☆ 可选、⚠️ 风险探针。
4. 每个问题说明验证目的。
5. 最后列出访谈后需要交叉验证的数据点。</code></pre>
<!-- slug:nei-skill/interview-guide-generator -->`,
  },
  {
    file: '11_MCP与API工具箱_投研信息获取.md',
    slug: 'nei-skill/mcp-api-toolbox',
    title: 'PE/VC 投研 MCP & API 工具箱：政策、学术、工商、金融、工程计算与网页抓取信息源',
    tagScene: 'industry-research',
    tagIndustry: null,
    tagContent: ['info-gather', 'automation', 'report-gen'],
    assetType: 'tool-stack',
    originalAuthor: 'N.E.I. / WorkBuddy MCP 调研',
    sourceUrl: 'https://nei-pevc.com',
    installHint: '先按信息需求选择 MCP/API，再在 Claude Code、Codex、Workbuddy 或其它可信 Agent 客户端中配置。第三方 API Key 请只保存在本地环境变量或客户端安全配置里。',
    usageNotes: '这是外部信息源选型目录，不代表 N.E.I. 已托管或验证全部第三方 MCP。付费数据源、企业工商、金融终端、法律数据库需自行确认授权和合规边界。',
    body: `<p>这是一份按投研工作流组织的 MCP / API 目录。它不是技术百科，而是回答一个更实用的问题：当投资经理要查政策、论文、工商、临床、SEC、新闻、工程参数或网页资料时，应该优先接哪个外部信息源。</p>
<h2>为什么值得收藏</h2>
<ul>
  <li>把信息获取分成政策法规、学术前沿、企业工商、金融市场、新闻舆情、网页抓取、科技工程七类。</li>
  <li>区分免费开源、免费层、付费订阅和机构级数据源，方便按预算选型。</li>
  <li>把 BioMCP、ArXiv MCP、HuggingFace MCP、Microchip MCP、Wolfram Alpha MCP、SEC EDGAR、GitHub MCP、Firecrawl、Exa、Tavily、Brave Search 等工具放进投研场景。</li>
  <li>明确安全边界：外部 MCP 需要自行确认来源、权限、API Key 管理和数据使用合规。</li>
</ul>
<h2>推荐从这 7 类开始</h2>
<ul>
  <li><strong>生物医药 / CGT：</strong>BioMCP + ClinicalTrials.gov + PubMed / Europe PMC。</li>
  <li><strong>学术前沿：</strong>ArXiv MCP + Semantic Scholar + OpenAlex。</li>
  <li><strong>AI / ML 生态：</strong>HuggingFace MCP + GitHub MCP。</li>
  <li><strong>半导体 / 硬科技：</strong>Microchip MCP + Wolfram Alpha MCP。</li>
  <li><strong>海外上市公司：</strong>SEC EDGAR / EdgarTools。</li>
  <li><strong>技术尽调：</strong>GitHub MCP + 论文检索 + 招聘/官网抓取。</li>
  <li><strong>新闻和深度搜索：</strong>Exa、Tavily、Brave Search。</li>
  <li><strong>网页抓取：</strong>Firecrawl、Fetch、Playwright MCP。</li>
</ul>
<h2>科技投资为什么需要“验算器”</h2>
<p>生物医药投资可以用 BioMCP 做跨库检索；硬科技投资还需要验证“理论上能不能成立”。Wolfram Alpha MCP 适合验算 LCOE、Lawson 判据、退相干时间、材料性能极限、半导体物理边界等硬参数。它不替代专家判断，但能帮助投资经理把夸张技术叙事先过一遍数量级检查。</p>
<h2>目前仍有 3 个空白</h2>
<ul>
  <li><strong>专利 MCP：</strong>智慧芽、USPTO、EPO 等 API 有门槛，成熟 MCP 仍少。</li>
  <li><strong>标准 MCP：</strong>目前看到 IEEE 2030.5 这类垂直样例；JEDEC、3GPP、SAE 等仍待补。</li>
  <li><strong>供应链数据 MCP：</strong>芯片出货量、库存、价格等实时数据还缺稳定 MCP 封装。</li>
</ul>
<h2>使用原则</h2>
<ol>
  <li>先明确问题：查公司、查行业、查政策、查论文、查临床、查上市文件、查工程参数，不同问题对应不同源。</li>
  <li>优先使用官方 API 或维护良好的 MCP Server。</li>
  <li>关键结论至少交叉验证两个来源。</li>
  <li>API Key 不要写进公开仓库、截图、群聊或共享文档。</li>
  <li>涉及客户、竞品、临床、金融数据时，先确认授权和合规边界。</li>
</ol>
<pre><code>请根据我的投研信息需求，帮我选择合适的 MCP / API：

研究对象：[公司 / 行业 / 技术 / 政策 / 药物靶点 / 工程参数]
我要查的问题：[具体问题]
预算限制：[免费 / 可接受 API Key / 付费订阅]
数据地区：[中国 / 美国 / 全球]
输出形式：[资料清单 / 尽调问题 / 行研报告 / 风险清单]

请输出：
1. 首选 MCP/API；
2. 备选 MCP/API；
3. 为什么选它；
4. 配置前需要准备什么；
5. 需要注意的安全和合规边界；
6. 建议交叉验证的来源；
7. 如果是硬科技项目，请列出需要用 Wolfram Alpha / 标准 / Datasheet 做数量级验算的参数。</code></pre>
<!-- slug:nei-skill/mcp-api-toolbox -->`,
  },
];

async function main() {
  const user = await prisma.user.findUnique({ where: { email: LIBRARY_EMAIL } });
  if (!user) throw new Error(`library user not found: ${LIBRARY_EMAIL}`);

  await updateLegacyMcpCopy();

  let created = 0;
  let skipped = 0;

  for (const meta of SKILLS) {
    const existing = await prisma.post.findFirst({
      where: { body: { contains: `slug:${meta.slug}` } },
      select: { id: true, title: true },
    });

    if (existing) {
      await prisma.post.update({
        where: { id: existing.id },
        data: {
          title: meta.title,
          body: meta.body,
          tagScene: meta.tagScene,
          tagIndustry: meta.tagIndustry,
          tagContent: JSON.stringify(meta.tagContent),
          tagSkill: meta.assetType,
          status: 'published',
          mcpApproved: true,
          reviewFlag: null,
          skillAsset: {
            upsert: {
              create: {
                assetType: meta.assetType,
                originalAuthor: meta.originalAuthor,
                sourceUrl: meta.sourceUrl,
                installHint: meta.installHint,
                usageNotes: meta.usageNotes,
              },
              update: {
                assetType: meta.assetType,
                originalAuthor: meta.originalAuthor,
                sourceUrl: meta.sourceUrl,
                installHint: meta.installHint,
                usageNotes: meta.usageNotes,
              },
            },
          },
        },
      });
      await upsertMarkdownAttachment({
        postId: existing.id,
        uploaderId: user.id,
        slug: meta.slug,
        file: meta.file,
      });
      console.log(`⏭️  updated #${existing.id} ${meta.title}`);
      skipped++;
      continue;
    }

    const md = fs.readFileSync(path.join(DIR, meta.file), 'utf-8');
    const fileName = `${meta.slug.replace('/', '-')}.md`;
    const buf = Buffer.from(md, 'utf-8');
    const storageKey = await saveBuffer(buf, fileName);

    const attachment = await prisma.attachment.create({
      data: {
        postId: null,
        uploaderId: user.id,
        fileName,
        storageKey,
        fileSize: buf.length,
        mimeType: 'text/markdown',
      },
    });

    const post = await prisma.post.create({
      data: {
        userId: user.id,
        title: meta.title,
        body: meta.body,
        tagScene: meta.tagScene,
        tagIndustry: meta.tagIndustry,
        tagContent: JSON.stringify(meta.tagContent),
        tagSkill: meta.assetType,
        status: 'published',
        mcpApproved: true,
        reviewFlag: null,
        skillAsset: {
          create: {
            assetType: meta.assetType,
            originalAuthor: meta.originalAuthor,
            sourceUrl: meta.sourceUrl,
            installHint: meta.installHint,
            usageNotes: meta.usageNotes,
          },
        },
      },
    });

    await prisma.attachment.update({ where: { id: attachment.id }, data: { postId: post.id } });
    console.log(`✅ created #${post.id} ${meta.title}`);
    created++;
  }

  console.log(`done: created=${created}, updated=${skipped}`);
}

async function upsertMarkdownAttachment({
  postId,
  uploaderId,
  slug,
  file,
}: {
  postId: number;
  uploaderId: number;
  slug: string;
  file: string;
}) {
  const md = fs.readFileSync(path.join(DIR, file), 'utf-8');
  const fileName = `${slug.replace('/', '-')}.md`;
  const buf = Buffer.from(md, 'utf-8');
  const storageKey = await saveBuffer(buf, fileName);
  const existingAttachment = await prisma.attachment.findFirst({
    where: { postId, fileName },
    select: { id: true, storageKey: true },
    orderBy: { id: 'asc' },
  });

  if (existingAttachment) {
    await prisma.attachment.update({
      where: { id: existingAttachment.id },
      data: {
        storageKey,
        fileSize: buf.length,
        mimeType: 'text/markdown',
      },
    });
    await removeKey(existingAttachment.storageKey);
    return;
  }

  await prisma.attachment.create({
    data: {
      postId,
      uploaderId,
      fileName,
      storageKey,
      fileSize: buf.length,
      mimeType: 'text/markdown',
    },
  });
}

async function updateLegacyMcpCopy() {
  const replacements: Array<[string, string]> = [
    ['Claude Code / Cursor 等', 'Claude Code / Codex / Workbuddy 等'],
    ['Claude Code / Cursor / Windsurf', 'Claude Code / Codex / Workbuddy'],
    ['Claude、Cursor、Windsurf', 'Claude Code、Codex、Workbuddy'],
    ['Claude / Cursor / Windsurf', 'Claude Code / Codex / Workbuddy'],
    ['Claude Code / Cursor', 'Claude Code / Codex / Workbuddy'],
    ['Claude Code、Cursor', 'Claude Code、Codex、Workbuddy'],
    ['Claude、Cursor', 'Claude Code、Codex、Workbuddy'],
  ];

  const posts = await prisma.post.findMany({
    where: {
      OR: replacements.flatMap(([from]) => [
        { title: { contains: from } },
        { body: { contains: from } },
      ]),
    },
    select: { id: true, title: true, body: true },
  });

  for (const post of posts) {
    let title = post.title;
    let body = post.body;
    for (const [from, to] of replacements) {
      title = title.split(from).join(to);
      body = body.split(from).join(to);
    }
    if (title !== post.title || body !== post.body) {
      await prisma.post.update({
        where: { id: post.id },
        data: { title, body },
      });
      console.log(`🧹 updated legacy MCP copy #${post.id}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
