# Memory Node Website Entry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 nei-pevc.com 增加 Memory Node 的公开产品入口，清楚说明本地优先边界，并为后续内测下载与设备授权保留稳定位置。

**Architecture:** 本轮只增加静态产品页面和站内入口，不修改 Prisma schema，不实现下载、订阅、设备授权或本地状态探测。`/memory` 使用现有 Next.js App Router、会话读取和设计系统；首页只增加一块独立的产品介绍，避免与云端 Skill MCP 混淆。

**Tech Stack:** Next.js 15 App Router、React 18、TypeScript、Tailwind CSS、现有 N.E.I. 设计系统。

---

### Task 1: 固定范围与协作契约

**Files:**
- Create: `docs/plans/2026-07-13-memory-node-web-entry.md`
- Create: `docs/prompts/2026-07-13-glm-memory-web-architecture-review.md`

**Step 1: 记录本轮非目标**

确认本轮不包含 Prisma、API、License、设备、下载、支付和 Deep Link。

**Step 2: 写 GLM 架构审查 Prompt**

要求 GLM 在独立 worktree 中只编写网站与本地客户端的接口契约，不修改前端实现。

**Step 3: 检查文档格式**

Run: `git diff --check`

Expected: exit 0。

### Task 2: 建立 Memory Node 公共页面

**Files:**
- Create: `app/memory/page.tsx`

**Step 1: 定义可验证的页面内容**

页面必须包含：

- “跨项目、跨客户端的长期投资记忆”定位；
- Agent 是主要使用者，人是权限主体；
- 数据保存在本机；
- 机构、基金、项目的分层示意；
- Codex 与 WorkBuddy 首批支持状态；
- Windows 内部测试版开发中；
- 未登录用户登录入口；
- 已登录用户的真实等待状态；
- Skill MCP 与 Memory Node MCP 的区别；
- 不保存原始文件、不监听完整聊天、不远程删除本地数据。

**Step 2: 实现 Metadata**

添加 title、description、canonical、Open Graph 和 Twitter metadata，不创建虚假产品截图。

**Step 3: 实现服务端登录态**

使用 `getSessionUid()` 判断是否登录。未登录 CTA 指向 `/login?next=/memory`；已登录状态只展示“已登录，内测登记即将开放”，不得伪装为已经提交申请。

**Step 4: 完成响应式页面**

沿用现有 parchment、ink-brown、gilded、wax-red、font-serif 和 font-display。页面应偏编辑部档案风格，不使用紫色渐变、玻璃卡片或常见 SaaS hero。

**Step 5: 运行静态验证**

Run: `npm run verify`

Expected: Prisma validate、Next lint、TypeScript 全部通过。

### Task 3: 增加全站导航入口

**Files:**
- Modify: `components/chrome/SiteHeader.tsx`

**Step 1: 添加桌面入口**

在 `MCP 库` 后增加 `Memory Node`，并正确处理 `/memory` active 状态。

**Step 2: 添加移动端入口**

移动抽屉中增加同名入口，登录与否均可见。

**Step 3: 检查键盘与点击范围**

沿用 `NavLink`、`DrawerLink`，不新增非语义点击容器。

**Step 4: 运行静态验证**

Run: `npm run verify`

Expected: PASS。

### Task 4: 增加首页产品入口

**Files:**
- Create: `components/home/HomeMemoryFeature.tsx`
- Modify: `app/page.tsx`

**Step 1: 实现独立产品模块**

模块应说明公共 Skill Library 与本地 Memory Node 的关系，强调“网站分发方法，本地节点保存记忆”。

**Step 2: 保持视觉区别**

模块不复用当前深色 MCP 连接 CTA。使用更克制的档案页双栏结构，让 Memory Node 成为第二产品支柱，同时不抢 Skill Feed 的主入口。

**Step 3: 加入真实状态 CTA**

CTA 指向 `/memory`，文案使用“了解 Memory Node”，不写“下载”或“立即使用”。

**Step 4: 接入首页**

将模块放在 `HomeMcpFeature` 之后、Skill Library 之前。

**Step 5: 运行静态验证**

Run: `npm run verify`

Expected: PASS。

### Task 5: 视觉与发布前验证

**Files:**
- Verify only

**Step 1: 启动开发服务**

Run: `npm run dev`

Expected: localhost:3000 可访问。

**Step 2: 桌面浏览器验收**

检查 `/memory` 和 `/`：导航、首屏、CTA、内容层级、无横向滚动。

**Step 3: 移动端验收**

至少检查 390px 宽度：导航抽屉、标题换行、卡片堆叠和按钮可点击性。

**Step 4: 验证登录态**

游客访问 `/memory` 不得出现加载中或空白；登录入口必须带 `next=/memory`。

**Step 5: 运行构建**

Run: `npm run build`

Expected: 编译通过。如本地数据库不可达导致动态页面构建失败，记录明确阶段和错误，不得把数据库错误描述为前端编译错误。

**Step 6: 提交**

```bash
git add app/memory/page.tsx app/page.tsx components/chrome/SiteHeader.tsx components/home/HomeMemoryFeature.tsx docs/plans/2026-07-13-memory-node-web-entry.md docs/prompts/2026-07-13-glm-memory-web-architecture-review.md
git commit -m "feat(memory): add public Memory Node entry"
```

## 后续阶段

以下内容等待 GLM 的接口契约 PR 审阅通过后再规划：

- 内测申请数据模型；
- Native App OAuth / PKCE 或 Device Authorization；
- entitlement、device、credential、release 表；
- Windows 下载与 SHA-256；
- 设备激活、撤销和 30 天离线授权；
- Deep Link 与本地节点状态探测；
- 价格、支付和订阅。
