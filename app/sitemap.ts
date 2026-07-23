import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { getPublicBaseUrl } from '@/lib/public-url';
import { POST_STATUS } from '@/lib/status';
import { taskMaps } from '@/lib/task-maps';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getPublicBaseUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/mcp`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/mcp-library`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/connect`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/security`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/legal`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/community-rules`, lastModified: now, changeFrequency: 'monthly', priority: 0.45 },
    { url: `${baseUrl}/copyright`, lastModified: now, changeFrequency: 'monthly', priority: 0.45 },
    { url: `${baseUrl}/contribution-guidelines`, lastModified: now, changeFrequency: 'monthly', priority: 0.45 },
    { url: `${baseUrl}/skills-map`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];

  const taskRoutes = taskMaps.map((task) => ({
    url: `${baseUrl}/tasks/${task.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  // Sitemap should never make a deployment depend on a successful database
  // connection. Neon may be temporarily unreachable during Vercel's static
  // generation phase; public static routes are still valid in that case.
  const posts = await prisma.post.findMany({
    where: { status: POST_STATUS.PUBLISHED, deletedAt: null },
    select: { id: true, updatedAt: true, featured: true },
    orderBy: { updatedAt: 'desc' },
    take: 5000,
  }).catch((error: unknown) => {
    console.error('[sitemap] unable to load published posts; emitting static routes only', error);
    return [];
  });

  const postRoutes = posts.map((post) => ({
    url: `${baseUrl}/posts/${post.id}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: post.featured ? 0.85 : 0.65,
  }));

  return [...staticRoutes, ...taskRoutes, ...postRoutes];
}
