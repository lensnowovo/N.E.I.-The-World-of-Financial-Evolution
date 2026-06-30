import fs from 'node:fs';
import path from 'node:path';

export function loadEnvFile(fileName: string) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;

  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function fileCachePath(storageKey: string) {
  return path.join(process.cwd(), 'public', 'file-cache', path.basename(storageKey));
}

export function uploadsPath(storageKey: string) {
  return path.join(process.cwd(), 'uploads', path.basename(storageKey));
}

export function canGenerateMarkdown(fileName: string) {
  return /\.(md|markdown|txt)$/i.test(fileName);
}

export function markdownFromHtml(title: string, bodyHtml: string) {
  const text = htmlToText(bodyHtml);
  if (!text) return '';
  return `# ${title}\n\n${text}\n`;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h1|h2|h3|blockquote|pre)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
