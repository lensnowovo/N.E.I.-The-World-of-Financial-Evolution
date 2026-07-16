import { stripHtml } from '@/lib/validate';
import { normalizePublicText } from '@/lib/public-url';

export const MCP_STAGE_SCENES = {
  'pre-deal': ['sourcing', 'screening', 'industry-research', 'business-dd'],
  deal: ['financial', 'legal', 'ic'],
  'post-deal': ['post-investment', 'fundraising', 'fund-ops', 'crm'],
} as const;

type Stage = keyof typeof MCP_STAGE_SCENES;

type IntentRule = {
  code: string;
  label: string;
  terms: string[];
  scenes?: string[];
  industries?: string[];
  contentTags?: string[];
};

const INTENT_RULES: IntentRule[] = [
  {
    code: 'bp-screening',
    label: '项目初筛',
    terms: ['bp 初筛', 'bp初筛', '拆 bp', '拆bp', '看 bp', '看bp', 'bp', '初筛', '项目初筛', '值不值得继续看', '要不要深看', '立项判断', 'screening'],
    scenes: ['screening'],
    contentTags: ['company-profile', 'risk-id'],
  },
  {
    code: 'industry-research',
    label: '行业研究',
    terms: ['行业研究', '产业研究', '赛道研究', '研究赛道', '看看赛道', '行业报告', '产业报告', '行业概览', '陌生行业', '快速了解一个行业', 'research'],
    scenes: ['industry-research'],
    contentTags: ['info-gather', 'competitive-map', 'report-gen'],
  },
  {
    code: 'market-sizing',
    label: '市场空间测算',
    terms: ['市场空间', '市场规模', '测算空间', 'tam', 'sam', 'som', 'market size', 'market sizing'],
    scenes: ['industry-research'],
    contentTags: ['competitive-map'],
  },
  {
    code: 'competitive-research',
    label: '竞争格局研究',
    terms: ['竞争格局', '竞品分析', '竞争分析', '竞品地图', '可比公司', 'competitive landscape'],
    scenes: ['industry-research', 'business-dd'],
    contentTags: ['competitive-map', 'company-profile'],
  },
  {
    code: 'commercial-dd',
    label: '商业尽调',
    terms: ['商业尽调', '做尽调', '尽调', '验证业务', '验证商业模式', 'diligence', 'dd'],
    scenes: ['business-dd'],
    contentTags: ['risk-id', 'company-profile'],
  },
  {
    code: 'interview',
    label: '访谈准备',
    terms: ['访谈提纲', '创始人访谈', '客户访谈', '专家访谈', '供应商访谈', '访谈创始人', '访谈专家', '访谈客户', '访谈', 'expert call', 'interview'],
    scenes: ['business-dd'],
    contentTags: ['expert-call'],
  },
  {
    code: 'financial-analysis',
    label: '财务分析',
    terms: ['财务分析', '看财务', '财务质量', '三表联动', '现金流', '建模', '财务模型', '估值模型', 'financial'],
    scenes: ['financial'],
    contentTags: ['data-clean', 'risk-id'],
  },
  {
    code: 'return-analysis',
    label: '投资回报测算',
    terms: ['irr', 'moic', '退出回报', '投资回报', '回报测算', '收益测算'],
    scenes: ['financial'],
  },
  {
    code: 'ic-materials',
    label: '投委会材料',
    terms: ['ic memo', 'ic材料', 'ic 材料', '写 ic', '写ic', '准备上会', '投委会材料', '投委会 memo', '投资备忘录', '立项报告'],
    scenes: ['ic'],
    contentTags: ['memo', 'debate', 'risk-id'],
  },
  {
    code: 'post-investment',
    label: '投后管理',
    terms: ['投后管理', '投后分析', '投后月报', '月报没达标', '经营跟踪', '跟踪被投企业', '被投企业', '风险预警'],
    scenes: ['post-investment'],
    contentTags: ['risk-id', 'report-gen'],
  },
  {
    code: 'lp-reporting',
    label: '募资与 LP 汇报',
    terms: ['lp 汇报', 'lp汇报', 'lp 季报', 'lp季报', '募资材料', '基金季报', '基金年报', 'fundraising'],
    scenes: ['fundraising'],
    contentTags: ['report-gen'],
  },
  {
    code: 'fund-ops',
    label: '基金运营',
    terms: ['基金运营', '基金估值', '基金清算', '运营台账', 'fund ops'],
    scenes: ['fund-ops'],
    contentTags: ['automation'],
  },
  {
    code: 'knowledge-management',
    label: '知识管理',
    terms: ['知识管理', '知识库', '会议纪要沉淀', '团队知识', 'crm'],
    scenes: ['crm'],
    contentTags: ['doc-parse', 'automation'],
  },
  {
    code: 'sourcing',
    label: '项目发现',
    terms: ['项目发现', '找项目', '扫项目', '项目来源', '创始人清单', 'deal sourcing', 'sourcing'],
    scenes: ['sourcing'],
    contentTags: ['info-gather', 'company-profile'],
  },
  {
    code: 'legal',
    label: '法务合规',
    terms: ['法务', '合规', '投资协议', '交易条款', 'vie', '法律风险', 'legal'],
    scenes: ['legal'],
    contentTags: ['risk-id'],
  },
];

