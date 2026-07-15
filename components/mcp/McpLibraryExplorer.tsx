'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import {
  mcpLibraryCategories,
  mcpLibraryItems,
  type McpLibraryCategoryKey,
  type McpLibraryItem,
} from '@/lib/mcp-library';
import { McpLibraryActions } from '@/components/mcp/McpLibraryActions';

type CategoryFilter = 'all' | McpLibraryCategoryKey;
type KindFilter = 'all' | 'mcp' | 'api';

const externalItems = mcpLibraryItems.filter((item) => !item.internal);

export function McpLibraryExplorer() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [kind, setKind] = useState<KindFilter>('all');
  const [selectedId, setSelectedId] = useState('');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return externalItems.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (kind === 'mcp' && !item.kind.includes('MCP')) return false;
      if (kind === 'api' && !item.kind.includes('API')) return false;
      if (!normalized) return true;
      const searchable = [
        item.name,
        item.highlight,
        item.coverage,
        item.auth,
        item.pricing,
        ...item.bestFor,
        ...item.pevcUseCases,
      ].join(' ').toLowerCase();
      return searchable.includes(normalized);
    });
  }, [category, kind, query]);

  const selected = filtered.find((item) => item.id === selectedId) ?? null;

  return (
    <section className="mt-7 border-t border-paper-edge pt-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[0.2em] text-gilded">External source index</p>
          <h2 className="mt-2 font-serif text-3xl text-ink-brown">选择外部信息源</h2>
          <p className="mt-2 max-w-2xl font-sans text-sm leading-7 text-leather">按用途、数据类型和接入方式筛选。N.E.I. 只提供目录与接入说明，不代理外部调用。</p>
        </div>
        <label className="group relative block">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[9px] tracking-[0.12em] text-gilded">INDEX</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜论文、临床试验、公司公告、开源生态…"
            className="h-12 w-full border border-paper-edge bg-vellum/78 pl-[4.5rem] pr-4 font-sans text-sm text-ink-brown outline-none transition-colors placeholder:text-sepia/55 focus:border-gilded"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-y border-paper-edge py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="按信息源分类筛选">
          <FilterButton active={category === 'all'} onClick={() => setCategory('all')}>全部 {externalItems.length}</FilterButton>
          {mcpLibraryCategories.map((item) => {
            const count = externalItems.filter((source) => source.category === item.key).length;
            return (
              <FilterButton key={item.key} active={category === item.key} onClick={() => setCategory(item.key)}>
                {item.label} {count}
              </FilterButton>
            );
          })}
        </div>
        <div className="flex gap-1.5" role="group" aria-label="按连接器类型筛选">
          <KindButton active={kind === 'all'} onClick={() => setKind('all')}>全部类型</KindButton>
          <KindButton active={kind === 'mcp'} onClick={() => setKind('mcp')}>MCP</KindButton>
          <KindButton active={kind === 'api'} onClick={() => setKind('api')}>API / 需封装</KindButton>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_440px]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-sepia">{filtered.length} sources matched</p>
            {(query || category !== 'all' || kind !== 'all') && (
              <button type="button" onClick={() => { setQuery(''); setCategory('all'); setKind('all'); }} className="font-serif text-xs italic text-sepia hover:text-wax-red">清除筛选</button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="border border-dashed border-paper-edge bg-vellum/45 px-5 py-16 text-center">
              <p className="font-serif text-xl text-ink-brown">目录里还没有匹配的信息源</p>
              <p className="mt-2 font-sans text-xs text-sepia">换一个证据类型或清除筛选后再试。</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {filtered.map((item, index) => (
                <SourceCard
                  key={item.id}
                  item={item}
                  index={index + 1}
                  active={selected?.id === item.id}
                  onClick={() => setSelectedId(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          {selected ? <SourceDossier key={selected.id} item={selected} /> : <EmptyDossier />}
        </aside>
      </div>
    </section>
  );
}

function SourceCard({ item, index, active, onClick }: { item: McpLibraryItem; index: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group min-h-40 border p-4 text-left transition-all',
        active
          ? 'border-gilded bg-gilded/8 shadow-[inset_3px_0_0_rgba(168,131,57,0.7)]'
          : 'border-paper-edge bg-vellum/68 hover:-translate-y-px hover:border-sepia/60 hover:bg-vellum',
      )}
      aria-pressed={active}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[9px] text-gilded">{String(index).padStart(2, '0')}</span>
        <span className={cn('border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]', item.kind === 'API' ? 'border-sepia/25 text-sepia' : 'border-moss/30 text-moss')}>
          {item.kind}
        </span>
      </div>
      <h3 className="mt-3 font-serif text-lg text-ink-brown transition-colors group-hover:text-wax-red">{item.name}</h3>
      <p className="mt-2 line-clamp-2 font-sans text-xs leading-5 text-leather">{item.highlight}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.bestFor.slice(0, 3).map((tag) => (
          <span key={tag} className="border border-paper-edge bg-parchment/70 px-2 py-0.5 font-sans text-[10px] text-sepia">{tag}</span>
        ))}
      </div>
    </button>
  );
}

function SourceDossier({ item }: { item: McpLibraryItem }) {
  const category = mcpLibraryCategories.find((entry) => entry.key === item.category);
  return (
    <article className="mcp-dossier-enter overflow-hidden border border-ink-brown/75 bg-vellum shadow-[0_18px_60px_rgba(61,43,26,0.12)]">
      <div className="relative overflow-hidden bg-ink-brown px-5 py-5 text-vellum">
        <div className="mcp-dossier-grid" aria-hidden="true" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-[9px] uppercase tracking-[0.2em] text-gilded">Source dossier / {category?.short}</p>
            <span className="border border-vellum/20 px-2 py-0.5 font-mono text-[9px] text-vellum/55">{item.status}</span>
          </div>
          <h3 className="mt-4 font-serif text-3xl leading-tight">{item.name}</h3>
          <p className="mt-3 font-sans text-xs leading-6 text-vellum/62">{item.highlight}</p>
        </div>
      </div>

      <div className="p-5">
        <DossierBlock label="覆盖信息"><p>{item.coverage}</p></DossierBlock>
        <DossierBlock label="PEVC 用法">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {item.pevcUseCases.map((useCase) => (
              <li key={useCase} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gilded" />{useCase}</li>
            ))}
          </ul>
        </DossierBlock>

        <div className="grid grid-cols-3 gap-px border border-paper-edge bg-paper-edge">
          <DossierSpec label="授权" value={item.auth} />
          <DossierSpec label="费用" value={item.pricing} />
          <DossierSpec label="成熟度" value={item.maturity} />
        </div>

        <div className="mt-4 border-l-2 border-gilded bg-gilded/7 px-3 py-2.5">
          <p className="font-display text-[9px] uppercase tracking-display text-gilded">Data boundary</p>
          <p className="mt-1 font-sans text-xs leading-5 text-leather">{item.safetyNote}</p>
        </div>

        <div className="mt-5">
          <McpLibraryActions item={item} />
        </div>
        <p className="mt-4 font-sans text-[10px] leading-5 text-sepia">接入前请再次核对项目官方文档、费用和权限范围。N.E.I. 只提供目录索引。</p>
      </div>
    </article>
  );
}

function DossierBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <p className="font-display text-[9px] uppercase tracking-[0.16em] text-sepia">{label}</p>
      <div className="mt-1.5 font-sans text-xs leading-6 text-leather">{children}</div>
    </div>
  );
}

