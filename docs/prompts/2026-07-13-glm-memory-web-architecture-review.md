# 给 GLM-5.2：Memory Node 网站集成架构任务

你是本任务的后端架构师和安全协议设计者。不要设计前端，不要修改 TSX，不要实现数据库和 API。请利用长上下文能力完整阅读两个仓库，产出一份可以进入工程评审的网站与本地客户端集成契约。

## 仓库

网站主仓库：

```text
D:\02-Dev\12. nei-pevc-lensnowovo
```

Memory Node 仓库：

```text
D:\02-Dev\14. nei-memory-node
```

## 开始前

1. 在网站主仓库运行 `git status --short --branch`。
2. 如果存在未提交修改，停止并报告，不要覆盖用户工作。
3. 阅读网站仓库的 `AGENTS.md`、`prisma/schema.prisma`、认证和 session 代码、`app/connect`、`app/dashboard`、`app/api/auth`、`app/api/users/me`、MCP Token 实现、环境变量示例、Vercel 配置和相关安全文档。
4. 阅读 Memory Node 的 `AGENTS.md`、`README.md` 和 `docs/plans/2026-07-13-memory-node-architecture.md`。
5. 查看两个仓库最近提交和开放 PR，区分已实现能力与规划。

## 工作区隔离

不要在当前网站工作区直接编辑。基于最新 `origin/main` 创建：

```text
branch: glm/memory-web-integration-contract
worktree: D:\02-Dev\16. nei-pevc-memory-contract
```

如果分支或目录已存在，先检查状态，不得删除或覆盖。

## 已确认的产品决策

- N.E.I. Skill Library 和云端 Skill MCP 继续免费。
- Memory Node 是本地优先的个人长期投资记忆产品。
- 用户必须使用 nei-pevc.com 账号登录和激活。
- 收费、订阅、设备授权由 nei-pevc.com 管理。
- 记忆正文、机构、基金、项目和 Agent 对话不得上传网站。
- 网站只保存 entitlement、设备授权、客户端版本和必要安全元数据。
- 默认允许 3 台设备。
- 激活后允许 30 天离线使用。
- 订阅到期或设备撤销不得远程删除本地数据。
- 到期后仍允许查看、导出和删除本地数据。
- 第一版 Windows 内测，后续 macOS。
- 首批 Agent 客户端为 Codex 和 WorkBuddy。
- 本地客户端凭据保存到 Windows Credential Manager / macOS Keychain。
- 不采用长期 License Key 的人工复制粘贴。

## 需要完成的分析

比较并选择适合当前项目的 Native App 登录方案：

1. OAuth 2.0 Authorization Code + PKCE + loopback redirect；
2. OAuth 2.0 Device Authorization Grant；
3. 由网站签发一次性激活码的自定义流程。

必须结合当前网站现有的 cookie session、GitHub OAuth、邮箱密码登录、Next.js/Vercel 部署和个人开发维护能力，不得照搬大型企业 OAuth Server。

请重点处理：

- 授权码、access token、refresh token 和 device credential 生命周期；
- Token 只存哈希、前缀显示、轮换、撤销和重放防护；
- PKCE、state、nonce、redirect URI 白名单；
- 设备 ID 的生成与隐私边界；
- 3 台设备限制和换机流程；
- 30 天离线授权的签名载荷、时钟回拨和宽限策略；
- 服务端故障时的 fail-safe / fail-closed 边界；
- 订阅到期、退款、撤销和账号删除；
- 客户端版本、最低安全版本和强制升级边界；
- Windows Release manifest、下载 URL、SHA-256、签名状态；
- 速率限制、审计字段、日志脱敏和异常告警；
- 数据库 migration 和 Vercel 发布顺序；
- 现有 `User`、`UserConsent`、MCP Token 与新模型的关系；
- 未来支付供应商尚未确定时如何保持 entitlement 解耦；
- 网站端和 Memory Node 端各自负责什么。

## 产出文件

只创建或修改以下文档：

```text
docs/contracts/memory-node-web-integration.md
docs/plans/2026-07-13-memory-node-web-backend-plan.md
```

契约文档至少包含：

- 方案比较与最终 ADR；
- 信任边界和威胁模型；
- 完整时序图；
- 服务端数据模型草案；
- HTTP endpoint、method、认证、请求和响应 JSON；
- 稳定错误码；
- Token 和设备状态机；
- 离线许可载荷；
- Release manifest schema；
- 隐私字段清单；
- 兼容与版本策略；
- 未决问题。

后端计划必须拆成小 PR，并包含测试、migration、回滚、监控和验收标准。不要实现代码。

## 质量要求

- 使用当前代码作为证据，标注具体文件路径。
- 区分“当前已有”“需要新增”“暂缓”。
- 方案必须适合一人维护的早期产品。
- 优先选简单且可审计的设计。
- 不得把记忆正文、机构名、基金名、项目名带入云端模型。
- 不得依赖客户端永远在线。
- 不得让订阅系统锁死用户本地数据。
- 不得使用模糊表述，例如“做好安全校验”。需写清校验位置和失败行为。

## 验证与交付

1. 运行 `git diff --check`。
2. 检查只改了上述两个文档。
3. 自审一遍威胁模型和状态机是否矛盾。
4. 提交：`docs(memory): define web integration contract`。
5. 推送分支并创建 PR，PR 目标为 `main`。
6. 最终汇报 PR URL、核心选择、仍需用户决定的问题；不要自行合并。
