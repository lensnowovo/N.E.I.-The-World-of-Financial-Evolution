import { prisma } from '@/lib/db';
import { fetchFeed, fetchUserStars, mapPostToCardData, sortPosts } from '@/lib/feed';
import { POST_STATUS } from '@/lib/status';
import type { PostCardData } from '@/lib/types';
import type { TaskMap, TaskMapIntent } from '@/lib/task-maps';

export type TaskMapIntentCards = {
  intent: TaskMapIntent;
  items: PostCardData[];
};

export type TaskMapData = {
  total: number;
  intents: TaskMapIntentCards[];
  unassigned: PostCardData[];
};

export async function fetchTaskMapData(task: TaskMap, uid: number | null): Promise<TaskMapData> {
  const curatedIds = [...new Set(task.intents.flatMap((intent) => intent.postIds))];
  const [curatedPosts, sceneRows] = await Promise.all([
    fetchPostsByIds(curatedIds, uid),
    Promise.all(task.scenes.map((scene) => fetchFeed({ scene, sort: 'popular', limit: 50 }, uid))),
  ]);

  const curatedMap = new Map(curatedPosts.map((post) => [post.id, post]));
  const allPosts = new Map<number, PostCardData>();
  curatedPosts.forEach((post) => allPosts.set(post.id, post));
  sceneRows.flat().forEach((post) => allPosts.set(post.id, post));

  return {
    total: allPosts.size,
    intents: task.intents.map((intent) => ({
      intent,
      items: intent.postIds
        .map((id) => curatedMap.get(id))
        .filter((post): post is PostCardData => Boolean(post)),
    })),
    unassigned: sceneRows.flat().filter((post) => !curatedMap.has(post.id)),
  };
}

async function fetchPostsByIds(ids: number[], uid: number | null): Promise<PostCardData[]> {
  if (ids.length === 0) return [];

  const rows = await prisma.post.findMany({
    where: { id: { in: ids }, status: POST_STATUS.PUBLISHED, deletedAt: null },
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
  });

  const sorted = sortPosts(rows, 'popular');
  const { starredIds } = await fetchUserStars(uid, sorted.map((post) => post.id));
  return sorted.map((post) => mapPostToCardData(post, starredIds.has(post.id)));
}
