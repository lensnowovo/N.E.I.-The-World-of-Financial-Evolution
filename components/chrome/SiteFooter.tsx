import { Ornament } from '@/components/icons/Ornament';

export function SiteFooter() {
  return (
    <footer className="relative z-[1] border-t border-paper-edge mt-section">
      <div className="mx-auto max-w-page px-6 py-10 text-sm text-sepia">
        <div className="flex justify-center mb-4 text-leather">
          <Ornament />
        </div>
        <p className="text-center font-serif italic">
          N.E.I. · New Era Investors · 一级市场投资人的 AI Skill Hub
        </p>
        <p className="mt-2 text-center text-xs">
          © {new Date().getFullYear()} N.E.I. · The World of Financial Evolution
        </p>
      </div>
    </footer>
  );
}
