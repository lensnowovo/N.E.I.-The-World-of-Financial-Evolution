import Link from 'next/link';
import { getSkillsMap } from '@/lib/skills-map';
import { SCENE_TAGS, SKILL_TAGS, sceneLabel, skillLabel } from '@/lib/tags';
import { Ornament } from '@/components/icons/Ornament';
import { SkillIcon } from '@/components/icons/SkillIcon';

export const metadata = {
  title: 'PEVC 技能资产地图',
  description: '按工作场景与技能类型交叉浏览 PEVC 社区贡献的 AI Skill Assets',
};

export default async function SkillsMapPage() {
  const { cells, stats } = await getSkillsMap();

  return (
    <div className="mx-auto max-w-page px-4 sm:px-6 py-8">
      {/* —— Header —— */}
      <header className="mb-10">
        <p className="font-display tracking-display text-[11px] text-sepia uppercase mb-3">
          Volume I · Skills Map
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-ink-brown mb-3">
          PEVC 技能资产地图
        </h1>
        <p className="font-serif italic text-leather max-w-2xl mb-6">
          以工作场景为行、技能类型为列的矩阵视图 —— 一眼纵览社区在哪些领域已沉淀 AI 资产，
          哪些领域仍待开拓。
        </p>

        {/* Stat pills */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <StatPill label="资产总量" value={String(stats.totalAssets)} />
          <StatPill label="活跃场景" value={String(stats.activeScenes)} />
          {stats.topAssetType && (
            <StatPill
              label="最多类型"
              value={`${stats.topAssetType.label} (${stats.topAssetType.count})`}
            />
          )}
        </div>

        <Link
          href="/publish"
          className="inline-flex items-center h-10 px-5 bg-ink-brown text-vellum hover:bg-wax-red font-serif text-sm rounded-sm transition-colors"
        >
          发布 Skill Asset
        </Link>
      </header>

      {/* —— Desktop Matrix (lg+) —— */}
      <section className="hidden lg:block">
        <div className="border border-paper-edge rounded-md overflow-hidden">
          {/* Column headers */}
          <div className="grid bg-linen border-b border-paper-edge" style={{ gridTemplateColumns: '220px repeat(7, 1fr)' }}>
            <div className="px-4 py-3 font-display tracking-display text-[10px] text-sepia uppercase border-r border-paper-edge">
              场景 \ 类型
            </div>
            {SKILL_TAGS.map((skill) => (
              <div
                key={skill.value}
                className="px-3 py-3 text-center font-serif text-xs text-ink-brown border-r border-paper-edge last:border-r-0"
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="grid place-content-center w-5 h-5 rounded-full bg-parchment text-gilded">
                    <SkillIcon skill={skill.value} size={13} className="text-gilded" />
                  </span>
                  <span>{skill.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Rows */}
          {SCENE_TAGS.map((scene, rowIdx) => {
            const rowCells = cells.filter((c) => c.scene === scene.value);
            return (
              <div
                key={scene.value}
                className={`grid border-b border-paper-edge last:border-b-0 ${
                  rowIdx % 2 === 0 ? 'bg-vellum' : 'bg-parchment/40'
                }`}
                style={{ gridTemplateColumns: '220px repeat(7, 1fr)' }}
              >
                {/* Scene label */}
                <div className="px-4 py-3 border-r border-paper-edge flex items-center">
                  <span className="font-serif text-xs text-ink-brown leading-snug">
                    {scene.label}
                  </span>
                </div>

                {/* Cells */}
                {rowCells.map((cell) =>
                  cell.count > 0 ? (
                    <Link
                      key={`${cell.scene}-${cell.assetType}`}
                      href={`/?scene=${cell.scene}&skill=${cell.assetType}`}
                      className="px-3 py-3 border-r border-paper-edge last:border-r-0 bg-vellum hover:bg-linen transition-colors group"
                    >
                      <div className="text-center">
                        <span className="font-sans text-sm font-semibold text-wax-red">
                          {cell.count}
                        </span>
                        {cell.featured && (
                          <>
                            <p className="font-serif text-xs text-ink-brown truncate mt-1 group-hover:text-wax-red transition-colors" title={cell.featured.title}>
                              {cell.featured.title}
                            </p>
                            <p className="font-sans text-[10px] text-sepia mt-0.5">
                              {cell.featured.author.role}
                            </p>
                          </>
                        )}
                      </div>
                    </Link>
                  ) : (
                    <div
                      key={`${cell.scene}-${cell.assetType}`}
                      className="px-3 py-3 border-r border-paper-edge last:border-r-0 bg-paper-edge/30 border-dashed flex items-center justify-center"
                    >
                      <span className="font-serif text-xs text-sepia/60 italic">
                        等待贡献
                      </span>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* —— Mobile: Grouped by scene (<lg) —— */}
      <section className="lg:hidden space-y-6">
        {SCENE_TAGS.map((scene) => {
          const sceneCells = cells.filter((c) => c.scene === scene.value);
          const hasAny = sceneCells.some((c) => c.count > 0);
          return (
            <div key={scene.value} className="border border-paper-edge rounded-md overflow-hidden">
              {/* Scene heading */}
              <div className="px-4 py-3 bg-linen border-b border-paper-edge">
                <h2 className="font-serif text-sm text-ink-brown">
                  {scene.label}
                </h2>
              </div>

              {/* 2-column grid of skill tiles */}
              <div className="grid grid-cols-2 gap-px bg-paper-edge">
                {sceneCells.map((cell) =>
                  cell.count > 0 ? (
                    <Link
                      key={`${cell.scene}-${cell.assetType}`}
                      href={`/?scene=${cell.scene}&skill=${cell.assetType}`}
                      className="bg-vellum hover:bg-linen transition-colors px-4 py-3 group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="grid place-content-center w-4 h-4 rounded-full bg-parchment text-gilded">
                          <SkillIcon skill={cell.assetType} size={10} className="text-gilded" />
                        </span>
                        <span className="font-sans text-xs text-leather">
                          {skillLabel(cell.assetType)}
                        </span>
                        <span className="ml-auto font-sans text-xs font-semibold text-wax-red">
                          {cell.count}
                        </span>
                      </div>
                      {cell.featured && (
                        <p className="font-serif text-xs text-ink-brown truncate group-hover:text-wax-red transition-colors" title={cell.featured.title}>
                          {cell.featured.title}
                        </p>
                      )}
                    </Link>
                  ) : (
                    <div
                      key={`${cell.scene}-${cell.assetType}`}
                      className="bg-paper-edge/20 px-4 py-3 flex items-center gap-2"
                    >
                      <span className="grid place-content-center w-4 h-4 rounded-full bg-paper-edge/50 text-sepia/40">
                        <SkillIcon skill={cell.assetType} size={10} className="text-sepia/40" />
                      </span>
                      <span className="font-serif text-xs text-sepia/50 italic">
                        {skillLabel(cell.assetType)} · 等待贡献
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* —— Footer —— */}
      <footer className="mt-12 text-center">
        <div className="flex justify-center mb-3 text-leather">
          <Ornament width={48} />
        </div>
        <p className="font-serif italic text-sm text-sepia">
          共 <span className="num-osf">{stats.totalAssets}</span> 个 Skill Asset ·
          覆盖 <span className="num-osf">{stats.activeScenes}</span> 个工作场景
        </p>
      </footer>
    </div>
  );
}

/* —— Stat pill component —— */
function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 h-8 px-3 border border-paper-edge bg-vellum rounded-sm">
      <span className="font-sans text-[10px] text-sepia uppercase tracking-wide">
        {label}
      </span>
      <span className="font-sans text-sm font-semibold text-ink-brown num-osf">
        {value}
      </span>
    </span>
  );
}