const INDUSTRY_RULES: IntentRule[] = [
  { code: 'biotech', label: '生物医药 / CGT', terms: ['细胞与基因', '细胞治疗', '基因治疗', 'cgt', '生物医药', '创新药', 'biotech', '生命科学'], industries: ['biotech'] },
  { code: 'healthcare', label: '医疗服务 / 器械', terms: ['医疗器械', '医疗服务', '医疗健康', '器械', 'healthcare'], industries: ['healthcare'] },
  { code: 'semiconductor', label: '半导体 / 芯片', terms: ['半导体', '芯片', '集成电路', '晶圆', '封测', 'semiconductor'], industries: ['semiconductor'] },
  { code: 'ai-saas', label: 'AI / SaaS', terms: ['人工智能', '大模型', 'ai', 'saas', '企业软件'], industries: ['ai-saas'] },
  { code: 'robotics', label: '具身智能 / 机器人', terms: ['具身智能', '机器人', '工业机器人', 'robotics'], industries: ['robotics'] },
  { code: 'climate', label: '新能源 / 储能', terms: ['新能源', '储能', '光伏', '风电', '氢能', '电池', 'climate'], industries: ['climate'] },
  { code: 'consumer', label: '消费 / 品牌', terms: ['消费', '品牌', '零售', '餐饮', 'consumer'], industries: ['consumer'] },
  { code: 'materials', label: '新材料', terms: ['新材料', '材料行业', '先进材料'], industries: ['materials'] },
  { code: 'aerospace', label: '商业航天', terms: ['商业航天', '卫星', '火箭', 'aerospace'], industries: ['aerospace'] },
  { code: 'fintech', label: '金融科技', terms: ['金融科技', 'fintech'], industries: ['fintech'] },
  { code: 'cross-border', label: '出海 / 全球化', terms: ['出海', '全球化', '海外市场', 'cross border'], industries: ['cross-border'] },
];

export type McpTaskInterpretation = {
  interpretedIntent: string;
  intentCodes: string[];
  inferredScenes: string[];
  inferredIndustries: string[];
  inferredContentTags: string[];
  matchedSignals: string[];
  searchTerms: string[];
};

export type McpSearchCandidate = {
  id: number;
  title: string;
  body?: string | null;
  tagScene?: string | null;
  tagIndustry?: string | null;
  tagSkill?: string | null;
  tagContent?: string | null;
  featured?: boolean | null;
  viewCount?: number | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  skillAsset?: { assetType?: string | null; originalAuthor?: string | null } | null;
  author?: { nickname?: string | null } | null;
  _count?: { stars?: number; comments?: number; attachments?: number } | null;
};

export type McpRankedCandidate<T extends McpSearchCandidate = McpSearchCandidate> = {
  post: T;
  score: number;
  semanticScore: number;
  matchedSignals: string[];
};

export function normalizeMcpSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[，。、；：？！“”《》"'`~!@#$%^&*()[\]{}|\\/?+=_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function matchRules(normalized: string, rules: IntentRule[]) {
  return rules
    .map((rule) => ({
      rule,
      matchedTerms: rule.terms.filter((term) => normalized.includes(normalizeMcpSearchText(term))),
    }))
    .filter((entry) => entry.matchedTerms.length > 0);
}

