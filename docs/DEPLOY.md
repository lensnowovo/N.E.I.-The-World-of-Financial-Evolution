# N.E.I. 部署与发布指南

> 当前生产站点：[https://nei-pevc.com](https://nei-pevc.com)
> 当前部署方式：GitHub PR + Vercel Production Deployment

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

`main` 是受保护分支，不允许直接 push。正常上线流程：

1. 从最新 `main` 拉新分支。
2. 本地完成修改并运行验证命令。
3. push 到 feature branch。
4. 创建 PR 到 `main`。
5. 等待 GitHub required check 通过。
6. 等待 Vercel Preview Deployment 通过。
7. Merge PR。
8. Vercel 自动从 `main` 触发 Production Deployment。

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

PR 和 `main` push 都会运行：

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

注意：`npm run build` 暂时不作为 GitHub required check，因为构建依赖生产环境变量和数据库连接。Vercel Preview / Production 是实际构建 gate。

---

## 5. Vercel 部署

Vercel 绑定仓库：

```text
lensnowovo/N.E.I.-The-World-of-Financial-Evolution
```

部署规则：

- PR：触发 Preview Deployment
- merge 到 `main`：触发 Production Deployment
- 生产域名：`https://nei-pevc.com`

Vercel 构建命令：

```bash
npm run vercel-build
```

`vercel-build` 会执行：

```bash
prisma generate && prisma db push --skip-generate && next build
```

如果 Vercel 没有 deployment，先确认：

1. PR 是否真的 merge 到 `main`
2. `main` 是否有新 commit
3. Vercel Git Integration 是否仍连接当前仓库
4. Vercel 项目 Production Branch 是否为 `main`

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

正常。feature branch 只会触发 PR / Preview 流程。只有 PR merge 到 `main` 后，Vercel 才会触发 production deployment。

### 直接 push main 被拒绝

正常。`main` 是保护分支，必须通过 PR 合并。

### Vercel Preview 通过，但生产站没变

说明 PR 还没有 merge，或者 production branch 不是当前仓库的 `main`。

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

如需回滚，优先在 Vercel Dashboard 回滚到上一个 Production Deployment；代码层面再开 revert PR，避免直接改保护分支。
