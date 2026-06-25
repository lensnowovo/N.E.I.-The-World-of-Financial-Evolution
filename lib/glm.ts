/**
 * GLM（智谱 AI / BigModel）客户端 —— OpenAI 兼容接口。
 *
 * 用松禾项目自有的 GLM key（env: GLM_API_KEY），给站内 AI 功能统一供能：
 *   - 发帖时的「智能发布辅助」（标签 / 摘要 / 占位符建议，见 lib/ai.ts suggestPublish）
 *   - GitHub 导入转写（transcribeSkill）
 *
 * 没有引入 openai SDK：直接 fetch OpenAI 兼容的 /chat/completions，依赖最少、
 * 切换 base_url / 模型只需改环境变量（GLM_BASE_URL / GLM_MODEL）。
 */

// Coding Plan 套餐地址（松禾账户用此，套餐额度在此路径下）；
// 标准按量计费账户则改 GLM_BASE_URL 为 /paas/v4。
const DEFAULT_BASE_URL = 'https://open.bigmodel.cn/api/coding/paas/v4';
const DEFAULT_MODEL = 'glm-4.6';
// transcribe/assist 需要读较长正文 + 生成多字段，glm-4.6 在 Coding Plan 上偶有
// reasoning 耗时，30s 不够；放宽到 55s，配合 route 侧 maxDuration=60（Vercel hobby 上限）。
const TIMEOUT_MS = 55_000;

export function isGlmEnabled(): boolean {
  return !!process.env.GLM_API_KEY;
}

function baseUrl(): string {
  return (process.env.GLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function model(): string {
  return process.env.GLM_MODEL || DEFAULT_MODEL;
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface GlmChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** 强制 JSON 对象输出（GLM 支持 response_format: json_object） */
  jsonMode?: boolean;
}

/**
 * 单轮 chat completion（非流式）。返回 assistant 文本内容。
 * 失败抛 Error（调用方 try/catch 后转成对用户友好的提示）。
 */
export async function glmChat(opts: GlmChatOptions): Promise<string> {
  const key = process.env.GLM_API_KEY;
  if (!key) throw new Error('GLM 未配置：需要设置 GLM_API_KEY');

  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: model(),
        messages: opts.messages,
        temperature: opts.temperature ?? 0.6,
        max_tokens: opts.maxTokens ?? 4000,
        ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '网络异常';
    throw new Error(`GLM 请求失败：${msg.includes('timeout') || msg.includes('abort') ? '响应超时' : msg}`);
  }

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message || body?.msg || JSON.stringify(body).slice(0, 200);
    } catch {
      detail = (await res.text().catch(() => '')).slice(0, 200);
    }
    if (res.status === 401) throw new Error('GLM key 无效或已过期');
    if (res.status === 429) throw new Error('GLM 调用过于频繁，请稍后再试');
    throw new Error(`GLM 请求失败（${res.status}）：${detail || res.statusText}`);
  }

  const data = await res.json();
  const content: unknown = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content) {
    throw new Error('GLM 返回内容为空或格式异常');
  }
  return content;
}

/** 容错 JSON 解析（GLM 偶尔会带 markdown 包裹或前后噪音） */
export function parseJsonLoose(s: string): Record<string, unknown> {
  let t = s.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  try {
    return JSON.parse(t);
  } catch {
    return {};
  }
}
