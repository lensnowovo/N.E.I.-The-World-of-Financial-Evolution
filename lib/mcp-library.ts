export type McpLibraryCategoryKey =
  | 'search'
  | 'research'
  | 'biomed'
  | 'ai'
  | 'hard-tech'
  | 'company'
  | 'market';

export type McpLibraryItem = {
  id: string;
  name: string;
  kind: 'MCP' | 'API' | 'MCP / API';
  category: McpLibraryCategoryKey;
  status: '推荐试用' | '适合自建' | '需订阅验证' | '观察';
  maturity: '官方' | '开源社区' | '社区实现' | '商业服务' | 'API 原生';
  pricing: '免费' | '免费层 + 付费' | '需订阅' | '按量计费' | '待确认';
  auth: '无需密钥' | 'API Key' | 'OAuth' | '平台账号' | '订阅账号' | '待确认';
  highlight: string;
  coverage: string;
  bestFor: string[];
  pevcUseCases: string[];
  safetyNote: string;
  url?: string;
  sourcePostId?: number;
  featured?: boolean;
  /**
   * 标记是 N.E.I. 自家 MCP。ConnectorActions 会把按钮改成跳 /connect
   * （自家 MCP 的 Token 只能在登录后从 /connect 生成，且只显示一次，
   * 所以不在 MCP 库页里直接复制 Prompt，而是引导用户去 /connect）。
   */
  internal?: boolean;
};

/**
 * 为某个 MCP / API 连接器生成一段写给 AI 客户端的接入 Prompt。
 * 根据 kind / auth / status 动态拼接，无需手写每条。
 *
 * 用于 MCP 库页的「复制接入 Prompt」按钮。
 */
export function buildConnectorSetupPrompt(item: McpLibraryItem): string {
  // 内部 MCP（nei-pevc）走另一条路：引导去 /connect，不在这里复制
  if (item.internal) {
    return `请帮我在当前受信任的 AI 客户端中接入 N.E.I. PEVC Skill Hub 的 MCP Server。

名称：${item.name}
类型：${item.kind}
项目地址：${item.url ?? '/connect'}
鉴权：${item.auth}（需先登录 N.E.I. 并在 /connect 生成 MCP Token）
PEVC 用途：${item.pevcUseCases.join(' / ')}

接入步骤：
1. 前往 ${item.url ?? '/connect'} 登录并生成 MCP Token（只显示一次，请只保存在我信任的本地客户端）
2. 复制 /connect 页提供的「一键配置 Prompt」或「MCP JSON 配置」
3. 粘贴回当前客户端，先调用 search_skills 搜索公开 Skill 全库；有收藏时再调用 list_my_skills

安全前提：
- N.E.I. MCP 只分发 Skill / Workflow，不读取本地文件，不上传项目材料
- Token 只保存在我信任的本地或已登录客户端，不要发到陌生网页、群聊、截图、共享文档
- 若 Token 泄露，请提醒我立即在 /connect 重置

配好后请告诉我可用工具列表，并先用 search_skills 搜索“BP 初筛”验证全库搜索。`;
  }

  // 观察中 / 鉴权未确认 的条目：先调研再装
  const isRecon = item.status === '观察' || item.auth === '待确认' || item.pricing === '待确认';
  const isApiOnly = item.kind === 'API';

  const steps: string[] = [];
  if (isRecon) {
    steps.push(`1. 先去项目地址 ${item.url ?? ''} 确认安装方式、鉴权要求与最新可用工具`);
    steps.push('2. 评估是否适合接入当前工作环境（注意条款、延迟和频率限制）');
    steps.push('3. 确认无误后再按官方文档安装并配置');
  } else if (isApiOnly) {
    steps.push(`1. 这是一个 HTTP API（${item.url ?? ''}），不是开箱即用的 MCP Server`);
    steps.push('2. 建议先用它包一层本地 MCP（例如 modelcontextprotocol/typescript-sdk 的 wrap 模式），再接入客户端');
    steps.push('3. 调用其 list_tools / 接口验证连通');
  } else {
    steps.push(`1. 按项目地址 ${item.url ?? ''} 的 README 安装该 MCP Server（一般是 npx / uvx / pipx 一行命令）`);
    steps.push('2. 在客户端 MCP 配置里加入该 Server');
    steps.push('3. 调用其 list_tools 验证连通');
  }

  const authLine = item.auth === '无需密钥'
    ? '无需密钥'
    : `${item.auth}（请只在我信任的本地客户端保存，不要发到陌生网页或群聊）`;

  return `请帮我在当前受信任的 AI 客户端中接入以下 MCP / API 连接器。

名称：${item.name}
类型：${item.kind}（${item.maturity}）
项目地址：${item.url ?? '未提供'}
鉴权：${authLine}
费用：${item.pricing}
覆盖信息：${item.coverage}
PEVC 用途：${item.pevcUseCases.join(' / ')}

接入步骤：
${steps.join('\n')}

安全前提：
- 不要把客户私有 BP / LP 名单 / 未公开管线 / 财务模型输入该连接器
- 若该连接器需要任何 Token / API Key，请只在我信任的本地客户端保存，不要发到陌生网页、群聊、截图或共享文档
- 联网搜索 / 抓取 / 浏览器自动化类连接器会访问外部服务，执行有副作用的操作前请先向我确认

配好后请告诉我可用工具列表，并简述每个工具适合的 PEVC 场景。`;
}