export function interpretMcpTask(text?: string | null): McpTaskInterpretation {
  const normalized = normalizeMcpSearchText(text ?? '');
  if (!normalized) {
    return {
      interpretedIntent: '未指定任务',
      intentCodes: [],
      inferredScenes: [],
      inferredIndustries: [],
      inferredContentTags: [],
      matchedSignals: [],
      searchTerms: [],
    };
  }

  const intentMatches = matchRules(normalized, INTENT_RULES);
  const industryMatches = matchRules(normalized, INDUSTRY_RULES);
  const fallbackIndustryResearch = intentMatches.length === 0 && industryMatches.length > 0;
  const effectiveIntentMatches = fallbackIndustryResearch
    ? [...intentMatches, { rule: INTENT_RULES.find((rule) => rule.code === 'industry-research')!, matchedTerms: ['行业语境'] }]
    : intentMatches;
  const intentLabels = unique(effectiveIntentMatches.map(({ rule }) => rule.label));
  const industryLabels = unique(industryMatches.map(({ rule }) => rule.label));
  const intentCodes = unique(effectiveIntentMatches.map(({ rule }) => rule.code));
  let inferredScenes = unique(effectiveIntentMatches.flatMap(({ rule }) => rule.scenes ?? []));
  const hasDirectDiligenceIntent = intentCodes.some((code) => code === 'commercial-dd' || code === 'interview');
  const hasResearchIntent = intentCodes.some((code) =>
    code === 'industry-research' || code === 'market-sizing' || code === 'competitive-research',
  );
  if (hasResearchIntent && !hasDirectDiligenceIntent) {
    inferredScenes = inferredScenes.filter((scene) => scene !== 'business-dd');
  }
  const matchedSignals = unique([
    ...effectiveIntentMatches.flatMap(({ matchedTerms }) => matchedTerms),
    ...industryMatches.flatMap(({ matchedTerms }) => matchedTerms),
  ]);
  const rawTerms = normalized.split(/\s+/).filter((term) => term.length >= 2 || /^[a-z0-9]+$/.test(term));

  return {
    interpretedIntent: [...intentLabels, ...industryLabels].join(' · ') || '通用 Skill 检索',
    intentCodes,
    inferredScenes,
    inferredIndustries: unique(industryMatches.flatMap(({ rule }) => rule.industries ?? [])),
    inferredContentTags: unique(effectiveIntentMatches.flatMap(({ rule }) => rule.contentTags ?? [])),
    matchedSignals,
    searchTerms: unique([normalized, ...rawTerms, ...matchedSignals, ...intentLabels, ...industryLabels]),
  };
}

export function resolveMcpScenes({
  scene,
  text,
  stage,
}: {
  scene?: string;
  text?: string | null;
  stage?: Stage;
}) {
  if (scene) return [scene];
  const inferred = interpretMcpTask(text).inferredScenes;
  if (!stage) return inferred;
  const staged = [...MCP_STAGE_SCENES[stage]];
  if (inferred.length === 0) return staged;
  const intersection = inferred.filter((value) => staged.includes(value as never));
  return intersection.length > 0 ? unique(intersection) : unique(inferred);
}

function safeTags(raw?: string | null) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function includesAny(text: string, terms: string[]) {
  return terms.filter((term) => term && text.includes(normalizeMcpSearchText(term)));
}

