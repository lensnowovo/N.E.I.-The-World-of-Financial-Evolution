# Public Beta P0 Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不改变生产数据库结构的前提下，修复 N.E.I. 的可信发布、MCP 当前 Token 状态、构建发布、附件 smoke、贡献者外显和后端测试底座。

**Architecture:** 保持现有 Next.js 模块化单体。新增少量纯函数承载审核与 MCP 状态规则，使 route、页面和测试共享同一套判断；数据库仍使用现有字段。通过一次 migration history reconciliation 让空 CI 数据库和已存在的生产数据库进入同一条 Prisma Migrate 轨道，但不在生产库重复执行建表或加字段 SQL。

**Tech Stack:** Next.js 15 App Router、React 18、TypeScript、Prisma 5、PostgreSQL / Neon、Vitest 4、GitHub Actions、Vercel、阿里云 OSS。

---

## 0. Scope、原则与 PR 顺序

本计划已经确认：

- 不新增或删除生产数据表；
- 不新增生产字段；
- 不升级 Next.js、React 或 Prisma major；
- 不引入 Redis、队列、微服务或新付费服务；
- 不在本轮确定最终商业模式或开放源代码许可证；
- 所有行为改动走独立 PR，前一个 PR 合并并部署验证后再开始后一个；
- 生产 migration resolve 必须由 `lensnowovo` 明确执行，不放进 CI、Vercel 或普通脚本。

建议 PR 顺序：

1. `test(p0): add backend contract test harness`
2. `fix(moderation): fail closed when content review is unavailable`
3. `fix(mcp): bind connection status to current token generation`
4. `fix(deploy): reconcile migration history and require build in CI`
5. `fix(files): distinguish online OSS smoke from static cache checks`
6. `feat(trust): expose contribution provenance and correct profile metrics`

任何 PR 出现线上回归时，使用 Vercel 回滚上一个 Production Deployment，并对该 PR 创建 revert；不要在生产数据库上手工回滚字段。

---

## PR 1：后端测试底座

### Task 1: 安装 Vitest 并增加脚本

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`

**Step 1: 安装测试依赖**

Run:

```powershell
npm install --save-dev vitest@^4.1.10
```

Expected: `package.json` 的 devDependencies 出现 `vitest`，lockfile 同步更新。

**Step 2: 添加测试脚本**

在 `package.json` scripts 中加入：

```json
"test": "vitest run",
"test:watch": "vitest"
```

把 `verify` 调整为：

```json
"verify": "prisma validate && npm run lint && tsc --noEmit --pretty false && npm run test"
```

**Step 3: 创建 Vitest 配置**

Create `vitest.config.ts`:

```ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
```

**Step 4: 验证空测试集行为**

Run:

```powershell
npm run test
```

Expected: 由于还没有测试，Vitest 可能以 no test files 退出非零。继续 Task 2，不提交半成品。

### Task 2: 为现有安全清洗添加回归测试

**Files:**

- Create: `tests/validate.test.ts`
- Test: `lib/validate.ts`

**Step 1: 编写测试**

Create `tests/validate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '@/lib/validate';

describe('sanitizeHtml', () => {
  it('removes script blocks and inline event handlers', () => {
    const html = '<p onclick="alert(1)">正文</p><script>alert(2)</script>';
    expect(sanitizeHtml(html)).toBe('<p>正文</p>');
  });

  it('removes unsafe URL schemes', () => {
    const html = '<a href="javascript:alert(1)">危险</a><a href="https://example.com">安全</a>';
    expect(sanitizeHtml(html)).toBe('<a>危险</a><a href="https://example.com">安全</a>');
  });

  it('keeps the supported prompt formatting tags', () => {
    const html = '<h2>标题</h2><pre><code>[行业]</code></pre><ul><li>步骤</li></ul>';
    expect(sanitizeHtml(html)).toBe(html);
  });
});
```

**Step 2: 运行测试**

Run:

```powershell
npm run test
```

Expected: 3 tests pass。

### Task 3: 把测试加入 CI 与 PR 模板

**Files:**

- Modify: `.github/workflows/ci.yml`
- Modify: `.github/pull_request_template.md`
- Modify: `README.md`
- Modify: `AGENTS.md`

**Step 1: CI 增加测试步骤**

在 typecheck 后加入：

```yaml
      - name: Test
        run: npm run test