export const mcpLibraryCategories: Array<{
  key: McpLibraryCategoryKey;
  label: string;
  short: string;
  description: string;
  tone: string;
}> = [
  {
    key: 'search',
    label: '搜索 / 抓取',
    short: 'Search',
    description: '把外部网页、新闻、PDF 和网页结构化内容接进 Agent。',
    tone: 'border-sky-300/35 bg-sky-300/10 text-sky-100',
  },
  {
    key: 'research',
    label: '论文 / 学术',
    short: 'Papers',
    description: '面向论文检索、引用链、主题监控和前沿技术跟踪。',
    tone: 'border-violet-300/35 bg-violet-300/10 text-violet-100',
  },
  {
    key: 'biomed',
    label: '生物医药',
    short: 'BioMed',
    description: '覆盖文献、临床试验、基因变异、药品安全等生命科学数据。',
    tone: 'border-emerald-300/35 bg-emerald-300/10 text-emerald-100',
  },
  {
    key: 'ai',
    label: 'AI / 开源生态',
    short: 'AI',
    description: '评估模型、数据集、开源项目活跃度和开发者生态。',
    tone: 'border-fuchsia-300/35 bg-fuchsia-300/10 text-fuchsia-100',
  },
  {
    key: 'hard-tech',
    label: '硬科技 / 工程',
    short: 'HardTech',
    description: '半导体、能源、标准、工程计算和技术可行性验算。',
    tone: 'border-amber-300/40 bg-amber-300/10 text-amber-100',
  },
  {
    key: 'company',
    label: '公司 / 尽调',
    short: 'Company',
    description: '工商、公告、融资、SEC 文件和公司事实核验。',
    tone: 'border-stone-200/35 bg-stone-200/10 text-stone-100',
  },
  {
    key: 'market',
    label: '市场 / 金融',
    short: 'Market',
    description: '价格、成交、宏观、行业指标和二级市场辅助数据。',
    tone: 'border-lime-300/35 bg-lime-300/10 text-lime-100',
  },
];

