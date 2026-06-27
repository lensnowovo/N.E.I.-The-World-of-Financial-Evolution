import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'N.E.I. · New Era Investors',
    short_name: 'N.E.I.',
    description: '一级市场投资人的 AI Skills Hub。',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f5efe2',
    theme_color: '#3a2a1f',
    lang: 'zh-CN',
  };
}
