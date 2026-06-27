# N.E.I. — The World of Financial Evolution

> 面向 PE / VC / FA / 产业投资人的 AI 工作流项目，当前重点整理 Prompt、Skill、Workflow，并提供 MCP 调用能力。

## 官方网站

**Production Site: [https://nei-pevc.com](https://nei-pevc.com)**

[访问产品](https://nei-pevc.com) · [MCP 配置指南](https://nei-pevc.com/mcp) · [安全与保密原则](https://nei-pevc.com/security) · [参与贡献](./CONTRIBUTING.md)

本仓库是 `nei-pevc.com` 的主仓库，也是线上站点当前使用的代码仓库。

## 关于 N.E.I.

**N.E.I. = New Era Investor**。

N.E.I. 是 jammyssy 发起的新一代投资人社群，目前已有 500+ 位成员，关注一级市场、AI 工具、投资工作流以及机构效率提升。

`nei-pevc.com` 是 N.E.I. 社群下的 PEVC AI 产品，起点来自一些非常具体的一线工作问题：

- BP 太多，能不能先有个靠谱的初筛框架？
- 行研、尽调、IC、投后这些活，能不能少从空白文档开始？
- 大家各自写过的好 Prompt、好模板，能不能放到一个地方复用？
- 如果已经在 Claude Code、Cursor、Windsurf 里工作，能不能直接把这些 Skill 调出来？

现阶段，项目先把一级市场常用的 Prompt、Skill、Workflow 和模板整理出来，支持搜索、收藏、复制，并通过 MCP 提供给 AI 客户端调用。

你可以把它理解成三件东西的组合：

- 一个一级市场从业者能看懂的 Prompt / Skill 库；
- 一个可以接进 Claude Code、Cursor、Windsurf 的 PEVC MCP Server；
- 一个慢慢积累机构方法论和工作模板的地方。

项目目前处于小范围 Public Beta 前后的打磨阶段，功能、内容和协作方式都会继续调整。

---

## 为什么做这个站

一级市场工作里有很多判断流程，表面上每次都不同，底层方法却高度重复：

- 一份 BP 要不要进入初筛？
- 一个赛道怎么快速形成投资地图？
- 商业尽调访谈应该问哪些问题？
- IC Memo 怎么组织结构和反方问题？
- 投后月报、政府回函、LP 汇报怎么标准化？

这些方法过去常常散落在个人经验、Word 模板、Excel 清单、投委会材料和聊天记录里。时间久了，每个人都会形成自己的处理方式，却很难复用，也很难交给 AI。

`nei-pevc.com` 先从可复用内容做起：把已经能用的 Skill、Prompt、Workflow 放到一起，让真实工作中少一些重复整理和重复写作。

---

## 现在能做什么

### 1. Skill Library

可以浏览、搜索和筛选 PEVC 场景下的 Prompt、SKILL.md、模板、方法论、工具组合和 Workflow。

支持维度包括：

- 工作场景：BP 初筛、行业研究、商业尽调、财务分析、IC 材料、投后管理、募资 / LP 等
- 内容类型：Prompt、SKILL.md、Workflow、Template、Tool Stack、Case Study
- 行业赛道：AI、半导体、新能源、医健、消费、先进制造等
- 工作内容：信息收集、尽调问题、报告生成、自动化、风险识别等

### 2. 收藏库

登录后，可以把常用 Skill 收藏到自己的 Library，并为每条收藏添加备注、排序和复用线索。

收藏会成为 MCP 调用的基础。后面你的 AI 客户端可以通过 `list_my_skills` 读取自己的收藏库，减少每次从全站重新搜索的成本。

### 3. MCP Server

站点提供 MCP Server。配置好 Token 后，可以在 AI 客户端里搜索、读取和调用平台上的 Skill。

当前工具包括：

- `search_skills`：按关键词 / 任务阶段 / 场景 / 类型 / 行业搜索公开 Skill，返回结构化结果
- `recommend_skills_for_task`：按 BP 初筛、行研、IC Memo、LP 汇报等任务推荐 Skill 组合
- `get_skill`：获取某个 Skill 的完整 Prompt / Workflow 原文
- `list_my_skills`：列出当前用户收藏且已准入 MCP 的 Skill，并说明被隐藏的未准入收藏数量
- `apply_skill`：把上下文填入 Prompt 模板，返回可执行 Prompt
- `favorite_skill`：从客户端把公开 Skill 加入收藏库
- `unfavorite_skill`：从收藏库移除 Skill，需要 `confirm=true` 二次确认

典型使用方式：

```text
用 N.E.I. 帮我初筛这个 BP，判断是否进入立项。
用 N.E.I. 生成一份商业尽调访谈问题清单。
用 N.E.I. 写一份 IC Memo 的一级结构和关键风险。
用 N.E.I. 起草一份给政府引导基金的正式回复函。
```

### 4. Skill 质量体系

详情页会展示 Skill Quality、适用场景、输入示例、输出预期和建议补齐项。

评分主要用于判断内容的复用程度：哪些内容已经比较完整，哪些还需要继续补充。它会参考：

- 标题是否具体
- 场景和标签是否完整
- 正文是否足够结构化
- 是否包含占位符、步骤、输入 / 输出示例
- 文件型 Skill 是否有附件
- 是否有来源、安装说明和使用心得

首页精选会优先放真正成型、质量分也过线的内容。

### 5. Admin 运营台

管理员这边目前主要处理：

- 待审队列
- 举报内容
- MCP 准入
- 首页精选
- 错误监控
- API / MCP 调用数据

这些运营能力会决定内容规模扩大后的秩序。内容多起来以后，需要审核、举报、MCP 准入和错误监控来维持质量。

---

## MCP 安全与保密原则

这个站会被拿来处理投资工作，所以安全边界要写清楚，不能含糊。

N.E.I. MCP 默认：

- 不读取本地文件
- 不上传用户文件
- 不保存 BP、财务模型、投委会材料、LP 名单
- 只分发 Skill / Workflow 文本
- Token 可随时撤销和重新生成
- 用户投稿 Skill 审核后才进入 MCP
- 调用日志不记录用户敏感正文

更完整说明见：[MCP 安全与保密原则](https://nei-pevc.com/security)。

---

## 技术栈

- **Next.js 15 App Router**
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Prisma 5**
- **PostgreSQL / Neon**
- **MCP SDK + mcp-handler**
- **TipTap Rich Editor**
- **Vercel 部署**

---

## 本地开发

推荐运行环境：

```bash
nvm use
npm --version
```

仓库使用 `.nvmrc` 统一到 Node 20 LTS；`package.json` 中的 `engines` 允许 Node 20.17 到 24.x，方便已经升级到 Node 24 的同学本地开发。依赖安装以 `package-lock.json` 为准。

```bash
npm ci
npm run db:push
npm run dev
```

访问：

```text
http://localhost:3000
```

常用命令：

```bash
npm run verify
npm run smoke:public-posts
npm run build
```

`npm run verify` 会依次执行 Prisma schema 校验、lint 和 TypeScript typecheck；这也是 PR Quality Gate 的核心检查。

生产构建：

```bash
npm run build
```

Vercel 构建：

```bash
npm run vercel-build
```

---

## 开发与上线流程

当前处于上线前冲刺期，团队规模很小，暂时允许直接 push `main` 来减少协作成本：

1. 先同步最新代码：`git pull --ff-only lensnowovo main`。
2. 本地开发后运行 `npm ci`、`npm run verify`，涉及页面或构建逻辑时再运行 `npm run build`。
3. commit 后直接 push 到 `main`。
4. GitHub `Lint, typecheck, and validate schema` 会在 `main` push 后运行。
5. Vercel 会基于 `main` 自动触发 production deployment。

上线稳定后再恢复 PR 流程：feature branch → PR → GitHub check + Vercel Preview → merge `main`。

协作约定：

- 不提交 `.env`、`.env.local`、`.vercel` 或任何密钥。
- 改依赖必须提交同步后的 `package-lock.json`。
- 如果 CI 报 `npm ci` lock mismatch，先在本地运行 `npm install` 或补齐跨平台 optional dependency，再用 `npm ci` 复验。
- 线上配置和部署排障见 [部署与发布指南](./docs/DEPLOY.md)。

---

## 环境变量

请参考 [.env.example](./.env.example)。

关键变量包括：

- `DATABASE_URL`
- `SESSION_SECRET`
- `NEXT_PUBLIC_BASE_URL`
- 邮件服务配置
- AI / GLM / Anthropic 相关配置
- 文件存储相关配置

不要提交 `.env` 或 `.env.local`。

---

## 项目结构

```text
app/                  Next.js App Router 页面与 API
components/           UI、首页模块、MCP 组件、详情页组件
lib/                  数据库、会话、安全、MCP、格式化、业务逻辑
prisma/               Prisma schema 与迁移
scripts/              数据导入、迁移、上线 smoke test
uploads/              本地开发附件目录
```

重点目录：

- `app/api/mcp/route.ts`：MCP Server 入口
- `app/connect/page.tsx`：MCP onboarding 与 Token 配置
- `app/security/page.tsx`：安全与保密原则
- `app/admin/page.tsx`：Admin 运营台
- `components/home/`：首页产品模块
- `lib/mcp-safety.ts`：MCP 返回内容的安全前缀
- `lib/skill-quality.ts`：Skill 质量评分
- `scripts/smoke-public-posts.ts`：公开 Post 详情页 smoke test

---

## 上线前验收清单

每次发布前建议至少运行：

```bash
npm run lint
npx tsc --noEmit --pretty false
npm run smoke:public-posts
npm run build
```

如果要检查线上详情页：

```bash
npm run smoke:public-posts -- --base https://nei-pevc.com
```

---

## 如何参与建设

欢迎两类贡献：

- **内容贡献**：提交 PEVC 场景下可复用的 Prompt、SKILL.md、Workflow、模板、案例和工具组合。
- **产品 / 代码贡献**：修复 bug、优化页面、补充 MCP 能力、改进安全与运营工具。

如果你没有工程背景，也可以直接在网站投稿，或者在 GitHub Issue 里写一个真实工作场景。比如“我想用 AI 帮我初筛 BP，但不知道怎么问”，这种需求本身就很有价值。维护者会再把它整理成 Skill、Workflow 或产品需求。

完整贡献方式见：[CONTRIBUTING.md](./CONTRIBUTING.md)。

---

## 现在做到哪了

目前项目还在 Public Beta 前后的打磨阶段，比较适合：

- 找 10～30 位 PEVC / FA / 产业投资朋友小范围试用；
- 收集真实任务，减少凭空设计功能；
- 继续补 BP 初筛、IC 材料、投后管理这些短板；
- 验证 MCP 收藏库到底能不能真的省时间。

下一阶段不会只盯着“再加多少条内容”。更重要的是：

- 提升核心场景覆盖
- 强化安全信任表达
- 提升 Skill 质量门槛
- 做任务到 Skill Bundle 的推荐路径
- 沉淀机构级私有 Skill Repository

---

## 项目来源与维护说明

N.E.I.（New Era Investor）是 jammyssy 发起和组建的新一代投资人社群。`nei-pevc.com` 最早来自社群里关于“一级市场怎么用 AI”的讨论。早期 MVP 由 jammyssy 使用 Claude Code 快速搭建，为后续产品探索提供了基础版本。

后面 `nei-pevc.com` 这条线，包括产品方向、MCP、安全、内容模型、运营后台、部署、基础设施、域名和持续开发，主要由 lensnowovo 接手推进、出资和维护。

这里明确项目关系：N.E.I. 是社群和共同语境，`nei-pevc.com` 是其中一个面向 PEVC 工作流的产品实践；这个仓库是 `nei-pevc.com` 当前的主仓库和正式部署仓库。

For English readers: N.E.I. stands for New Era Investor, a next-generation investor community initiated and organized by jammyssy with 500+ members. `nei-pevc.com` is a PEVC-focused AI product line under the broader N.E.I. community. The earliest MVP was scaffolded with support from jammyssy. The `nei-pevc.com` product line — including product direction, MCP workflow, security system, content model, admin operations, deployment, infrastructure, domain, and ongoing development — is led, funded, and maintained by lensnowovo. This repository is the canonical product repository for `nei-pevc.com`.

See also: [NOTICE.md](./NOTICE.md).

---

## License

Private beta project. All rights reserved unless otherwise stated.