export const mcpLibraryItems: McpLibraryItem[] = [
  {
    id: 'nei-pevc',
    name: 'N.E.I. PEVC Skill Hub',
    kind: 'MCP',
    category: 'search',
    status: '推荐试用',
    maturity: '官方',
    pricing: '免费',
    auth: '平台账号',
    highlight: '本站自建 MCP，分发 PEVC 投研 / 尽调 / IC Memo / LP 汇报 Skill 与工作纪律。',
    coverage:
      'N.E.I. 上所有已审核的 PEVC Skill / Workflow，含 search_skills、recommend_skills_for_task、get_skill、apply_skill、list_my_skills、favorite_skill、list_disciplines、get_default_discipline 等工具。',
    bestFor: ['BP 初筛', '行研', 'IC Memo', 'LP 汇报', '投后月报'],
    pevcUseCases: [
      '按任务推荐 Skill 组合',
      '在客户端加载 Agent 工作纪律',
      '把 Skill 模板填上下文生成可执行 Prompt',
    ],
    safetyNote:
      'N.E.I. 只分发 Skill 文本，不读取本地文件，不上传项目材料；Token 可随时在 /connect 重置。',
    url: '/connect',
    sourcePostId: 145,
    featured: true,
    internal: true,
  },
  {
    id: 'biomcp',
    name: 'BioMCP',
    kind: 'MCP',
    category: 'biomed',
    status: '推荐试用',
    maturity: '开源社区',
    pricing: '免费',
    auth: '无需密钥',
    highlight: '生物医药投研最值得先试的 MCP。',
    coverage: 'PubMed、ClinicalTrials.gov、Europe PMC、ClinVar、OpenFDA 等公开生命科学数据源。',
    bestFor: ['创新药', 'IVD', '基因检测', '临床阶段判断'],
    pevcUseCases: ['梳理靶点与适应症文献', '查询临床试验进展', '核对药物安全与监管公开信息'],
    safetyNote: '适合查公开数据库；企业未公开管线、访谈纪要和患者数据不要直接输入。',
    url: 'https://github.com/genomoncology/biomcp',
    sourcePostId: 145,
    featured: true,
  },
  {
    id: 'arxiv-mcp',
    name: 'ArXiv MCP Server',
    kind: 'MCP',
    category: 'research',
    status: '推荐试用',
    maturity: '社区实现',
    pricing: '免费',
    auth: '无需密钥',
    highlight: '适合做前沿技术主题追踪。',
    coverage: 'arXiv 论文搜索、下载、摘要阅读、主题订阅与引用线索整理。',
    bestFor: ['AI', '机器人', '量子', '材料', '硬科技'],
    pevcUseCases: ['追踪赛道论文密度', '寻找核心研究团队', '形成技术路线时间线'],
    safetyNote: '论文结论需要二次核验，不要把模型摘要当成专家结论。',
    url: 'https://github.com/blazickjp/arxiv-mcp-server',
    sourcePostId: 145,
    featured: true,
  },
  {
    id: 'huggingface-mcp',
    name: 'Hugging Face MCP',
    kind: 'MCP',
    category: 'ai',
    status: '推荐试用',
    maturity: '官方',
    pricing: '免费层 + 付费',
    auth: '平台账号',
    highlight: 'AI/ML 投资看模型生态的高价值连接器。',
    coverage: '模型、数据集、Spaces、论文、下载量、社区讨论与文档。',
    bestFor: ['AI 应用', '基础模型', '开源生态', '数据集评估'],
    pevcUseCases: ['判断模型热度与活跃度', '核验 Demo 与 Space', '跟踪竞品模型路线'],
    safetyNote: '公开模型生态适合横向比较；不要上传客户私有数据集做测试。',
    url: 'https://huggingface.co/docs/hub/mcp-server',
    sourcePostId: 145,
    featured: true,
  },
  {
    id: 'github-mcp',
    name: 'GitHub MCP Server',
    kind: 'MCP',
    category: 'ai',
    status: '推荐试用',
    maturity: '官方',
    pricing: '免费层 + 付费',
    auth: 'OAuth',
    highlight: '开源项目活跃度和技术团队执行力的基础设施。',
    coverage: '代码搜索、Issue、PR、Release、贡献者、项目管理和仓库元数据。',
    bestFor: ['开源软件', 'Developer Tool', 'AI Infra', '安全工具'],
    pevcUseCases: ['检查项目活跃度', '识别真实贡献者', '分析 Issue 响应和版本节奏'],
    safetyNote: '授权范围要最小化；尽量只读公开仓库，谨慎连接私有代码库。',
    url: 'https://github.com/github/github-mcp-server',
    sourcePostId: 145,
    featured: true,
  },
  {
    id: 'wolfram-alpha',
    name: 'Wolfram Alpha MCP',
    kind: 'MCP / API',
    category: 'hard-tech',
    status: '推荐试用',
    maturity: '社区实现',
    pricing: '免费层 + 付费',
    auth: 'API Key',
    highlight: '硬科技投资里的“技术可行性验算器”。',
    coverage: '数学、物理、化学、工程计算、单位换算和公式推导。',
    bestFor: ['新能源', '核聚变', '量子计算', '新材料', '半导体'],
    pevcUseCases: ['验算 LCOE', '核对 Lawson 判据', '估算退相干时间与门操作时间', '验证材料性能上限'],
    safetyNote: '适合做 sanity check；关键投资判断仍需专家复核和原始模型验证。',
    url: 'https://products.wolframalpha.com/api',
    sourcePostId: 145,
    featured: true,
  },
  {
    id: 'microchip-mcp',
    name: 'Microchip MCP',
    kind: 'MCP',
    category: 'hard-tech',
    status: '观察',
    maturity: '社区实现',
    pricing: '待确认',
    auth: '待确认',
    highlight: '半导体产品、Datasheet 和参考设计检索入口。',
    coverage: 'Microchip 芯片产品、规格、Errata、参考设计和应用文档。',
    bestFor: ['半导体', 'IoT 硬件', '汽车电子', '工业控制'],
    pevcUseCases: ['核对芯片规格', '比较产品线覆盖', '辅助判断供应链替代方案'],
    safetyNote: '作为工程资料入口使用；关键 BOM、价格和交付周期仍要向供应链渠道核验。',
    sourcePostId: 145,
  },
  {
    id: 'ieee-2030-5',
    name: 'IEEE 2030.5 MCP',
    kind: 'MCP',
    category: 'hard-tech',
    status: '观察',
    maturity: '社区实现',
    pricing: '待确认',
    auth: '待确认',
    highlight: '智能能源通信标准的结构化导航。',
    coverage: 'IEEE 2030.5 智能能源协议对象、接口和 HATEOAS 导航。',
    bestFor: ['虚拟电厂', '储能', '智能电网', '充电桩'],
    pevcUseCases: ['理解能源通信协议', '核验产品是否接近标准接口', '辅助访谈技术团队'],
    safetyNote: '标准解释不能替代合规意见；商业项目仍需查看授权标准文本。',
    sourcePostId: 145,
  },
  {
    id: 'exa-mcp',
    name: 'Exa MCP',
    kind: 'MCP',
    category: 'search',
    status: '推荐试用',
    maturity: '商业服务',
    pricing: '免费层 + 付费',
    auth: 'API Key',
    highlight: '语义搜索和网页发现能力强，适合找“相似公司/相似论文/相似产品”。',
    coverage: '网页搜索、语义相似搜索、内容提取和研究型搜索。',
    bestFor: ['竞品发现', '主题研究', '海外信息检索'],
    pevcUseCases: ['找相似公司', '生成赛道公司长名单', '补充专家访谈前材料'],
    safetyNote: '联网搜索会访问外部服务，不要把保密项目名称和未公开材料整段发送。',
    url: 'https://github.com/exa-labs/exa-mcp-server',
    sourcePostId: 145,
  },
  {
    id: 'firecrawl-mcp',
    name: 'Firecrawl MCP',
    kind: 'MCP',
    category: 'search',
    status: '推荐试用',
    maturity: '商业服务',
    pricing: '免费层 + 付费',
    auth: 'API Key',
    highlight: '把网页转成 Agent 友好的 Markdown / 结构化内容。',
    coverage: '网页抓取、站点爬取、结构化抽取、Markdown 转换。',
    bestFor: ['官网分析', '竞品文档', '政策网页', '产品资料'],
    pevcUseCases: ['抽取公司官网信息', '整理竞品产品页', '批量阅读政策或招投标公告'],
    safetyNote: '注意目标网站条款和频率限制；不要抓取需要登录或无授权的数据。',
    url: 'https://github.com/mendableai/firecrawl-mcp-server',
    sourcePostId: 145,
  },
  {
    id: 'playwright-mcp',
    name: 'Playwright MCP',
    kind: 'MCP',
    category: 'search',
    status: '适合自建',
    maturity: '官方',
    pricing: '免费',
    auth: '无需密钥',
    highlight: '让 Agent 操作浏览器，适合做站点验收和交互式信息采集。',
    coverage: '浏览器打开、点击、表单、截图、页面结构读取和自动化测试。',
    bestFor: ['网站验收', '竞品体验', '投后运营检查'],
    pevcUseCases: ['检查被投公司官网流程', '批量截图竞品页面', '自动化上线前 smoke test'],
    safetyNote: '浏览器自动化权限很高；登录后台、支付、删除等操作要人工确认。',
    url: 'https://github.com/microsoft/playwright-mcp',
    sourcePostId: 145,
  },
  {
    id: 'semantic-scholar',
    name: 'Semantic Scholar API',
    kind: 'API',
    category: 'research',
    status: '适合自建',
    maturity: 'API 原生',
    pricing: '免费',
    auth: 'API Key',
    highlight: '论文引用、作者和影响力线索适合封装成内部 MCP。',
    coverage: '论文、作者、引用、参考文献、领域、摘要和开放元数据。',
    bestFor: ['学术影响力', '技术源头', '专家地图'],
    pevcUseCases: ['寻找核心 PI', '追踪引用网络', '判断论文是否进入产业化阶段'],
    safetyNote: '公开学术元数据适合初筛，专家判断仍需结合访谈和产业验证。',
    url: 'https://api.semanticscholar.org',
    sourcePostId: 145,
  },
  {
    id: 'openalex',
    name: 'OpenAlex API',
    kind: 'API',
    category: 'research',
    status: '适合自建',
    maturity: 'API 原生',
    pricing: '免费',
    auth: '无需密钥',
    highlight: '开放学术图谱，适合做机构、作者、论文和概念网络。',
    coverage: 'Works、Authors、Institutions、Sources、Concepts、Funders 等开放元数据。',
    bestFor: ['高校成果转化', '研究机构分析', '专家网络'],
    pevcUseCases: ['看机构研究方向', '找同领域作者群', '判断论文主题迁移趋势'],
    safetyNote: '元数据覆盖和归并存在误差，正式报告要引用原始来源。',
    url: 'https://docs.openalex.org',
    sourcePostId: 145,
  },
  {
    id: 'sec-edgar',
    name: 'SEC EDGAR / EdgarTools',
    kind: 'API',
    category: 'company',
    status: '适合自建',
    maturity: 'API 原生',
    pricing: '免费',
    auth: '无需密钥',
    highlight: '海外上市公司公告和财务披露的基础数据源。',
    coverage: '10-K、10-Q、S-1、8-K、公司事实、财务报表和披露文本。',
    bestFor: ['海外上市公司', '可比公司', '退出路径', '财务披露'],
    pevcUseCases: ['找可比公司风险披露', '拆 S-1 商业模式', '做退出案例和财务指标对照'],
    safetyNote: '公告数据适合引用，但自动抽取的表格和指标要人工复核。',
    url: 'https://www.sec.gov/edgar/sec-api-documentation',
    sourcePostId: 145,
  },
  {
    id: 'brave-search',
    name: 'Brave Search MCP',
    kind: 'MCP',
    category: 'search',
    status: '推荐试用',
    maturity: '官方',
    pricing: '免费层 + 付费',
    auth: 'API Key',
    highlight: '通用网页搜索入口，适合作为 Agent 的基础外部信息源。',
    coverage: '网页、新闻、图片、视频等搜索结果和摘要信息。',
    bestFor: ['通用调研', '新闻监控', '公开信息补全'],
    pevcUseCases: ['补充公司公开动态', '搜索政策新闻', '查找第三方报道'],
    safetyNote: '搜索结果不等于事实；需要交叉验证来源质量和发布时间。',
    url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
    sourcePostId: 145,
  },
  {
    id: 'financial-datasets',
    name: 'Financial Datasets MCP',
    kind: 'MCP',
    category: 'market',
    status: '观察',
    maturity: '商业服务',
    pricing: '免费层 + 付费',
    auth: 'API Key',
    highlight: '把金融市场数据接给 Agent，用于二级指标和可比公司辅助分析。',
    coverage: '股票价格、财务指标、新闻、公司信息和部分市场数据。',
    bestFor: ['可比公司', '二级市场验证', '行业景气度'],
    pevcUseCases: ['跟踪可比公司估值', '观察产业链上市公司信号', '辅助退出路径判断'],
    safetyNote: '金融数据源需要核对授权和延迟；不要作为投资建议自动输出。',
    url: 'https://github.com/financial-datasets/mcp-server',
    sourcePostId: 145,
  },
];

