# N.E.I. — The World of Financial Evolution

> 面向 PE / VC / FA / 产业投资人的 AI Skill Hub、Prompt Library 与 MCP 工作流平台。

[访问产品](https://nei-pevc.com) · [MCP 配置指南](https://nei-pevc.com/mcp) · [安全与保密原则](https://nei-pevc.com/security)

N.E.I. 不是一个普通 Prompt 站。它试图把一级市场高频工作——BP 初筛、行业研究、商业尽调、财务分析、IC Memo、投后管理、募资 / LP 沟通——沉淀成可搜索、可收藏、可调用、可复用的 AI Skill 与 Workflow。

你可以把它理解成：

- 给一级市场从业者用的 **AI Skill Library**
- 给 Claude Code / Cursor / Windsurf 等客户端接入的 **PEVC MCP Server**
- 给机构内部逐步沉淀方法论的 **Prompt / Workflow Repository**

当前项目处于小范围 Public Beta 准备阶段。

---

## 为什么做 N.E.I.

一级市场工作里有大量重复但高价值的判断流程：

- 一份 BP 要不要进入初筛？
- 一个赛道怎么快速形成投资地图？
- 商业尽调访谈应该问哪些问题？
- IC Memo 怎么组织结构和反方问题？
- 投后月报、政府回函、LP 汇报怎么标准化？

这些工作过去散落在个人经验、Word 模板、Excel 清单、投委会材料和聊天记录里。N.E.I. 想做的，是把这些“隐性工作流”变成可以被 AI 客户端调用的结构化 Skill。

---

## 产品能力

### 1. Skill Library

浏览、搜索和筛选 PEVC 场景下的 Prompt、SKILL.md、模板、方法论、工具组合和 Workflow。

支持维度包括：

- 工作场景：BP 初筛、行业研究、商业尽调、财务分析、IC 材料、投后管理、募资 / LP 等
- 内容类型：Prompt、SKILL.md、Workflow、Template、Tool Stack、Case Study
- 行业赛道：AI、半导体、新能源、医健、消费、先进制造等
- 工作内容：信息收集、尽调问题、报告生成、自动化、风险识别等

### 2. 收藏库

用户可以把常用 Skill 收藏到自己的 Library，并为每条收藏添加备注、排序和复用线索。

这不是简单点赞，而是 MCP 调用的基础：你的 AI 客户端可以通过 `list_my_skills` 读取你自己的收藏库。

### 3. MCP Server

N.E.I. 提供 MCP Server，让 AI 客户端直接搜索和调用平台上的 Skill。

当前工具包括：

- `search_skills`：按关键词 / 场景 / 类型搜索公开 Skill
- `get_skill`：获取某个 Skill 的完整 Prompt / Workflow 原文
- `list_my_skills`：列出当前用户收藏且已准入 MCP 的 Skill
- `apply_skill`：把上下文填入 Prompt 模板，返回可执行 Prompt
- `favorite_skill`：从客户端把公开 Skill 加入收藏库

典型使用方式：

```text
用 N.E.I. 帮我初筛这个 BP，判断是否进入立项。
用 N.E.I. 生成一份商业尽调访谈问题清单。
用 N.E.I. 写一份 IC Memo 的一级结构和关键风险。
用 N.E.I. 起草一份给政府引导基金的正式回复函。
```

### 4. Skill 质量体系

详情页会展示 Skill Quality、适用场景、输入示例、输出预期和建议补齐项。

质量评分会参考：

- 标题是否具体
- 场景和标签是否完整
- 正文是否足够结构化
- 是否包含占位符、步骤、输入 / 输出示例
- 文件型 Skill 是否有附件
- 是否有来源、安装说明和使用心得

首页精选会优先展示真正 Workflow 且质量分达到门槛的内容。

### 5. Admin 运营台

管理员可以处理：

- 待审队列
- 举报内容
- MCP 准入
- 首页精选
- 错误监控
- API / MCP 调用数据

这让 N.E.I. 不只是内容站，而是一个可以持续运营的 Skill 平台。

---

## MCP 安全与保密原则

N.E.I. 面向机构用户，因此安全边界必须清楚。

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

```bash
npm install
npm run db:push
npm run dev
```

访问：

```text
http://localhost:3000
```

常用命令：

```bash
npm run lint
npx tsc --noEmit --pretty false
npm run smoke:public-posts
npm run build
```

生产构建：

```bash
npm run build
```

Vercel 构建：

```bash
npm run vercel-build
```

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

## 当前阶段

N.E.I. 当前适合：

- 邀请 10～30 位 PEVC / FA / 产业投资朋友小范围试用
- 收集真实使用任务
- 补齐 BP 初筛、IC 材料、投后管理等核心场景
- 验证 MCP 收藏库调用是否真的提高工作效率

下一阶段重点不是继续堆内容，而是：

- 提升核心场景覆盖
- 强化安全信任表达
- 提升 Skill 质量门槛
- 做任务到 Skill Bundle 的推荐路径
- 沉淀机构级私有 Skill Repository

---

## License

Private beta project. All rights reserved unless otherwise stated.
