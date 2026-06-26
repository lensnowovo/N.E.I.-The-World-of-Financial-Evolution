export const INVESTOR_ROLES = [
  {
    value: 'VC',
    label: 'VC',
    fullName: 'Venture Capital',
    tagline: '早期与成长阶段投资',
    desc: '关注项目发现、初筛、赛道研究与投资判断',
  },
  {
    value: 'PE',
    label: 'PE',
    fullName: 'Private Equity',
    tagline: '成熟阶段与控股交易',
    desc: '关注商业尽调、财务分析、交易结构与投后价值提升',
  },
  {
    value: 'FA',
    label: 'FA',
    fullName: 'Financial Advisor',
    tagline: '融资与交易顾问',
    desc: '关注项目包装、买方清单、流程管理与交易材料',
  },
  {
    value: 'CVC',
    label: '产业投资',
    fullName: 'Corporate Venture / Strategic Investment',
    tagline: '产业协同与战略布局',
    desc: '关注业务协同、产业资源、战略价值与落地路径',
  },
  {
    value: 'GOV_GUIDANCE',
    label: '政府引导基金',
    fullName: 'Government Guidance Fund',
    tagline: '区域产业与政策目标',
    desc: '关注政策方向、产业集群、基金绩效与合规材料',
  },
  {
    value: 'PORTFOLIO',
    label: '投后',
    fullName: 'Portfolio Management',
    tagline: '经营跟踪与风险预警',
    desc: '关注经营指标、组织变化、风险识别与后续融资准备',
  },
  {
    value: 'LP',
    label: 'LP',
    fullName: 'Limited Partner',
    tagline: '基金配置与组合复盘',
    desc: '关注基金表现、组合进展、管理人评估与 LP 汇报',
  },
  {
    value: 'RESEARCH',
    label: '研究员',
    fullName: 'Investment Research',
    tagline: '赛道洞察与知识沉淀',
    desc: '关注信息整理、行业框架、数据验证与观点沉淀',
  },
] as const;

export type InvestorRole = (typeof INVESTOR_ROLES)[number]['value'];

export const INVESTOR_ROLE_VALUES = INVESTOR_ROLES.map((role) => role.value);

export function isInvestorRole(role: string): role is InvestorRole {
  return INVESTOR_ROLE_VALUES.includes(role as InvestorRole);
}

export function roleLabel(role: string) {
  return INVESTOR_ROLES.find((item) => item.value === role)?.label ?? role;
}

export function roleFullName(role: string) {
  const item = INVESTOR_ROLES.find((option) => option.value === role);
  if (!item) return role;
  return `${item.label} · ${item.fullName}`;
}