export function getMcpLibraryItemsByCategory(category: McpLibraryCategoryKey) {
  return mcpLibraryItems.filter((item) => item.category === category);
}

export function getMcpLibraryCategory(category: McpLibraryCategoryKey) {
  return mcpLibraryCategories.find((item) => item.key === category);
}

export function getConnectorById(id: string): McpLibraryItem | undefined {
  return mcpLibraryItems.find((item) => item.id === id);
}

// ───────────────────────────────────────────────────────────────────────────
// 连接器目录查询（"目录索引"能力）
// ───────────────────────────────────────────────────────────────────────────
//
// N.E.I. MCP 的定位是"Skill 分发 + 连接器目录索引 + Prompt 仓库"。
// Agent 是引擎——它决定补不补、补哪个、怎么配合 Skill 用。
// N.E.I. 只提供：浏览(list)、查详情(get)、搜(search)、按任务推荐(recommend)、
// 拿加载 prompt(get_connector_setup_prompt)。
//
// 这些函数是纯函数，MCP route.ts 会把它们包成工具。

export type ConnectorListItem = {
  id: string;
  name: string;
  kind: McpLibraryItem['kind'];
  category: McpLibraryCategoryKey;
  categoryLabel: string;
  status: McpLibraryItem['status'];
  maturity: McpLibraryItem['maturity'];
  pricing: McpLibraryItem['pricing'];
  auth: McpLibraryItem['auth'];
  highlight: string;
  bestFor: string[];
  pevcUseCases: string[];
  internal: boolean;
  url: string | null;
};

