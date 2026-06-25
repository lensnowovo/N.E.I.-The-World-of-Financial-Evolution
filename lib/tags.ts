// PEVC 原生四维分类体系（PRD §4）
// 注意：value 是内部稳定标识，绝不能改（数据库 / API / URL 都依赖它）。
// label / example 可以自由调整为大白话。

export const SCENE_TAGS = [
  { value: 'sourcing', label: '项目发现', example: '找项目、扫赛道、列创始人清单' },
  { value: 'screening', label: '初筛判断', example: '刚拿到一个项目，快速决定要不要深看' },
  { value: 'industry-research', label: '行业研究', example: '写行业报告、测市场规模、分析赛道' },
  { value: 'business-dd', label: '商业尽调', example: '摸业务、产品、团队、市场' },
  { value: 'financial', label: '财务分析', example: '建模型、做估值、看财务健康度' },
  { value: 'legal', label: '法务合规', example: '投资协议、VIE 结构、合规风险' },
  { value: 'ic', label: 'IC 材料', example: '写投委会材料、立项报告' },
  { value: 'post-investment', label: '投后管理', example: '被投公司赋能、董事会参与' },
  { value: 'fundraising', label: '募资 / LP', example: '找 LP、写募资材料、LP 沟通' },
  { value: 'crm', label: '知识管理', example: 'CRM、会议纪要、团队知识库' },
] as const;

export const INDUSTRY_TAGS = [
  { value: 'ai-saas', label: 'AI / SaaS' },
  { value: 'semiconductor', label: '半导体 / 芯片' },
  { value: 'biotech', label: '生物医药 / CGT' },
  { value: 'consumer', label: '消费 / 品牌' },
  { value: 'robotics', label: '具身智能 / 机器人' },
  { value: 'climate', label: '新能源 / 储能' },
  { value: 'aerospace', label: '商业航天' },
  { value: 'materials', label: '新材料' },
  { value: 'fintech', label: '金融科技' },
  { value: 'crypto', label: 'Crypto / Web3' },
  { value: 'healthcare', label: '医疗服务 / 器械' },
  { value: 'cross-border', label: '出海 / 全球化' },
] as const;

export const CONTENT_TAGS = [
  { value: 'info-gather', label: '信息搜集' },
  { value: 'doc-parse', label: '文档解析' },
  { value: 'data-clean', label: '数据清洗' },
  { value: 'report-gen', label: '报告生成' },
  { value: 'debate', label: '观点辩论' },
  { value: 'memo', label: '投资 Memo' },
  { value: 'expert-call', label: '专家访谈准备' },
  { value: 'company-profile', label: '公司画像' },
  { value: 'competitive-map', label: '竞品地图' },
  { value: 'risk-id', label: '风险识别' },
  { value: 'automation', label: '自动化流程' },
] as const;

export const SKILL_TAGS = [
  { value: 'prompt', label: '提示词', desc: '一段复制就能用的 AI 指令' },
  { value: 'agent-skill', label: 'SKILL.md', desc: '给 Claude Code 用的结构化指令文件' },
  { value: 'workflow', label: '工作流程', desc: '可照做的完整工作流' },
  { value: 'tool-stack', label: '工具组合', desc: '一组工具的搭配推荐' },
  { value: 'template', label: '模板', desc: '可复用的文档 / 表格 / PPT 模板' },
  { value: 'api-script', label: '脚本', desc: '可执行的代码片段' },
  { value: 'case-study', label: '实战案例', desc: '完整的方法论应用案例' },
] as const;

export const ROLE_TAGS = [
  { value: 'VC', label: 'VC', desc: '风险投资机构从业者' },
  { value: 'PE', label: 'PE', desc: '私募股权机构从业者' },
  { value: 'FA', label: 'FA', desc: '财务顾问 / 中介机构从业者' },
] as const;

/**
 * 首页「不筛选时」按投资流程阶段分组展示。
 * 把 10 个工作场景归并成 3 大阶段，呼应 PEVC 从业者的工作心智，
 * 也避免稀疏场景（只有 1-2 条）单独成组显得单薄。
 */
export const STAGE_GROUPS = [
  {
    value: 'pre-deal',
    label: '投前 · 发现与判断',
    scenes: ['sourcing', 'screening', 'industry-research', 'business-dd'],
  },
  {
    value: 'deal',
    label: '决策 · 建模与交易',
    scenes: ['financial', 'legal', 'ic', 'fundraising'],
  },
  {
    value: 'post-deal',
    label: '投后 · 管理与赋能',
    scenes: ['post-investment', 'crm'],
  },
] as const;


export type Role = (typeof ROLE_TAGS)[number]['value'];

const lookup = <T extends { value: string; label: string }>(arr: readonly T[], v?: string | null) =>
  v ? arr.find((x) => x.value === v)?.label ?? v : '';

