import Link from 'next/link';

export const metadata = { title: '隐私政策 · N.E.I.' };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <Link href="/" className="font-serif italic text-sm text-sepia hover:text-ink-brown mb-4 inline-block">← 返回首页</Link>
      <h1 className="font-serif text-3xl text-ink-brown mb-2">隐私政策</h1>
      <p className="font-sans text-xs text-sepia mb-8">版本 2026-06 · 最后更新：2026 年 6 月</p>
      <div className="prose-manuscript max-w-none space-y-6 text-sm leading-7 text-leather">
        <section>
          <h2 className="font-serif text-xl text-ink-brown">一、我们收集什么</h2>
          <p><strong className="text-ink-brown">账号信息</strong>：注册邮箱、用户名、角色（VC/PE/FA）、头像、机构（选填）、简介（选填）。GitHub 登录时获取 GitHub 昵称和头像。</p>
          <p><strong className="text-ink-brown">使用行为</strong>：收藏记录、评论、投稿内容、浏览次数、MCP 调用元数据（调用时间、工具名、Skill ID、客户端标识、耗时）。</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ink-brown">二、MCP Token</h2>
          <p>当您生成 MCP Token 时，平台<strong className="text-ink-brown">不保存 Token 明文，仅保存用于验证的 SHA-256 哈希值</strong>。Token 明文只在生成时向您显示一次。您可以随时撤销 Token。Token 最后使用时间会被记录（用于安全监控）。</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ink-brown">三、MCP 调用日志</h2>
          <p>MCP 调用日志<strong className="text-ink-brown">仅记录元数据</strong>（用户 ID、工具名、Skill ID、客户端标识、请求 ID、耗时），<strong className="text-ink-brown">不记录您的 BP 正文、财务模型、投委会材料、LP 名单或任何用户输入的敏感内容</strong>。</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ink-brown">四、Cookie</h2>
          <p>N.E.I. 使用一个 HTTP-only Cookie（pevc_session）维持登录状态。该 Cookie 包含 HMAC 签名的会话凭证，不包含明文密码。Cookie 在 30 天后过期。</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ink-brown">五、第三方服务</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>数据库</strong>：Neon（PostgreSQL，新加坡区域）——存储用户、帖子、收藏等数据；</li>
            <li><strong>文件存储</strong>：Cloudflare R2——存储用户上传的附件（SKILL.md 等）；</li>
            <li><strong>部署</strong>：Vercel（新加坡区域）——托管网站和 API；</li>
            <li><strong>邮件</strong>：Resend——发送验证码邮件；</li>
            <li><strong>OAuth</strong>：GitHub——GitHub 登录；</li>
            <li><strong>AI 服务</strong>：智谱 GLM（open.bigmodel.cn）——AI 转写和发布辅助。</li>
          </ul>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ink-brown">六、用户权利</h2>
          <p>您可以查看和修改个人资料（/settings）、查看和撤销 MCP Token、收藏和取消收藏、编辑和删除自己的投稿（软删除）。如需删除账号，请联系平台。</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ink-brown">七、数据安全</h2>
          <p>生产环境的 SESSION_SECRET 强制配置（缺失时应用启动失败）。用户密码使用 bcrypt 哈希存储。MCP Token 使用 SHA-256 哈希存储。投稿内容经过 GLM 安全扫描（检测 Prompt Injection / 数据外泄指令）。我们将持续完善安全能力。</p>
        </section>
        <section>
          <h2 className="font-serif text-xl text-ink-brown">八、联系方式</h2>
          <p>如有隐私问题，请通过 GitHub（github.com/lensnowovo）联系。</p>
        </section>
        <div className="pt-6 border-t border-paper-edge flex gap-4 text-xs flex-wrap">
          <Link href="/terms" className="text-sepia hover:text-ink-brown">用户协议 →</Link>
          <Link href="/security" className="text-sepia hover:text-ink-brown">MCP 安全 →</Link>
          <Link href="/disclaimer" className="text-sepia hover:text-ink-brown">免责声明 →</Link>
          <Link href="/contribution-guidelines" className="text-sepia hover:text-ink-brown">投稿规则 →</Link>
        </div>
      </div>
    </div>
  );
}
