import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '连接 N.E.I. MCP Server',
  description:
    '生成 N.E.I. MCP Token，复制配置包，把收藏的 PEVC Skill / Workflow 接入 Claude Code、Codex、Workbuddy 或其它 Agent 客户端。',
  alternates: {
    canonical: '/connect',
  },
  openGraph: {
    title: '连接 N.E.I. MCP Server',
    description:
      '生成 N.E.I. MCP Token，复制配置包，把收藏的 PEVC Skill / Workflow 接入 Claude Code、Codex、Workbuddy 或其它 Agent 客户端。',
    url: '/connect',
    type: 'website',
    siteName: 'N.E.I.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: '连接 N.E.I. MCP Server' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '连接 N.E.I. MCP Server',
    description:
      '生成 N.E.I. MCP Token，复制配置包，把收藏的 PEVC Skill / Workflow 接入 Claude Code、Codex、Workbuddy 或其它 Agent 客户端。',
    images: ['/twitter-image'],
  },
};

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
