import Link from 'next/link';

const TASKS = [
  {
    title: '拆 BP',
    description: '快速提取项目摘要、亮点、硬伤和追问问题。',
    href: '/?scene=screening',
  },
  {
    title: '做行研',
    description: '生成产业链、市场规模、竞争格局和投资逻辑。',
    href: '/?scene=industry-research',
  },
  {
    title: '做尽调',
    description: '生成客户、供应商、竞品、专家访谈提纲。',
    href: '/?scene=business-dd',
  },
  {
    title: '看财务',
    description: '分析毛利率、现金流、应收、存货和预测合理性。',
    href: '/?scene=financial',
  },
  {
    title: '写 IC',
    description: '生成投资逻辑、核心风险、估值判断和投委会 Q&A。',
    href: '/?scene=ic',
  },
  {
    title: '管投后',
    description: '生成投后月报、经营异常识别和风险预警。',
    href: '/?scene=post-investment',
  },
  {
    title: '做 LP 汇报',
    description: '生成基金表现摘要、项目组合进展和 LP 季报初稿。',
    href: '/?scene=fundraising',
  },
  {
    title: '配置 MCP',
    description: '把收藏的 Skill 接入 Claude、Cursor、Windsurf 直接调用。',
    href: '/connect',
  },
] as const;

export function HomeTaskGrid() {
  return (
    <section className="py-10 sm:py-12 border-b border-paper-edge">
      <SectionHeading
        eyebrow="Task Index"
        title="你今天要完成什么投资工作？"
        description="从手头任务进入，直接查看对应的 Skill 与工作流。"
      />

      <ol className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TASKS.map((task, index) => (
          <li key={task.title}>
            <Link
              href={task.href}
              className="group flex h-full min-h-36 flex-col border border-paper-edge bg-vellum p-4 rounded-md hover:border-sepia hover:shadow-card transition-all"
            >
              <span className="font-mono text-[10px] text-sepia">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-2 font-serif text-xl text-ink-brown group-hover:text-wax-red transition-colors">
                {task.title}
              </h3>
              <p className="mt-1.5 font-sans text-xs leading-5 text-leather flex-1">
                {task.description}
              </p>
              <span className="mt-3 font-serif italic text-xs text-sepia group-hover:text-ink-brown">
                进入场景 →
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
      <div>
        <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-1">
          {eyebrow}
        </p>
        <h2 className="font-serif text-2xl sm:text-3xl text-ink-brown">{title}</h2>
      </div>
      <p className="font-sans text-xs sm:text-sm text-sepia">{description}</p>
    </div>
  );
}