export type ConnectorDetail = ConnectorListItem & {
  coverage: string;
  safetyNote: string;
  sourcePostId: number | null;
  featured: boolean;
};

export type ConnectorListFilters = {
  category?: McpLibraryCategoryKey;
  kind?: McpLibraryItem['kind'];
  status?: McpLibraryItem['status'];
  /** 只返回 internal / 只返回外部；不传则全部 */
  internalOnly?: boolean;
  /** 最多返回多少条，默认 50 */
  limit?: number;
};

function categoryLabel(key: McpLibraryCategoryKey): string {
  return mcpLibraryCategories.find((c) => c.key === key)?.label ?? key;
}

function toListItem(item: McpLibraryItem): ConnectorListItem {
  return {
    id: item.id,
    name: item.name,
    kind: item.kind,
    category: item.category,
    categoryLabel: categoryLabel(item.category),
    status: item.status,
    maturity: item.maturity,
    pricing: item.pricing,
    auth: item.auth,
    highlight: item.highlight,
    bestFor: item.bestFor,
    pevcUseCases: item.pevcUseCases,
    internal: Boolean(item.internal),
    url: item.url ?? null,
  };
}

/**
 * 按过滤器列出连接器（目录浏览）。
 */
export function listConnectors(filters: ConnectorListFilters = {}): ConnectorListItem[] {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  return mcpLibraryItems
    .filter((item) => {
      if (filters.category && item.category !== filters.category) return false;
      if (filters.kind && item.kind !== filters.kind) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.internalOnly === true && !item.internal) return false;
      if (filters.internalOnly === false && item.internal) return false;
      return true;
    })
    .slice(0, limit)
    .map(toListItem);
}