```

此 PR 暂时不加入 build；build 在 PR 4 与 migration baseline 一起启用。

**Step 2: PR 模板增加测试项**

加入：

```markdown
- [ ] `npm run test`
```

**Step 3: 文档更新**

把本地基线命令统一为：

```powershell
npm run verify
```

说明 `verify` 已包含 Prisma validate、lint、typecheck 和 unit tests。

**Step 4: 完整验证**

Run:

```powershell
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/nei_ci'
$env:SESSION_SECRET='p0-test-only-secret-at-least-32-characters'
$env:NEXT_PUBLIC_BASE_URL='http://localhost:3000'
npm run verify
git diff --check
```

Expected: 全部通过，无 whitespace error。

**Step 5: Commit**

```powershell
git add package.json package-lock.json vitest.config.ts tests/validate.test.ts .github/workflows/ci.yml .github/pull_request_template.md README.md AGENTS.md
git commit -m "test(p0): add backend contract test harness"
```

---

## PR 2：可信发布状态

### Task 4: 抽取内容审核决策纯函数

**Files:**

- Create: `lib/moderation.ts`
- Create: `tests/moderation.test.ts`
- Reference: `lib/status.ts`

**Step 1: 先写失败测试**

Create `tests/moderation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveModerationDecision } from '@/lib/moderation';

describe('resolveModerationDecision', () => {
  it('publishes only a successful safe verdict', () => {
    expect(resolveModerationDecision({ verdict: 'safe', reason: '' })).toEqual({
      status: 'published',
      securityLevel: 'safe',
      reviewFlag: null,
    });
  });

  it('keeps suspicious content public but visibly queued for review', () => {
    expect(resolveModerationDecision({ verdict: 'suspicious', reason: 'needs review' })).toEqual({
      status: 'published',
      securityLevel: 'suspicious',
      reviewFlag: 'needs review',
    });
  });

  it('holds rejected content for manual review', () => {
    expect(resolveModerationDecision({ verdict: 'reject', reason: 'unsafe instruction' })).toEqual({
      status: 'pending',
      securityLevel: 'reject',
      reviewFlag: 'unsafe instruction',
    });
  });

  it('fails closed when the scanner has no result', () => {
    expect(resolveModerationDecision(null)).toEqual({
      status: 'pending',
      securityLevel: 'suspicious',
      reviewFlag: 'scan_unavailable: pending manual review',
    });
  });
});
```

Run:

```powershell
npm run test -- tests/moderation.test.ts
```

Expected: FAIL，因为模块不存在。

**Step 2: 实现最小决策函数**

Create `lib/moderation.ts`:

```ts
import { POST_STATUS } from '@/lib/status';

export type ModerationReview = {
  verdict: 'safe' | 'suspicious' | 'reject';
  reason: string;
};

export type ModerationDecision = {
  status: (typeof POST_STATUS)[keyof typeof POST_STATUS];
  securityLevel: 'safe' | 'suspicious' | 'reject';
  reviewFlag: string | null;
};

export function resolveModerationDecision(review: ModerationReview | null): ModerationDecision {
  if (!review) {
    return {
      status: POST_STATUS.PENDING,
      securityLevel: 'suspicious',
      reviewFlag: 'scan_unavailable: pending manual review',
    };
  }

  if (review.verdict === 'safe') {
    return { status: POST_STATUS.PUBLISHED, securityLevel: 'safe', reviewFlag: null };
  }

  if (review.verdict === 'suspicious') {
    return {
      status: POST_STATUS.PUBLISHED,
      securityLevel: 'suspicious',
      reviewFlag: review.reason || 'suspicious: pending manual review',
    };
  }

  return {
    status: POST_STATUS.PENDING,
    securityLevel: 'reject',
    reviewFlag: review.reason || 'rejected by automated review',
  };
}
```

**Step 3: 运行测试**

Run:

```powershell
npm run test -- tests/moderation.test.ts
```

Expected: 4 tests pass。

### Task 5: 投稿 API 使用 fail-closed 规则

**Files:**

- Modify: `app/api/posts/route.ts:104-163`
- Test: `tests/moderation.test.ts`

**Step 1: 替换默认 safe 逻辑**

在 route 中引入：

```ts
import { resolveModerationDecision, type ModerationReview } from '@/lib/moderation';
```

把 `verdict` / `reason` 默认值逻辑替换为：

```ts
let review: ModerationReview | null = null;
try {
  review = await reviewPostSafety({ title, body: stripHtml(safeBody) });
} catch (error) {
  console.error('[moderation] review unavailable; holding post for manual review', error);
}