function recencyTime(value?: Date | string | null) {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

/**
 * Deterministic relevance scoring for MCP discovery.
 * Semantic task/industry matches dominate. Engagement is capped at 12 points,
 * so a popular but irrelevant Skill cannot outrank a relevant low-traffic one.
 */
export function scoreMcpCandidate<T extends McpSearchCandidate>(
  post: T,
  input: {
    text?: string | null;
    explicitScene?: string;
    explicitIndustry?: string;
    interpretation?: McpTaskInterpretation;
  },
): McpRankedCandidate<T> {
  const interpretation = input.interpretation ?? interpretMcpTask(input.text);
  const normalizedQuery = normalizeMcpSearchText(input.text ?? '');
  const title = normalizeMcpSearchText(post.title || '');
  const body = normalizeMcpSearchText(stripHtml(normalizePublicText(post.body || '')));
  const tags = safeTags(post.tagContent);
  const tagText = normalizeMcpSearchText(tags.join(' '));
  const assetType = normalizeMcpSearchText(post.skillAsset?.assetType || post.tagSkill || '');
  const matchedSignals: string[] = [];
  let score = 0;

  if (normalizedQuery && title === normalizedQuery) {
    score += 240;
    matchedSignals.push('标题完全匹配');
  } else if (normalizedQuery && title.includes(normalizedQuery)) {
    score += 180;
    matchedSignals.push('标题短语匹配');
  }

  const titleTerms = includesAny(title, interpretation.searchTerms.filter((term) => term !== normalizedQuery));
  if (titleTerms.length > 0) {
    score += Math.min(150, titleTerms.length * 50);
    matchedSignals.push(`标题：${titleTerms.slice(0, 3).join('、')}`);
  }

  if (input.explicitScene && post.tagScene === input.explicitScene) {
    score += 150;
    matchedSignals.push(`指定场景：${input.explicitScene}`);
  } else if (post.tagScene && interpretation.inferredScenes.includes(post.tagScene)) {
    score += 120;
    matchedSignals.push(`任务场景：${post.tagScene}`);
  }

  if (input.explicitIndustry && post.tagIndustry === input.explicitIndustry) {
    score += 120;
    matchedSignals.push(`指定行业：${input.explicitIndustry}`);
  } else if (post.tagIndustry && interpretation.inferredIndustries.includes(post.tagIndustry)) {
    score += 95;
    matchedSignals.push(`行业：${post.tagIndustry}`);
  }

  const matchedTags = tags.filter((tag) => interpretation.inferredContentTags.includes(tag));
  if (matchedTags.length > 0) {
    score += Math.min(90, matchedTags.length * 45);
    matchedSignals.push(`内容标签：${matchedTags.join('、')}`);
  }

  const tagTerms = includesAny(tagText, interpretation.searchTerms);
  if (tagTerms.length > 0) score += Math.min(60, tagTerms.length * 20);
  const typeTerms = includesAny(assetType, interpretation.searchTerms);
  if (typeTerms.length > 0) score += Math.min(40, typeTerms.length * 20);
  const bodyTerms = includesAny(body, interpretation.searchTerms);
  if (bodyTerms.length > 0) {
    score += Math.min(48, bodyTerms.length * 8);
    matchedSignals.push(`正文：${bodyTerms.slice(0, 2).join('、')}`);
  }

  const semanticScore = score;
  if (post.featured) {
    score += 10;
    matchedSignals.push('精选内容');
  }

  const stars = post._count?.stars ?? 0;
  const comments = post._count?.comments ?? 0;
  const views = post.viewCount ?? 0;
  const engagement = Math.min(12, Math.log2(1 + stars * 4 + comments * 2 + views * 0.05));
  score += engagement;

  return {
    post,
    score: Math.round(score * 100) / 100,
    semanticScore,
    matchedSignals: unique(matchedSignals),
  };
}

export function rankMcpCandidates<T extends McpSearchCandidate>(
  posts: T[],
  input: {
    text?: string | null;
    explicitScene?: string;
    explicitIndustry?: string;
    interpretation?: McpTaskInterpretation;
    includeZeroScore?: boolean;
  },
) {
  return posts
    .map((post) => scoreMcpCandidate(post, input))
    .filter((entry) => input.includeZeroScore || entry.semanticScore > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const starDiff = (b.post._count?.stars ?? 0) - (a.post._count?.stars ?? 0);
      if (starDiff !== 0) return starDiff;
      const timeDiff = recencyTime(b.post.updatedAt ?? b.post.createdAt) - recencyTime(a.post.updatedAt ?? a.post.createdAt);
      if (timeDiff !== 0) return timeDiff;
      return b.post.id - a.post.id;
    });
}

export function recommendationRole(index: number, total: number): 'primary' | 'supporting' | 'optional' {
  if (index === 0) return 'primary';
  if (index < Math.min(total, 4)) return 'supporting';
  return 'optional';
}

export function recommendationReason(entry: McpRankedCandidate) {
  const signals = entry.matchedSignals.filter((signal) => signal !== '精选内容').slice(0, 2);
  if (signals.length === 0) return '这是当前公开库中与该任务最接近的 MCP-ready Skill。';
  return `匹配${signals.join('；')}。`;
}

export const MCP_RECOMMENDED_SEQUENCES: Record<string, string[]> = {
  sourcing: ['明确项目搜寻标准', '收集和筛选候选项目', '形成跟踪与触达清单'],
  screening: ['提取项目关键事实', '识别亮点、风险和信息缺口', '形成初筛意见与追问清单'],
  'industry-research': ['搭建行业与产业链框架', '测算市场并验证外部证据', '梳理竞争格局与投资判断'],
  'business-dd': ['拆解需要验证的商业问题', '准备访谈与证据采集', '汇总结论、矛盾与待核实事项'],
  financial: ['整理并标准化财务数据', '检查盈利、现金流与关键假设', '形成估值和回报判断'],
  legal: ['提取核心条款与结构', '识别合规和交易风险', '形成法务追问清单'],
  ic: ['组织投资逻辑与关键证据', '呈现风险、估值和反方问题', '形成投委会材料与答辩准备'],
  'post-investment': ['整理经营更新', '识别偏差与异常信号', '形成行动项和投后汇报'],
  fundraising: ['整理基金和组合表现', '提炼进展、风险和解释', '形成 LP 沟通材料'],
  'fund-ops': ['明确运营事项', '整理周期性数据与检查清单', '形成内部记录和交付物'],
  crm: ['清理来源材料', '提取可复用知识', '形成可检索的团队沉淀'],
};
