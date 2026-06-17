/**
 * 第三批种子内容：文档办公效率 + 协作工具 + Prompt 库拆分
 *
 * 用法：npx tsx scripts/import-batch3.ts
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
  body: string;
  tagScene: string;
  tagIndustry?: string | null;
  tagContent: string[];
  tagSkill: string;
  originalAuthor: string;
  sourceUrl: string;
  license: string;
  installHint?: string;
  usageNotes?: string;
};

const SKILLS: NewSkill[] = [
  // ===== 7. jztan/pdf-mcp PDF 智能提取 =====
  {
    title: 'PDF MCP：给 AI 分块读大 PDF，招股书/尽调材料/财报智能提取',
    body: `<p>招股书、尽调材料、年报动辄几百页，直接喂给 AI 会超上下文限制。这个 MCP server 让 AI <strong>分块、增量地阅读大 PDF</strong>，支持全文搜索、表格提取、图片 OCR。</p>
<h2>解决什么问题</h2>
<ul>
<li><strong>大 PDF 处理</strong>：分块读取，突破 AI 上下文限制</li>
<li><strong>智能检索</strong>：对 PDF 内容做混合搜索，快速定位关键信息</li>
<li><strong>表格/图片提取</strong>：把财报里的表格和图表提取出来</li>
</ul>
<h2>怎么用</h2>
<ol>
<li><code>pip install pdf-mcp</code> 或 clone 仓库</li>
<li>在 AI 工具的 MCP 配置里注册</li>
<li>对 AI 说："读取这个招股书的第三章，提取所有财务数据"</li>
</ol>
<blockquote>基于 PyMuPDF，专为突破 Claude/ChatGPT 的上下文限制设计。适合处理招股书、尽调材料、年报等大文档的分析师。</blockquote>`,
    tagScene: 'business-dd',
    tagContent: ['doc-parse', 'data-clean'],
    tagSkill: 'tool-stack',
    originalAuthor: 'jztan',
    sourceUrl: 'https://github.com/jztan/pdf-mcp',
    license: 'MIT',
    installHint: 'pip install 后在 AI 工具 MCP 配置注册。基于 PyMuPDF。',
    usageNotes: '适合处理大 PDF（招股书/年报/尽调材料）。分块读取突破上下文限制。',
  },

  // ===== 8. lark-openapi-mcp 飞书协作 =====
  {
    title: '飞书 MCP（官方）：让 AI 读写飞书文档/多维表格/消息',
    body: `<p>国内投研团队大多用飞书。这是飞书官方开源的 MCP server，让 AI 直接<strong>读写飞书文档、多维表格、消息、审批</strong>——投研知识库的自动化整理不再是梦。</p>
<h2>解决什么问题</h2>
<ul>
<li><strong>知识库整理</strong>：让 AI 自动把会议纪要、研报、尽调笔记归档到飞书文档</li>
<li><strong>多维表格自动化</strong>：AI 直接读写项目追踪表、Deal Pipeline</li>
<li><strong>消息通知</strong>：项目状态变化自动发飞书消息通知团队</li>
</ul>
<h2>怎么用</h2>
<ol>
<li>在飞书开放平台创建一个 App，获取 app_id/app_secret</li>
<li>配置 MCP server（飞书官方文档有详细步骤）</li>
<li>在 Claude Code / Cursor 里注册后，AI 就能操作飞书</li>
</ol>
<blockquote>飞书官方维护，MIT 许可，免费档 App 即可用。适合用飞书做投研协作的团队。</blockquote>`,
    tagScene: 'crm',
    tagContent: ['automation', 'report-gen'],
    tagSkill: 'tool-stack',
    originalAuthor: 'Lark/飞书',
    sourceUrl: 'https://github.com/larksuite/lark-openapi-mcp',
    license: 'MIT',
    installHint: '在飞书开放平台创建 App，配置 MCP server 后注册到 AI 工具。官方文档有详细步骤。',
    usageNotes: '适合用飞书做投研协作的团队。免费档 App 即可用。',
  },

  // ===== 9. OfficeCLI Office 自动化 =====
  {
    title: 'OfficeCLI：AI 原生的 Office 自动化（Word/Excel/PPT 一站式）',
    body: `<p>需要批量生成 Word 报告、Excel 表格、PPT 演示文稿？OfficeCLI 是一个 AI Agent 用的 Office 命令行工具，<strong>无需安装 Office</strong>，单文件即可创建/读取/编辑所有 Office 格式。</p>
<h2>解决什么问题</h2>
<ul>
<li><strong>批量生成</strong>：从模板批量生成 IC 材料、尽调报告、周报</li>
<li><strong>格式转换</strong>：在 Word/Excel/PPT 之间转换</li>
<li><strong>AI 驱动</strong>：对 AI 说"帮我生成一份一页纸投资摘要"，直接出 Word</li>
</ul>
<h2>怎么用</h2>
<ol>
<li>下载单文件可执行程序（无需装 Office）</li>
<li>自带 SKILL.md，AI Agent 自动识别调用</li>
<li>或命令行直接操作：<code>officecli create docx --template IC模板.docx</code></li>
</ol>
<blockquote>Apache-2.0 许可，7100+ star。自带 SKILL.md，Claude Code / Cursor 能自动识别。适合需要批量处理 Office 文件的投研团队。</blockquote>`,
    tagScene: 'ic',
    tagContent: ['automation', 'report-gen'],
    tagSkill: 'tool-stack',
    originalAuthor: 'iOfficeAI',
    sourceUrl: 'https://github.com/iOfficeAI/OfficeCLI',
    license: 'Apache-2.0',
    installHint: '下载单文件可执行程序即可，无需安装 Office。自带 SKILL.md，AI Agent 自动调用。',
    usageNotes: '适合批量生成/处理 Office 文件。自带 SKILL.md 兼容 Claude Code。',
  },

  // ===== 10. UZI-Skill 股票深度分析 =====
  {
    title: 'UZI Skill：22 维度股票深度分析（含 17 种华尔街模型 + 180 条量化规则）',
    body: `<p>这是一个给 Claude Code 用的深度股票分析 Skill。输入一个股票代码，它会从<strong>22 个维度</strong>分析，内置 17 种华尔街分析模型、51 位投资风格评委、180 条量化规则，输出一份完整的深度分析报告。</p>
<h2>解决什么问题</h2>
<ul>
<li><strong>一键深度分析</strong>：输入股票代码，自动产出多维度分析</li>
<li><strong>多模型交叉</strong>：17 种估值/分析模型交叉验证</li>
<li><strong>投资风格匹配</strong>：51 位虚拟"评委"从不同投资风格角度评价</li>
</ul>
<h2>怎么用</h2>
<ol>
<li>把 SKILL.md 放到 <code>~/.claude/skills/</code> 目录</li>
<li>在 Claude Code 里说："分析一下 [股票代码]"</li>
<li>自动触发 UZI Skill 生成完整分析报告</li>
</ol>
<blockquote>MIT 许可，2000+ star。适合做个股深度研究的投资人。注意：分析仅供参考，不构成投资建议。</blockquote>`,
    tagScene: 'financial',
    tagContent: ['report-gen', 'risk-id'],
    tagSkill: 'agent-skill',
    originalAuthor: 'wbh604',
    sourceUrl: 'https://github.com/wbh604/UZI-Skill',
    license: 'MIT',
    installHint: '把 SKILL.md 放到 ~/.claude/skills/ 目录。在 Claude Code 里说"分析 [股票]"自动触发。',
    usageNotes: '适合个股深度研究。22 维度 + 17 种模型 + 180 条规则。分析仅供参考。',
  },

  // ===== 11. wonderful-prompts 行研/写作 prompt（从库中精选一个）=====
  {
    title: '行研速成 Prompt：让 AI 帮你 30 分钟补课一个陌生赛道',
    body: `<p>碰到一个完全不熟悉的赛道，怎么快速建立认知框架？这个 Prompt 让 AI 按投资人的思维框架，<strong>系统性地帮你拆解一个赛道</strong>——市场规模、竞争格局、关键玩家、投资逻辑，30 分钟出一份框架性认知。</p>
<h2>Prompt 全文</h2>
<pre>你是一位资深的一级市场投资人，专注早期投资。我需要快速了解「[填入赛道名]」这个赛道。

请按以下框架帮我做一份赛道速览：

## 1. 一句话定义
这个赛道到底在解决什么问题、用什么方式解决。

## 2. 市场规模与驱动力
- 当前市场规模（TAM/SAM），数据要标注来源或注明估算
- 核心驱动力：政策、技术、需求侧变化
- 增长预期：未来 3-5 年的增速判断

## 3. 竞争格局
- 列出 5-8 个关键玩家，标注融资轮次和估值（如能查到）
- 分为：头部 / 挑战者 / 新入者
- 各家的差异化和护城河

## 4. 商业模式拆解
- 主流的商业模式有哪几种
- 单位经济模型（LTV/CAC/毛利率）的行业基准

## 5. 投资逻辑
- 这个赛道现在投什么类型的公司最有机会
- 主要风险和红旗信号
- 退出路径（IPO/并购的现实性）

## 6. 值得深挖的 3 个问题
列出 3 个你觉得最值得进一步研究的问题。

要求：
- 用中文，语气像一个资深合伙人在给新人做 briefing
- 数据查不到就说"未查到，建议核实"，不要编
- 总字数控制在 3000-5000 字</pre>
<h2>怎么用</h2>
<ol>
<li>复制上面的 Prompt</li>
<li>粘贴到 ChatGPT / Claude / Kimi 等任意 AI 对话框</li>
<li>把「[填入赛道名]」换成你要研究的赛道（如"具身智能机器人""合成生物学"）</li>
</ol>
<blockquote>脱胎于横纵分析法思路，针对"快速补课"场景精简。适合刚接触新赛道、需要在短时间建立认知框架的投资人。</blockquote>`,
    tagScene: 'industry-research',
    tagContent: ['info-gather', 'report-gen'],
    tagSkill: 'prompt',
    originalAuthor: 'PEVC 社区',
    sourceUrl: 'https://github.com/langgptai/wonderful-prompts',
    license: 'MIT',
    installHint: '复制 Prompt → 粘贴到 AI 对话框 → 把 [填入赛道名] 换成你的目标赛道。',
    usageNotes: '适合快速补课陌生赛道。结合 GPT Researcher 使用效果更好（一个出框架，一个补数据）。',
  },

  // ===== 12. 公文写作 Prompt（从 Awesome-AI-GPTs 精选）=====
  {
    title: '公文写作 Prompt：AI 帮你写通知/请示/报告/函（体制内 & 国企友好）',
    body: `<p>在政府机关、事业单位、国企体系里，公文写作有严格的格式和语态要求。这个 Prompt 让 AI 按<strong>标准公文格式</strong>帮你起草通知、请示、报告、函等常用公文。</p>
<h2>Prompt 全文</h2>
<pre>你是一位资深的机关公文写作专家，精通党政机关公文处理工作条例和各类公文规范。

我需要你帮我起草一份「[填入公文类型：通知/请示/报告/函]」。

主题：[填入主题]
背景：[填入背景信息]
接收方：[填入接收方，如"各部门""上级领导"」

要求：
1. 严格遵循《党政机关公文处理工作条例》的格式规范
2. 语言正式、简洁、有力，符合公文语态
3. 结构完整：标题 → 主送机关 → 正文 → 落款 → 日期
4. 正文逻辑：先说背景/依据，再说措施/要求，最后提希望/要求
5. 如有政策依据，引用具体文件名和文号
6. 篇幅控制在 800-1500 字</pre>
<h2>怎么用</h2>
<ol>
<li>复制上面的 Prompt</li>
<li>粘贴到 AI 对话框</li>
<li>填入公文类型、主题、背景、接收方</li>
</ol>
<blockquote>来自 Awesome-AI-GPTs 公文写作合集（CC0 公共领域）。适合政府机关、国企、事业单位的工作人员。LP 沟通、政府事务相关场景也适用。</blockquote>`,
    tagScene: 'fundraising',
    tagContent: ['report-gen'],
    tagSkill: 'prompt',
    originalAuthor: 'EmbraceAGI',
    sourceUrl: 'https://github.com/EmbraceAGI/Awesome-AI-GPTs',
    license: 'CC0-1.0',
    installHint: '复制 Prompt → 粘贴到 AI 对话框 → 填入公文类型/主题/背景/接收方。',
    usageNotes: '适合政府机关/国企/事业单位的公文写作。LP 沟通、政府事务场景也适用。',
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
