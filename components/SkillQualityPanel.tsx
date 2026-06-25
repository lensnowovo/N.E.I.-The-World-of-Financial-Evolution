import { cn } from '@/lib/cn';
import type { SkillQualityResult } from '@/lib/skill-quality';

export function SkillQualityPanel({ quality }: { quality: SkillQualityResult }) {
  const scoreColor =
    quality.score >= 80
      ? 'border-moss/40 bg-moss/5 text-moss'
      : quality.score >= 60
        ? 'border-gilded/50 bg-gilded/5 text-gilded'
        : 'border-wax-red/40 bg-wax-red/5 text-wax-red';

  return (
    <section className="rounded-md border border-paper-edge bg-vellum/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-1">
            Skill Quality
          </p>
          <h2 className="font-serif text-base text-ink-brown">质量评分与适用场景</h2>
          <p className="font-sans text-xs text-leather mt-1 leading-relaxed">
            {quality.summary}
          </p>
        </div>
        <div className={cn('shrink-0 rounded border px-3 py-2 text-center', scoreColor)}>
          <p className="font-serif text-2xl leading-none">{quality.score}</p>
          <p className="font-sans text-[10px] mt-1">{quality.level}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {quality.bestFor.map((item) => (
          <span key={item} className="rounded-sm border border-paper-edge bg-parchment px-2 py-0.5 font-sans text-[11px] text-leather">
            {item}
          </span>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <QualityBlock title="输入示例" body={quality.inputExample} />
        <QualityBlock title="输出预期" body={quality.outputExample} />
      </div>

      {(quality.strengths.length > 0 || quality.missing.length > 0) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {quality.strengths.length > 0 && (
            <div>
              <p className="font-serif italic text-xs text-moss mb-1">已具备</p>
              <ul className="space-y-1">
                {quality.strengths.map((item) => (
                  <li key={item} className="font-sans text-[11px] text-leather">✓ {item}</li>
                ))}
              </ul>
            </div>
          )}
          {quality.missing.length > 0 && (
            <div>
              <p className="font-serif italic text-xs text-gilded mb-1">建议补齐</p>
              <ul className="space-y-1">
                {quality.missing.map((item) => (
                  <li key={item} className="font-sans text-[11px] text-leather">• {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function SkillQualityBadge({ score, level }: { score: number; level: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-paper-edge bg-vellum px-1.5 py-0.5 font-mono text-[10px] text-sepia">
      Q{score}
      <span className="font-sans">{level}</span>
    </span>
  );
}

function QualityBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-sm border border-paper-edge bg-parchment/60 px-3 py-2">
      <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-1">{title}</p>
      <p className="font-sans text-xs text-leather leading-relaxed">{body}</p>
    </div>
  );
}
