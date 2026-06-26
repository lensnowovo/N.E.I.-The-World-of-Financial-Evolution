import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter, Cinzel, Noto_Serif_SC } from 'next/font/google';
import './globals.css';
import { getCurrentUser } from '@/lib/session';
import { SiteHeader } from '@/components/chrome/SiteHeader';
import { SiteFooter } from '@/components/chrome/SiteFooter';

// 衬线 —— 标题与文章
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

// 衬线中文 —— 与 Cormorant 搭配的中文衬线
const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-noto-serif-sc',
  display: 'swap',
  preload: false,
});

// 无衬线 —— 正文 / UI
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

// 装饰 —— 仅 logo
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-cinzel',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'N.E.I. · 一级市场投资人的 AI Skills Hub',
  description:
    'New Era Investors，面向 PE、VC、FA 与产业投资人的 Skill Library、Workflow 和 MCP 工作流平台',
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
        <SiteHeader user={user} />
        <main className="relative z-[1] flex-1 w-full mx-auto max-w-page px-4 sm:px-6 py-8 sm:py-10 animate-fade-in">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
