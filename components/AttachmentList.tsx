import Link from 'next/link';
import { FileSeal } from '@/components/icons/FileSeal';
import { formatBytes, truncate } from '@/lib/format';

type Attachment = {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  downloadCount: number;
};

/**
 * AttachmentList · 附件 / 卷宗附记
 * 每条附件用蜡封图标 + 衬线文件名，像档案目录里的附录
 * 未登录时下载按钮变成"登录后下载"指引
 */
export function AttachmentList({
  postId,
  attachments,
  isAuthed,
  headerTitle = '附件',
}: {
  postId: number;
  attachments: Attachment[];
  isAuthed: boolean;
  headerTitle?: string;
}) {
  if (!attachments.length) return null;

  return (
    <section className="mt-12">
      {/* 章节小标题 */}
      <div className="flex items-baseline gap-3 mb-5">
        <h3 className="font-serif text-xl text-ink-brown">{headerTitle}</h3>
        <span className="font-serif italic text-sm text-sepia">
          共 <span className="num-osf">{attachments.length}</span> 个
        </span>
      </div>

      {/* 列表 */}
      <ul className="border-t border-paper-edge">
        {attachments.map((a) => {
          const ext = (a.fileName.split('.').pop() ?? '?').toLowerCase();
          return (
            <li
              key={a.id}
              className="group flex items-center gap-5 py-4 border-b border-paper-edge hover:bg-vellum/60 -mx-2 px-2 transition-colors"
            >
              <FileSeal ext={ext} size={44} />
              <div className="min-w-0 flex-1">
                <p
                  className="font-serif text-base text-ink-brown truncate"
                  title={a.fileName}
                >
                  {truncate(a.fileName, 56)}
                </p>
                <p className="mt-1 font-sans text-xs text-sepia">
                  <span className="num-osf">{formatBytes(a.fileSize)}</span>
                  <span className="mx-1.5">·</span>
                  下载{' '}
                  <span className="num-osf">{a.downloadCount}</span> 次
                </p>
              </div>
              {isAuthed ? (
                <a
                  href={`/api/files/${a.id}/download`}
                  download
                  className="inline-flex items-center h-9 px-4 border border-ink-brown text-ink-brown hover:bg-ink-brown hover:text-vellum font-serif text-sm rounded-sm transition-colors"
                >
                  下载
                </a>
              ) : (
                <Link
                  href={`/login?next=/posts/${postId}`}
                  className="font-serif italic text-sm text-sepia hover:text-ink-brown underline underline-offset-4 decoration-paper-edge hover:decoration-ink-brown"
                >
                  登录后下载
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
