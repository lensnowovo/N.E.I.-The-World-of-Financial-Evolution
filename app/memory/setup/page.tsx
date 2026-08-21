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

export default async function MemorySetupPage({
  searchParams,
}: {
  searchParams: Promise<{ desktop_state?: string }>;
}) {
  const { desktop_state: desktopState } = await searchParams;
  const uid = await getSessionUid();
  if (uid === null) {
    const next = desktopState
      ? `/memory/setup?desktop_state=${encodeURIComponent(desktopState)}`
      : '/memory/setup';
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  const safeDesktopState = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(desktopState ?? '')
    ? desktopState ?? null
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href="/memory" className="font-serif text-sm text-sepia transition-colors hover:text-wax-red">
          ← Memory Node
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-wider text-sepia">N.E.I. Account</span>
      </div>
      <ActivationCodePanel desktopState={safeDesktopState} />
    </div>
  );
}
