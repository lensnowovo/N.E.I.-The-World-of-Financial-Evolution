import path from 'path';
import { marked } from 'marked';
import { sanitizeHtml } from '@/lib/validate';
import { readFileByKey } from '@/lib/storage';

/**
 * SkillPreview · SKILL.md 原文预览（折叠区）
 *
 * 默认折叠，点开渲染附件 markdown 原文（英文）。
 * 平衡小白（不被英文技术文档吓到）和技术人（想看完整原文）。
 *
 * server component：直接读 uploads 文件 + marked 转 HTML + sanitize。
 * 用原生 <details> 折叠，零 client JS、原生可访问。
 *
 * 只有 .md/.markdown 文本附件才预览（二进制文件如 xlsx 无法渲染）。
 */
export async function SkillPreview({
  storageKey,
  fileName,
}: {
  storageKey: string;
  fileName: string;
}) {
  // 只预览文本类附件
  const ext = path.extname(fileName).toLowerCase();
  if (!['.md', '.markdown', '.txt'].includes(ext)) return null;

  let raw: string;
  try {
    // 走存储抽象：本地走 UPLOAD_DIR，生产走 R2/S3（readFileByKey 内部已防路径穿越）
    const buf = await readFileByKey(storageKey);
    raw = buf.toString('utf-8');
  } catch {
    return null; // 文件丢失，静默不渲染预览区
  }

  // marked 配置：GitHub 风格，给代码块加语言标记（不执行高亮，保持轻量）
  marked.setOptions({ gfm: true, breaks: false });
  const html = marked.parse(raw) as string;
  const safe = sanitizeHtml(html);

  return (
    <details className="group mt-8 rounded-md border border-paper-edge bg-vellum/40">
      <summary className="cursor-pointer list-none flex items-center gap-2 px-4 py-3 select-none hover:bg-vellum/60 transition-colors">
        <svg
          className="shrink-0 text-sepia transition-transform group-open:rotate-90"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M3 1.5 L7 5 L3 8.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-serif text-sm text-ink-brown">查看 {fileName} 原文</span>
        <span className="font-mono text-[10px] text-sepia ml-1">
          {raw.length.toLocaleString()} 字符
        </span>
      </summary>
      <div
        className="px-5 pb-5 pt-1 border-t border-paper-edge font-sans text-[13px] text-leather leading-relaxed overflow-x-auto
          [&_h1]:font-serif [&_h1]:text-lg [&_h1]:text-ink-brown [&_h1]:mt-4 [&_h1]:mb-2
          [&_h2]:font-serif [&_h2]:text-base [&_h2]:text-ink-brown [&_h2]:mt-4 [&_h2]:mb-2
          [&_h3]:font-serif [&_h3]:text-sm [&_h3]:text-ink-brown [&_h3]:mt-3 [&_h3]:mb-1.5
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
          [&_li]:my-0.5
          [&_code]:font-mono [&_code]:text-[12px] [&_code]:bg-parchment [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded
          [&_pre]:bg-ink-brown [&_pre]:text-vellum [&_pre]:p-3 [&_pre]:rounded [&_pre]:my-3 [&_pre]:overflow-x-auto
          [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-vellum
          [&_blockquote]:border-l-2 [&_blockquote]:border-gilded [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-sepia [&_blockquote]:my-2
          [&_a]:text-wax-red [&_a]:underline [&_a]:underline-offset-2
          [&_strong]:text-ink-brown"
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    </details>
  );
}
