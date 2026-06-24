export const isPhone = (v: string) => /^1[3-9]\d{9}$/.test(v);
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const isNickname = (v: string) => v.length >= 2 && v.length <= 20 && !/[<>&"']/.test(v);
export const isPassword = (v: string) =>
  v.length >= 8 && v.length <= 20 && /[A-Za-z]/.test(v) && /\d/.test(v);
export const isCode = (v: string) => /^\d{6}$/.test(v);

const SENSITIVE = ['admin', '管理员', '官方', '客服', 'root'];
export const hasSensitive = (v: string) => SENSITIVE.some((w) => v.toLowerCase().includes(w));

// HTML 清洗（白名单标签 + 属性白名单 + URL scheme 过滤）
// 防 stored XSS：剥离非白名单标签、所有未显式允许的属性（含 on* 事件处理器，无论引号形式）、
// 以及 javascript:/vbscript:/data: 等危险 URL scheme。
const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li',
  'blockquote', 'h1', 'h2', 'h3', 'a', 'code', 'pre', 'img',
]);

// 每个标签允许的属性白名单（tag → attr set）。不在白名单的属性一律剥离。
const ALLOWED_ATTRS: Record<string, ReadonlySet<string>> = {
  a: new Set(['href']),
  img: new Set(['src', 'alt']),
};

// 这些标签连同其内部内容一起删除（而非只删标签），避免脚本/CSS/嵌入内容残留。
const BLOCKED_TAGS_WITH_CONTENT = [
  'script', 'style', 'iframe', 'object', 'embed', 'svg', 'math',
  'template', 'noscript', 'form', 'frame', 'applet', 'head',
];

// 匹配单个标签：<(可选/)><标签名><属性段>。属性段用 [^>]* 近似（见下方说明）。
const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;
// 从属性段中提取 name(=value)?，value 可为双引号/单引号/未加引号。
const ATTR_RE = /\s*([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`]+)))?/g;

function decodeEntitiesForUrl(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&colon;/gi, ':')
    .replace(/&tab;/gi, '\t')
    .replace(/&newline;/gi, '\n')
    .replace(/\s+/g, '');
}

function isSafeUrl(url: string): boolean {
  // 解码 HTML 实体后，浏览器会忽略 scheme 前的空白和控制字符。
  const normalized = decodeEntitiesForUrl(url).toLowerCase().replace(/^[\u0000-\u0020]+/, '');
  return !/^(javascript|vbscript|data):/.test(normalized);
}

function escapeAttr(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function sanitizeHtml(html: string): string {
  let out = html;

  // 1) 整块移除危险元素（含内部内容）。
  for (const tag of BLOCKED_TAGS_WITH_CONTENT) {
    out = out.replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`, 'gi'), '');
    // 兜底：未闭合的孤立开标签也丢掉。
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>`, 'gi'), '');
  }

  // 2) 移除 HTML 注释、CDATA、PI、doctype（IE 条件注释等注入面）。
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  out = out.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  out = out.replace(/<\?[\s\S]*?\?>/g, '');
  out = out.replace(/<!DOCTYPE[^>]*>/gi, '');

  // 3) 逐标签重建：未知标签整段丢弃；已知标签按白名单保留属性。
  out = out.replace(TAG_RE, (_full, closing: string, name: string, attrStr: string) => {
    const tag = name.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (closing === '/') return `</${tag}>`;

    const allowed = ALLOWED_ATTRS[tag];
    const kept: string[] = [];
    if (allowed) {
      ATTR_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = ATTR_RE.exec(attrStr)) !== null) {
        const attrName = m[1].toLowerCase();
        if (!allowed.has(attrName)) continue; // 自动剥离 on* 及一切非白名单属性
        const value = m[2] ?? m[3] ?? m[4] ?? '';
        if ((attrName === 'href' || attrName === 'src') && !isSafeUrl(value)) continue;
        kept.push(`${attrName}="${escapeAttr(value)}"`);
      }
    }
    return `<${tag}${kept.length ? ' ' + kept.join(' ') : ''}>`;
  });

  return out;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}
