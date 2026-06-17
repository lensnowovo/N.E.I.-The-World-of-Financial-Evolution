export const isPhone = (v: string) => /^1[3-9]\d{9}$/.test(v);
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const isNickname = (v: string) => v.length >= 2 && v.length <= 20 && !/[<>&"']/.test(v);
export const isPassword = (v: string) =>
  v.length >= 8 && v.length <= 20 && /[A-Za-z]/.test(v) && /\d/.test(v);
export const isCode = (v: string) => /^\d{6}$/.test(v);

const SENSITIVE = ['admin', '管理员', '官方', '客服', 'root'];
export const hasSensitive = (v: string) => SENSITIVE.some((w) => v.toLowerCase().includes(w));

// 极简 HTML 清洗（白名单标签）
const ALLOWED = ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'a', 'code', 'pre', 'img'];
export function sanitizeHtml(html: string): string {
  // 极简实现：剥离所有事件属性、script、iframe
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(new RegExp(`<(?!\\/?(?:${ALLOWED.join('|')})\\b)[^>]*>`, 'gi'), '');
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}
