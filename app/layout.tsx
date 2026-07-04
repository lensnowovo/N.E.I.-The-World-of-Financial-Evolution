import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Cormorant_Garamond, Inter, Cinzel, Noto_Serif_SC } from 'next/font/google';
import './globals.css';
import { getCurrentUser } from '@/lib/session';
import { SiteHeader } from '@/components/chrome/SiteHeader';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { ActivityTracker } from '@/components/ActivityTracker';
import { getPublicBaseUrl } from '@/lib/public-url';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-noto-serif-sc',
  display: 'swap',
  preload: false,
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-cinzel',
  display: 'swap',
});

const siteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${getPublicBaseUrl()}/#organization`,
      name: 'N.E.I.',
      alternateName: 'New Era Investors',
      url: getPublicBaseUrl(),
      description: '面向 PE、VC、FA 与产业投资人的 Skill Library、Workflow 和 MCP 工作流平台。',
    },
    {
      '@type': 'WebSite',
      '@id': `${getPublicBaseUrl()}/#website`,
      name: 'N.E.I.',
      url: getPublicBaseUrl(),
      inLanguage: 'zh-CN',
      publisher: { '@id': `${getPublicBaseUrl()}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${getPublicBaseUrl()}/?q={search_term_string}#skill-library`,
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(getPublicBaseUrl()),
  applicationName: 'N.E.I.',
  title: {
    default: 'N.E.I. · 一级市场投资人的 AI Skills Hub',
    template: '%s · N.E.I.',
  },
  description:
    'New Era Investors，面向 PE、VC、FA 与产业投资人的 Skill Library、Workflow 和 MCP 工作流平台。',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: '/',
    siteName: 'N.E.I.',
    title: 'N.E.I. · 一级市场投资人的 AI Skills Hub',
    description:
      'New Era Investors，面向 PE、VC、FA 与产业投资人的 Skill Library、Workflow 和 MCP 工作流平台。',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'N.E.I. · New Era Investors',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'N.E.I. · 一级市场投资人的 AI Skills Hub',
    description:
      'New Era Investors，面向 PE、VC、FA 与产业投资人的 Skill Library、Workflow 和 MCP 工作流平台。',
    images: ['/twitter-image'],
  },
  manifest: '/manifest.webmanifest',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <html
      lang="zh-CN"
      className={`${cormorant.variable} ${notoSerifSC.variable} ${inter.variable} ${cinzel.variable}`}
    >
      <body className="noise-paper min-h-screen flex flex-col">
        <script
          id="site-json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <Suspense fallback={null}>
          <ActivityTracker />
        </Suspense>
        <SiteHeader user={user} />
        <main className="relative z-[1] flex-1 w-full mx-auto max-w-page px-4 sm:px-6 py-8 sm:py-10 animate-fade-in">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
