import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { POST_STATUS } from '@/lib/status';
import { listSkillRequests } from '@/lib/skill-requests';
import { SkillRequestBoard } from './SkillRequestBoard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '需求与解法',
  description: '发布你缺少的 PEVC Skill，认领真实工作需求，并用站内 Skill 提交解决方案。',
};

export default async function SkillRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ publish?: string }>;
}) {
  const query = await searchParams;
  const user = await getCurrentUser();
  const [requests, mySkills] = await Promise.all([
    listSkillRequests({ userId: user?.id ?? null, sort: 'popular', limit: 80 }),
    user
      ? prisma.post.findMany({
          where: {
            userId: user.id,
            status: POST_STATUS.PUBLISHED,
            deletedAt: null,
            skillAsset: { isNot: null },
          },
          orderBy: { updatedAt: 'desc' },
          select: { id: true, title: true },
          take: 100,
        })
      : Promise.resolve([]),
  ]);

  return (
    <SkillRequestBoard
      initialRequests={requests}
      currentUser={user ? { id: user.id, nickname: user.nickname, isAdmin: user.isAdmin } : null}
      mySkills={mySkills}
      initialPublishOpen={query.publish === '1' && Boolean(user)}
    />
  );
}