/**
 * 查单个连接器的完整元数据（不含 setup prompt）。
 */
export function getConnectorDetail(id: string): ConnectorDetail | null {
  const item = getConnectorById(id);
  if (!item) return null;
  return {
    ...toListItem(item),
    coverage: item.coverage,
    safetyNote: item.safetyNote,
    sourcePostId: item.sourcePostId ?? null,
    featured: Boolean(item.featured),
  };
}

/**
 * 按关键词搜连接器（名字 / 覆盖 / 用途 / bestFor）。
 */
export function searchConnectors(query: string, limit = 10): ConnectorListItem[] {
  const normalized = normalizeForMatch(query);
  if (!normalized) return [];
  const cap = Math.min(Math.max(limit, 1), 30);

  return mcpLibraryItems
    .map((item) => {
      const haystack = normalizeForMatch(
        [item.id, item.name, item.coverage, item.highlight, ...item.bestFor, ...item.pevcUseCases].join(' '),
      );
      const tokens = normalized.split(/\s+/).filter(Boolean);
      const hits = tokens.filter((t) => haystack.includes(t)).length;
      return { item, hits };
    })
    .filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, cap)
    .map((entry) => toListItem(entry.item));
}

// ───────────────────────────────────────────────────────────────────────────
// 任务 → 外部连接器推荐
// ───────────────────────────────────────────────────────────────────────────
//
// 用于 N.E.I. MCP 的「主动推荐外部数据源」能力：
// Agent 调 recommend_skills_for_task / recommend_connectors_for_task 时，
// N.E.I. 按 task + industry 关键词命中规则，返回建议补充的外部 MCP / API，
// 用户确认后调 get_connector_setup_prompt 拿加载指令。
//
// 设计原则：
// - 推荐规则集中在这一张表，新增 connector 只要加一行 trigger 即可
// - internal=true（nei-pevc 自己）不参与推荐
// - status='观察' 的只有在 task 显式提到该 connector 名字时才推荐
// - 一次最多返回 3 条，避免淹没 Skill 推荐结果

