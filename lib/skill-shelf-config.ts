export const SKILL_SHELF_GROUPS = [
  {
    value: 'project-judgement',
    mark: '02',
    eyebrow: 'Decision Desk',
    label: '项目判断',
    description: '从项目发现、BP 初筛到商业尽调，先判断值不值得继续投入时间。',
    scenes: ['sourcing', 'screening', 'business-dd'],
  },
  {
    value: 'industry-research',
    mark: '03',
    eyebrow: 'Research Desk',
    label: '行业研究',
    description: '建立行业认知、扫描赛道、测算市场，并形成可以继续验证的研究框架。',
    scenes: ['industry-research'],
  },
  {
    value: 'finance-and-ic',
    mark: '04',
    eyebrow: 'Committee Desk',
    label: '财务与 IC',
    description: '处理财务判断、交易风险和投委会表达，把研究结果变成决策材料。',
    scenes: ['financial', 'legal', 'ic'],
  },
  {
    value: 'portfolio-and-fund',
    mark: '05',
    eyebrow: 'Operations Desk',
    label: '投后、募资与基金运营',
    description: '覆盖投后跟踪、LP 沟通、知识沉淀和基金日常运营。',
    scenes: ['post-investment', 'fundraising', 'fund-ops', 'crm'],
  },
] as const;

export type SkillShelfValue = (typeof SKILL_SHELF_GROUPS)[number]['value'];
