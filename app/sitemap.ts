import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { getPublicBaseUrl } from '@/lib/public-url';
import { POST_STATUS } from '@/lib/status';
import { taskBundles } from '@/lib/bundles';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getPublicBaseUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/mcp`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/connect`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/security`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/legal`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/skills-map`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];

  const bundleRoutes = taskBundles.map((bundle) => ({
    url: `${baseUrl}/bundles/${bundle.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  const posts = await prisma.post.findMany({
    where: { status: POST_STATUS.PUBLISHED, deletedAt: null },
    select: { id: true, updatedAt: true, featured: true },
    orderBy: { updatedAt: 'desc' },
    take: 5000,
  });

  const postRoutes = posts.map((post) => ({
    url: `${baseUrl}/posts/${post.id}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: post.featured ? 0.85 : 0.65,
  }));

  return [...staticRoutes, ...bundleRoutes, ...postRoutes];
}
