# N.E.I. PEVC Skill Hub

> New Era Investor 旗下的 PEVC AI Skill Hub / Prompt Library / MCP 工作流平台。
> 面向 PE、VC、FA、产业投资、政府引导基金与投后管理场景，整理可复用的 Skill、Prompt、Workflow 与外部信息连接器。

**Production Site:** [https://nei-pevc.com](https://nei-pevc.com)

[访问产品](https://nei-pevc.com) · [MCP 连接](https://nei-pevc.com/connect) · [MCP / API 库](https://nei-pevc.com/mcp-library) · [安全与保密原则](https://nei-pevc.com/security) · [参与贡献](./CONTRIBUTING.md)

本仓库是 `nei-pevc.com` 的唯一主仓库，也是 Vercel 生产环境当前使用的代码仓库。

---

## 1. 项目简介

N.E.I. 是 New Era Investor 的缩写，由 jammyssy 发起并组织，是一个关注一级市场、AI 工具、投资工作流和机构效率的新一代投资人社群，目前已有 500+ 成员。

`nei-pevc.com` 是 N.E.I. 社群下的 PEVC AI 产品实践。项目最早来自社群里关于“一级市场如何真正用上 AI”的讨论：BP 初筛、行业研究、商业尽调、IC Memo、投后月报、LP 汇报、政府基金回函，这些任务每天都在发生，也都有大量重复结构。

这个站先从一件具体的事做起：把真实工作中能复用的 Prompt、Skill、Workflow、模板和工具连接器沉淀下来，让投资人可以浏览、搜索、收藏、复制，并通过 MCP 在自己的 Agent 客户端里调用。

当前支持 Claude Code、Codex、Workbuddy 或其他兼容 MCP / Agent 工作流的客户端。

---

## 2. 当前状态

截至 2026-06-30，项目已进入小范围 Public Beta 前后的发布阶段。

已经具备：

- 公开 Skill / Prompt / Workflow 内容库
- 按任务、行业、内容类型筛选
- Skill 详情页、复制、收藏、评论与举报
- 提出 Skill 需求：发布缺口、认领需求、提交并采纳站内 Skill
- MCP 连接与 Token 管理
- MCP 全库搜索 + 收藏库读取
- MCP / API 外部信息连接器库
- Skill 质量评分与补齐建议
- 投稿与审核流程
- Admin 日常运营台
- 安全与保密说明页
- GitHub PR + CI 保护流程
- Vercel 自动部署

目前产品更适合邀请 PEVC / FA / 产业投资朋友小范围试用，收集真实任务和真实反馈。内容和功能仍会持续调整。

---

## 3. 产品能力

### Skill Library

浏览、搜索和筛选 PEVC 场景下的 Prompt、SKILL.md、方法论、模板、工具组合和 Workflow。

覆盖的工作场景包括：

- BP 初筛
- 行业研究
- 商业尽调
- 财务分析
- IC 材料
- 投后管理
- 募资 / LP 汇报
- 政府基金与正式函件

内容会逐步从“单条 Prompt”升级到“任务包 / Workflow / Playbook”。例如：写 IC 不只需要一个 Prompt，还需要反方质询、风险红旗、格式模板、脱敏提示和交付标准。

### MCP Server

N.E.I. 提供 MCP Server。用户可为 Codex、Claude Code、Workbuddy 等客户端分别生成独立 Token，在自己的 Agent 客户端中调用平台内容。

当前 MCP 工具包括：

- `search_skills`：搜索公开 Skill
- `recommend_skills_for_task`：按任务推荐 Skill 组合
- `get_skill`：读取某个 Skill 的完整内容
- `apply_skill`：把上下文填入 Prompt 模板，返回可执行 Prompt
- `list_my_skills`：读取当前用户收藏库
- `favorite_skill` / `unfavorite_skill`：在客户端内管理收藏
- `list_disciplines` / `get_default_discipline`：获取 Agent 工作纪律
- `list_skill_requests` / `create_skill_request`：浏览需求，并在明确确认后发布公开 Skill 需求

MCP 的设计目标是让用户继续在自己熟悉的客户端工作。模型额度、项目材料、本地文件权限和外部工具授权都由用户自己的客户端控制。

### MCP / API Library

除 N.E.I. 自建 MCP 外，项目也整理外部信息获取工具，例如网页抓取、论文检索、生物医药、AI 开源生态、公司与市场数据、工程验算等方向。

这些连接器用于帮助投资人判断“外部信息从哪里来”。接入外部 MCP / API 前，应先确认数据来源、费用、权限边界和保密要求。

### Skill Quality

详情页会展示 Skill 质量评分、适用场景、输入示例、输出预期和建议补齐项。

评分主要用于判断内容复用程度：

- 90+：可作为首页旗舰内容
- 80+：适合精选展示
- 70+：可公开使用，但仍建议继续补齐
- 低于 70：一般不进入精选

质量体系会逐步影响首页推荐、MCP 准入和内容运营。

### Admin 运营台

管理员可以处理：

- 投稿审核
- 举报内容
- MCP 准入
- 首页精选
- 错误监控
- API / MCP 调用数据

随着内容规模扩大，运营台会成为内容质量、用户安全和 MCP 可用性的主要控制面。

---

## 4. 安全与保密原则

N.E.I. 会被用于投资工作，因此安全边界必须清楚。

默认原则：

- 不读取用户本地文件
- 不上传用户文件
- 不保存 BP、财务模型、IC 材料、LP 名单等敏感材料
- 只分发 Skill / Workflow 文本
- 每个 Agent 客户端使用独立 Token，可单独撤销且互不影响
- 用户投稿内容审核后才进入 MCP
- 调用日志不记录用户敏感正文
- 外部 MCP / API 需要用户自行确认权限和数据边界

完整说明见：[MCP 安全与保密原则](https://nei-pevc.com/security)。

---

## 5. 技术栈

- Next.js 15 App Router
- React
- TypeScript
- Tailwind CSS
- Prisma 5
- PostgreSQL / Neon
- MCP SDK + mcp-handler
- TipTap Rich Editor
- Vercel

---

## 6. 本地开发

推荐使用 Node 20 LTS。仓库包含 `.nvmrc`，依赖安装以 `package-lock.json` 为准。

```bash
nvm use
npm ci
npm run db:push
npm run dev
```

本地访问：

```text
http://localhost:3000
```

常用检查：

```bash
npm run verify
npm run smoke:public-posts
npm run build
```

`npm run verify` 会依次执行 Prisma schema 校验、lint 和 TypeScript typecheck，也是 PR Quality Gate 的核心检查。

Vercel 构建命令：

```bash
npm run vercel-build
```

---

## 7. 环境变量

请参考 [.env.example](./.env.example)。

关键变量包括：

- `DATABASE_URL`
- `SESSION_SECRET`
- `NEXT_PUBLIC_BASE_URL`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `ADMIN_BOOTSTRAP_EMAILS`
- `GLM_API_KEY`
- `GLM_BASE_URL`
- `GLM_MODEL`
- S3 / R2 文件存储相关变量

不要提交 `.env`、`.env.local`、生产数据库连接串、API Key、MCP Token 或任何用户私密数据。

---

## 8. 项目结构

```text
app/                  Next.js App Router 页面与 API
components/           UI、首页模块、MCP 组件、详情页组件
lib/                  数据库、会话、安全、MCP、业务逻辑
prisma/               Prisma schema 与迁移
scripts/              数据导入、迁移、smoke test
docs/                 部署与维护文档
uploads/              本地开发附件目录
```

重点入口：

- `app/page.tsx`：首页
- `app/api/mcp/route.ts`：MCP Server
- `app/connect/page.tsx`：MCP onboarding 与 Token 配置
- `app/mcp-library/page.tsx`：MCP / API 库
- `app/security/page.tsx`：安全与保密原则
- `app/admin/page.tsx`：Admin 运营台
- `app/posts/[id]/page.tsx`：Skill 详情页
- `lib/mcp-safety.ts`：MCP 返回内容安全前缀
- `lib/skill-quality.ts`：Skill 质量评分
- `scripts/smoke-public-posts.ts`：公开内容 smoke test

---

## 9. 开发与发布流程

`main` 是生产分支，已开启 branch protection。

后续所有代码和文档改动都走 PR：

```bash
git checkout main
git pull --ff-only origin main
git checkout -b codex/<short-task-name>

# 修改、检查、提交
npm run verify
git add .
git commit -m "type(scope): summary"
git push origin codex/<short-task-name>
```

然后在 GitHub 创建 Pull Request。

合并要求：

- PR 必须通过 `Lint, typecheck, and validate schema`
- conversation 必须 resolved
- 禁止 force push 到 `main`
- 禁止删除 `main`
- 管理员也受保护

涉及页面、构建、MCP、安全或数据库的改动，建议额外运行：

```bash
npm run build
npm run smoke:public-posts
```

线上 smoke：

```bash
npm run smoke:public-posts -- --base https://nei-pevc.com
```

---

## 10. 如何参与

欢迎两类贡献。

### 内容贡献

可以提交 PEVC 场景下可复用的：

- Prompt
- SKILL.md
- Workflow
- 模板
- 案例
- 工具组合
- MCP / API 连接器调研

高质量内容建议包含：

- 适用角色
- 使用场景
- 所需输入材料
- 执行步骤
- 预期输出
- 示例输入
- 示例输出
- 安全边界
- 不适用场景

### 产品 / 代码贡献

可以贡献：

- 修复 bug
- 优化页面体验
- 改进 MCP 能力
- 强化安全与权限
- 补充运营台能力
- 编写 smoke test
- 改进文档

没有工程背景也可以参与。直接在网站投稿，或在 GitHub Issue 里写一个真实工作场景即可。维护者会把高价值需求整理成 Skill、Workflow 或产品任务。

完整贡献方式见：[CONTRIBUTING.md](./CONTRIBUTING.md)。

---

## 11. 项目来源与维护说明

N.E.I. 是 jammyssy 发起并组织的新一代投资人社群。`nei-pevc.com` 最早来自社群里关于“一级市场如何使用 AI”的讨论。早期 MVP 由 jammyssy 使用 Claude Code 快速搭建，为后续产品探索提供了基础版本。

后续 `nei-pevc.com` 产品线，包括产品方向、MCP 工作流、安全系统、内容模型、Admin 运营台、部署、基础设施、域名和持续开发，主要由 lensnowovo 接手推进、出资和维护。

这里明确项目关系：N.E.I. 是社群和共同语境；`nei-pevc.com` 是其中一个面向 PEVC 工作流的产品实践；本仓库是 `nei-pevc.com` 当前的主仓库和正式部署仓库。

For English readers: N.E.I. stands for New Era Investor, a next-generation investor community initiated and organized by jammyssy with 500+ members. `nei-pevc.com` is a PEVC-focused AI product line under the broader N.E.I. community. The earliest MVP was scaffolded with support from jammyssy. The `nei-pevc.com` product line, including product direction, MCP workflow, security system, content model, admin operations, deployment, infrastructure, domain, and ongoing development, is led, funded, and maintained by lensnowovo. This repository is the canonical product repository for `nei-pevc.com`.

See also: [NOTICE.md](./NOTICE.md).

---

## License

Private beta project. All rights reserved unless otherwise stated.
