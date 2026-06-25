export const dynamic = 'force-dynamic';

import Link from 'next/link';

export const metadata = {
  title: '安全与信任 · N.E.I.',
  description:
    'N.E.I. MCP 的安全边界、数据承诺、Token 管理、Skill 审核机制与举报渠道',
};

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-page px-4 sm:px-6 py-8">
      <div className="mb-6 pb-5 border-b border-paper-edge">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-serif italic text-sm text-sepia hover:text-ink-brown mb-3"
        >
          ← 返回首页
        </Link>
        <h1 className="font-serif text-3xl text-ink-brown mb-1">安全与信任</h1>
        <p className="font-sans text-sm text-sepia">
          N.E.I. MCP 的安全边界、数据承诺与可疑 Skill 举报渠道
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        {/* 左：主内容 */}
        <div className="prose-manuscript max-w-none">
          <h2>N.E.I. MCP 做什么 / 不做什么</h2>
          <p>
            N.E.I. 的 MCP（Model Context Protocol）服务只做一件事：把你选定的
            Skill（PEVC 分析方法、尽调框架、Prompt 模板）作为<strong>文本</strong>
            分发给你的本地 AI 客户端。所有分析、推理、生成都发生在你自己机器上的
            agent 里——N.E.I. 不会替它执行任何动作。
          </p>

          <div className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
            <div className="border border-paper-edge bg-vellum/60 rounded-md p-4">
              <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-2">
                N.E.I. 会做
              </p>
              <ul className="font-sans text-sm text-ink-brown space-y-1.5">
                <li>· 分发 Skill 的 Prompt 原文</li>
                <li>· 在 Skill 前注入安全规则前缀</li>
                <li>· 记录调用计数、耗时、客户端类型（用于审计）</li>
                <li>· 对投稿内容做 GLM 安全扫描</li>
              </ul>
            </div>
            <div className="border border-wax-red/30 bg-linen/40 rounded-md p-4">
              <p className="font-display tracking-display text-[10px] text-wax-red uppercase mb-2">
                N.E.I. 绝不做
              </p>
              <ul className="font-sans text-sm text-ink-brown space-y-1.5">
                <li>· 读取你本地的文件、邮箱或凭据</li>
                <li>· 把你的 BP / 财务模型 / LP 名单回传到平台</li>
                <li>· 替你发送邮件、消息或调用外部 API</li>
                <li>· 写入或修改你的系统、代码仓库</li>
                <li>· 存储 Skill 在你本地执行后产生的结果</li>
              </ul>
            </div>
          </div>

          <h2>数据不回传承诺</h2>
          <p>
            <strong>关键边界：</strong> Skill 在<strong>你的本地 agent 中执行</strong>，
            N.E.I. 平台只提供 Prompt 原文，绝不会接收到你的 BP、PDF、表格或任何分析结果。
            执行用的 AI 额度、上下文窗口、生成的产物全部留在你客户端侧。
          </p>
          <p>
            换句话说：N.E.I. 是「Prompt 图书馆」，不是「计算平台」。
            即使你把一份敏感 BP 喂给本地 agent 分析，平台也不会知道它的存在。
          </p>

          <h2>Token 管理</h2>
          <p>
            访问 MCP 需要 Bearer Token。Token 是一串以 <code>nei_</code> 开头的随机字符串，
            只在生成时<strong>显示一次</strong>，平台仅存其 SHA-256 哈希用于校验，
            明文永不入库。
          </p>
          <ul>
            <li>
              <strong>生成：</strong> 在{' '}
              <Link href="/settings" className="text-wax-red">
                设置页
              </Link>{' '}
              点击「生成 MCP Token」，复制后立即保存到密码管理器；关闭页面后无法再看到原文
            </li>
            <li>
              <strong>撤销：</strong> 同一页面可随时吊销旧 Token 并重新生成；
              怀疑泄露时这是第一道应急动作
            </li>
            <li>
              <strong>泄露处理：</strong> 如 Token 不慎粘贴到聊天群、共享文档、
              Git 仓库或截图，请立即去设置页吊销——所有使用旧 Token 的客户端会自动失效
            </li>
            <li>
              <strong>使用记录：</strong> 平台会记录 Token 的创建时间和最后一次使用时间，
              便于你审计是否有异常调用
            </li>
          </ul>

          <h2>Skill 审核机制</h2>
          <p>
            为防止恶意 Prompt 注入通过 Skill 进军你的 agent，N.E.I. 采用三重过滤：
          </p>
          <ol>
            <li>
              <strong>投稿默认不进 MCP：</strong> 用户投稿的 Skill 默认{' '}
              <code>mcpApproved = false</code>，仅作为站内可见内容，
              不会通过 MCP 返回给任何客户端
            </li>
            <li>
              <strong>GLM 安全扫描：</strong> 新帖发布前由 GLM 自动判定
              内容安全、Prompt 安全、投资合规三档：<code>safe</code> 直发、
              <code>suspicious</code> 标记管理员复核、<code>reject</code> 不公开
            </li>
            <li>
              <strong>人工准入：</strong> 仅平台管理员审核通过的 Skill
              （<code>mcpApproved = true</code>）才会出现在 <code>search_skills</code>{' '}
              / <code>get_skill</code> / <code>list_my_skills</code> 的返回里
            </li>
          </ol>
          <p>
            <strong>防 Rug Pull：</strong> 作者编辑已审核的 Skill 后，
            <code>mcpApproved</code> 会自动重置为 <code>false</code>，
            版本号 +1，必须重新审核才能再次进入 MCP——
            防止「初版安全、更新偷偷加恶意指令」的攻击。
          </p>

          <h2>外部 MCP 风险提示</h2>
          <p>
            除了 N.E.I.，你的 AI 客户端可能还会连接其他 MCP 服务
            （比如文件系统、网络搜索、企业知识库）。<strong>这些是独立服务</strong>，
            各自有不同的安全策略与数据回传规则。
          </p>
          <p>
            接入前请自行确认：
          </p>
          <ul>
            <li>该 MCP 服务背后的厂商与可联系渠道</li>
            <li>它是否会读取或回传你的本地数据</li>
            <li>它的鉴权方式（Token / OAuth / 无鉴权）与撤销机制</li>
            <li>它的日志粒度——是否记录请求正文</li>
          </ul>
          <p>
            N.E.I. 只能保证自身的安全边界，<strong>无法替你审查其他 MCP 服务</strong>。
            在不确定时，请仅在工作专用、无敏感数据的隔离环境里启用陌生 MCP。
          </p>

          <h2>如何举报可疑 Skill</h2>
          <p>
            如果你在 N.E.I. 上看到疑似含 Prompt 注入、数据外泄、合规问题的 Skill
            （例如：正文里出现「忽略以上指令」「读取 ~/.ssh」「发送到某邮箱」
            等可疑语句），请立即举报：
          </p>
          <ol>
            <li>
              进入该 Skill 的详情页（如{' '}
              <Link href="/" className="text-wax-red">
                首页
              </Link>{' '}
              搜索或从作者主页进入）
            </li>
            <li>点击「举报」按钮，填写理由（尽量引用具体可疑片段）</li>
            <li>
              管理员会在 <Link href="/admin">/admin</Link> 控制台看到举报并处置：
              下架（设为 pending）、撤回 MCP 准入、或加 <code>reviewFlag</code>{' '}
              交由人工复核
            </li>
          </ol>
          <p>
            如涉及正在进行的攻击或大规模泄露风险，请同时在{' '}
            <Link href="/settings" className="text-wax-red">
              设置页
            </Link>{' '}
            吊销你的 MCP Token 作为应急止血。
          </p>
        </div>

        {/* 右：侧边 */}
        <aside className="lg:sticky lg:top-6 lg:self-start space-y-4">
          <div className="border border-paper-edge bg-vellum rounded-md p-4">
            <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-2">
              快速操作
            </p>
            <Link
              href="/settings"
              className="block font-serif text-sm text-wax-red hover:underline mb-2"
            >
              → 生成 / 吊销 Token
            </Link>
            <Link
              href="/mcp"
              className="block font-serif text-sm text-leather hover:text-ink-brown mb-2"
            >
              → MCP 配置指南
            </Link>
            <Link
              href="/"
              className="block font-serif text-sm text-leather hover:text-ink-brown"
            >
              → 浏览 Skill
            </Link>
          </div>

          <div className="border border-paper-edge bg-vellum/50 rounded-md p-4">
            <p className="font-display tracking-display text-[10px] text-sepia uppercase mb-2">
              三句话原则
            </p>
            <p className="font-sans text-xs text-leather leading-relaxed">
              Skill 只提供分析框架，不授权读写本地文件。
              <br />
              你的 BP / LP 名单只留在你客户端，平台拿不到。
              <br />
              不确定某个 Skill？先吊销 Token，再举报。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