function DossierSpec({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-parchment/80 px-3 py-2.5">
      <p className="font-sans text-[9px] text-sepia">{label}</p>
      <p className="mt-1 truncate font-serif text-xs text-ink-brown" title={value}>{value}</p>
    </div>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn('min-h-8 border px-3 font-serif text-xs transition-colors', active ? 'border-ink-brown bg-ink-brown text-vellum' : 'border-paper-edge bg-vellum/55 text-leather hover:border-sepia')}>
      {children}
    </button>
  );
}

function KindButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn('min-h-8 border-b px-3 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors', active ? 'border-gilded text-ink-brown' : 'border-transparent text-sepia hover:text-ink-brown')}>
      {children}
    </button>
  );
}

function EmptyDossier() {
  return (
    <article className="overflow-hidden border border-ink-brown/55 bg-vellum/72 shadow-[0_18px_60px_rgba(61,43,26,0.08)]">
      <div className="relative overflow-hidden bg-ink-brown px-5 py-6 text-[#eee3d0]">
        <div className="mcp-dossier-grid" aria-hidden="true" />
        <div className="relative">
          <p className="font-display text-[9px] uppercase tracking-[0.2em] text-gilded">Source dossier</p>
          <h3 className="mt-4 font-serif text-2xl text-[#f5ead6]">选择一个外部信息源</h3>
          <p className="mt-3 font-sans text-xs leading-6 text-[#d8cbb6]">点击左侧卡片，在这里查看接入方式和详细信息。</p>
        </div>
      </div>
      <div className="px-5 py-4">
        <p className="font-serif text-sm italic text-gilded">← 从左侧开始选择</p>
      </div>
    </article>
  );
}
