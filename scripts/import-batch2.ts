/**
 * 第二批种子内容：社区扩充（群友需求精准命中 + 金融专业 + 效率工具）
 *
 * 来源：多个开源仓库（license 已用 GitHub API 核实）
 * 包装方式：按仓库形态选类型（工具→tool-stack，研究框架→workflow，MCP→tool-stack）
 * 都标注原作者 + 来源链接 + license
 *
 * 用法：npx tsx scripts/import-batch2.ts
 * 幂等：按 title 去重
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const LIBRARY_EMAIL = 'library@pevc.local';

const NOTICE = (license: string, repo: string, author: string) => `
<hr>
<p style="font-size:12px;color:#8b7355">
📦 <strong>来源</strong>：<a href="${repo}">${repo.replace('https://github.com/', '')}</a>（原作者：${author}）<br>
📜 <strong>许可</strong>：${license} · 允许分享与修改，需保留来源声明<br>
🔧 <strong>用法</strong>：见上方「怎么用」说明，或访问原仓库获取最新版本
</p>`;

type NewSkill = {
  title: string;
  body: string; // HTML 介绍
  tagScene: string;
  tagIndustry?: string | null;
  tagContent: string[];
  tagSkill: string; // assetType
  originalAuthor: string;
  sourceUrl: string;
  license: string;
  installHint?: string;
  usageNotes?: string;
};

const SKILLS: NewSkill[] = [
  // ===== 1. ENScan_GO 工商查询（群友需求：工商查询）=====
  {
    title: 'ENScan：一键采集企业工商信息、股权穿透、对外投资',
    body: `<p>做尽调时，摸清一家公司的<strong>工商信息、对外投资、控股关系、ICP 备案、APP、小程序、微信公众号</strong>是最基础但也最耗时间的一步。ENScan 把这些散落在爱企查、天眼查等平台的信息<strong>一键聚合导出</strong>。</p>
<h2>解决什么问题</h2>
<ul>
<li><strong>股权穿透</strong>：自动梳理目标公司的多层控股关系，省去手动逐层查</li>
<li><strong>资产清单</strong>：一键收集目标公司名下的 APP、小程序、公众号、ICP 备案——尽调资产清单直接成型</li>
<li><strong>批量查询</strong>：支持输入多个公司名批量采集，适合赛道扫描时快速摸一批公司</li>
</ul>
<h2>怎么用</h2>
<ol>
<li>从 GitHub Release 下载对应系统的可执行文件（Windows/Mac/Linux）</li>
<li>配置数据源（爱企查/天眼查 cookie 或 token）</li>
<li>命令行运行：<code>./ENScan_GO -n 公司名</code>，或用 MCP 模式接入 AI 工具</li>
</ol>
<blockquote>支持 MCP 协议接入 Claude Code / Cursor 等 AI 工具，让 AI 直接帮你查公司。适合做尽调、竞品分析、赛道扫描的投资人。</blockquote>`,
    tagScene: 'business-dd',
    tagContent: ['info-gather', 'company-profile'],
    tagSkill: 'tool-stack',
    originalAuthor: 'ENScan',
    sourceUrl: 'https://github.com/wgpsec/ENScan_GO',
    license: 'Apache-2.0',
    installHint: '从 GitHub Release 下载可执行文件，配置爱企查/天眼查 cookie 后即可使用。也支持 MCP 模式接入 AI 工具。',
    usageNotes: '适合尽调、竞品分析、赛道扫描。需要配置数据源 cookie（爱企查/天眼查等）。',
  },

  // ===== 2. gpt-researcher 行研深度研究（群友需求：行研补课）=====
  {
    title: 'GPT Researcher：开源深度研究框架，30 分钟出一份带引用的研究报告',
    body: `<p>碰到一个陌生赛道，从零开始研究要花好几天。GPT Researcher 是一个开源的深度研究 Agent，给它一个主题，它会<strong>自主检索多个信息源、综合分析、产出带引用的研究报告</strong>。</p>
<h2>解决什么问题</h2>
<ul>
<li><strong>行业速览</strong>：输入赛道名，自动搜集信息生成行业概览报告</li>
<li><strong>公司研究</strong>：输入公司名，产出公司画像 + 竞品对比 + 行业定位</li>
<li><strong>客观引用</strong>：每条结论都标注来源，不是凭空生成，可信度远高于直接问 AI</li>
</ul>
<h2>怎么用</h2>
<ol>
<li><code>pip install gpt-researcher</code> 安装</li>
<li>配置 LLM API key（支持 OpenAI / Anthropic / 本地模型）</li>
<li>Python 调用或用官方 Web UI：<code>gptr</code></li>
</ol>
<blockquote>27000+ star 的明星项目，支持自定义研究范围、报告格式、信息源。也有 MCP 版本可接入 Claude Code。适合需要快速补课一个新赛道的投资人。</blockquote>`,
    tagScene: 'industry-research',
    tagContent: ['info-gather', 'report-gen'],
    tagSkill: 'workflow',
    originalAuthor: 'GPT Researcher',
    sourceUrl: 'https://github.com/assafelovic/gpt-researcher',
    license: 'Apache-2.0',
    installHint: 'pip install gpt-researcher，配置 LLM API key 后即可使用。也有 Web UI 和 MCP 版本。',
    usageNotes: '适合行业速览、公司研究、竞品分析。支持自定义报告格式和信息源。',
  },

  // ===== 3. slide-doctor PPT 质检（群友需求：AI check PPT typo）=====
  {
    title: 'Slide Doctor：AI 自动检查 PPT 的拼写、大小写、格式错误',
    body: `<p>IC 材料、路演 PPT 发出去前最怕有低级拼写错误。Slide Doctor 用 AI 自动扫描你的 PowerPoint，找出<strong>拼写错误、大小写不一致、术语不统一、格式错位</strong>等问题。</p>
<h2>解决什么问题</h2>
<ul>
<li><strong>拼写检查</strong>：自动找出 PPT 里的错别字、拼写错误</li>
<li><strong>格式一致性</strong>：检查大小写、术语是否前后统一</li>
<li><strong>排版问题</strong>：识别对齐、间距等视觉问题</li>
</ul>
<h2>怎么用</h2>
<ol>
<li>安装 uv（Python 包管理器）和 LibreOffice</li>
<li>配置 Mistral API key</li>
<li>命令行运行：<code>uv run slide-doctor 你的PPT.pptx</code></li>
</ol>
<blockquote>基于 Mistral AI，在 Mistral AI London Hackathon 开发。适合 IC 材料定稿前、路演前最后一道质检。</blockquote>`,
    tagScene: 'ic',
    tagContent: ['doc-parse'],
    tagSkill: 'tool-stack',
    originalAuthor: 'Slide Doctor',
    sourceUrl: 'https://github.com/svilupp/slide-doctor',
    license: 'MIT',
    installHint: '需要安装 uv + LibreOffice + Mistral API key。命令行运行：uv run slide-doctor 文件.pptx',
    usageNotes: '适合 PPT 定稿前的质检环节。需要 Mistral API key（有免费额度）。',
  },

  // ===== 4. PaddleOCR 扫描版财报提取（群友需求：扫描版审计报表提取）=====
  {
    title: 'PaddleOCR：扫描版财报/审计报表的高精度 OCR 提取（百度开源）',
    body: `<p>很多老财报、审计报告只有扫描版 PDF，没法直接复制数据。PaddleOCR 是百度开源的 OCR 引擎，能把<strong>扫描版财务报表、图片、PDF</strong>高精度转成可编辑的结构化数据（表格、文本）。</p>
<h2>解决什么问题</h2>
<ul>
<li><strong>扫描版财报数字化</strong>：把扫描的资产负债表、利润表转成 Excel/结构化数据</li>
<li><strong>表格识别</strong>：PP-Structure 模块专门识别表格结构，输出 HTML/Excel</li>
<li><strong>中文 OCR</strong>：百度出品，中文识别准确率业界领先</li>
</ul>
<h2>怎么用</h2>
<ol>
<li><code>pip install paddlepaddle paddleocr</code></li>
<li>Python 调用：<code>PaddleOCR(use_angle_cls=True).ocr('财报.pdf')</code></li>
<li>表格识别用 PP-Structure：<code>PaddleOCRPPStructure()</code></li>
</ol>
<blockquote>70000+ star，Dify、RAGFlow 等知名项目的底层 OCR 引擎。新版本 PaddleOCR-VL 支持 Markdown/JSON 结构化输出，准确率 96%+。适合需要处理扫描版财报、合同、票据的财务和尽调团队。</blockquote>`,
    tagScene: 'financial',
    tagContent: ['doc-parse', 'data-clean'],
    tagSkill: 'tool-stack',
    originalAuthor: 'PaddlePaddle',
    sourceUrl: 'https://github.com/PaddlePaddle/PaddleOCR',
    license: 'Apache-2.0',
    installHint: 'pip install paddlepaddle paddleocr。表格识别用 PP-Structure 模块。也可封装成 MCP server。',
    usageNotes: '适合扫描版财报/合同/票据的数字化。Apache-2.0 许可，可商用。',
  },

  // ===== 5. FinanceMCP A股数据（金融数据）=====
  {
    title: 'FinanceMCP：A股板块/行情/财务数据 MCP（同花顺+东方财富双源）',
    body: `<p>做 A 股研究时，获取<strong>板块行情、成分股、概念指数</strong>数据要来回切同花顺、东方财富。FinanceMCP 把这些数据源封装成 MCP server，让 AI 直接帮你查。</p>
<h2>解决什么问题</h2>
<ul>
<li><strong>板块分析</strong>：查同花顺/东方财富的概念板块、行业板块指数和成分股</li>
<li><strong>行情数据</strong>：获取板块/个股的开盘、收盘、涨跌幅、成交量</li>
<li><strong>AI 直查</strong>：接入 Claude Code / Cursor，用自然语言查数据</li>
</ul>
<h2>怎么用</h2>
<ol>
<li><code>npx -y financemcp-dcths</code>（stdio 模式，本地用）</li>
<li>配置 Tushare token（积分制，免费档可用基础接口）</li>
<li>在 AI 工具的 MCP 配置里加上这个 server</li>
</ol>
<blockquote>集成同花顺 + 东方财富双数据源，支持 stdio 和 HTTP 两种部署模式。适合做 A 股赛道研究、板块分析的投资人。</blockquote>`,
    tagScene: 'industry-research',
    tagContent: ['data-clean', 'report-gen'],
    tagSkill: 'tool-stack',
    originalAuthor: 'FinanceMCP',
    sourceUrl: 'https://github.com/guangxiangdebizi/FinanceMCP-DCTHS',
    license: 'Apache-2.0',
    installHint: 'npx -y financemcp-dcths 启动，配置 Tushare token。在 AI 工具 MCP 配置里注册。',
    usageNotes: '适合 A 股板块研究、行情查询。需要 Tushare token（积分制）。',
  },

  // ===== 6. excel-mcp-server Excel 自动化（财务建模）=====
  {
    title: 'Excel MCP Server：让 AI 直接读写 Excel，不用装 Office（建模/估值神器）',
    body: `<p>财务模型、估值表、cap table 都在 Excel 里。这个 MCP server 让 AI 直接<strong>创建、读取、修改 Excel 文件</strong>——不用装 Office，AI 就能帮你建模型、填数据、画图表。</p>
<h2>解决什么问题</h2>
<ul>
<li><strong>自动建模</strong>：让 AI 按你的要求生成财务模型（DCF、可比公司、LBO）</li>
<li><strong>数据处理</strong>：批量读写、清洗、格式化 Excel 数据</li>
<li><strong>图表生成</strong>：自动创建折线图、柱状图、饼图、数据透视表</li>
</ul>
<h2>怎么用</h2>
<ol>
<li>安装：<code>uvx excel-mcp-server stdio</code></li>
<li>在 Claude Code / Cursor 的 MCP 配置里注册</li>
<li>对 AI 说："帮我建一个 DCF 估值模型" 或 "读取这个 Excel 的所有 sheet"</li>
</ol>
<blockquote>支持公式、格式、图表、数据透视表、数据验证。MIT 许可，可商用。适合做财务建模、估值分析、数据处理的投资人。</blockquote>`,
    tagScene: 'financial',
    tagContent: ['data-clean', 'automation'],
    tagSkill: 'tool-stack',
    originalAuthor: 'haris-musa',
    sourceUrl: 'https://github.com/haris-musa/excel-mcp-server',
    license: 'MIT',
    installHint: 'uvx excel-mcp-server stdio 启动。在 AI 工具 MCP 配置注册后，AI 即可操作 Excel。',
    usageNotes: '适合财务建模、估值分析、批量数据处理。无需安装 Microsoft Excel。',
  },
];

async function main() {
  const author = await prisma.user.findUnique({ where: { email: LIBRARY_EMAIL } });
  if (!author) {
    console.error('❌ 找不到 library 用户');
    process.exit(1);
  }

  let ok = 0;
  let skip = 0;
  for (const s of SKILLS) {
    // 幂等
    const dup = await prisma.post.findFirst({ where: { title: s.title } });
    if (dup) {
      console.log(`⏭️  已存在: ${s.title.slice(0, 30)}...`);
      skip++;
      continue;
    }

    const body = s.body + NOTICE(s.license, s.sourceUrl, s.originalAuthor);

    const post = await prisma.post.create({
      data: {
        userId: author.id,
        title: s.title,
        body,
        tagScene: s.tagScene,
        tagIndustry: s.tagIndustry ?? null,
        tagContent: JSON.stringify(s.tagContent),
        tagSkill: s.tagSkill,
        status: 'published',
        skillAsset: {
          create: {
            assetType: s.tagSkill,
            originalAuthor: s.originalAuthor,
            sourceUrl: s.sourceUrl,
            installHint: s.installHint || null,
            usageNotes: s.usageNotes || null,
          },
        },
      },
    });

    console.log(`✅ ${post.id} | ${s.title.slice(0, 40)}`);
    ok++;
  }

  console.log(`\n🎉 完成：导入 ${ok}，跳过 ${skip}`);
  const total = await prisma.post.count();
  console.log(`当前总帖数：${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
