# N.E.I. 上线部署指南

> 审计日期：2026-06-16
> 当前状态：42 条内容、功能闭环完整、tsc 0 错误、已推送到 GitHub main

---

## 🔴 上线前必须做的 3 件事

### 1. 升级 Next.js（修 critical 漏洞）

```bash
npm audit fix
# 或手动升级 next 到最新 14.x
npm install next@latest
```

验证：`npm audit` 无 critical/high。

### 2. 换数据库：SQLite → PostgreSQL（Neon）

**为什么**：SQLite 多并发写会锁库，Vercel serverless 不支持本地文件 DB。

**步骤**：
1. 注册 [Neon](https://neon.tech)（免费），创建一个数据库
2. 拿到 Connection String（形如 `postgresql://user:pass@host/db?sslmode=require`）
3. 改 `.env`：`DATABASE_URL="postgresql://..."`
4. 改 `prisma/schema.prisma` 的 datasource provider：`sqlite` → `postgresql`
5. 运行：`npx prisma migrate dev --name init`
6. 重新灌种子内容：`npx tsx scripts/import-skills.ts /tmp/fs-skills && npx tsx scripts/import-batch2.ts && npx tsx scripts/import-batch3.ts && npx tsx scripts/import-batch4.ts`

### 3. 换文件存储：本地 uploads → Cloudflare R2

**为什么**：Vercel serverless 重启后 uploads/ 被清空。

**步骤**：
1. 注册 [Cloudflare](https://cloudflare.com)，创建 R2 bucket
2. 创建 R2 API Token（拿到 Account ID + Access Key + Secret Key）
3. 装 SDK：`npm install @aws-sdk/client-s3`
4. 改 `lib/storage.ts`：4 个函数（saveBuffer/readFileByKey/removeKey/ensureUploadDir）内部实现从 fs 换成 S3 client，签名不变
5. 配环境变量：
   ```
   R2_ACCOUNT_ID=xxx
   R2_ACCESS_KEY_ID=xxx
   R2_SECRET_ACCESS_KEY=xxx
   R2_BUCKET_NAME=nei-skills
   R2_PUBLIC_URL=https://pub-xxx.r2.dev  # R2 公开访问域名
   ```

---

## 🟡 配置环境变量（Vercel 后台填）

在 Vercel 项目设置 → Environment Variables 填入：

| 变量 | 说明 | 必填 |
|------|------|:---:|
| `DATABASE_URL` | Neon Postgres 连接串 | ✅ |
| `SESSION_SECRET` | 32+ 字符随机串（`node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`) | ✅ |
| `RESEND_API_KEY` | Resend 邮件 API key | ✅ |
| `EMAIL_FROM` | 发件人地址（需在 Resend 验证域名） | ✅ |
| `GITHUB_CLIENT_ID` | GitHub OAuth App ID | ✅ |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Secret | ✅ |
| `ANTHROPIC_API_KEY` | Claude API key（AI 转写用） | 选填 |
| `R2_ACCOUNT_ID` | Cloudflare R2 | ✅ |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 | ✅ |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 | ✅ |
| `R2_BUCKET_NAME` | Cloudflare R2 | ✅ |

### GitHub OAuth 回调 URL

在 GitHub OAuth App 设置里，Authorization callback URL 改为：
```
https://你的域名/api/auth/github/callback
```

---

## 📦 Vercel 部署步骤

1. 去 [vercel.com](https://vercel.com)，用 GitHub 账号登录
2. New Project → 选 `jammyssy/N.E.I.-The-World-of-Financial-Evolution` 仓库
3. Framework Preset 自动识别为 Next.js
4. **先填环境变量**（上面那张表）
5. Deploy
6. 拿到 `xxx.vercel.app` 域名
7. 去 GitHub OAuth App 改回调 URL
8. 去 Resend 验证发件域名
9. 测试注册→登录→发帖→下载闭环

---

## ⚠️ 上线前清单（逐项打勾）

- [ ] `npm audit` 无 critical/high
- [ ] `DATABASE_URL` 换成 Postgres
- [ ] `lib/storage.ts` 换成 R2
- [ ] `SESSION_SECRET` 是随机值（不是 change-me）
- [ ] `lib/email.ts` 删掉 `console.log` 打印验证码那行
- [ ] GitHub OAuth 回调 URL 改成生产域名
- [ ] Resend 发件域名已验证
- [ ] `ANTHROPIC_API_KEY` 已配（如要开 AI 转写）
- [ ] `next build` 通过
- [ ] 注册→登录→发帖→下载→评论 闭环测试通过

---

## 备选：VPS 部署（不改代码）

如果不想改 R2/Postgres，用 VPS 直接跑：

```bash
# 在服务器上
git clone https://github.com/jammyssy/N.E.I.-The-World-of-Financial-Evolution.git
cd N.E.I.-The-World-of-Financial-Evolution
npm install
npm run setup  # prisma db push + seed
# 灌种子内容
npx tsx scripts/import-skills.ts /path/to/fs-skills
npx tsx scripts/import-batch2.ts
npx tsx scripts/import-batch3.ts
npx tsx scripts/import-batch4.ts
# 启动
npm run build
pm2 start "npm run start" --name nei
# 配 Nginx 反代 + SSL
```

**注意**：SQLite + 本地 uploads 在 VPS 上可以跑，但单机性能有上限。500 人日常浏览够用，但高并发写（多人同时发帖/上传）可能锁库。
