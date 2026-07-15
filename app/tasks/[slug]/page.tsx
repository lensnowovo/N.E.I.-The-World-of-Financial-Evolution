import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUid } from '@/lib/session';
import { getTaskMap, taskMaps } from '@/lib/task-maps';
import { fetchTaskMapData } from '@/lib/task-map-posts';
import { HomeTaskMap } from '@/components/home/HomeTaskMap';
import { getPublicBaseUrl } from '@/lib/public-url';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return taskMaps.map((task) => ({ slug: task.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const task = getTaskMap(slug);
  if (!task) return {};

  const baseUrl = getPublicBaseUrl();
  const title = task.title;
  const description = `${task.description} 常见产出：${task.outcome}`;

  return {
    title,
    description,
    alternates: { canonical: `${baseUrl}/tasks/${task.slug}` },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/tasks/${task.slug}`,
      type: 'article',
      siteName: 'N.E.I.',
      images: [{ url: '/share-cover.png', width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/share-cover.png'] },
  };
}

export default async function TaskMapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const task = getTaskMap(slug);
  if (!task) notFound();

  const uid = await getSessionUid();
  const data = await fetchTaskMapData(task, uid);
  const baseUrl = getPublicBaseUrl();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: task.title,
    description: task.description,
    url: `${baseUrl}/tasks/${task.slug}`,
    inLanguage: 'zh-CN',
    hasPart: task.intents.map((intent, index) => ({
      '@type': 'ItemList',
      position: index + 1,
      name: intent.title,
      description: intent.description,
    })),
  };

  return (
    <div className="py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeTaskMap task={task} data={data} currentUserId={uid} />
    </div>
  );
}
