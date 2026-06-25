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
          N.E.I. · New Era Investors · 一级市场投资人的 AI Skills Hub
        </p>
        <p className="mt-2 text-center text-xs">
          © {new Date().getFullYear()} N.E.I. · The World of Financial Evolution
        </p>
        <nav className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 font-sans text-xs">
          <Link href="/legal" className="hover:text-ink-brown transition-colors">
            信任与使用规则
          </Link>
          <Link href="/terms" className="hover:text-ink-brown transition-colors">
            用户协议
          </Link>
          <Link href="/privacy" className="hover:text-ink-brown transition-colors">
            隐私政策
          </Link>
          <Link href="/disclaimer" className="hover:text-ink-brown transition-colors">
            免责声明
          </Link>
          <Link href="/contribution-guidelines" className="hover:text-ink-brown transition-colors">
            投稿规则
          </Link>
          <Link href="/security" className="hover:text-ink-brown transition-colors">
            MCP 安全与保密原则
          </Link>
          <Link href="/mcp" className="hover:text-ink-brown transition-colors">
            MCP 配置指南
          </Link>
          <Link href="/connect" className="hover:text-ink-brown transition-colors">
            连接配置
          </Link>
        </nav>
      </div>
    </footer>
  );
}
