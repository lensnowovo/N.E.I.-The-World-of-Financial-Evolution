export type TaskMapIntent = {
  slug: string;
  title: string;
  description: string;
  postIds: number[];
};

export type TaskMap = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  scenes: string[];
  outcome: string;
  preview: string;
  intents: TaskMapIntent[];
};

export const taskMaps: TaskMap[] = [
  {
    slug: 'bp-screening',
    title: '项目初筛工作台',
    shortTitle: '拆 BP',
    description: '从拿到项目材料开始，快速补齐信息并形成第一轮判断。',
    scenes: ['screening'],
    outcome: '初筛意见 / 关键追问 / 下一步建议',
    preview: '快速判断 · 读材料 · 补行业 · 找风险',
    intents: [
      {
        slug: 'quick-screen',
        title: '快速判断要不要深看',
        description: '用一套明确的投资标准完成项目初筛。',
        postIds: [48],
      },
      {
        slug: 'read-materials',
        title: '读取 BP 与大体量材料',
        description: '处理 BP、招股书、尽调附件和扫描件。',
        postIds: [23],
      },
      {
        slug: 'market-context',
        title: '补充行业与竞品信息',
        description: '快速建立赛道认知，判断市场空间和竞争位置。',
        postIds: [62, 54, 70, 42],
      },
      {
        slug: 'questions',
        title: '识别风险和关键追问',
        description: '找出项目硬伤、验证盲点和下一轮核查问题。',
        postIds: [69, 49],
      },
      {
        slug: 'screening-memo',
        title: '形成初筛或立项意见',
        description: '把已有判断整理成可供内部沟通的正式材料。',
        postIds: [51],
      },
    ],
  },
  {
    slug: 'industry-research',
    title: '行业研究工作台',
    shortTitle: '做行研',
    description: '按你现在要完成的研究任务，直接找到对应方法和工具。',
    scenes: ['industry-research'],
    outcome: '行业认知 / 市场测算 / 专项研究 / 行研报告',
    preview: '快速认知 · 市场测算 · 竞争格局 · 行业框架',
    intents: [
      {
        slug: 'quick-understanding',
        title: '快速了解一个陌生行业',
        description: '在短时间内建立行业边界、核心变量和基本认知框架。',
        postIds: [62, 42, 67, 68],
      },
      {
        slug: 'full-research',
        title: '做一份完整行业研究',
        description: '从资料搜集到结论输出，使用端到端研究方法。',
        postIds: [98, 43, 18],
      },
      {
        slug: 'market-sizing',
        title: '测算市场空间',
        description: '估算 TAM / SAM / SOM、渗透率和增长空间。',
        postIds: [70],
      },
      {
        slug: 'competition',
        title: '梳理竞争格局',
        description: '画清主要玩家、市场定位和竞争关系。',
        postIds: [54],
      },
      {
        slug: 'industry-frameworks',
        title: '研究一个具体行业',
        description: '直接调用半导体、机器人、新能源、生物医药等行业专用框架。',
        postIds: [73, 87, 74, 79, 83, 72, 80, 81, 86, 88, 75, 76, 77, 78, 84, 85, 71],
      },
      {
        slug: 'external-intelligence',
        title: '查政策、论文与外部资料',
        description: '跟踪政策信号、学术前沿、金融数据和外部研究工具。',
        postIds: [89, 90, 145, 21],
      },
    ],
  },
  {
    slug: 'commercial-dd',
    title: '商业尽调工作台',
    shortTitle: '做尽调',
    description: '按要核查的具体事项进入，直接找到清单、访谈和外部验证工具。',
    scenes: ['business-dd'],
    outcome: '尽调清单 / 访谈提纲 / 外部核验 / 风险结论',
    preview: '尽调清单 · 访谈 · 工商 · 订单 · 专利',
    intents: [
      {
        slug: 'dd-plan',
        title: '生成尽调清单与总体框架',
        description: '按行业和交易类型建立本次尽调的核查范围。',
        postIds: [49, 69],
      },
      {
        slug: 'interviews',
        title: '准备访谈并整理纪要',
        description: '准备客户、供应商、竞品和专家问题，整理访谈底稿。',
        postIds: [144, 92, 147],
      },
      {
        slug: 'corporate-records',
        title: '核验工商、股权与关联关系',
        description: '穿透企业工商信息、控股关系和对外投资。',
        postIds: [17],
      },
      {
        slug: 'orders',
        title: '核验客户、订单与招投标',
        description: '通过公开业务证据交叉验证项目方的收入与市场说法。',
        postIds: [93],
      },
      {
        slug: 'technology',
        title: '核验专利、技术与科研资产',
        description: '评估专利壁垒、技术路线和科学家创业项目。',
        postIds: [91, 82, 45],
      },
      {
        slug: 'large-documents',
        title: '处理大体量尽调材料',
        description: '让 Agent 分块读取招股书、年报和尽调文件。',
        postIds: [23],
      },
    ],
  },
  {
    slug: 'financial-review',
    title: '财务分析工作台',
    shortTitle: '看财务',
    description: '按报表处理、经营质量、交易建模和模型审计进入。',
    scenes: ['financial'],
    outcome: '财务分析 / 估值模型 / 交易模型 / 审计问题',
    preview: '读报表 · 看经营 · 搭模型 · 查错误',
    intents: [
      {
        slug: 'extract-statements',
        title: '提取扫描版财报和审计报表',
        description: '用 OCR 处理扫描件和难以复制的财务材料。',
        postIds: [20],
      },
      {
        slug: 'excel-automation',
        title: '让 Agent 直接处理 Excel',
        description: '读取、修改和自动化处理 Excel 数据。',
        postIds: [22],
      },
      {
        slug: 'unit-economics',
        title: '分析单位经济与经营质量',
        description: '分析 ARR cohort、LTV/CAC、留存和收入质量。',
        postIds: [50],
      },
      {
        slug: 'transaction-models',
        title: '搭建并购与 LBO 模型',
        description: '测算收购估值、杠杆回报和增厚稀释。',
        postIds: [52, 59],
      },
      {
        slug: 'three-statements',
        title: '搭建三表联动模型',
        description: '打通利润表、资产负债表和现金流量表。',
        postIds: [53],
      },
      {
        slug: 'model-audit',
        title: '审计模型和识别风险',
        description: '检查硬编码、断链、公式错误和关键风险。',
        postIds: [55, 26],
      },
    ],
  },
  {
    slug: 'ic-memo',
    title: 'IC 材料工作台',
    shortTitle: '写 IC',
    description: '把尽调结论写成投资建议书，并完成格式处理和交付检查。',
    scenes: ['ic'],
    outcome: 'IC Memo / Word 投资建议书 / 汇报材料',
    preview: '写 Memo · 出 Word · 做 Office · 查格式',
    intents: [
      {
        slug: 'memo',
        title: '撰写 IC Memo',
        description: '把项目判断、尽调结论和风险写成投资建议书。',
        postIds: [51],
      },
      {
        slug: 'word-output',
        title: '生成正式 Word 投资建议书',
        description: '直接输出可继续编辑和流转的 Word 材料。',
        postIds: [146],
      },
      {
        slug: 'office-automation',
        title: '自动处理 Word、Excel 和 PPT',
        description: '让 Agent 完成 Office 文档的生成和修改。',
        postIds: [25],
      },
      {
        slug: 'quality-check',
        title: '检查汇报材料格式',
        description: '发现 PPT 中的拼写、大小写和格式问题。',
        postIds: [19],
      },
    ],
  },
  {
    slug: 'portfolio',
    title: '投后管理工作台',
    shortTitle: '管投后',
    description: '跟踪经营表现、识别风险，并规划投后赋能与退出准备。',
    scenes: ['post-investment'],
    outcome: '经营点评 / 风险监控 / 赋能与退出计划',
    preview: '看经营 · 找风险 · 做赋能 · 备退出',
    intents: [
      {
        slug: 'performance-review',
        title: '快速分析经营表现',
        description: '从财报和业绩会材料形成经营点评。',
        postIds: [61],
      },
      {
        slug: 'portfolio-actions',
        title: '制定风险监控和赋能动作',
        description: '覆盖风险跟踪、增值赋能和退出准备。',
        postIds: [95],
      },
    ],
  },
  {
    slug: 'lp-reporting',
    title: '募资与基金运营工作台',
    shortTitle: '做 LP 汇报',
    description: '处理基金运营、政府引导基金沟通和募资交易材料。',
    scenes: ['fundraising', 'fund-ops'],
    outcome: '基金运营 SOP / 推介材料 / 募资与交易文件',
    preview: '基金运营 · 政府基金 · 推介材料 · 交易流程',
    intents: [
      {
        slug: 'fund-operations',
        title: '梳理基金运营全流程',
        description: '处理基金设立、管理、估值、报告和清算事项。',
        postIds: [96],
      },
      {
        slug: 'government-funds',
        title: '应对政府引导基金',
        description: '理解返投要求、政策变化和 GP 谈判策略。',
        postIds: [97],
      },
      {
        slug: 'marketing-materials',
        title: '准备项目推介材料',
        description: '撰写 CIM 和匿名 Teaser，清楚表达项目卖点。',
        postIds: [56, 57],
      },
      {
        slug: 'buyer-process',
        title: '组织买家与交易流程',
        description: '建立买家清单并准备竞标流程文件。',
        postIds: [58, 60],
      },
    ],
  },
];

export function getTaskMap(slug?: string | null) {
  return taskMaps.find((task) => task.slug === slug);
}

export function getTaskMapSkillCount(task: TaskMap) {
  return new Set(task.intents.flatMap((intent) => intent.postIds)).size;
}