type ConnectorTrigger = {
  id: string;
  /** task / industry 文本中命中任一关键词即推荐 */
  keywords: string[];
  /** 推荐理由模板，{task} 会被替换为实际任务文本 */
  reason: string;
};

const CONNECTOR_TRIGGERS: ConnectorTrigger[] = [
  {
    id: 'biomcp',
    keywords: ['创新药', '生物医药', '医药', '生物科技', '靶点', '适应症', '临床试验', '管线',
      'biotech', 'pharma', 'drug', 'clinical', 'biomarker', 'IVD', '基因', 'biomed', '医疗'],
    reason: '本任务涉及生物医药，BioMCP 可补充 PubMed 文献、ClinicalTrials.gov 试验进度和 OpenFDA 药物安全公开数据。',
  },
  {
    id: 'arxiv-mcp',
    keywords: ['论文', '前沿技术', '技术追踪', '技术路线', '研究团队', 'arxiv', '预印本',
      '机器人', '量子', '材料', 'AI 论文', '模型论文', '技术调研'],
    reason: '本任务需要追踪前沿技术，ArXiv MCP 可检索预印本论文、整理主题订阅和引用线索。',
  },
  {
    id: 'huggingface-mcp',
    keywords: ['开源模型', 'AI 模型', '大模型', '基础模型', 'huggingface', '数据集评估',
      '模型生态', 'AI 应用', 'ML', '开源 AI'],
    reason: '本任务涉及 AI 模型生态，Hugging Face MCP 可评估模型热度、数据集和 Spaces。',
  },
  {
    id: 'github-mcp',
    keywords: ['开源项目', 'github', '代码活跃度', '贡献者', 'developer tool', 'AI Infra',
      '开发者工具', '开源软件', '仓库', 'issue', 'PR'],
    reason: '本任务涉及开源项目评估，GitHub MCP 可检查仓库活跃度、识别真实贡献者、分析 Issue 响应节奏。',
  },
  {
    id: 'wolfram-alpha',
    keywords: ['硬科技', 'LCOE', 'lawson', '退相干', '技术验算', '工程计算', '半导体物理',
      '新材料性能', '新能源', '核聚变', '量子计算', '物理模型', '公式推导'],
    reason: '本任务需要技术可行性验算，Wolfram Alpha MCP 可做 LCOE / Lawson 判据 / 材料性能上限等 sanity check。',
  },
  {
    id: 'exa-mcp',
    keywords: ['相似公司', '竞品发现', '赛道公司', '长名单', '语义搜索', '海外公司检索',
      '相似产品', '相似论文'],
    reason: '本任务需要找相似公司或产品，Exa MCP 的语义搜索适合生成赛道长名单和竞品发现。',
  },
  {
    id: 'firecrawl-mcp',
    keywords: ['官网分析', '抓取网页', '竞品页面', '政策网页', '产品资料', '招投标公告',
      '批量阅读', '网页转 markdown', '结构化抽取'],
    reason: '本任务需要抓取网页内容，Firecrawl MCP 可把官网 / 竞品页 / 政策网页转成 Agent 友好的 Markdown。',
  },
  {
    id: 'playwright-mcp',
    keywords: ['网站验收', '浏览器自动化', '投后运营检查', '竞品体验', 'smoke test',
      '批量截图', '表单填写'],
    reason: '本任务涉及网站交互验证，Playwright MCP 可做站点验收、竞品体验截图和自动化测试。',
  },
  {
    id: 'semantic-scholar',
    keywords: ['学术影响力', '引用网络', '核心 PI', '专家地图', '论文引用', '技术源头',
      'author', '学者'],
    reason: '本任务需要追溯学术影响力，Semantic Scholar API 适合找核心 PI、引用网络和论文源头。',
  },
  {
    id: 'openalex',
    keywords: ['高校成果转化', '研究机构', '机构分析', '专家网络', 'funders', '学术图谱',
      '研究方向'],
    reason: '本任务涉及机构 / 研究方向分析，OpenAlex API 可看高校研究方向、找同领域作者群。',
  },
  {
    id: 'sec-edgar',
    keywords: ['海外上市', 'S-1', '10-K', '10-Q', '8-K', 'SEC', '美国上市', '纳斯达克',
      '纽交所', '可比公司风险披露', '退出案例'],
    reason: '本任务涉及海外上市公司，SEC EDGAR 可查 10-K / S-1 / 8-K 披露，用于可比公司和退出案例对照。',
  },
  {
    id: 'brave-search',
    keywords: ['通用调研', '新闻监控', '公开信息补全', '公司动态', '政策新闻', '第三方报道',
      '网页搜索'],
    reason: '本任务需要补全公开信息，Brave Search MCP 可作为 Agent 的基础外部搜索入口。',
  },
  {
    id: 'financial-datasets',
    keywords: ['可比公司估值', '二级市场', '行业景气度', '产业链上市公司', '退出路径判断',
      '股票价格', 'financial datasets'],
    reason: '本任务涉及二级市场辅助分析，Financial Datasets MCP 可跟踪可比公司估值和产业链信号。',
  },
];

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[，。、；：？！""《》"'`~!@#$%^&*()[\]{}|\\/?+=_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type RecommendedConnector = {
  id: string;
  name: string;
  category: McpLibraryCategoryKey;
  kind: McpLibraryItem['kind'];
  auth: McpLibraryItem['auth'];
  reason: string;
  /** 给 Agent 的下一步指令提示 */
  confirmHint: string;
};

