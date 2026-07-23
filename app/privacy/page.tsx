import Link from 'next/link';
import { LEGAL_CONTACT, LEGAL_EFFECTIVE_DATE, PRIVACY_VERSION } from '@/lib/legal';

export const metadata = { title: '隐私政策 · N.E.I.' };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/legal" className="mb-5 inline-block font-serif text-sm italic text-sepia hover:text-ink-brown">← 返回信任与规则</Link>
      <header className="mb-8 border-b border-paper-edge pb-5">
        <p className="font-display text-[10px] uppercase tracking-[0.2em] text-gilded">Privacy Policy</p>
        <h1 className="mt-2 font-serif text-4xl text-ink-brown">隐私政策</h1>
        <p className="mt-2 font-sans text-xs text-sepia">版本 {PRIVACY_VERSION} · 生效日期 {LEGAL_EFFECTIVE_DATE}</p>
      </header>

      <div className="space-y-7 font-sans text-sm leading-7 text-leather">
        <Section title="一、处理者与适用范围">
          <p>个人信息处理者为吴其臻（N.E.I. 项目负责人及 nei-pevc.com 备案主体）。本政策适用于网站账号、投稿、评论、MCP、Memory Node 网站端授权和相关安全运营。</p>
          <p>Memory Node 的机构、基金、项目与记忆正文按产品设计保存在用户本机；网站端只处理账号、权益、设备和许可证元数据，不远程读取或删除本地记忆。</p>
        </Section>

        <Section title="二、我们处理的数据">
          <ul className="list-disc space-y-1 pl-6">
            <li>账号资料：邮箱、昵称、角色、头像、机构和简介；GitHub 登录时的 GitHub ID、用户名、头像和已验证邮箱。</li>
            <li>安全数据：登录会话、验证码状态、IP 地址、User-Agent、限流记录、异常和必要的操作时间。</li>
            <li>社区数据：投稿、评论、收藏、关注、举报、来源及许可证信息、附件与审核状态。</li>
            <li>MCP 数据：Token 哈希、Token 名称及提示、创建/撤销/最后使用时间；调用工具名、Skill ID、耗时、请求标识等元数据。MCP 不记录项目正文或工具响应正文。</li>
            <li>Memory Node 授权数据：权益计划与期限、设备 ID 和名称、平台、客户端版本、激活/最后在线/撤销时间、许可证版本。记忆正文不上传。</li>
            <li>AI 辅助数据：只有在您主动使用 AI 转写、补全或提交公开投稿审核时，相应文本才会发送给页面标明的模型服务。请先脱敏。</li>
          </ul>
        </Section>

        <Section title="三、处理目的与依据">
          <p>我们仅为创建和保护账号、提供社区与 MCP 服务、履行内容审核和安全义务、处理投诉、维护服务质量及履行法律责任处理必要数据。</p>
          <p>注册时的协议、隐私和跨境处理确认均为非预勾选；我们记录版本、时间和必要安全元数据。非必要营销不与注册捆绑。</p>
        </Section>

        <Section title="四、Cookie 与本地存储">
          <p>网站使用名为 pevc_session 的 HttpOnly 会话 Cookie 维持登录，设置 SameSite=Lax，生产环境启用 Secure，最长有效期 30 天。OAuth 流程还会使用短期、一次性的状态 Cookie 防止跨站请求伪造。</p>
        </Section>

        <Section title="五、受托处理与跨境提供">
          <p>为运行服务，我们可能向下列服务商提供实现目的所必需的最少数据。注册时将对境外提供取得单独同意；您不同意时可以继续浏览公开内容，但不能创建需要这些服务的账号。</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead><tr className="border-b border-paper-edge"><th className="py-2 pr-4">服务</th><th className="py-2 pr-4">用途与数据</th><th className="py-2">主要位置</th></tr></thead>
              <tbody>
                <Row name="Vercel" use="网站与 API 托管；请求 IP、日志和运行元数据" location="境外/新加坡配置" />
                <Row name="Neon" use="PostgreSQL 数据库；账号、社区、MCP 与授权数据" location="新加坡" />
                <Row name="Resend" use="发送验证码邮件；邮箱地址和邮件投递元数据" location="境外服务" />
                <Row name="GitHub" use="可选 OAuth 登录与源码/仓库导入；GitHub 账号资料" location="境外服务" />
                <Row name="智谱 GLM" use="用户主动使用的 AI 辅助与公开投稿安全检查；相应文本" location="中国境内服务" />
                <Row name="阿里云 OSS / 配置的对象存储" use="用户上传并决定公开的附件" location="当前生产配置为中国境内" />
              </tbody>
            </table>
          </div>
          <p>我们不会出售个人信息。服务商、区域或用途发生实质变化时，将更新清单；依法需要重新同意的，会在继续处理前征得同意。</p>
        </Section>

        <Section title="六、保存期限">
          <p>账号资料在账号存续期间保存；公开投稿在用户删除、平台下架或处理完权利争议前保存。验证码、限流桶和临时上传仅保留完成验证、安全防护或关联投稿所需的最短期间。</p>
          <p>MCP 调用元数据和安全日志原则上不超过 180 天；原始运营指标原则上不超过 90 天。依法取证、争议处理、网络安全日志或监管要求需要延长的，仅限必要范围并限制访问。</p>
        </Section>

        <Section title="七、您的权利">
          <p>您可以查询、更正个人资料，撤销 MCP Token，删除自己的投稿，或申请复制、限制处理、注销账号和删除个人信息。当前尚未提供自动化入口的请求，可通过下方联系方式提出，我们会核验身份后处理并说明结果。</p>
          <p>撤回同意不影响撤回前处理的合法性。为履行法定义务、保护安全或解决争议确需保留的信息，将在目的完成后删除或匿名化。</p>
        </Section>

        <Section title="八、安全事件与未成年人">
          <p>我们采用密码哈希、Token 哈希、权限校验、限流、内容审核和日志最小化等措施。发生可能影响个人权益的安全事件时，将依法补救、报告并通过合理方式通知受影响用户。</p>
          <p>本服务不面向未满 18 周岁者。发现误收集未成年人信息后，请联系我们核验并处理。</p>
        </Section>

        <Section title="九、更新与联系">
          <p>重大变更将通过显著提示或重新确认告知。您对本政策、个人信息权利或跨境处理有疑问，可通过以下渠道联系。</p>
          {LEGAL_CONTACT.email && <p>隐私联系邮箱：<a className="underline" href={`mailto:${LEGAL_CONTACT.email}`}>{LEGAL_CONTACT.email}</a></p>}
          <p>安全问题：<a className="underline" href={LEGAL_CONTACT.github} target="_blank" rel="noreferrer">GitHub Security</a></p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="font-serif text-xl text-ink-brown">{title}</h2><div className="mt-3 space-y-3">{children}</div></section>;
}

function Row({ name, use, location }: { name: string; use: string; location: string }) {
  return <tr className="border-b border-paper-edge/70 align-top"><td className="py-2 pr-4 font-medium text-ink-brown">{name}</td><td className="py-2 pr-4">{use}</td><td className="py-2">{location}</td></tr>;
}
