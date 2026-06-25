import Link from 'next/link';
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
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 font-serif text-xs">
          <Link href="/security" className="hover:text-ink-brown">
            MCP 安全与保密原则
          </Link>
          <Link href="/mcp" className="hover:text-ink-brown">
            MCP 配置指南
          </Link>
        </div>
      </div>
    </footer>
  );
}
