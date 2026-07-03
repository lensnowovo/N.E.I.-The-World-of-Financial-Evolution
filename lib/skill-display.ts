import { normalizePublicText } from '@/lib/public-url';
import { stripHtml } from '@/lib/validate';
import { contentLabel, industryLabel, sceneLabel, skillLabel } from '@/lib/tags';

export type SkillDisplayInput = {
  title: string;
  body: string;
  tagScene: string;
  tagIndustry?: string | null;
  tagContent?: string[];
  tagSkill?: string | null;
  assetType?: string | null;
  usageNotes?: string | null;
  outputExample?: string;
};

export type SkillDisplayMeta = {
  displayTitle: string;
  displaySummary: string;
  displayUseCase: string;
  displayOutput: string;
  displaySteps: string[];
  displayTags: string[];
};

const SCENE_OUTPUTS: Record<string, string> = {
  sourcing: '输出项目线索、赛道清单和下一步触达建议',
  screening: '输出 BP 初筛 Memo、追问清单和初步判断',
  'industry-research': '输出行业研究底稿、赛道判断框架和关键假设',
  'business-dd': '输出商业尽调清单、访谈提纲和验证路径',
  financial: '输出财务质量分析、异常指标和风险问题清单',
  legal: '输出合规风险清单、条款关注点和待确认事项',
  ic: '输出 IC Memo、投委会 Q&A 和决策摘要',
  'post-investment': '输出投后月报、经营异常识别和风险预警',
  fundraising: '输出 LP 季报、基金运营摘要和沟通材料',
  'fund-ops': '输出基金运营材料、流程清单和合规提醒',
  crm: '输出知识库条目、会议纪要和关系维护动作',
};

const SCENE_STEPS: Record<string, string[]> = {
  sourcing: ['项目发现', '线索筛选'],
  screening: ['提取 BP', '初筛判断', '追问清单'],
  'industry-research': ['行业框架', '市场空间', '竞争格局'],
  'business-dd': ['尽调清单', '专家访谈', '商业验证'],
  financial: ['财务质量', '风险识别', '预测校验'],
  legal: ['合规检查', '条款审阅'],
  ic: ['投资逻辑', '风险判断', '投委会 Q&A'],
  'post-investment': ['经营跟踪', '风险预警'],
  fundraising: ['LP 汇报', '基金运营'],
  'fund-ops': ['基金运营', '合规流程'],
  crm: ['知识沉淀', '关系维护'],
};

const SCENE_USE_CASES: Record<string, string> = {
  sourcing: '投资经理、FA、产业投资人在找项目、拉长名单、准备初次触达时使用',
  screening: '投资经理、FA 在看 BP、做项目初筛、判断是否进入立项时使用',
  'industry-research': '投资经理、FA、产业研究人员在陌生赛道扫描、立项前行业判断时使用',
  'business-dd': '投资经理、尽调负责人、FA 在商业尽调、访谈准备和证据验证时使用',
  financial: '投资经理、财务顾问、投后团队在财务质量分析和模型复核时使用',
  legal: '投资经理、法务和合规人员在条款审阅、风险识别时使用',
  ic: '投资经理、项目负责人在写 IC Memo、准备投委会问答时使用',
  'post-investment': '投后负责人、投资经理在经营跟踪、月报整理和风险预警时使用',
  fundraising: 'GP、IR、基金运营团队在 LP 汇报和募资材料准备时使用',
  'fund-ops': 'GP、IR、基金运营人员在基金运营、流程管理和合规提醒时使用',
  crm: '投资团队、知识管理负责人在会议纪要、关系维护和知识沉淀时使用',
};

export function buildSkillDisplay(input: SkillDisplayInput): SkillDisplayMeta {
  const bodyText = cleanText(input.body);
  const assetLabel = skillLabel(input.assetType || input.tagSkill) || 'Skill';
  const scene = sceneLabel(input.tagScene);
  const industry = input.tagIndustry ? industryLabel(input.tagIndustry) : '';
  const contentTags = (input.tagContent || []).map((tag) => contentLabel(tag)).filter(Boolean);

  const displaySummary = clampText(
    firstUsefulSentence(bodyText) ||
      `${input.title}，适合用于${scene || '一级市场'}场景的${assetLabel}。`,
    118,
  );

  const displayUseCase = clampText(
    normalizeUseCaseText(input.usageNotes) ||
      SCENE_USE_CASES[input.tagScene] ||
      `${scene || '一级市场'}相关从业者复用这个${assetLabel}`,
    88,
  );

  const displayOutput = clampText(
    input.outputExample && input.outputExample.length <= 80
      ? input.outputExample
      : SCENE_OUTPUTS[input.tagScene] || `输出可复用的${assetLabel}结果`,
    48,
  );

  const displaySteps = (SCENE_STEPS[input.tagScene] || [scene || '通用工作流'])
    .filter(Boolean)
    .slice(0, 3);

  const displayTags = [
    assetLabel,
    scene,
    industry,
    ...contentTags,
  ].filter(Boolean).slice(0, 5);

  return {
    displayTitle: buildSkillCardTitle(input.title),
    displaySummary,
    displayUseCase,
    displayOutput,
    displaySteps,
    displayTags,
  };
}

export function buildSkillCardTitle(title: string) {
  const clean = title.replace(/\s+/g, ' ').trim();
  if (!clean) return '未命名 Skill';

  const colonIndex = clean.search(/[：:]/);
  if (colonIndex > 0) {
    const prefix = clean.slice(0, colonIndex).trim();
    if (prefix.length >= 3 && prefix.length <= 24) return prefix;
  }

  const withoutParen = clean
    .replace(/[（(][^（）()]{2,32}[）)]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clampText(withoutParen || clean, 26);
}

function cleanText(html: string) {
  return stripHtml(normalizePublicText(html))
    .replace(/^#+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstUsefulSentence(text: string) {
  const cleaned = text
    .replace(/^这(是|个)\s*/g, '')
    .replace(/^本\s*/g, '')
    .trim();
  if (!cleaned) return '';

  const match = cleaned.match(/^(.{24,150}?[。！？.!?])/);
  if (match?.[1]) return match[1];
  return cleaned.slice(0, 118);
}

function normalizeUseCaseText(text?: string | null) {
  if (!text) return '';
  return normalizePublicText(text)
    .replace(/^适合[：:\s]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function clampText(text: string, max: number) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}
