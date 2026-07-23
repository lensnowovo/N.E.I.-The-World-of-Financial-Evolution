import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUid } from '@/lib/session';
import { ActivationCodePanel } from './ActivationCodePanel';

export const metadata: Metadata = {
  title: '连接 Memory Node｜N.E.I.',
  description: '使用 N.E.I. 账号为本机 Memory Node 生成一次性激活码。',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function MemorySetupPage() {
  const uid = await getSessionUid();
  if (uid === null) redirect('/login?next=/memory/setup');

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href="/memory" className="font-serif text-sm text-sepia transition-colors hover:text-wax-red">
          ← Memory Node
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-wider text-sepia">N.E.I. Account</span>
      </div>
      <ActivationCodePanel />
    </div>
  );
}
