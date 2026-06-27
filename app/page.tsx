import { getSessionUid } from '@/lib/session';
import { fetchFeedPage, fetchUserStars, hasAnyFilter, mapPostToCardData, parseFeedQuery } from '@/lib/feed';
import { prisma } from '@/lib/db';
import { POST_STATUS } from '@/lib/status';
import { getTaskBundle, type TaskBundle } from '@/lib/bundles';
import { stripHtml } from '@/lib/validate';
import { FilterStrip } from '@/components/FilterStrip';
import { HomeHero } from '@/components/home/HomeHero';
import { HomeTaskGrid } from '@/components/home/HomeTaskGrid';
import { HomeBundleTimeline, type BundleStepCards } from '@/components/home/HomeBundleTimeline';
import { HomeSideDock, type HomeSideDockData } from '@/components/home/HomeSideDock';
import { SkillFeed } from '@/components/SkillFeed';

type SP = { [k: string]: string | string[] | undefined };

export default async function HomePage({ searchParams }: { searchParams: Promise<SP> }) {
  const rawSearchParams = await searchParams;
  const query = parseFeedQuery(rawSearchParams);
  const uid = await getSessionUid();
  const selectedBundle = getTaskBundle(
    typeof rawSearchParams.bundle === 'string' ? rawSearchParams.bundle : undefined,
  );

  const [feedPage, totalSkills, workflowCount, sideDockData, bundleStepCards] = await Promise.all([
    fetchFeedPage({ ...query, page: 1, pageSize: 24 }, uid),
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
    fetchBundleStepCards(selectedBundle, uid),
  ]);
  const hasFilter = hasAnyFilter(query);
  const querySignature = buildQuerySignature(rawSearchParams);

  return (
    <div>
      <HomeSideDock data={sideDockData} />
      <HomeHero totalSkills={totalSkills} workflowCount={workflowCount} />
      <HomeTaskGrid activeSlug={selectedBundle.slug} />
      <HomeBundleTimeline
        bundle={selectedBundle}
        stepCards={bundleStepCards}
        currentUserId={uid}
      />

      <section id="skill-library" className="scroll-mt-24 pt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-5">
          <div>
            <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-1">
              Skill Feed
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl text-ink-brown">
              {hasFilter ? '正在筛选 Skill Library' : '继续探索 Skill Library'}
            </h2>
          </div>
          <p className="font-sans text-xs sm:text-sm text-sepia">
            搜索、筛选、收藏，也可以从上方 Bundle 回到完整工作流。
          </p>
        </div>

        <FilterStrip />
        <SkillFeed
          initialItems={feedPage.items}
          initialHasMore={feedPage.hasMore}
          initialTotal={feedPage.total}
          currentUserId={uid}
          querySignature={querySignature}
        />
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

async function fetchBundleStepCards(bundle: TaskBundle, uid: number | null): Promise<BundleStepCards[]> {
  const posts = await prisma.post.findMany({
    where: {
      status: POST_STATUS.PUBLISHED,
      deletedAt: null,
      tagScene: { in: bundle.scenes },
    },
    include: {
      author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
      _count: { select: { comments: true, stars: true, attachments: true } },
      skillAsset: {
        select: {
          id: true,
          assetType: true,
          originalAuthor: true,
          sourceUrl: true,
          installHint: true,
          usageNotes: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 120,
  });

  const selections = new Map<string, number[]>();
  const usedIds = new Set<number>();
  const selectedIds: number[] = [];

  for (const step of bundle.steps) {
    const matches = posts
      .filter((post) => !usedIds.has(post.id))
      .map((post) => ({ post, score: scoreBundlePost(post, step.skillQueries) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.post.id);

    matches.forEach((id) => {
      usedIds.add(id);
      selectedIds.push(id);
    });
    selections.set(step.title, matches);
  }

  const { starredIds } = await fetchUserStars(uid, selectedIds);
  const cardById = new Map(
    posts
      .filter((post) => selectedIds.includes(post.id))
      .map((post) => [post.id, mapPostToCardData(post, starredIds.has(post.id))]),
  );

  return bundle.steps.map((step) => ({
    stepTitle: step.title,
    items: (selections.get(step.title) || [])
      .map((id) => cardById.get(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
  }));
}

function scoreBundlePost(post: any, keywords: string[]) {
  const tagContent = safeJsonArray(post.tagContent).join(' ');
  const text = [
    post.title,
    stripHtml(post.body),
    post.tagScene,
    post.tagIndustry,
    post.tagSkill,
    post.skillAsset?.assetType,
    post.skillAsset?.originalAuthor,
    tagContent,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return keywords.reduce((score, keyword) => {
    const token = keyword.toLowerCase();
    if (!token) return score;
    if (String(post.title).toLowerCase().includes(token)) return score + 8;
    return text.includes(token) ? score + 3 : score;
  }, 0);
}

function safeJsonArray(raw: string | null): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
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

  const [user, favoriteCount, postCount, mcpReadyCount, todayNewCount] = await Promise.all([
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