/**
 * 按 task + industry 推荐外部 MCP / API 连接器。
 *
 * @returns 推荐连接器数组（最多 3 条），按命中权重降序
 */
export function recommendConnectorsForTask(
  task: string,
  industry?: string | null,
  scenes?: string[],
): RecommendedConnector[] {
  const haystack = normalizeForMatch([task, industry ?? '', (scenes ?? []).join(' ')].join(' '));
  if (!haystack) return [];

  const scored: Array<{ trigger: ConnectorTrigger; item: McpLibraryItem; hits: number }> = [];

  for (const trigger of CONNECTOR_TRIGGERS) {
    const item = getConnectorById(trigger.id);
    if (!item || item.internal) continue;

    // 观察 中的 connector，只有 task 显式提到它的名字/id 才推荐
    const isWatchlisted = item.status === '观察';
    if (isWatchlisted) {
      const explicitMention = normalizeForMatch(item.name).split(' ').some((part) =>
        part.length >= 4 && haystack.includes(part),
      ) || haystack.includes(normalizeForMatch(item.id));
      if (!explicitMention) continue;
    }

    let hits = 0;
    for (const kw of trigger.keywords) {
      const normalizedKw = normalizeForMatch(kw);
      if (normalizedKw && haystack.includes(normalizedKw)) hits += 1;
    }
    if (hits === 0) continue;

    scored.push({ trigger, item, hits });
  }

  return scored
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 3)
    .map(({ trigger, item }) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      kind: item.kind,
      auth: item.auth,
      reason: trigger.reason.replace('{task}', task.slice(0, 60)),
      confirmHint:
        `确认添加 ${item.name}？调用 get_connector_setup_prompt(connector_id="${item.id}", confirmed=true) 获取加载指令。`,
    }));
}
