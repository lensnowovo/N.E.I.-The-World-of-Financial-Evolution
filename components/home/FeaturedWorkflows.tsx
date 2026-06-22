import Link from 'next/link';
import { SkillIcon } from '@/components/icons/SkillIcon';

const WORKFLOWS = [
  {
    title: 'BP 初筛工作流',
    description: '从项目摘要到硬伤识别，形成第一轮判断和追问清单。',
    scene: '初筛判断',
    href: '/?scene=screening',
    tags: ['BP 解析', '风险识别', '追问清单'],
  },
  {
    title: '行业快速研究工作流',
    description: '在有限时间里搭出产业链、市场空间和竞争格局骨架。',
    scene: '行业研究',
    href: '/?scene=industry-research',
    tags: ['市场规模', '产业链', '竞争地图'],
  },
  {
    title: '商业尽调工作流',
    description: '围绕客户、供应商、竞品和专家访谈组织尽调问题。',
    scene: '商业尽调',
    href: '/?scene=business-dd',
    tags: ['访谈提纲', '客户验证', '竞品分析'],
  },
  {
    title: 'IC Memo 工作流',
    description: '把研究材料收束为投资逻辑、风险、估值和决策建议。',
    scene: 'IC 材料',
    href: '/?scene=ic',
    tags: ['投资逻辑', '估值判断', '风险事项'],
  },
  {
    title: '投委会 Q&A 工作流',
    description: '从反方视角预演投委会追问，补齐证据与回答口径。',
    scene: 'IC 材料',
    href: '/?scene=ic&content=debate',
    tags: ['反方论证', '投委会', '回答口径'],
  },
  {
    title: '投后月报工作流',
    description: '归纳经营进展、异常信号和下一步需要推动的事项。',
    scene: '投后管理',
    href: '/?scene=post-investment',
    tags: ['经营月报', '异常识别', '风险预警'],
  },
] as const;

export function FeaturedWorkflows() {
  return (
    <section className="py-10 sm:py-12 border-b border-paper-edge">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-1">
            Curated Workflows
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl text-ink-brown">精选 PEVC 工作流</h2>
        </div>
        <Link href="/?skill=workflow" className="font-serif italic text-sm text-leather hover:text-wax-red">
          查看全部工作流程 →
        </Link>
      </div>

      {/* TODO: Add an editorial featured flag and replace these category entries with curated database records. */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {WORKFLOWS.map((workflow) => (
          <Link
            key={workflow.title}
            href={workflow.href}
            className="group flex min-h-48 flex-col border border-paper-edge bg-vellum p-5 rounded-md hover:border-sepia hover:shadow-card transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 font-sans text-[11px] text-wax-red">
                <SkillIcon skill="workflow" className="h-3.5 w-3.5" />
                {workflow.scene}
              </span>
              <span className="font-mono text-[9px] text-sepia">workflow</span>
            </div>
            <h3 className="mt-3 font-serif text-xl text-ink-brown group-hover:text-wax-red transition-colors">
              {workflow.title}
            </h3>
            <p className="mt-1.5 font-sans text-xs leading-5 text-leather flex-1">
              {workflow.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {workflow.tags.map((tag) => (
                <span key={tag} className="border border-paper-edge px-2 py-0.5 font-sans text-[10px] text-sepia rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            <span className="mt-4 pt-3 border-t border-paper-edge font-serif italic text-xs text-sepia group-hover:text-ink-brown">
              查看相关 Skill →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
