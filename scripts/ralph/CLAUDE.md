# Ralph Agent 指令

你是一个在软件项目上工作的自主编码 agent。

以下文件都在 scripts/ralph 下: prd.json、progress.txt

## 你的任务

1. 读取 `prd.json` 中的 PRD（与此文件在同一目录）
2. 读取 `progress.txt` 中的进度日志（首先检查 Codebase Patterns 部分）
3. 检查你是否在 PRD 中 `branchName` 指定的正确 branch 上。如果不是，checkout 或从 main 创建它。
4. **严格按照顺序**选择 `userStories` 数组中第一个满足以下所有条件的 story：
   - `passes: false`
   - `blocked: false`（或 blocked 字段不存在）
   **(绝对禁止跳跃：必须按数组顺序开发完当前再开发下一个)**

   如果该 story 的 `notes` 字段不为空，说明 Validator 上次验证发现了问题，
   请优先阅读 notes 中的失败原因，针对性地进行修复，而不是重新实现。
5. 实现该单个 user story,只实现这一个user story的内容
6. 运行局部质量检查（只针对你改动的文件运行 typecheck。**绝对禁止**运行全局或全量的重量级测试，节省时间且聚焦于当前 story）
7. 如果检查通过，提交所有更改，消息为：`feat: [Story ID] - [Story Title]`
8. 更新 PRD，将已完成的 story 的 `passes` 设置为 `true`，**并且必须将 `notes` 字段清空为 `""`**
9. 每次完成运行后, 将你的进度追加到 `progress.txt`

## 进度报告格式

追加到 progress.txt（永远不要替换，始终追加）：
```
## [日期-时间,格式yyyy-mm-dd HH:mm] - [Story ID]
- 实现了什么
- 更改的文件
- **未来迭代的学习：**
  - 发现的 patterns（例如，"这个 codebase 使用 X 来做 Y"）
  - 遇到的陷阱（例如，"更改 W 时不要忘记更新 Z"）
  - 有用的上下文（例如，"评估面板在 component X 中"）
---
```

学习部分至关重要 - 它帮助未来的迭代避免重复错误并更好地理解 codebase。

## 整合 Patterns

如果你发现未来迭代应该知道的**可重用 pattern**，将其添加到 progress.txt 顶部的 `## Codebase Patterns` 部分（如果不存在则创建）。例如：
```
## Codebase Patterns
- Prisma 查询过滤软删除统一加 deletedAt: null；列表查询收敛到 lib/feed.ts 的 buildFeedWhere
- session 鉴权用 getSessionUid()；管理员判断用 getCurrentUser() 的 isAdmin
- 改 prisma/schema.prisma 后必须 npx prisma generate 再 typecheck
```

只添加**通用且可重用**的 patterns，不要添加 story 特定的细节。

## 质量要求

- 所有 commits 必须通过 `npx tsc --noEmit`（本项目无独立 typecheck script，统一用此命令）
- 不要提交损坏的代码
- 保持更改专注且最小化
- 遵循现有的代码 patterns

## 服务与浏览器测试（N.E.I. 适配）

N.E.I. 是 **Next.js 一体化应用**（前后端在同一项目，API 用 Next.js Route Handlers，**无独立后端服务，无 Java**）。

- **验收首要标准：`npx tsc --noEmit` 必过**。本地无 DATABASE_URL，不要用 `npm run build` 做完整验收（会因无 DB 打印 prisma 噪音，虽 exit 0 但不可靠）。
- **UI/行为类验收**（acceptanceCriteria 含 "Verify in browser using agent-browser"）：本地无 DB，`npm run dev` 起的页面首页会因 prisma 查询失败报错，agent-browser 完整验证可能受限。若无法完成浏览器验证，在 progress.txt 注明"需部署后人工验证"；**只要 `npx tsc --noEmit` 过 + 代码实现符合 acceptanceCriteria 描述，可将该 story 的 passes 设为 true**，不要因本地无 DB 而阻塞。
- **绝对不要启动**任何 Java / mvn / spring-boot / 独立后端服务（本项目没有）。

## 停止条件

完成 user story 后，检查 prd.json 中所有 stories 的状态。

如果所有的 story 都满足以下任一条件，在你的回复**最后一行**单独输出停止标记（不得有任何前缀或解释文字）：
- `passes: true`（已完成并通过验证）
- `blocked: true`（已超过最大重试次数，被跳过）

停止标记格式（仅在所有 story 真正完成时才输出，且必须是独立的一行）：
<promise>COMPLETE</promise>

⚠️ 重要：**禁止**在任何解释、说明或否定语句中提及或引用停止标记的文字。如果你想表达"任务未完成"，直接结束响应即可，不要写任何与停止标记相关的字样。

如果仍有 `passes: false` 且 `blocked: false` 的 story，正常结束响应，不输出任何标记。

## 重要提示

- 每次迭代只处理一个 story, 记住 只处理一个user story,处理完这个story,你的任务就结束了
- 频繁提交
- 保持 typecheck 绿色
- 在开始之前阅读 progress.txt 中的 Codebase Patterns 部分

## 关于本项目（N.E.I.）的重要注意事项

**技术栈**：Next.js 15.5 App Router + React 18 + TypeScript(strict) + Prisma 5.22 + PostgreSQL + Tailwind。前后端一体化，无独立后端。

**关键约束**：
- 本地无 DATABASE_URL。验收用 `npx tsc --noEmit`。
- **改 `prisma/schema.prisma` 后，必须先 `npx prisma generate` 再 typecheck**，否则新增字段类型不存在导致 tsc 报错。
- 部署用 `npm run vercel-build`（含 prisma db push），不要手写 SQL migration。
- session 自实现于 `lib/session.ts`（HMAC 签名 cookie）；取当前用户用 `getSessionUid()`，取用户对象用 `getCurrentUser()`。
- 文件存储在 `lib/storage.ts`（R2/本地 fallback），MCP 在 `app/api/mcp/route.ts`。
- 不要改业务逻辑/UI 除非 story 明确要求；遵循现有代码 patterns。
