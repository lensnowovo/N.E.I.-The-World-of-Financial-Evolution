/**
 * AI 转写：GitHub URL → 结构化 skill 资产字段。
 *
 * 流程：解析 GitHub URL → raw.githubusercontent.com 抓原文 → 喂给 Claude →
 * 返回 { title, body, branch, tagSkill, tagScene, tagContent, ... }。
 *
 * AI 输出的分类标签严格落在 lib/tags.ts 的封闭枚举内（system prompt 喂完整枚举），
 * 保证预填后能通过 POST /api/posts 的校验。
 */
import Anthropic from '@anthropic-ai/sdk';
import { SCENE_TAGS, INDUSTRY_TAGS, CONTENT_TAGS, SKILL_TAGS } from '@/lib/tags';

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

export function isAiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export type TranscribedSkill = {
  title: string;
  intro: string; // 中文介绍正文（HTML）
  branch: 'prompt' | 'file' | 'method';
  tagSkill: string;
  tagScene: string;
  tagIndustry?: string | null;
  tagContent: string[];
  installHint?: string | null;
  shouldAttach: boolean; // 是否把抓来的原文作为附件
  originalAuthor?: string | null; // 原作者（从 GitHub URL owner 提取）
};

/**
 * 把 GitHub URL 转成 raw.githubusercontent.com URL。
 * 支持 github.com/owner/repo/blob/branch/path 和 raw URL 两种。
 */
function toRawUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // 已经是 raw
    if (u.hostname === 'raw.githubusercontent.com') return url;
    if (u.hostname !== 'github.com') return null;
    // /owner/repo/blob/branch/path → /owner/repo/branch/path
    const m = u.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
    if (!m) return null;
    return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`;
  } catch {
    return null;
  }
}

/**
 * 判断是否 GitHub 文件 URL（而非仓库主页）。
 */
export function isGitHubFileUrl(url: string): boolean {
  return /github\.com\/[^/]+\/[^/]+\/blob\//.test(url) ||
    /raw\.githubusercontent\.com\//.test(url);
}

async function fetchGitHubContent(url: string): Promise<{ text: string; fileName: string } | null> {
  const rawUrl = toRawUrl(url);
  if (!rawUrl) return null;
  const res = await fetch(rawUrl, { redirect: 'follow' });
  if (!res.ok) return null;
  const text = await res.text();
  const fileName = rawUrl.split('/').pop() || 'skill.md';
  return { text, fileName };
}

// system prompt：喂完整枚举，引导 AI 输出落在合法值内
const SYSTEM_PROMPT = `你是一个 PEVC（私募股权/风险投资）Skill 资产的编辑助手。
用户会给你一段来自 GitHub 的内容（通常是 SKILL.md、README 或 Prompt），你的任务是把它转写成一个结构化的 skill 资产，方便 PE/VC/FA 从业者发现和使用。

输出必须是严格的 JSON，字段如下：
- title: 中文标题，5-50 字，一句话概括这个 skill 是什么、能做什么
- intro: 中文介绍正文，HTML 格式（用 <p>/<h2>/<ul>/<li> 等），200-800 字。说清楚：这是什么、解决什么问题、怎么用、适合谁。用大白话，不要行话。
- branch: 内容形态分支。"prompt"（一段提示词）、"file"（现成文件，如 SKILL.md/模板/脚本）、"method"（一套工作流或方法论）
- tagSkill: Skill 类型，必须从这些里选：${SKILL_TAGS.map((t) => t.value).join(' / ')}
- tagScene: 工作场景，必须从这些里选：${SCENE_TAGS.map((t) => t.value).join(' / ')}
- tagIndustry: 行业（选填），可从这些里选或 null：${INDUSTRY_TAGS.map((t) => t.value).join(' / ')}
- tagContent: 工作内容标签数组，0-3 个，从这些里选：${CONTENT_TAGS.map((t) => t.value).join(' / ')}
- installHint: 安装/使用说明（选填），一句话告诉读者怎么用
- shouldAttach: 布尔值。如果原内容是 SKILL.md/脚本/模板这种"文件型"资产，建议 true（保留原文作为附件）；如果是 prompt 文本，false

