# N.E.I. 部署与发布指南

> 当前生产站点：[https://nei-pevc.com](https://nei-pevc.com)
> 当前部署方式：直接 push `main` + Vercel Production Deployment

本文档用于团队协作和上线排障。上线前请以这里为准，不再使用早期 VPS / SQLite / 本地 uploads 方案。

---

## 1. 环境版本

仓库使用 `.nvmrc` 作为团队默认 Node 版本：

```bash
nvm use
node --version
npm --version
```

当前约定：

- Node：20 LTS，最低 `20.17`
- npm：10.x 或 11.x
- 包管理器：npm，禁止混用 pnpm / yarn
- 依赖锁文件：`package-lock.json`

`package.json` 中的 `engines` 允许 Node 20.17 到 24.x，是为了兼容已经升级到 Node 24 的本地环境；CI 默认读取 `.nvmrc`。

---

## 2. 本地开发

首次安装：

```bash
npm ci
npm run db:push
npm run dev
```

本地访问：

```text
http://localhost:3000
```

提交前至少运行：

```bash
npm ci
npm run verify
```

涉及页面、路由、Prisma、依赖或部署逻辑时，再运行：

```bash
npm run build
```

`npm run verify` 包含：

```bash
prisma validate
npm run lint
tsc --noEmit --pretty false
```

---

## 3. GitHub 协作流程

上线前冲刺期只有少量维护者修改代码，暂时关闭 `main` 的强制 PR 保护，允许直接 push `main` 来减少发布摩擦。

当前流程：

1. 同步最新 `main`。
2. 本地完成修改并运行验证命令。
3. commit。
4. 直接 push 到 `main`。
5. GitHub required check 会在 `main` push 后运行。
6. Vercel 自动从 `main` 触发 Production Deployment。

```bash
git pull --ff-only lensnowovo main
npm ci
npm run verify
npm run build
git push lensnowovo HEAD:main
```

上线稳定后恢复 PR 流程：

1. 从最新 `main` 拉新分支。
2. push 到 feature branch。
3. 创建 PR 到 `main`。
4. 等待 GitHub required check 通过。
5. 等待 Vercel Preview Deployment 通过。
6. Merge PR。
7. Vercel 自动从 `main` 触发 Production Deployment。

建议命名：

```bash
git checkout -b feat/xxx
git checkout -b fix/xxx
git checkout -b chore/xxx
```

禁止提交：

- `.env`
- `.env.local`
- `.vercel`
- 任何 API key / database url / OAuth secret
- `node_modules`
- `.next`

---

## 4. GitHub Actions

`main` push 会运行：

```text
Lint, typecheck, and validate schema
```

workflow 文件：

```text
.github/workflows/ci.yml
```

当前检查项：

```bash
npm ci
npx prisma validate
npm run lint
npx tsc --noEmit --pretty false
```

注意：`npm run build` 暂时不作为 GitHub required check，因为构建依赖生产环境变量和数据库连接。Vercel Production 是实际构建 gate；恢复 PR 流程后，Vercel Preview 也会作为预览构建 gate。

---

## 5. Vercel 部署

Vercel 绑定仓库：

```text
lensnowovo/N.E.I.-The-World-of-Financial-Evolution
```

部署规则：

- push 到 `main`：触发 Production Deployment
- 恢复 PR 流程后，PR 会触发 Preview Deployment
- 生产域名：`https://nei-pevc.com`

Vercel 构建命令：

```bash
npm run vercel-build
```

`vercel-build` 只负责**生成 Prisma Client 并构建网站**，不修改任何数据库：

```bash
prisma generate && next build
```

> ⚠️ **构建阶段禁止任何数据库写入或 schema 变更。** 历史上 `vercel-build` 曾包含 `prisma db push`，会在每次 Preview Deployment 执行时直接同步 `schema.prisma` 到数据库——当 Preview 与 Production 共用 `DATABASE_URL` 时，预览构建可能改写甚至删除生产表（如已发生过的 `McpAccessToken` 险情）。该命令已移除，并由 `npm run check:release-safety`（CI 门禁）防止回归。

如果 Vercel 没有 deployment，先确认：

1. `main` 是否有新 commit
2. Vercel Git Integration 是否仍连接当前仓库
3. Vercel 项目 Production Branch 是否为 `main`

---

## 5b. 数据库迁移与发布安全（重要）

本仓库的数据库 schema 变更走 **受控的 Prisma migration 流程**，与 Vercel 构建彻底分离。构建只生成 Client、不碰数据库结构。

### Preview Deployment

- 只执行 `prisma generate && next build`，**不修改任何数据库**。
- Preview 与 Production **不得共用同一个可写 `DATABASE_URL` 后再执行迁移**。如 Preview 需要数据库，应使用**独立的 Preview 数据库**（Neon 支持按分支创建），并仅在本地/受控脚本里对其执行 `db:push`/`migrate deploy`，绝不在 Vercel 构建阶段执行。

### Production 数据库迁移（与应用构建分离）

正式数据库的 schema 变更必须作为**单独的、受控的步骤**执行，不在 `vercel-build` 内：

1. **备份**：在 Neon 对生产数据库创建一个恢复点（branch / PITR 快照）。
2. **检查待执行 migration**（不写入）：

   ```bash
   DATABASE_URL=<production DATABASE_URL> npm run db:migrate:status
   ```

3. **人工审核** `prisma/migrations/` 下待应用的新 migration SQL，确认无意外 `DROP`/破坏性操作。
4. **执行迁移**（受控环境，指向生产库）：

   ```bash
   DATABASE_URL=<production DATABASE_URL> npm run db:migrate:deploy
   ```

   `prisma migrate deploy` 只应用 `prisma/migrations/` 里尚未执行的、版本化的 migration，不会像 `db push` 那样按 `schema.prisma` 隐式同步（含隐式删表）。
5. **迁移成功后再发布应用**：push 到 `main` → Vercel Production Deployment（此时只做 `prisma generate && next build`）。

### 绝对禁止

- 对生产库执行 `prisma db push`（会按 schema 隐式同步，可能删表）。
- 使用 `--accept-data-loss` 或 `--force-reset`。
- 在 Vercel 构建阶段（`vercel-build`/`build`/`postinstall`）执行任何数据库写入或 schema 变更命令。
- Preview 与 Production 共用可写数据库后再在 Preview 构建里执行迁移。

> CI 门禁 `Release safety (no db push in build)`（`node scripts/check-release-safety.mjs`）会扫描构建生命周期脚本与 `vercel.json`，发现 `prisma db push` / `prisma migrate deploy` / `--accept-data-loss` / `--force-reset` 等立即让 CI 失败。本地可用 `npm run check:release-safety` 自查。

### 回滚策略

- **应用版本**可回滚：在 Vercel Dashboard 回滚到上一个 Production Deployment，或提交 revert commit。
- **数据库 migration 不要依赖自动向下回滚**（`migrate reset` 会清库，生产禁用）。
- **破坏性变更采用 expand → migrate data → contract 分阶段**：先加新列/新表（兼容）、迁移数据、最后在确认无回滚需求后再删旧结构。每个阶段都是独立的 forward-only migration。

---

## 6. 生产环境变量

环境变量只放在 Vercel Project Settings，不进仓库。

必填：

| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | Neon PostgreSQL |
| `SESSION_SECRET` | 登录会话密钥 |
| `NEXT_PUBLIC_BASE_URL` | 生产站点 URL，建议 `https://nei-pevc.com` |
| `RESEND_API_KEY` | 邮件服务 |
| `EMAIL_FROM` | 发件人 |
| `GITHUB_CLIENT_ID` | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth |
| `S3_ENDPOINT` | 阿里云 OSS endpoint |
| `S3_REGION` | OSS region |
| `S3_ACCESS_KEY_ID` | OSS access key |
| `S3_SECRET_ACCESS_KEY` | OSS secret |
| `S3_BUCKET_NAME` | OSS bucket |

选填：

| 变量 | 用途 |
| --- | --- |
| `ANTHROPIC_API_KEY` | AI 相关能力 |
| `GLM_API_KEY` | AI 相关能力 |
| `MEMORY_LICENSE_PRIVATE_KEY` | Memory Node 授权：Ed25519 许可证签发私钥（PEM）。`openssl genpkey -algorithm ED25519` 生成。激活签发依赖此变量；未配置则 `/api/activation/activate` 在签发阶段失败。对应**公钥由 Memory Node 客户端编译内置（另一仓库 nei-memory-node）**。 |
| `CRON_SECRET` | Vercel Cron 鉴权密钥，保护 `/api/cron/cleanup-rate-limits`。在 Vercel → Settings → Cron Jobs 配置同名 `CRON_SECRET`，Vercel 会以 `Authorization: Bearer <CRON_SECRET>` 调用；未配置则该端点一律 401。 |

### Vercel Cron（限流清理）

`vercel.json` 配置每 10 分钟调用 `/api/cron/cleanup-rate-limits`，删除：

- `RateLimitBucket.expiresAt < now`（过期限流桶）；
- `ActivationCode.expiresAt < now − 7 天`（过期并超过保留期的激活码；仍有效/未过保留期的一律保留）。

部署 Memory Node 激活前，请在 Vercel 配置 `CRON_SECRET` 并在 Cron Jobs 处填入相同值；否则清理不会执行（限流表会持续增长），且端点对任何调用返回 401。

GitHub OAuth callback URL：

```text
https://nei-pevc.com/api/auth/github/callback
```

---

## 7. 常见问题

### `npm ci` 报 lockfile mismatch

原因通常是 `package.json` 和 `package-lock.json` 不同步，或者 Windows 本地生成 lockfile 时漏掉 Linux runner 需要的 optional dependency。

处理：

```bash
npm install
npm ci
npm run verify
```

如果 CI 明确提示缺少跨平台 optional dependency，例如 `@emnapi/*`，需要补齐 `package-lock.json` 后再用 `npm ci` 复验。

### push 分支后没有生产部署

正常。只有 `main` 更新后，Vercel 才会触发 production deployment。

### 直接 push main 被拒绝

说明 GitHub branch protection 或 ruleset 又被打开了。上线前冲刺期可以临时关闭；上线稳定后再恢复 PR 保护。

### Vercel Preview 通过，但生产站没变

说明改动还没有进入 `main`，或者 production branch 不是当前仓库的 `main`。

---

## 8. 上线后验证

部署完成后至少检查：

```bash
npm run smoke:public-posts -- --base https://nei-pevc.com
```

手动检查：

- 首页能显示最新版文案
- 详情页 `/posts/[id]` 正常
- 登录 / 注册正常
- 收藏 / 复制 / 评论正常
- MCP 配置页正常
- 文件下载正常

如需回滚，优先在 Vercel Dashboard 回滚到上一个 Production Deployment；代码层面可以直接提交 revert commit。恢复 PR 流程后，再改回 revert PR。
