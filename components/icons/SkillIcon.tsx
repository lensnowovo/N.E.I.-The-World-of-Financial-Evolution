import { clsx } from 'clsx';

type SkillKey =
  | 'prompt'
  | 'agent-skill'
  | 'workflow'
  | 'tool-stack'
  | 'template'
  | 'api-script'
  | 'case-study';

type Props = {
  skill: SkillKey | string;
  size?: number;
  className?: string;
};

/**
 * Skill 类型简笔图标 · 1px stroke 线性风格
 * 每个图标都在 24×24 viewbox 内，留 2px 边距
 * 与身份徽章一同构成"内容属性维度"的视觉系统
 */
export function SkillIcon({ skill, size = 16, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={clsx('inline-block text-leather', className)}
      aria-hidden="true"
    >
      {GLYPHS[skill as SkillKey] ?? GLYPHS['prompt']}
    </svg>
  );
}

const GLYPHS: Record<SkillKey, React.ReactElement> = {
  /** Prompt —— 引号 + 一行字 */
  prompt: (
    <>
      <path d="M6 9 C6 7, 7 6.5, 8 7 L8 9 C8 10, 7.5 11, 6.5 11" />
      <path d="M10 9 C10 7, 11 6.5, 12 7 L12 9 C12 10, 11.5 11, 10.5 11" />
      <path d="M5 15 H19" />
      <path d="M5 17.5 H15" />
    </>
  ),

  /** Agent Skill —— 节点图，三角形结构 */
  'agent-skill': (
    <>
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="6" cy="17" r="1.5" />
      <circle cx="18" cy="17" r="1.5" />
      <path d="M11 6 L7 16" />
      <path d="M13 6 L17 16" />
      <path d="M7.5 17 H16.5" />
    </>
  ),

  /** Workflow —— 流程箭头 */
  workflow: (
    <>
      <rect x="3" y="6" width="6" height="5" />
      <rect x="15" y="6" width="6" height="5" />
      <rect x="9" y="14" width="6" height="5" />
      <path d="M9 8.5 H15" />
      <path d="M12 11 V14" />
      <path d="M14 13 L12 14 L14 15" transform="rotate(-90 12 14.5)" opacity="0" />
    </>
  ),

  /** Tool Stack —— 三层堆叠 */
  'tool-stack': (
    <>
      <path d="M12 4 L20 8 L12 12 L4 8 Z" />
      <path d="M4 12 L12 16 L20 12" />
      <path d="M4 16 L12 20 L20 16" />
    </>
  ),

  /** Template —— 文档 + 网格线 */
  template: (
    <>
      <path d="M6 4 H15 L18 7 V20 H6 Z" />
      <path d="M15 4 V7 H18" />
      <path d="M8 11 H16" />
      <path d="M8 14 H16" />
      <path d="M8 17 H13" />
    </>
  ),

  /** API / Script —— 尖括号 + 斜线 */
  'api-script': (
    <>
      <path d="M9 8 L5 12 L9 16" />
      <path d="M15 8 L19 12 L15 16" />
      <path d="M13.5 6 L10.5 18" />
    </>
  ),

  /** Case Study —— 放大镜 + 文件 */
  'case-study': (
    <>
      <rect x="4" y="4" width="11" height="14" />
      <path d="M7 8 H12" />
      <path d="M7 11 H12" />
      <path d="M7 14 H10" />
      <circle cx="17" cy="16" r="3" />
      <path d="M19.5 18.5 L21 20" />
    </>
  ),
};
