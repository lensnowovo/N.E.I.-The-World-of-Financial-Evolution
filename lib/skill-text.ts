/**
 * 从 post body HTML 提取纯文本 Prompt（优先 <pre> 内容）。
 * 共用：MCP server get_skill + API v1 raw + 执行台。
 */
export function extractPlainText(bodyHtml: string): string {
  const preMatch = bodyHtml.match(/<pre[\s\S]*?>([\s\S]*?)<\/pre>/i);
  const raw = preMatch ? preMatch[1] : bodyHtml;
  return decodeHtmlText(raw.replace(/<[^>]*>/g, ''));
}

/**
 * 从 post body HTML 提取可阅读全文。
 * 与 extractPlainText 不同：不优先只取 <pre>，适合 Discipline / 方法论 / 长文说明。
 */
export function extractReadableText(bodyHtml: string): string {
  const withBreaks = bodyHtml
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h[1-6]|li|ul|ol|pre|blockquote)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]*>/g, '');
  return decodeHtmlText(withBreaks);
}

function decodeHtmlText(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&hellip;/g, '…')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
