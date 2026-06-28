import { sceneLabel, contentLabel, skillLabel } from '@/lib/tags';

export type SkillQualityInput = {
  title: string;
  body: string;
  tagScene: string;
  tagContent?: string[] | string | null;
  tagSkill?: string | null;
  assetType?: string | null;
  attachmentsCount?: number;
  sourceUrl?: string | null;
  installHint?: string | null;
  usageNotes?: string | null;
};

export type SkillQualityResult = {
  score: number;
  level: '优秀' | '良好' | '待补充';
  summary: string;
  strengths: string[];
  missing: string[];
  bestFor: string[];
  inputExample: string;
  outputExample: string;
};

export function analyzeSkillQuality(input: SkillQualityInput): SkillQualityResult {
  const bodyText = stripHtml(input.body);
  const tagContent = parseTagContent(input.tagContent);
  const assetType = input.assetType || input.tagSkill || null;
  const hasPlaceholder = /(\[[^\]]{2,}\]|{{[^}]{2,}}|<[^>]{2,}>)/.test(bodyText);
  const hasSteps = /(步骤|step\s*\d+|第一|第二|第三|1[.、]|2[.、]|3[.、]|流程|workflow)/i.test(bodyText);
  const hasInputOutput = /(输入|输出|input|output|示例|example|交付物|产出)/i.test(bodyText);
  const hasScenario = Boolean(input.tagScene);
  const hasAssetMeta = Boolean(input.sourceUrl || input.installHint || input.usageNotes);
  const attachmentOptionalTypes = new Set(['prompt', 'workflow', 'agent-discipline', 'case-study']);
  const hasAttachmentWhenNeeded = assetType && !attachmentOptionalTypes.has(assetType)
    ? (input.attachmentsCount ?? 0) > 0
    : true;
  const longEnough = bodyText.length >= 180;
  const titleClear = input.title.trim().length >= 8;
  const hasContentTags = tagContent.length > 0;

  const checks = [
    { ok: titleClear, points: 10, strength: '标题足够具体', missing: '把标题写成「场景 + 动作 + 产出」' },
    { ok: hasScenario, points: 10, strength: '已标注适用场景', missing: '补充最核心的使用场景' },
    { ok: hasContentTags, points: 10, strength: '有工作内容标签', missing: '补充 1-3 个工作内容标签' },
    { ok: longEnough, points: 20, strength: '正文信息量足够', missing: '补充背景、使用步骤或注意事项' },
    { ok: hasPlaceholder, points: 15, strength: '包含可替换输入位', missing: '用 [公司名]、[行业] 这类占位符标出输入' },
    { ok: hasSteps, points: 15, strength: '有步骤化结构', missing: '补充 1/2/3 步骤或工作流顺序' },
    { ok: hasInputOutput, points: 10, strength: '说明了输入/输出或示例', missing: '补充输入示例和输出预期' },
    { ok: hasAssetMeta, points: 5, strength: '有来源/安装/使用说明', missing: '补充来源、安装或适用人群说明' },
    { ok: hasAttachmentWhenNeeded, points: 5, strength: '文件型 Skill 附件完整', missing: '文件/模板型 Skill 建议附上可下载材料' },
  ];

  const score = Math.min(100, checks.reduce((sum, c) => sum + (c.ok ? c.points : 0), 0));
  const strengths = checks.filter((c) => c.ok).map((c) => c.strength).slice(0, 4);
  const missing = checks.filter((c) => !c.ok).map((c) => c.missing).slice(0, 4);
  const level = score >= 80 ? '优秀' : score >= 60 ? '良好' : '待补充';
  const assetLabel = assetType ? skillLabel(assetType) : 'Skill';
  const bestFor = [
    input.tagScene ? sceneLabel(input.tagScene) : '未标注场景',
    ...tagContent.slice(0, 2).map((tag) => contentLabel(tag)),
    assetLabel,
  ];

  return {
    score,
    level,
    summary: score >= 80
      ? '结构完整，适合进入收藏与 MCP 调用。'
      : score >= 60
        ? '核心信息可用，补齐示例后会更容易复用。'
        : '还需要补充输入、步骤和输出预期，才能稳定复用。',
    strengths,
    missing,
    bestFor,
    inputExample: inferInputExample(bodyText, input.tagScene),
    outputExample: inferOutputExample(bodyText, input.tagScene),
  };
}

function parseTagContent(value: SkillQualityInput['tagContent']): string[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferInputExample(body: string, scene: string): string {
  const placeholder = body.match(/\[[^\]]{2,}\]|{{[^}]{2,}}|<[^>]{2,}>/)?.[0];
  if (placeholder) return `替换 ${placeholder}，再补充公司/行业/资料链接等上下文。`;
  if (scene === 'industry-research') return '输入行业名称、目标市场、时间范围与关注问题。';
  if (scene === 'business-dd') return '输入公司名称、访谈纪要、官网/融资资料与待验证假设。';
  if (scene === 'ic') return '输入项目摘要、核心争议点和需要 IC 判断的结论。';
  return '输入你的业务对象、当前目标和已有材料。';
}

function inferOutputExample(body: string, scene: string): string {
  if (/(表格|table)/i.test(body)) return '输出结构化表格，包含判断、证据、风险和下一步动作。';
  if (scene === 'industry-research') return '输出赛道地图、关键玩家、增长驱动和风险清单。';
  if (scene === 'business-dd') return '输出尽调问题清单、证据等级和待补材料。';
  if (scene === 'ic') return '输出 IC 摘要、投资亮点、核心风险和建议决策。';
  return '输出可直接复制进工作流的结构化结论。';
}
