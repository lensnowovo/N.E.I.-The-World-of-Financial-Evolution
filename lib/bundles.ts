export type TaskBundleStep = {
  title: string;
  description: string;
  skillQueries: string[];
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
    skillCountLabel: '12 个 Skills',
    mcpLabel: 'MCP Ready',
    steps: [
      {
        title: '提取 BP',
        description: '提取项目基本信息、团队、产品、商业模式、融资诉求和核心数据。',
        skillQueries: ['BP', '摘要', '团队', '商业模式'],
      },
      {
        title: '快速行业分析',
        description: '判断项目所在赛道的空间、增长驱动、产业链位置和周期。',
        skillQueries: ['行业', '产业链', '市场空间', '赛道'],
      },
      {
        title: '竞品对比',
        description: '识别直接竞品、替代方案、可比公司和差异化定位。',
        skillQueries: ['竞品', '可比公司', '差异化', '竞争格局'],
      },
      {
        title: '简要 BP 意见',
        description: '形成项目亮点、核心硬伤、关键假设和下一步追问。',
        skillQueries: ['初筛', '追问', '投资判断', '硬伤'],
      },
      {
        title: '公文格式输出',
        description: '把初步判断整理为内部汇报、立项建议或正式意见格式。',
        skillQueries: ['Memo', '意见', '模板', '立项'],
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
    skillCountLabel: '10 个 Skills',
    mcpLabel: 'MCP Ready',
    steps: [
      { title: '界定赛道', description: '明确研究对象、边界、上下游和关键子行业。', skillQueries: ['行业', '赛道', '定义'] },
      { title: '市场空间', description: '估算 TAM/SAM/SOM、增长驱动和渗透率变化。', skillQueries: ['TAM', 'SAM', 'SOM', '市场规模'] },
      { title: '竞争格局', description: '拆分主要玩家、份额、壁垒和商业模式差异。', skillQueries: ['竞争格局', '玩家', '壁垒'] },
      { title: '投资逻辑', description: '沉淀关键假设、催化剂、风险和可投细分方向。', skillQueries: ['投资逻辑', '风险', '催化剂'] },
    ],
  },
  {
    slug: 'commercial-dd',
    title: '商业尽调工作流',
    shortTitle: '做尽调',
    description: '围绕客户、供应商、竞品、专家访谈和商业模式验证形成尽调清单。',
    output: '商业尽调清单 / 专家访谈提纲',
    scenes: ['business-dd'],
    skillCountLabel: '9 个 Skills',
    mcpLabel: 'MCP Ready',
    steps: [
      { title: '拆验证假设', description: '把投资疑问拆成可验证的客户、产品、市场和团队假设。', skillQueries: ['尽调', '验证', '假设'] },
      { title: '访谈提纲', description: '生成客户、专家、供应商和竞品访谈问题。', skillQueries: ['专家访谈', '客户访谈', '提纲'] },
      { title: '证据分级', description: '整理证据强弱、待补材料和下一轮确认路径。', skillQueries: ['证据', '待补', '清单'] },
    ],
  },
  {
    slug: 'financial-review',
    title: '财务分析工作流',
    shortTitle: '看财务',
    description: '检查收入质量、毛利率、现金流、应收、存货和预测合理性。',
    output: '财务质量分析 / 风险问题清单',
    scenes: ['financial'],
    skillCountLabel: '8 个 Skills',
    mcpLabel: 'MCP Ready',
    steps: [
      { title: '收入质量', description: '识别收入确认、客户集中度、回款周期和可持续性。', skillQueries: ['收入', '回款', '客户集中度'] },
      { title: '利润与现金流', description: '检查毛利率、费用率、经营现金流和资本开支。', skillQueries: ['毛利率', '现金流', '费用率'] },
      { title: '预测校验', description: '复核预测假设、敏感性和估值关键变量。', skillQueries: ['预测', '估值', '敏感性'] },
    ],
  },
  {
    slug: 'ic-memo',
    title: 'IC Memo 工作流',
    shortTitle: '写 IC',
    description: '把项目判断组织成投资逻辑、估值、风险和投委会 Q&A。',
    output: 'IC Memo / 投委会问题清单',
    scenes: ['ic'],
    skillCountLabel: '11 个 Skills',
    mcpLabel: 'MCP Ready',
    steps: [
      { title: '投资逻辑', description: '凝练为什么投、为什么现在投、为什么我们投。', skillQueries: ['IC', '投资逻辑', 'Memo'] },
      { title: '风险与反方', description: '准备核心风险、反方观点和缓释方案。', skillQueries: ['风险', '反方', 'Q&A'] },
      { title: '投委会 Q&A', description: '生成投委会可能追问和答辩口径。', skillQueries: ['投委会', 'Q&A', '问题'] },
    ],
  },
  {
    slug: 'portfolio',
    title: '投后管理工作流',
    shortTitle: '管投后',
    description: '跟踪经营进展、异常指标、风险预警和投后赋能动作。',
    output: '投后月报 / 风险预警清单',
    scenes: ['post-investment', 'crm'],
    skillCountLabel: '7 个 Skills',
    mcpLabel: 'MCP Ready',
    steps: [
      { title: '月度经营跟踪', description: '整理关键指标、现金流、销售进展和组织变化。', skillQueries: ['投后', '月报', '经营'] },
      { title: '异常识别', description: '识别收入、费用、回款和团队层面的异常信号。', skillQueries: ['异常', '风险预警', '指标'] },
      { title: '赋能动作', description: '形成下一步资源对接、管理建议和董事会沟通材料。', skillQueries: ['赋能', '董事会', '资源'] },
    ],
  },
  {
    slug: 'lp-reporting',
    title: 'LP 汇报工作流',
    shortTitle: '做 LP 汇报',
    description: '整理基金表现、组合进展、退出路径和 LP 沟通材料。',
    output: 'LP 季报 / 基金运营摘要',
    scenes: ['fundraising', 'fund-ops'],
    skillCountLabel: '6 个 Skills',
    mcpLabel: 'MCP Ready',
    steps: [
      { title: '基金表现摘要', description: '汇总 DPI、TVPI、IRR、估值变化和现金流。', skillQueries: ['LP', '基金', '表现'] },
      { title: '组合进展', description: '整理重点项目进展、风险变化和退出机会。', skillQueries: ['组合', '项目进展', '退出'] },
      { title: '季报初稿', description: '生成面向 LP 的季度报告和沟通话术。', skillQueries: ['季报', '汇报', '沟通'] },
    ],
  },
  {
    slug: 'mcp-setup',
    title: 'MCP 配置工作流',
    shortTitle: '配置 MCP',
    description: '把收藏的 Skill 接入 Claude、Cursor、Windsurf 等客户端调用。',
    output: 'MCP 配置步骤 / 客户端连接说明',
    scenes: ['crm'],
    skillCountLabel: '4 个步骤',
    mcpLabel: '可外部调用',
    steps: [
      { title: '收藏 Skill', description: '先把常用 Prompt、Workflow 和 SKILL.md 放进自己的库。', skillQueries: ['MCP', '收藏', 'Skill'] },
      { title: '生成 Token', description: '在连接页生成 MCP Token，并按安全规则保存。', skillQueries: ['Token', '连接', '配置'] },
      { title: '配置客户端', description: '把 MCP Server 接入 Claude、Cursor 或 Windsurf。', skillQueries: ['Claude', 'Cursor', 'Windsurf'] },
      { title: '调用工作流', description: '在 AI 客户端中搜索、获取并套用自己的收藏 Skill。', skillQueries: ['调用', 'apply_skill', 'get_skill'] },
    ],
  },
];

export const DEFAULT_BUNDLE_SLUG = 'bp-screening';

export function getTaskBundle(slug?: string | null) {
  return taskBundles.find((bundle) => bundle.slug === slug) || taskBundles[0];
}