标签说明（value → 含义）：
场景：${SCENE_TAGS.map((t) => `${t.value}(${t.label})`).join('、')}
类型：${SKILL_TAGS.map((t) => `${t.value}(${t.label})`).join('、')}

重要：tagSkill 和 tagScene 必须严格用上面列出的 value（英文），不要用中文 label。
只返回 JSON，不要任何解释或 markdown 代码块标记。`;

export async function transcribeSkill(url: string): Promise<TranscribedSkill> {
  if (!isAiEnabled()) {
    throw new Error('AI 转写未配置：需要设置 ANTHROPIC_API_KEY');
  }

  const fetched = await fetchGitHubContent(url);
  if (!fetched) {
    throw new Error('无法获取 GitHub 内容，请确认是公开仓库的文件链接');
  }

  // 限制输入长度，避免超大文件
  const content = fetched.text.slice(0, 30000);

  const response = await client().messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `源文件名：${fetched.fileName}\n源链接：${url}\n\n--- 原文开始 ---\n${content}\n--- 原文结束 ---`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  const parsed = parseJsonLoose(text);

  // 校验 + 兜底（parsed 字段都是 unknown，逐个 String 化校验）
  const tagSkill = SKILL_TAGS.some((t) => t.value === parsed.tagSkill)
    ? String(parsed.tagSkill)
    : 'agent-skill';
  const tagScene = SCENE_TAGS.some((t) => t.value === parsed.tagScene)
    ? String(parsed.tagScene)
    : 'crm';
  const tagContent = Array.isArray(parsed.tagContent)
    ? parsed.tagContent.filter((c: unknown) => CONTENT_TAGS.some((t) => t.value === c)).slice(0, 3).map(String)
    : [];

  const branch: TranscribedSkill['branch'] =
    parsed.branch === 'prompt' ? 'prompt' : parsed.branch === 'method' ? 'method' : 'file';

  const tagIndustryRaw = parsed.tagIndustry;
  const tagIndustry =
    typeof tagIndustryRaw === 'string' &&
    INDUSTRY_TAGS.some((t) => t.value === tagIndustryRaw)
      ? tagIndustryRaw
      : null;

  return {
    title: String(parsed.title || '').slice(0, 100) || '未命名 Skill',
    intro: String(parsed.intro || '<p>（无介绍）</p>'),
    branch,
    tagSkill,
    tagScene,
    tagIndustry,
    tagContent,
    installHint: parsed.installHint ? String(parsed.installHint).slice(0, 2000) : null,
    shouldAttach: !!parsed.shouldAttach,
    originalAuthor: extractOriginalAuthor(url),
  };
}

/** 从 GitHub URL 提取 owner 并友好化作为原作者 */
function extractOriginalAuthor(url: string): string | null {
  const m = url.match(/github\.com\/([^/]+)\//);
  if (!m) return null;
  const owner = m[1];
  if (owner === 'anthropics') return 'Anthropic';
  return owner.charAt(0).toUpperCase() + owner.slice(1);
}

/** 容错 JSON 解析（去掉可能的 markdown 标记和前后噪音） */
function parseJsonLoose(s: string): Record<string, unknown> {
  let t = s.trim();
  // 去掉 ```json ... ``` 包裹
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  // 找第一个 { 到最后一个 }
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  try {
    return JSON.parse(t);
  } catch {
    return {};
  }
}

/** 把抓来的 GitHub 原文内容也返回（给接口存为附件用） */
export async function transcribeWithSource(url: string): Promise<{
  skill: TranscribedSkill;
  sourceContent: { text: string; fileName: string } | null;
}> {
  const skill = await transcribeSkill(url);
  const sourceContent = await fetchGitHubContent(url);
  return { skill, sourceContent };
}
