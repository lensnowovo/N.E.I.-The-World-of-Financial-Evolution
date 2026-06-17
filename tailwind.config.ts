import type { Config } from 'tailwindcss';

/**
 * PEVC 知识平台 · 设计系统
 * 核心：羊皮纸 + 棕墨水 + 节制的骑士感
 * 所有颜色定义在 globals.css 的 CSS 变量里，这里只做暴露
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    // 完全替换默认调色板，避免误用 blue-500 之类
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',

      // 中性 —— 羊皮纸 / 亚麻 / 旧纸
      parchment: 'var(--parchment)',
      linen: 'var(--linen)',
      vellum: 'var(--vellum)',
      'paper-edge': 'var(--paper-edge)',

      // 主色 —— 棕墨水 / 旧皮革
      'ink-brown': 'var(--ink-brown)',
      leather: 'var(--leather)',
      sepia: 'var(--sepia)',

      // 强调色 —— 用得极省
      'wax-red': 'var(--wax-red)',
      gilded: 'var(--gilded)',
      moss: 'var(--moss)',

      // 系统色（语义别名）
      success: 'var(--moss)',
      warning: 'var(--gilded)',
      danger: 'var(--wax-red)',
    },

    fontFamily: {
      // 衬线 —— 标题 / 文章 / 数字
      serif: [
        'var(--font-cormorant)',
        'Cormorant Garamond',
        'EB Garamond',
        'var(--font-noto-serif-sc)',
        'Source Han Serif SC',
        'Noto Serif SC',
        'serif',
      ],
      // 无衬线 —— 正文 / UI 文字
      sans: [
        'var(--font-inter)',
        'Inter',
        'PingFang SC',
        'Source Han Sans SC',
        'system-ui',
        'sans-serif',
      ],
      // 装饰 —— 仅 logo / 章节大字
      display: ['var(--font-cinzel)', 'Cinzel', 'serif'],
      // 等宽 —— path 点缀 / 热度数字（档案批注感）
      mono: ['ui-monospace', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
    },

    fontSize: {
      // 行高对中文友好（>= 1.7）
      xs: ['12px', { lineHeight: '1.6' }],
      sm: ['13px', { lineHeight: '1.7' }],
      base: ['15px', { lineHeight: '1.75' }],
      lg: ['17px', { lineHeight: '1.7' }],
      xl: ['20px', { lineHeight: '1.5' }],
      '2xl': ['24px', { lineHeight: '1.4' }],
      '3xl': ['30px', { lineHeight: '1.3' }],
      '4xl': ['38px', { lineHeight: '1.2' }],
      '5xl': ['48px', { lineHeight: '1.15' }],
    },

    // 圆角严格限制
    borderRadius: {
      none: '0',
      DEFAULT: '2px',
      sm: '2px',
      md: '3px',
      lg: '4px',
      full: '9999px', // 仅徽章圆形使用
    },

    extend: {
      maxWidth: {
        prose: '720px',  // 文章正文宽，像一页书
        page: '1200px',  // 页面最大宽
      },
      spacing: {
        section: '80px', // section 之间
      },
      letterSpacing: {
        display: '0.08em', // Cinzel 罗马大写需要更宽字距
        wide: '0.04em',
      },
      // 几乎不用阴影 —— 留作明确的小态
      boxShadow: {
        seal: '0 0 0 1px var(--paper-edge)', // 用 ring 替代 shadow
        card: '0 2px 8px -2px rgba(61, 46, 31, 0.08)', // 卡片 hover 时的微影
        none: 'none',
      },
      // 微交互动画
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'fade-in': 'fade-in 0.3s ease-out both',
      },
    },
  },
  // 默认 ring 颜色改成 ink-brown
  plugins: [],
};

export default config;
