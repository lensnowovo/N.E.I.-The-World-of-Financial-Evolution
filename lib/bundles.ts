export type TaskBundleStep = {
  title: string;
  description: string;
  postIds: number[];
};

export type TaskBundle = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  output: string;
  scenes: string[];
  skillCountLabel: string;
  mcpLabel: string;
  steps: TaskBundleStep[];
};

export const taskBundles: TaskBundle[] = [
  {
    slug: 'bp-screening',
    title: '拆 BP 工作流',
    shortTitle: '拆 BP',
    description: '从 BP 到项目初筛意见，快速完成摘要、行业、竞品、风险和汇报材料。',
    output: 'BP 初筛 Memo / 追问清单 / 简要意见',
    scenes: ['screening', 'industry-research', 'business-dd'],
    skillCountLabel: '15 个 Skills',
    mcpLabel: 'MCP Ready',
    steps: [
      {
        title: '提取 BP',
        description: '提取项目基本信息、团队、产品、商业模式、融资诉求和核心数据。',
        postIds: [48, 23, 17],
      },
      {
        title: '快速行业分析',
        description: '判断项目所在赛道的空间、增长驱动、产业链位置和周期。',
        postIds: [67, 68, 62],
      },
      {
        title: '竞品对比',
        description: '识别直接竞品、替代方案、可比公司和差异化定位。',
        postIds: [54, 70],
      },
      {
        title: '简要 BP 意见',
        description: '形成项目亮点、核心硬伤、关键假设和下一步追问。',
        postIds: [69, 49],
      },
      {
        title: '整理输出',
        description: '把初步判断整理为内部汇报、立项建议或正式意见格式。',
        postIds: [51, 98],
      },
    ],
  },
  {
    slug: 'industry-research',
    title: '行业研究工作流',
    shortTitle: '做行研',
    description: '从陌生赛道到研究框架，梳理产业链、市场空间、竞争格局和投资逻辑。',
    output: '行业研究底稿 / 赛道判断框架',
    scenes: ['industry-research'],
    skillCountLabel: '11 个 Skills',
    mcpLabel: 'MCP Ready',
    steps: [
      { title: '界定赛道', description: '明确研究对象、边界、上下游和关键子行业。', postIds: [42, 67, 62] },
      { title: '市场空间', description: '估算 TAM/SAM/SOM、增长驱动和渗透率变化。', postIds: [70, 68] },
      { title: '竞争格局', description: '拆分主要玩家、份额、壁垒和商业模式差异。', postIds: [54, 89] },
      { title: '投资逻辑', description: '沉淀关键假设、催化剂、风险和可投细分方向。', postIds: [98, 90] },
    ],
  },
  {
    slug: 'commercial-dd',
    title: '商业尽调工作流',
    shortTitle: '做尽调',
    description: '围绕客户、供应商、竞品、专家访谈和商业模式验证形成尽调清单。',
    output: '商业尽调清单 / 专家访谈提纲',
    scenes: ['business-dd'],
    skillCountLabel: '8 个 Skills',
    mcpLabel: 'MCP Ready',
    steps: [
      { title: '拆验证假设', description: '把投资疑问拆成可验证的客户、产品、市场和团队假设。', postIds: [49, 69] },
      { title: '访谈提纲', description: '生成客户、专家、供应商和竞品访谈问题。', postIds: [92, 23] },
      { title: '证据分级', description: '整理证据强弱、待补材料和下一轮确认路径。', postIds: [93, 91] },
    ],
  },
  {
    slug: 'financial-review',
    title: '财务分析工作流',
    shortTitle: '看财务',
    description: '检查收入质量、毛利率、现金流、应收、存货和预测合理性。',
    output: '财务质量分析 / 风险问题清单',
    scenes: ['financial'],
    skillCountLabel: '7 个 Skills',
    mcpLabel: 'MCP Ready',
    steps: [
      { title: '收入质量', description: '识别收入确认、客户集中度、回款周期和可持续性。', postIds: [50, 26] },
      { title: '利润与现金流', description: '检查毛利率、费用率、经营现金流和资本开支。', postIds: [53, 55] },
      { title: '预测校验', description: '复核预测假设、敏感性和估值关键变量。', postIds: [52, 59] },
    ],
  },
  {
    slug: 'ic-memo',
    title: 'IC Memo 工作流',
    shortTitle: '写 IC',
    description: '把项目判断组织成投资逻辑、估值、风险和投委会 Q&A。',
    output: 'IC Memo / 投委会问题清单',
    scenes: ['ic'],
    skillCountLabel: '5 个 Skills',
    mcpLabel: 'MCP Ready',
    steps: [
      { title: '投资逻辑', description: '凝练为什么投、为什么现在投、为什么我们投。', postIds: [51, 68] },
      { title: '风险与反方', description: '准备核心风险、反方观点和缓释方案。', postIds: [69] },
      { title: '格式输出', description: '生成投委会可能追问和答辩口径。', postIds: [19, 25] },
    ],
  },
  {
    slug: 'portfolio',
    title: '投后管理工作流',
    shortTitle: '管投后',
    description: '跟踪经营进展、异常指标、风险预警和投后赋能动作。',
    output: '投后月报 / 风险预警清单',
    scenes: ['post-investment', 'crm'],
    skillCountLabel: '4 个 Skills',
    mcpLabel: 'MCP Ready',
    steps: [
      { title: '月度经营跟踪', description: '整理关键指标、现金流、销售进展和组织变化。', postIds: [95, 61] },
      { title: '赋能动作', description: '形成下一步资源对接、管理建议和董事会沟通材料。', postIds: [94] },
    ],
  },
  {
    slug: 'lp-reporting',
    title: 'LP 汇报工作流',
    shortTitle: '做 LP 汇报',
    description: '整理基金表现、组合进展、退出路径和 LP 沟通材料。',
    output: 'LP 季报 / 基金运营摘要',
    scenes: ['fundraising', 'fund-ops'],
    skillCountLabel: '3 个 Skills',
    mcpLabel: 'MCP Ready',
    steps: [
      { title: '基金表现摘要', description: '汇总 DPI、TVPI、IRR、估值变化和现金流。', postIds: [96] },
      { title: '组合进展', description: '整理重点项目进展、风险变化和退出机会。', postIds: [95] },
      { title: '政策与合规', description: '关注政府引导基金政策变化和合规要求。', postIds: [97] },
    ],
  },
  {
    slug: 'mcp-setup',
    title: 'MCP 配置工作流',
    shortTitle: '配置 MCP',
    description: '把 N.E.I. Skill 全库接入 Claude Code、Codex、Workbuddy 等 Agent 客户端，常用 Skill 再收藏沉淀。',
    output: 'MCP 配置完成 / 客户端连接说明',
    scenes: ['crm'],
    skillCountLabel: '3 个 Skills',
    mcpLabel: '可外部调用',
    steps: [
      { title: '了解 MCP', description: '了解 N.E.I. MCP 做什么、不做什么、安全边界。', postIds: [44] },
      { title: '配置客户端', description: '生成 Token 并配置 Claude Code / Codex / Workbuddy。', postIds: [94] },
      { title: '验证调通', description: '调用 search_skills 搜全库；有收藏时再用 list_my_skills 读常用库。', postIds: [98] },
    ],
  },
];

export const DEFAULT_BUNDLE_SLUG = 'bp-screening';

export function getTaskBundle(slug?: string | null) {
  return taskBundles.find((bundle) => bundle.slug === slug) || taskBundles[0];
}