const decision = resolveModerationDecision(review);
```

创建 Post 时使用：

```ts
status: decision.status,
reviewFlag: decision.reviewFlag,
securityLevel: decision.securityLevel,
```

返回值改为：

```ts
return NextResponse.json({ id: post.id, status: decision.status });
```

**Step 2: 确认 Admin 队列能接住状态**

现有查询已经包含 `status=pending OR reviewFlag != null`。不修改数据库，不新增状态。

### Task 6: 修复 pending 投稿后的用户反馈

**Files:**

- Modify: `app/publish/PublishForm.tsx:318-344`
- Modify: `app/dashboard/DashboardClient.tsx`
- Modify: `app/contribution-guidelines/page.tsx`

**Step 1: 投稿前端识别 pending**

成功后改为：

```ts
if (data.status === 'pending') {
  router.push('/dashboard?notice=review-pending');
  router.refresh();
  return;
}

router.push(`/posts/${data.id}`);
router.refresh();
```

**Step 2: Dashboard 展示一次性提示**

Dashboard client 从 query string 读取 `notice=review-pending`，展示：

```text
投稿已保存，正在等待人工复核。审核通过后会出现在公开目录；进入 MCP 仍需单独准入。
```

提示只表达状态，不承诺审核时限。

**Step 3: 更新投稿规则**

明确：

- safe 扫描可公开；
- suspicious 公开但进入复核队列；
- reject 或扫描不可用时先保存为待审；
- 任何内容进入 MCP 都需要管理员准入。

**Step 4: 验证**

Run:

```powershell
npm run verify
```

Manual:

1. 本地不配置 `GLM_API_KEY`；
2. 登录后投稿；
3. 确认 API 返回 `status=pending`；
4. 确认跳到 Dashboard 并显示待审说明；
5. Admin 待审队列能看到该内容；
6. 游客不能访问其详情页。

**Step 5: Commit**

```powershell
git add lib/moderation.ts tests/moderation.test.ts app/api/posts/route.ts app/publish/PublishForm.tsx app/dashboard/DashboardClient.tsx app/contribution-guidelines/page.tsx
git commit -m "fix(moderation): fail closed when content review is unavailable"
```

---

## PR 3：MCP 当前 Token 的真实连接状态

### Task 7: 抽取当前 Token 连接状态规则

**Files:**

- Create: `lib/mcp-connection.ts`
- Create: `tests/mcp-connection.test.ts`

**Step 1: 写失败测试**

Create `tests/mcp-connection.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isCallFromCurrentToken, toCurrentTokenCallWhere } from '@/lib/mcp-connection';

describe('MCP current token generation', () => {
  const createdAt = new Date('2026-07-10T10:00:00.000Z');

  it('accepts a call after the current token was generated', () => {
    expect(isCallFromCurrentToken(createdAt, new Date('2026-07-10T10:01:00.000Z'))).toBe(true);
  });

  it('rejects an old call from a previous token', () => {
    expect(isCallFromCurrentToken(createdAt, new Date('2026-07-10T09:59:00.000Z'))).toBe(false);
  });

  it('is disconnected when no token exists', () => {
    expect(isCallFromCurrentToken(null, new Date())).toBe(false);
  });

  it('builds a Prisma-compatible time filter', () => {
    expect(toCurrentTokenCallWhere(7, createdAt)).toEqual({
      userId: 7,
      createdAt: { gte: createdAt },
    });
  });
});
```

**Step 2: 实现纯函数**

Create `lib/mcp-connection.ts`:

```ts
export function isCallFromCurrentToken(tokenCreatedAt: Date | null, callAt: Date | null): boolean {
  return Boolean(tokenCreatedAt && callAt && callAt.getTime() >= tokenCreatedAt.getTime());
}

