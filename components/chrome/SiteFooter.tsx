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
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center font-sans text-xs">
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-ink-brown"
          >
            粤ICP备2026087653号-1
          </a>
          <span aria-hidden="true" className="text-paper-edge-strong">
            ·
          </span>
          <a
            href="https://cn.nei-pevc.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center transition-opacity hover:opacity-75"
            aria-label="查看 N.E.I. 中国内地服务节点"
          >
            {/* The visible badge is served by the mainland ECS node, providing a lightweight health check and real node traffic. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://cn.nei-pevc.com/status.svg"
              alt="中国内地节点 · 正常"
              width="138"
              height="20"
              loading="eager"
            />
          </a>
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
          <Link href="/community-rules" className="hover:text-ink-brown transition-colors">
            社区规则
          </Link>
          <Link href="/copyright" className="hover:text-ink-brown transition-colors">
            版权与下架
          </Link>
          <Link href="/disclaimer" className="hover:text-ink-brown transition-colors">
            免责声明
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
