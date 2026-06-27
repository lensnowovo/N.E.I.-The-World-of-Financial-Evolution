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
  outputExample?: string;
};

export type SkillDisplayMeta = {
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
    [scene, industry, contentTags[0]].filter(Boolean).join(' / ') || `${assetLabel} 复用场景`,
    42,
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
    displaySummary,
    displayUseCase,
    displayOutput,
    displaySteps,
    displayTags,
  };
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

function clampText(text: string, max: number) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}