export function toCurrentTokenCallWhere(userId: number, tokenCreatedAt: Date) {
  return {
    userId,
    createdAt: { gte: tokenCreatedAt },
  } as const;
}
```

Run:

```powershell
npm run test -- tests/mcp-connection.test.ts
```

Expected: 4 tests pass。

### Task 8: Token 生成和撤销重置旧状态

**Files:**

- Modify: `app/api/users/me/mcp-token/route.ts`

**Step 1: 生成 Token 时重置 last used**

Update data:

```ts
data: {
  mcpTokenHash: hash,
  tokenCreatedAt: new Date(),
  tokenLastUsedAt: null,
},
```

**Step 2: 撤销 Token 时清空全部 Token 状态**

Update data:

```ts
data: {
  mcpTokenHash: null,
  tokenCreatedAt: null,
  tokenLastUsedAt: null,
},
```

不要删除历史 `McpCallLog`；它仍是运营数据，但不再决定新 Token 状态。

### Task 9: MCP 调用日志改为可靠写入

**Files:**

- Modify: `app/api/mcp/route.ts:71-88`
- Modify: `app/api/mcp/route.ts:256-899`

**Step 1: 鉴权成功时可靠更新 last used**

把 fire-and-forget update 改为：

```ts
await prisma.user.update({
  where: { id: user.id },
  data: { tokenLastUsedAt: new Date() },
});
```

如果更新失败，MCP 请求返回明确的 server error，不把未知状态当连接成功。

**Step 2: logCall 返回 Promise**

```ts
const logCall = async (tool: string, start: number, postId?: number) => {
  try {
    await prisma.mcpCallLog.create({
      data: {
        userId: uid,
        tool,
        postId,
        clientName,
        requestId,
        latencyMs: Date.now() - start,
      },
    });
  } catch (error) {
    console.error('[mcp] failed to persist call log', { tool, requestId, error });
  }
};
```

保留 best-effort 语义：日志失败不应吞掉已生成的 Skill 响应；但必须等待写入尝试完成，避免 Vercel 提前结束函数。

**Step 3: 逐个 finally await**

把所有：

```ts
logCall('tool_name', start, postId);
```

改为：

```ts
await logCall('tool_name', start, postId);
```

用以下命令确认没有漏改：

```powershell
rg -n "logCall\(" app/api/mcp/route.ts
```

Expected: 定义处之外，所有 tool handler 调用前都有 `await`。

### Task 10: 状态 API 与首页只读取当前 Token 调用

**Files:**

- Modify: `app/api/users/me/mcp-status/route.ts`
- Modify: `app/page.tsx:110-150`
- Verify: `components/home/HomeMcpFeature.tsx`
- Verify: `components/mcp/McpOnboardingChecklist.tsx`

**Step 1: 状态 API 先取 Token 时间**

先查询：

```ts
const user = await prisma.user.findUnique({
  where: { id: uid },
  select: { mcpTokenHash: true, tokenCreatedAt: true, tokenLastUsedAt: true },
});
```

无 Token 时直接返回：

```ts
{
  favoriteCount,
  hasMcpToken: false,
  tokenLastUsedAt: null,
  lastMcpCallAt: null,
  hasAnyMcpCall: false,
  hasListMySkillsCall: false,
  isConnected: false,
}
```

有 Token 时，所有 `McpCallLog` 查询增加：

```ts
createdAt: { gte: user.tokenCreatedAt }
```

**Step 2: 首页查询当前 Token 的最近调用**

User select 加入 `tokenCreatedAt`。取得 user 后，最近调用必须满足 `createdAt >= tokenCreatedAt`。

为避免当前 `Promise.all` 在取得 user 之前查询日志，拆成两段：先并行查询 user 和普通计数，再根据 `user.tokenCreatedAt` 查询 current-token log。

**Step 3: 手动验收**

1. 旧 Token 已有历史调用；
2. 重新生成 Token；
3. 首页重新出现“等待调通”，连接页显示未完成；
4. 用旧 Token 调用返回 401；
5. 用新 Token 调用 `search_skills` 成功；
6. 刷新后 CTA 消失、连接步骤变绿；
7. 撤销 Token 后恢复未连接状态。

**Step 4: 验证并提交**

```powershell
npm run verify
git diff --check
git add lib/mcp-connection.ts tests/mcp-connection.test.ts app/api/users/me/mcp-token/route.ts app/api/users/me/mcp-status/route.ts app/api/mcp/route.ts app/page.tsx
git commit -m "fix(mcp): bind connection status to current token generation"
```

---

## PR 4：Migration history、构建与发布

> 这是唯一包含人工生产操作的 PR。先完成代码和 CI 验证，再由维护者执行 production resolve，最后才修改 Vercel build command。

### Task 11: 生成 schema history 补齐 migration

**Files:**

- Create: `prisma/migrations/20260710_reconcile_schema_history/migration.sql`
- Create: `docs/runbooks/2026-07-10-prisma-baseline.md`

**Step 1: 准备两个临时 PostgreSQL 数据库**

需要：

```text
postgresql://postgres:postgres@localhost:5432/nei_migration_source
postgresql://postgres:postgres@localhost:5432/nei_migration_shadow
```

它们只能是空的本地/CI 数据库，不得指向生产。

**Step 2: 从现有 migration 到当前 schema 生成 SQL**

Run:

```powershell
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/nei_migration_source'
npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url 'postgresql://postgres:postgres@localhost:5432/nei_migration_shadow' --script --output prisma/reconcile-schema-history.sql
New-Item -ItemType Directory -Path 'prisma/migrations/20260710_reconcile_schema_history' -ErrorAction Stop | Out-Null
Move-Item -LiteralPath 'prisma/reconcile-schema-history.sql' -Destination 'prisma/migrations/20260710_reconcile_schema_history/migration.sql'
```

Expected: SQL 只负责把早期 migration 补到当前 `schema.prisma`，包括现有生产字段和表；不包含业务数据写入。

**Step 3: 人工审查 SQL**

必须确认：

- 没有 `DROP TABLE "User"`、`DROP TABLE "Post"` 等核心表操作；
- 允许删除已经从 schema 移除的早期 `PostLike`，但先确认生产不存在需要保留的数据；
- 新增字段有与当前 schema 一致的 default；
- 所有新表、index 和 foreign key 与 schema 一致；
- 文件中没有生产 URL、用户名或 secret。

如果 diff 要删除无法确认的数据，停止并单独设计数据迁移，不继续本计划。

### Task 12: 用全新数据库证明 migrations 可还原当前 schema

**Files:**

- Test: `prisma/migrations/**`
- Test: `prisma/schema.prisma`

**Step 1: 对空库执行 migration deploy**

```powershell
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/nei_ci'
npx prisma migrate reset --force --skip-seed
npx prisma migrate deploy
```

Expected: initial + reconcile 两个 migration 成功。

**Step 2: 检查 drift**

```powershell
npx prisma migrate diff --from-url $env:DATABASE_URL --to-schema-datamodel prisma/schema.prisma --exit-code
```

Expected: exit code 0，输出 No difference detected。

**Step 3: 在该空库运行 build**

```powershell
$env:SESSION_SECRET='p0-build-only-secret-at-least-32-characters'
$env:NEXT_PUBLIC_BASE_URL='http://localhost:3000'
npm run build
```

Expected: build 完成。

### Task 13: Sitemap 对数据库临时不可用时降级

**Files:**

- Modify: `app/sitemap.ts`

**Step 1: 设置 revalidation**

加入：

```ts
export const revalidate = 3600;
```

**Step 2: 数据库异常时保留静态与 Bundle 路由**

把 Post 查询包进 try/catch：

```ts
let postRoutes: MetadataRoute.Sitemap = [];
try {
  const posts = await prisma.post.findMany({
    where: { status: POST_STATUS.PUBLISHED, deletedAt: null },
    select: { id: true, updatedAt: true, featured: true },
    orderBy: { updatedAt: 'desc' },
    take: 5000,
  });
  postRoutes = posts.map((post) => ({
    url: `${baseUrl}/posts/${post.id}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: post.featured ? 0.85 : 0.65,
  }));
} catch (error) {
  console.error('[sitemap] database unavailable; returning static routes only', error);
}
```

返回值保持：

```ts
return [...staticRoutes, ...bundleRoutes, ...postRoutes];
```

### Task 14: GitHub Actions 加 PostgreSQL、migration 和 build

**Files:**

- Modify: `.github/workflows/ci.yml`

**Step 1: 增加 PostgreSQL service**

```yaml
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: nei_ci
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
```

CI `DATABASE_URL` 保持：

```yaml
DATABASE_URL: postgresql://postgres:postgres@localhost:5432/nei_ci
```

**Step 2: 安装后执行 migrations**

```yaml
      - name: Apply migrations
        run: npx prisma migrate deploy

      - name: Check schema drift
        run: npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
```

**Step 3: 增加 build gate**

```yaml
      - name: Build
        run: npm run build
```

保留 validate、lint、typecheck、test。更新 workflow name 或 branch protection context 前，确认 required check 名称仍为 `Lint, typecheck, and validate schema`；最好保持 job name 不变，避免保护规则失联。

### Task 15: 生产 migration baseline 人工 Runbook

**Files:**

- Create: `docs/runbooks/2026-07-10-prisma-baseline.md`
- Modify: `docs/DEPLOY.md`
- Modify: `package.json`
- Modify: `vercel.json`

Runbook 必须包含以下顺序：

**Step 1: 在 Neon 创建可恢复备份 / restore point**

记录时间，不把连接串写进文档或日志。

**Step 2: 检查生产 schema 与当前 Prisma schema**

在安全终端加载 `DATABASE_URL` 后：

```powershell
npx prisma migrate diff --from-url $env:DATABASE_URL --to-schema-datamodel prisma/schema.prisma --exit-code
```

Expected: exit code 0。若非 0，停止，不执行 resolve。

**Step 3: 查看 migration 状态**

```powershell
npx prisma migrate status
```

分支处理：

- 如果 `20260616173100_init` 已 applied：只登记 reconcile；
- 如果生产库没有 migration history：依次登记 initial 和 reconcile；
- 如果存在 failed / rolled back migration：停止，单独诊断。

**Step 4: 只登记，不执行 SQL**

已有 initial：

```powershell
npx prisma migrate resolve --applied 20260710_reconcile_schema_history
```

无 history：

```powershell
npx prisma migrate resolve --applied 20260616173100_init
npx prisma migrate resolve --applied 20260710_reconcile_schema_history
```

**Step 5: 再次验证**

```powershell
npx prisma migrate status
npx prisma migrate diff --from-url $env:DATABASE_URL --to-schema-datamodel prisma/schema.prisma --exit-code
```

Expected: migrations up to date，drift 为零。

**Step 6: 切换构建命令**

`package.json`:

```json
"vercel-build": "prisma generate && prisma migrate deploy && next build"
```

`vercel.json` 保持：

```json
{
  "buildCommand": "npm run vercel-build",
  "regions": ["sin1"]
}
```

**Step 7: Preview 后再合并**

Preview 必须通过；生产部署后检查 migration log、首页、登录、MCP、Admin 和附件下载。

**Step 8: Commit**

```powershell
git add prisma/migrations/20260710_reconcile_schema_history/migration.sql docs/runbooks/2026-07-10-prisma-baseline.md app/sitemap.ts .github/workflows/ci.yml package.json vercel.json docs/DEPLOY.md
git commit -m "fix(deploy): reconcile migration history and require build in CI"
```

---

## PR 5：附件 smoke 与对象存储语义

### Task 16: 统一 smoke 参数解析

**Files:**

- Create: `scripts/smoke-args.ts`
- Create: `tests/smoke-args.test.ts`
- Modify: `scripts/smoke-public-posts.ts`
- Modify: `scripts/smoke-public-downloads.ts`

**Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { parseSmokeArgs } from '@/scripts/smoke-args';

describe('parseSmokeArgs', () => {
  it('accepts --base', () => {
    expect(parseSmokeArgs(['--base', 'https://nei-pevc.com']).baseUrl).toBe('https://nei-pevc.com');
  });

  it('accepts a positional URL used by npm scripts', () => {
    expect(parseSmokeArgs(['https://nei-pevc.com']).baseUrl).toBe('https://nei-pevc.com');
  });

  it('falls back to SMOKE_BASE_URL', () => {
    expect(parseSmokeArgs([], { SMOKE_BASE_URL: 'https://nei-pevc.com' }).baseUrl).toBe('https://nei-pevc.com');
  });
});
```

**Step 2: 实现解析函数**

```ts
export function parseSmokeArgs(argv: string[], env: NodeJS.ProcessEnv = process.env) {
  const named = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key?.startsWith('--') && value && !value.startsWith('--')) {
      named.set(key.slice(2), value);
      i += 1;
    }
  }
  const positionalUrl = argv.find((value) => /^https?:\/\//i.test(value));
  return {
    baseUrl: named.get('base') || positionalUrl || env.SMOKE_BASE_URL || '',
    limit: Number(named.get('limit') || '0'),
  };
}
```

两个 smoke script 使用：

```ts
const { baseUrl, limit } = parseSmokeArgs(process.argv.slice(2));
```

下载 smoke 不需要 limit 时只取 `baseUrl`。

### Task 17: 在线 smoke 不再要求 Git 静态缓存

**Files:**

- Modify: `scripts/smoke-public-downloads.ts:40-53`

**Step 1: 调整检查顺序**

规则：

```ts
if (baseUrl) {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/files/${attachment.id}/download`;
  const res = await fetch(url, { redirect: 'manual' });
  if (!res.ok) {
    failures.push({ id: attachment.id, fileName: attachment.fileName, reason: `download HTTP ${res.status}` });
  }
  continue;
}

if (!fs.existsSync(fileCachePath(attachment.storageKey))) {
  failures.push({ id: attachment.id, fileName: attachment.fileName, reason: 'missing public/file-cache object' });
}
```

含义：

- DB/local 模式检查 curated static cache；
- online 模式检查真实下载 route，由 route 自己选择 static cache、OSS 或 fallback；
- 在没有 schema 字段前，不猜测 storage backend。

**Step 2: 更新文档命令**

统一为：

```powershell
npm run smoke:public-posts -- https://nei-pevc.com
npm run smoke:public-downloads -- https://nei-pevc.com
```

Update: `README.md`、`AGENTS.md`、`docs/DEPLOY.md`、`docs/PUBLIC_BETA_CHECKLIST.md`。

**Step 3: 验证**

```powershell
npm run test
npm run smoke:public-posts -- https://nei-pevc.com
npm run smoke:public-downloads -- https://nei-pevc.com
```

Expected: 67 个公开详情通过，包含 #77-#80 的在线附件下载通过。

**Step 4: Commit**

```powershell
git add scripts/smoke-args.ts tests/smoke-args.test.ts scripts/smoke-public-posts.ts scripts/smoke-public-downloads.ts README.md AGENTS.md docs/DEPLOY.md docs/PUBLIC_BETA_CHECKLIST.md
git commit -m "fix(files): distinguish online OSS smoke from static cache checks"
```

---

## PR 6：贡献者来源外显与指标纠偏

### Task 18: 建立无 schema 的 provenance view model

**Files:**

- Create: `lib/contribution-trust.ts`
- Create: `tests/contribution-trust.test.ts`
- Reference: `lib/bundles.ts`

**Step 1: 测试三种来源类型**

测试至少覆盖：

1. 普通原创：贡献者就是发布者；
2. 外部收录：显示 originalAuthor 和收录者；
3. 精选 / MCP Ready / Workflow membership 状态。

Expected view model：

```ts
type ContributionTrustView = {
  sourceType: 'original' | 'curated-external';
  contributor: { id: number; name: string };
  originalAuthor: string | null;
  sourceUrl: string | null;
  statuses: Array<'N.E.I. 精选' | 'MCP Ready'>;
  workflowNames: string[];
};
```

实现函数不得查询数据库，只接收 Post select 和 `taskBundles`，便于页面和测试共用。

### Task 19: Skill 详情加入“贡献与来源”卡

**Files:**

- Create: `components/ContributionProvenance.tsx`
- Modify: `app/posts/[id]/page.tsx`
- Modify: `app/contribution-guidelines/page.tsx`

**Step 1: 组件展示字段**

展示：

- 贡献者；
- 原作者（有则显示）；
- 收录整理者（外部收录时显示）；
- 来源链接；
- N.E.I. 精选；
- MCP Ready；
- 已加入的 Workflow；
- 投稿与署名规则入口。

不要增加新的质量分，不显示无法验证的“专家”“认证作者”等标签。

**Step 2: 替换右栏分散来源信息**

详情页原有作者、来源和状态数据迁入组件；保留标签、附件和统计。避免同一来源信息在右栏和底部重复。

**Step 3: 授权文案边界**

投稿规则明确投稿者保留署名，N.E.I. 可按现有条款展示、整理、推荐和 MCP 分发。代码 LICENSE、内容许可证和商业分成在商业化讨论后单独决策，本 PR 不创建 LICENSE 文件。

### Task 20: Profile 指标纠偏并合并重复 tab

**Files:**

- Modify: `app/profile/[id]/page.tsx`
- Test: `tests/contribution-trust.test.ts`

**Step 1: 修正 MCP Ready 查询**

现有查询改为：

```ts
prisma.post.count({
  where: {
    userId: id,
    status: POST_STATUS.PUBLISHED,
    deletedAt: null,
    mcpApproved: true,
  },
})
```

**Step 2: 统一 Star / 收藏**

产品用语统一为“收藏 / Star”。保留 `?tab=stars` 作为 canonical URL；访问旧的 `?tab=favorites` 时 redirect 到 `?tab=stars`，不删除数据。

**Step 3: 徽章继续使用真实行为**

- 发布数 > 0：`N.E.I. Contributor`
- 精选数 > 0：`Curated by N.E.I.`
- MCP Ready 数 > 0：`MCP Ready Builder`
- Workflow 内容数 > 0：现有 Workflow badge 或新增 `Workflow Contributor`

不要因管理员身份自动获得贡献质量徽章；管理员标记可单独展示维护者身份。

### Task 21: UI 与完整回归

**Files:**

- Verify: `app/posts/[id]/page.tsx`
- Verify: `app/profile/[id]/page.tsx`
- Verify: mobile viewport

**Step 1: 自动检查**

```powershell
npm run verify
npm run build
npm run smoke:public-posts -- https://nei-pevc.com
git diff --check
```

Expected: 全部通过。

**Step 2: 浏览器检查**

检查：

1. 普通原创 Skill；
2. Anthropic 外部收录 Skill；
3. #42 横纵分析法的精选、MCP Ready 和行业研究 Workflow；
4. 贡献者 Profile；
5. 390px 移动端；
6. 来源 URL 仍使用 `noopener noreferrer`。

**Step 3: Commit**

```powershell
git add lib/contribution-trust.ts tests/contribution-trust.test.ts components/ContributionProvenance.tsx app/posts/[id]/page.tsx app/profile/[id]/page.tsx app/contribution-guidelines/page.tsx
git commit -m "feat(trust): expose contribution provenance and correct profile metrics"
```

---

## 7. 每个 PR 的统一发布检查

### 本地

```powershell
git status --short
npm run verify
git diff --check
```

涉及 build、migration、route 或 Server Component 时：

```powershell
npm run build
```

### GitHub

- PR description 写明影响范围；
- CI required check 通过；
- Vercel Preview 通过；
- 所有 conversation resolved；
- 不 squash 掉需要保留的 migration/manual gate 说明。

### 生产

```powershell
npm run smoke:public-posts -- https://nei-pevc.com
npm run smoke:public-downloads -- https://nei-pevc.com
```

人工检查：首页、登录、投稿、Admin 待审、MCP 连接状态、详情来源卡和 OSS 下载。

---

## 8. P0 完成定义

只有同时满足以下条件，P0 才算结束：

- GLM 不可用时投稿不会被标成 safe；
- pending 投稿有正确用户反馈并进入 Admin 队列；
- 当前 Token 未实际调用时不显示 MCP 已连接；
- 重新生成和撤销 Token 后状态正确；
- MCP call log 写入尝试不会被 Vercel 提前截断；
- GitHub required check 包含 migrations、tests 和 build；
- 生产 migration history 与当前 schema 一致，drift 为零；
- Vercel 不再运行 `prisma db push`；
- 线上附件 smoke 能正确验证 OSS 文件；
- Skill 详情能区分贡献者、原作者、收录整理和 Workflow；
- Profile 的 MCP Ready 与收藏指标真实；
- 线上 67 个公开 Skill 详情和全部公开附件 smoke 通过。

P0 完成后再进入商业化方向讨论。届时应基于以下已经可信的数据做判断：活跃用户、MCP Token 生成数、当前 Token 调通率、每工具调用、被调用 Skill、收藏、贡献者数量、Workflow 复用和机构需求，不以注册数或 Skill 总数单独决定商业模式。
