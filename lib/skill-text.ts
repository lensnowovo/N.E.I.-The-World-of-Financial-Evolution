/**
 * 从 post body HTML 提取纯文本 Prompt（优先 <pre> 内容）。
 * 共用：MCP server get_skill + API v1 raw + 执行台。
 */
export function extractPlainText(bodyHtml: string): string {
  const preMatch = bodyHtml.match(/<pre[\s\S]*?>([\s\S]*?)<\/pre>/i);
  const raw = preMatch ? preMatch[1] : bodyHtml;
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&hellip;/g, '…')
    .trim();
}