export const sceneLabel = (v?: string | null) => lookup(SCENE_TAGS, v);
export const industryLabel = (v?: string | null) => lookup(INDUSTRY_TAGS, v);
export const contentLabel = (v?: string | null) => lookup(CONTENT_TAGS, v);
export const skillLabel = (v?: string | null) => lookup(SKILL_TAGS, v);

export const roleColor = (role: string) => {
  switch (role) {
    case 'VC':
      return 'bg-emerald-50 text-emerald-700';
    case 'PE':
      return 'bg-violet-50 text-violet-700';
    case 'FA':
      return 'bg-amber-50 text-amber-700';
    default:
      return 'bg-ink-100 text-ink-700';
  }
};

export const ASSET_TYPE_HELPERS: Record<string, { body: string; installHint: string; usageNotes: string }> = {
  prompt: {
    body: '小建议：把提示词写清楚，用 [方括号] 标出需要替换的部分，比如「[公司名]」。',
    installHint: '这个提示词在哪个工具里用效果最好？（ChatGPT、Claude、Kimi 等）',
    usageNotes: '适合谁用、在什么场景下用效果最好？',
  },
  'agent-skill': {
    body: '小建议：说清楚这个 SKILL.md 是干嘛的、能帮你做什么。',
    installHint: '如果安装方式特别，可以写一句（不懂的读者会跳过）。',
    usageNotes: '适合谁用、有什么要注意的？',
  },
  workflow: {
    body: '小建议：按步骤写，每一步写清楚输入是什么、产出是什么。',
    installHint: '需要用到哪些工具或账号？',
    usageNotes: '适合什么场景，做完能得到什么？',
  },
  'tool-stack': {
    body: '小建议：列出每个工具是干嘛的、它们怎么配合。',
    installHint: '每个工具去哪注册或下载？',
    usageNotes: '适合谁用，这套组合的好处是什么？',
  },
  template: {
    body: '小建议：正文里简单说几句这个模板怎么用，文件传到下面「上传文件」。',
    installHint: '什么格式（Excel / Word / PPT）、怎么打开？',
    usageNotes: '适合什么场景，怎么改成自己的？',
  },
  'api-script': {
    body: '小建议：说清楚脚本干啥用，运行步骤写明白。',
    installHint: '运行前要装什么、配什么环境变量？（不懂的读者会问）',
    usageNotes: '适合谁用，有什么前提条件？',
  },
  'case-study': {
    body: '小建议：把背景、做法、结果、复盘都写上，别人才能照着学。',
    installHint: '复现这个案例需要哪些工具和数据？',
    usageNotes: '适合什么范围，能借鉴什么？',
  },
};

/**
 * 「怎么用」固定说明 —— 详情页根据 assetType 自动展示，零维护。
 * 给不懂技术的读者一句具体的下一步动作。
 */
export const HOW_TO_USE: Record<string, string> = {
  prompt:
    '复制下面的提示词，粘贴到 ChatGPT / Claude / Kimi 等任意 AI 对话框，把方括号 [像这样] 的部分换成你的实际内容。',
  template:
    '下载文件后用 Excel / Word / PPT 打开（看文件后缀），按里面的说明填写。建议先复制一份原文件再改，保住模板。',
  'agent-skill':
    '这是个 SKILL.md 文件。在 Claude Code 里放到 ~/.claude/skills/ 目录下即可调用。（看不懂这步？先用其他类型就好）',
  'api-script':
    '下载脚本文件后，按正文里的「运行步骤」配置环境。需要会一点点命令行，不懂可以在评论区问作者。',
  workflow: '下面正文里是完整的工作流程，按步骤照做即可，每一步的输入产出都写清楚了。',
  'tool-stack': '正文里推荐了工具组合，点链接去各工具官网注册 / 下载，按顺序搭配使用。',
  'case-study': '这是一个完整案例，建议先通读一遍理解思路，再对照自己的项目套用。',
};

/**
 * 发布分支 · 大白话选项 → 内部 assetType 映射
 * 分支 B「Skill 文件」和分支 C「方法论」用这组映射。
 */
export const FILE_TYPE_OPTIONS: { label: string; assetType: string }[] = [
  { label: '模板（Word / PPT）', assetType: 'template' },
  { label: '表格（Excel）', assetType: 'template' },
  { label: '脚本（代码文件）', assetType: 'api-script' },
  { label: 'SKILL.md', assetType: 'agent-skill' },
];

export const METHOD_TYPE_OPTIONS: { label: string; assetType: string }[] = [
  { label: '工作流程', assetType: 'workflow' },
  { label: '工具组合', assetType: 'tool-stack' },
  { label: '实战案例', assetType: 'case-study' },
];
