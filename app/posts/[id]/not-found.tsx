import Link from 'next/link';
import { Ornament } from '@/components/icons/Ornament';

/**
 * 详情页 404 · 该卷不存在或未发布
 */
export default function PostNotFound() {
  return (
    <div className="mx-auto max-w-prose pt-12 text-center">
      <p className="font-display tracking-display text-[11px] text-sepia uppercase mb-4">
        内容不存在
      </p>
      <h1 className="font-serif text-3xl text-ink-brown mb-3">
        找不到这个内容
      </h1>
      <p className="font-serif italic text-leather mb-6">
        它可能已被作者删除，或链接有误
      </p>

      <div className="flex justify-center mb-6 text-leather">
        <Ornament width={64} />
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center h-9 px-4 bg-ink-brown text-vellum hover:bg-wax-red font-serif text-sm rounded-sm transition-colors"
        >
          回到首页
        </Link>
      </div>
    </div>
  );
}
