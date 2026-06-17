import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { Ornament } from '@/components/icons/Ornament';
import { PublishForm } from './PublishForm';

export default async function PublishPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/publish');

  return (
    <div className="mx-auto max-w-prose">
      {/* —— 卷首 —— */}
      <header className="text-center mb-10 mt-2">
        <p className="font-display tracking-display text-[11px] text-sepia uppercase mb-3">
          Compose
        </p>
        <h1 className="font-serif text-4xl text-ink-brown mb-3">分享一个 Skill</h1>
        <p className="font-serif italic text-leather">
          把好用的东西沉淀下来，让群里的人都能用上
        </p>
        <div className="flex justify-center mt-5 text-leather">
          <Ornament width={64} />
        </div>
      </header>

      <PublishForm currentUser={{ id: user.id, role: user.role, nickname: user.nickname }} />
    </div>
  );
}
