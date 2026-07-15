import { getSessionUid } from '@/lib/session';
import { fetchFeedPage, hasAnyFilter, parseFeedQuery } from '@/lib/feed';
import { prisma } from '@/lib/db';
import { POST_STATUS } from '@/lib/status';
import { FilterStrip } from '@/components/FilterStrip';
import { HomeHero } from '@/components/home/HomeHero';
import { HomeTaskGrid } from '@/components/home/HomeTaskGrid';
import { HomeMcpFeature } from '@/components/home/HomeMcpFeature';
import { HomeMemoryFeature } from '@/components/home/HomeMemoryFeature';
import { HomeSkillShelves } from '@/components/home/HomeSkillShelves';
import { HomeSideDock, type HomeSideDockData } from '@/components/home/HomeSideDock';
import { SkillFeed } from '@/components/SkillFeed';
import { fetchHomeSkillShelves } from '@/lib/home-shelves';

type SP = { [k: string]: string | string[] | undefined };

export default async function HomePage({ searchParams }: { searchParams: Promise<SP> }) {
  const rawSearchParams = await searchParams;
  const query = parseFeedQuery(rawSearchParams);
  const uid = await getSessionUid();
  const hasFilter = hasAnyFilter(query) || typeof rawSearchParams.sort === 'string';

  const [feedPage, shelves, totalSkills, workflowCount, sideDockData] = await Promise.all([
    hasFilter ? fetchFeedPage({ ...query, page: 1, pageSize: 24 }, uid) : Promise.resolve(null),
    hasFilter ? Promise.resolve([]) : fetchHomeSkillShelves(uid),
    prisma.post.count({
      where: { status: POST_STATUS.PUBLISHED, deletedAt: null, skillAsset: { isNot: null } },
    }),
    prisma.post.count({
      where: {
        status: POST_STATUS.PUBLISHED,
        deletedAt: null,
        skillAsset: { is: { assetType: 'workflow' } },
      },
    }),
    fetchHomeSideDockData(uid),
  ]);
  const querySignature = buildQuerySignature(rawSearchParams);

  return (
    <div>
      <HomeSideDock data={sideDockData} />
      <HomeHero totalSkills={totalSkills} workflowCount={workflowCount} />
      <HomeTaskGrid />
      <HomeMcpFeature
        status={{
          signedIn: Boolean(sideDockData.user),
          hasMcpToken: Boolean(sideDockData.user?.hasMcpToken),
          lastMcpCallAt: sideDockData.user?.lastMcpCallAt ?? null,
        }}
      />
      <HomeMemoryFeature />

      <section id="skill-library" className="scroll-mt-24 pt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-5">
          <div>
            <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-1">
              Skill Feed
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl text-ink-brown">
              {hasFilter ? '正在筛选 Skill Library' : '按工作任务浏览 Skill Library'}
            </h2>
          </div>
          <p className="font-sans text-xs sm:text-sm text-sepia">
            {hasFilter
              ? '搜索、筛选、收藏，也可以从上方工作地图按手头任务查找。'
              : '每栏先看四条；需要时再进入完整目录。'}
          </p>
        </div>

        <FilterStrip />
        {hasFilter && feedPage ? (
          <SkillFeed
            initialItems={feedPage.items}
            initialHasMore={feedPage.hasMore}
            initialTotal={feedPage.total}
            currentUserId={uid}
            querySignature={querySignature}
          />
        ) : (
          <HomeSkillShelves shelves={shelves} currentUserId={uid} />
        )}
      </section>
    </div>
  );
}

function buildQuerySignature(searchParams: SP) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') params.set(key, value);
    else if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
  }
  return params.toString();
}

async function fetchHomeSideDockData(uid: number | null): Promise<HomeSideDockData> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayNewCountPromise = prisma.post.count({
    where: {
      status: POST_STATUS.PUBLISHED,
      deletedAt: null,
      createdAt: { gte: todayStart },
    },
  });

  if (!uid) {
    return {
      user: null,
      stats: {
        favoriteCount: 0,
        postCount: 0,
        mcpReadyCount: 0,
        todayNewCount: await todayNewCountPromise,
      },
    };
  }

  const [user, favoriteCount, postCount, mcpReadyCount, lastMcpCall, todayNewCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: uid },
      select: {
        id: true,
        nickname: true,
        role: true,
        institution: true,
        avatarUrl: true,
        githubAvatarUrl: true,
        mcpTokenHash: true,
        tokenLastUsedAt: true,
      },
    }),
    prisma.postFavorite.count({
      where: {
        userId: uid,
        post: { status: POST_STATUS.PUBLISHED, deletedAt: null },
      },
    }),
    prisma.post.count({
      where: { userId: uid, status: POST_STATUS.PUBLISHED, deletedAt: null },
    }),
    prisma.post.count({
      where: { userId: uid, status: POST_STATUS.PUBLISHED, deletedAt: null, mcpApproved: true },
    }),
    prisma.mcpCallLog.findFirst({
      where: { userId: uid },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    todayNewCountPromise,
  ]);

  return {
    user: user
      ? {
          id: user.id,
          nickname: user.nickname,
          role: user.role,
          institution: user.institution,
          avatarUrl: user.avatarUrl,
          githubAvatarUrl: user.githubAvatarUrl,
          hasMcpToken: !!user.mcpTokenHash,
          tokenLastUsedAt: user.tokenLastUsedAt,
          lastMcpCallAt: lastMcpCall?.createdAt ?? null,
        }
      : null,
    stats: {
      favoriteCount,
      postCount,
      mcpReadyCount,
      todayNewCount,
    },
  };
}
