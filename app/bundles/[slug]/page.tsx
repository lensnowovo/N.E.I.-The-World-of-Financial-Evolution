import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUid } from '@/lib/session';
import { taskBundles } from '@/lib/bundles';
import { fetchBundleStepCards } from '@/lib/bundle-posts';
import { HomeBundleTimeline } from '@/components/home/HomeBundleTimeline';
import { getPublicBaseUrl } from '@/lib/public-url';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return taskBundles.map((bundle) => ({ slug: bundle.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bundle = taskBundles.find((item) => item.slug === slug);
  if (!bundle) return {};

  const baseUrl = getPublicBaseUrl();
  const title = `${bundle.title} · PEVC 工作流`;
  const description = `${bundle.description} 输出：${bundle.output}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/bundles/${bundle.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/bundles/${bundle.slug}`,
      type: 'article',
      siteName: 'N.E.I.',
      images: [
        {
          url: '/share-cover.png',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/share-cover.png'],
    },
  };
}

export default async function BundlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bundle = taskBundles.find((item) => item.slug === slug);
  if (!bundle) notFound();

  const uid = await getSessionUid();
  const stepCards = await fetchBundleStepCards(bundle, uid);
  const sceneQuery = bundle.scenes[0] ? `/?scene=${bundle.scenes[0]}#skill-library` : '/#skill-library';
  const baseUrl = getPublicBaseUrl();
  const bundleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: bundle.title,
    description: bundle.description,
    url: `${baseUrl}/bundles/${bundle.slug}`,
    inLanguage: 'zh-CN',
    tool: 'N.E.I. Skill Library',
    supply: bundle.output,
    step: bundle.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.title,
      text: step.description,
    })),
  };

  return (
    <div className="py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bundleJsonLd) }}
      />
      <div className="mb-6 border-b border-paper-edge pb-5">
        <Link
          href="/"
          className="mb-4 inline-flex font-serif italic text-sm text-sepia transition-colors hover:text-ink-brown"
        >
          ← 回到首页
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display tracking-display text-[10px] uppercase text-sepia mb-1">
              N.E.I. Bundle
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl text-ink-brown">
              {bundle.title}
            </h1>
            <p className="mt-3 max-w-2xl font-sans text-sm leading-6 text-leather">
              {bundle.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="border border-paper-edge bg-vellum px-2.5 py-1 font-sans text-[11px] text-sepia">
                {bundle.steps.length} 个步骤
              </span>
              <span className="border border-paper-edge bg-vellum px-2.5 py-1 font-sans text-[11px] text-sepia">
                {bundle.skillCountLabel}
              </span>
            </div>
          </div>
          <Link
            href={sceneQuery}
            className="inline-flex h-9 items-center justify-center rounded-sm border border-ink-brown px-4 font-serif text-sm text-ink-brown transition-colors hover:bg-ink-brown hover:text-vellum"
          >
            查看相关 Skill
          </Link>
        </div>
      </div>

      <HomeBundleTimeline
        bundle={bundle}
        stepCards={stepCards}
        currentUserId={uid}
        framed={false}
        showHeader={false}
      />
    </div>
  );
}
