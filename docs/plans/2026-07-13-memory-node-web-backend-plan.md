# Memory Node Web Backend Implementation Plan

日期：2026-07-13（修订 2026-07-14）
状态：待工程评审（v2，含 Ed25519 修订）
前置文档：`docs/contracts/memory-node-web-integration.md`

---

## 修订说明（v2 vs v1）

| 项 | v1 | v2 |
|---|---|---|
| 许可证签名 | HMAC-SHA256(SESSION_SECRET)，客户端不验证 | **Ed25519 非对称签名**，客户端用内置公钥离线验证 |
| 激活码存储 | 明文存 DB | **只存 SHA-256 哈希**（codeHash） |
| 激活码格式 | `NEI-XXXX-XXXX`（10 位） | **8 位 Crockford Base32**（无前缀，~40 bit） |
| 激活流程 | 多步非事务 | **单个 `prisma.$transaction`** |
| 权益检查 | 只查 `status='active'` | **status='active' AND (expiresAt IS NULL OR expiresAt > now)** |
| 被撤销设备重激活 | 不明确 | **仍占设备名额**（重新激活时按 active 计数） |
| 限流 | 内存 Map，PR7 才加 | **持久化（ActivationAttempt 表），与 PR2 同时上线** |
| 路由 | `/connect` 加激活区块 | **独立路由 `/memory`、`/memory/setup`、`/memory/devices`** |
| PR 拆分 | 7 个 PR，加固延后 | **6 个 PR，加固合入 PR2** |
| 环境变量 | 复用 SESSION_SECRET | **新增 `MEMORY_LICENSE_PRIVATE_KEY`**（Ed25519 PEM） |

---

## PR 拆分总览

| PR | 标题 | 改动范围 | 复杂度 | 前置 |
|----|------|----------|--------|------|
| 1 | Schema + migration | prisma/schema.prisma, db push | S | — |
| 2 | **激活码 + 激活端点 + 限流 + Ed25519 签发**（合并原 PR7 加固） | 2 API route + lib/activation-license.ts + lib/rate-limit.ts (DB) | M-L | PR1 |
| 3 | 设备管理 + 许可证刷新 | 3 个 API route | M | PR2 |
| 4 | Entitlement 管理（admin） | /admin 页面 + API | M | PR1 |
| 5 | Release manifest API | 1 个 API route | S | PR1 |
| 6 | `/memory/setup` + `/memory/devices` 前端 | 2 个页面 | S | PR2+PR3 |

**关键变化**：原 PR7（限流 + 输入校验）**已合并进 PR2**。限流是激活端点的安全前提，不能推迟。

---

## PR 1: Schema + Migration

### 目标
新增 5 个 Prisma 模型（含 ActivationAttempt 限流表），同步到 Neon。

### 改动文件
- `prisma/schema.prisma`：
  - 新增 `ActivationCode`（含 `codeHash`，不含明文）
  - 新增 `DeviceActivation`
  - 新增 `Entitlement`（含 `expiresAt`）
  - 新增 `ReleaseManifest`
  - 新增 `ActivationAttempt`（持久限流表）
  - `User` 新增 4 个 relation 字段
- 使用 `prisma db push`（additive，非破坏性）

### 模型要点

```prisma
model ActivationCode {
  id            Int       @id @default(autoincrement())
  codeHash      String    @unique           // SHA-256(code)，不存明文
  userId        Int
  createdAt     DateTime  @default(now())
  expiresAt     DateTime                    // +5min
  consumedAt    DateTime?
  deviceId      String?
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([codeHash])
}

model DeviceActivation {
  id            Int       @id @default(autoincrement())
  userId        Int
  deviceId      String
  deviceName    String
  platform      String
  clientVersion String
  status        String    @default("active")  // active | revoked
  activatedAt   DateTime  @default(now())
  lastSeenAt    DateTime  @default(now())
  revokedAt     DateTime?
  revokeReason  String?
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, deviceId])
  @@index([userId])
}

model Entitlement {
  id          Int       @id @default(autoincrement())
  userId      Int       @unique
  plan        String    @default("free")
  status      String    @default("active")
  startedAt   DateTime  @default(now())
  expiresAt   DateTime?                    // 关键：权益到期
  source      String?
  metadata    String?
  updatedAt   DateTime  @updatedAt
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model ReleaseManifest {
  id              Int       @id @default(autoincrement())
  product         String
  version         String
  platform        String
  downloadUrl     String
  sha256          String
  minVersion      String?
  releaseNotes    String?
  isLatest        Boolean   @default(false)
  publishedAt     DateTime  @default(now())
  @@index([product, platform, isLatest])
}

model ActivationAttempt {
  id          Int      @id @default(autoincrement())
  ip          String
  endpoint    String    // "code" | "activate" | "refresh"
  createdAt   DateTime @default(now())
  @@index([ip, endpoint, createdAt])
}
```

### 验收标准
- `npx prisma validate` 通过
- `npx prisma generate` 通过
- `npx prisma db push` 成功（5 张新表）
- `npx tsc --noEmit` 通过
- 现有功能不受影响

### 回滚
- `prisma db push` 创建的表可手动 `DROP TABLE`
- schema 回退到 PR 前 commit

---

## PR 2: 激活码 + 激活端点 + 限流 + Ed25519 签发（合并加固）

### 目标
实现：
1. `POST /api/activation/code`（生成码，仅存哈希）
2. `POST /api/activation/activate`（事务验证 + Ed25519 签发）
3. `lib/activation-license.ts`（Ed25519 签发/验证）
4. `lib/rate-limit.ts` 改为**持久化**（ActivationAttempt 表）
5. 输入校验（8 位 Base32、UUID、semver）

### 改动文件
- `lib/activation-license.ts`（新建：Ed25519 签发/验证，**不依赖 SESSION_SECRET**）
- `lib/rate-limit.ts`（新建或扩展：DB 持久限流）
- `lib/activation-code.ts`（新建：8 位 Crockford Base32 生成 + SHA-256 哈希）
- `app/api/activation/code/route.ts`（新建）
- `app/api/activation/activate/route.ts`（新建）

### 核心逻辑

**`lib/activation-code.ts`**：
```typescript
// 8 位 Crockford Base32（去除 I L O U，避免歧义）
const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function generateActivationCode(): string {
  const bytes = crypto.randomBytes(5); // 40 bit
  // 编码为 8 位 Crockford Base32
  return encodeCrockford(bytes); // → "A1B2C3D4"
}

export function hashActivationCode(code: string): string {
  return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
}
// 注意：哈希前先 toUpperCase，接受用户小写输入
```

**`lib/activation-license.ts`**：
```typescript
const PRIVATE_KEY = crypto.createPrivateKey({
  key: Buffer.from(process.env.MEMORY_LICENSE_PRIVATE_KEY, 'utf8'),
  format: 'pem',
});

const CURRENT_KID = 'key-2026-07';

export function issueLicense(params: {
  uid: number; did: string; ent: string; vmin: string;
}): { license: string; exp: number } {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 30 * 24 * 3600; // 30 天
  const payload = { v: 1, kid: CURRENT_KID, ...params, iat, exp };
  const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
  const sig = crypto.sign(null, payloadBytes, {
    key: PRIVATE_KEY,
    dsaEncoding: 'ieee-p1363',  // Ed25519 raw (RFC 8032)
  });
  return {
    license: payloadBytes.toString('base64url') + '.' + sig.toString('base64url'),
    exp,
  };
}

export function verifyLicense(license: string): {
  valid: boolean; payload?: LicensePayload; reason?: string
} {
  // 用公钥验证（refresh 时用同一密钥对验旧许可证）
  // 注意：服务端同时持有私钥和公钥，可用私钥对象的 derive 公钥验签
}
```

**`lib/rate-limit.ts`（持久化）**：
```typescript
export async function checkRateLimit(
  ip: string, endpoint: string, limit: number, windowMs: number
): Promise<{ ok: boolean; retryAfter: number }> {
  const since = new Date(Date.now() - windowMs);
  const count = await prisma.activationAttempt.count({
    where: { ip, endpoint, createdAt: { gte: since } }
  });
  if (count >= limit) {
    return { ok: false, retryAfter: Math.ceil(windowMs / 1000) };
  }
  await prisma.activationAttempt.create({ data: { ip, endpoint } });
  return { ok: true, retryAfter: 0 };
}
```
> 不再用内存 Map（Vercel 多实例不可靠）。Beta 阶段 DB 表够用；后续可切 Upstash Redis，接口签名不变。

**`POST /api/activation/code`**：
1. `getSessionUid()` → uid（无则 401）
2. 检查 entitlement（status='active' 且未过期）；无权益 → 403 NO_ENTITLEMENT / ENTITLEMENT_EXPIRED
3. 限流：`checkRateLimit(ip, 'code', 3, 60_000)`；超限 → 429
4. `code = generateActivationCode()`
5. `codeHash = hashActivationCode(code)`
6. `prisma.activationCode.create({ codeHash, userId, expiresAt: now+5min })`
7. 返回 `{ code, expires_in: 300 }`（明文只返回这一次）

**`POST /api/activation/activate`**（核心：全部在事务中）：
```typescript
// 0. 限流（事务外）
const rl = await checkRateLimit(ip, 'activate', 10, 60_000);
if (!rl.ok) return error(429, 'RATE_LIMITED');

// 1. 输入校验（事务外）
validateCodeFormat(body.code);       // ^[0-9A-Z]{8}$ (Crockford)
validateUuid(body.device_id);
validateSemver(body.client_version);
validatePlatform(body.platform);

// 2. 全部验证 + 写入在单个事务中
const result = await prisma.$transaction(async (tx) => {
  const codeHash = hashActivationCode(body.code);
  const row = await tx.activationCode.findUnique({
    where: { codeHash },  // 靠 codeHash 唯一索引 + 行锁
  });
  if (!row) throw new ActivationError(400, 'INVALID_CODE');
  if (row.expiresAt < new Date()) throw new ActivationError(400, 'CODE_EXPIRED');
  if (row.consumedAt) throw new ActivationError(400, 'CODE_CONSUMED');

  const release = await tx.releaseManifest.findFirst({
    where: { product: 'memory-node', platform: body.platform, isLatest: true },
  });
  if (release?.minVersion && semverLt(body.client_version, release.minVersion)) {
    throw new ActivationError(403, 'CLIENT_TOO_OLD');
  }

  const ent = await tx.entitlement.findUnique({ where: { userId: row.userId } });
  if (!ent || !['memory-node-pro', 'memory-node-team'].includes(ent.plan)) {
    throw new ActivationError(403, 'NO_ENTITLEMENT');
  }
  if (ent.status !== 'active') throw new ActivationError(403, 'ENTITLEMENT_EXPIRED');
  if (ent.expiresAt && ent.expiresAt <= new Date()) {
    throw new ActivationError(403, 'ENTITLEMENT_EXPIRED');
  }

  // 设备计数：被撤销设备重激活也占名额（不排除 revoked 同 deviceId）
  const activeCount = await tx.deviceActivation.count({
    where: { userId: row.userId, status: 'active', deviceId: { not: body.device_id } },
  });
  if (activeCount >= 3) throw new ActivationError(403, 'DEVICE_LIMIT_EXCEEDED');

  // 消费激活码
  await tx.activationCode.update({
    where: { id: row.id },
    data: { consumedAt: new Date(), deviceId: body.device_id },
  });

  // upsert 设备
  await tx.deviceActivation.upsert({
    where: { userId_deviceId: { userId: row.userId, deviceId: body.device_id } },
    create: {
      userId: row.userId, deviceId: body.device_id,
      deviceName: body.device_name, platform: body.platform,
      clientVersion: body.client_version, status: 'active',
    },
    update: {
      deviceName: body.device_name, platform: body.platform,
      clientVersion: body.client_version, status: 'active',
      lastSeenAt: new Date(), revokedAt: null, revokeReason: null,
    },
  });

  // 签发 Ed25519 许可证
  const { license, exp } = issueLicense({
    uid: row.userId, did: body.device_id, ent: ent.plan,
    vmin: release?.minVersion ?? '0.0.1',
  });
  return { license, exp, uid: row.userId, plan: ent.plan };
});

// 3. 返回（事务外，不读 license 明文到日志）
const user = await prisma.user.findUnique({ where: { id: result.uid } });
return Response.json({
  license: result.license,
  expires_at: new Date(result.exp * 1000).toISOString(),
  user: { nickname: user?.nickname, plan: result.plan },
});
```

### 测试
- 单元：
  - `generateActivationCode` 输出 8 位 Crockford Base32
  - `hashActivationCode` 大小写不敏感（A1B2 == a1b2）
  - `issueLicense` 签名可用对应公钥验证
  - `verifyLicense` 拒绝被篡改的 payload（改 exp 一字节 → invalid）
  - `verifyLicense` 拒绝用错误密钥签的许可证
- 集成：
  - 生成码 → 激活成功 → 返回 Ed25519 许可证
  - 码过期 → 400 CODE_EXPIRED
  - 码重用 → 400 CODE_CONSUMED
  - 设备超限（3 active）→ 403 DEVICE_LIMIT_EXCEEDED
  - entitlement status='expired' → 403 ENTITLEMENT_EXPIRED
  - entitlement expiresAt 过去 → 403 ENTITLEMENT_EXPIRED
  - **被撤销设备重激活 + 已 3 active → 403 DEVICE_LIMIT_EXCEEDED**（T12）
  - client_version 过低 → 403 CLIENT_TOO_OLD
  - 限流：第 11 次 activate → 429
  - **并发两个 activate 同一码 → 只有一个 CODE_CONSUMED 另一个成功**（事务隔离）
- 安全：
  - `/code` 无 cookie → 401
  - `/activate` 无 cookie → 不需 cookie（200/400/403）
  - 日志不含 code 明文（只记前 4 位 `A1B2****`）和 license 明文

### 验收标准
- `tsc --noEmit` 通过
- 手动 curl：生成码 → 激活 → 拿到 `payload.sig` 格式许可证
- 用 `openssl` + 公钥验证返回的许可证签名通过
- 限流表 ActivationAttempt 有写入记录
- 改 v1 的许可证格式（HMAC）→ 旧客户端无法激活（预期，因为是新设计）

### 回滚
- 删 2 个 route + 3 个 lib 文件
- ActivationCode 记录无副作用
- 限流表数据可保留或清理

---

## PR 3: 设备管理 + 许可证刷新

### 目标
实现设备列表、撤销、许可证刷新 3 个端点。

### 改动文件
- `app/api/activation/devices/route.ts`（新建：GET 列表）
- `app/api/activation/devices/[id]/route.ts`（新建：DELETE 撤销）
- `app/api/activation/refresh/route.ts`（新建：POST 刷新）

### 核心逻辑

**`GET /api/activation/devices`**：
1. `getSessionUid()` → uid
2. 查 `deviceActivation.findMany({ where: { userId: uid }, orderBy: { lastSeenAt: 'desc' } })`
3. 返回 `{ devices: [...], limit: 3 }`

**`DELETE /api/activation/devices/:id`**：
1. `getSessionUid()` → uid
2. 查 `deviceActivation` where `{ userId: uid, deviceId: id }`
3. 不存在 → 404
4. 设 `status: 'revoked', revokedAt: now, revokeReason: 'user_revoke'`
5. **不删除任何数据**（本地数据不受影响；释放名额供新设备激活）

**`POST /api/activation/refresh`**（限流：`checkRateLimit(ip, 'refresh', 30, 60_000)`）：
1. `verifyLicense(body.license)` → 失败 → 400 INVALID_LICENSE
2. 解析 payload → uid, did, ent
3. 查 `deviceActivation` where `{ userId: uid, deviceId: did }`
4. 不存在 → 403 DEVICE_REVOKED
5. status !== 'active' → 403 DEVICE_REVOKED
6. 查 entitlement → status !== 'active' 或 expiresAt 过去 → 403 ENTITLEMENT_EXPIRED
7. 通过 → 更新 lastSeenAt + `issueLicense` 签发新许可证（新 30 天窗口）
8. 返回 `{ license, expires_at }`

### 测试
- 激活后 GET devices → 返回 1 台 active
- DELETE device → status 变 revoked + revokedAt 非空
- revoked device refresh → 403 DEVICE_REVOKED
- 正常 refresh → 新许可证 exp 延后 30 天
- 篡改 license 的 exp → 400 INVALID_LICENSE（Ed25519 验签失败）
- entitlement 过期后 refresh → 403 ENTITLEMENT_EXPIRED

### 验收标准
- 设备列表正确显示 active/revoked
- 撤销后 refresh 被拒
- 刷新后许可证有效期延长 30 天
- 篡改许可证被拒（证明 Ed25519 离线验证有效）

---

## PR 4: Entitlement 管理（Admin）

### 目标
管理员可以在 /admin 设置用户 entitlement（含 expiresAt）。

### 改动文件
- `app/api/admin/entitlements/route.ts`（GET 列表 + POST 设置）
- `app/admin` 控制台新增"权益管理"区块
- 操作日志（AdminAuditLog 或复用审计机制）

### 核心逻辑

**GET /api/admin/entitlements**：列出所有非 free entitlement（分页）

**POST /api/admin/entitlements**：
```json
{ "userId": 42, "plan": "memory-node-pro", "status": "active", "expiresAt": "2026-12-31T23:59:59Z", "source": "manual" }
```
- upsert entitlement
- 记录操作日志：adminId、targetUserId、操作类型、新旧值、时间
- `source: 'manual'`

### 验收标准
- Admin 可查看所有用户权益（含 plan/status/expiresAt）
- Admin 可手动授予/修改/续期 entitlement
- 每次操作有日志
- 非 admin 访问返回 403

> **U1 决策**：最小 Admin 操作页 + 操作日志。脚本仅用于最初几个测试账号的批量授予。

---

## PR 5: Release Manifest API

### 目标
桌面客户端可检查更新。

### 改动文件
- `app/api/releases/memory-node/latest/route.ts`（GET，公开）

### 核心逻辑
1. 读 `platform` query
2. 查 `releaseManifest.findFirst({ where: { product: 'memory-node', platform, isLatest: true } })`
3. 不存在 → `{ available: false }`
4. 存在 → 返回 manifest（含 downloadUrl、sha256、minVersion）

### 验收标准
- 无记录时返回 `{ available: false }`
- 有记录时返回完整 manifest

> **U2 决策**：downloadUrl 内测期指向私有 GitHub Releases；开放给非仓库成员时迁移到阿里云 OSS。

---

## PR 6: `/memory/setup` + `/memory/devices` 前端

### 目标
独立的 Memory Node 激活与设备管理页面（**不放在 /connect**）。

### 改动文件
- `app/memory/page.tsx`（产品介绍 + 状态概览，公开）
- `app/memory/setup/page.tsx`（生成激活码 + 输入引导 + 已激活设备列表）
- `app/memory/devices/page.tsx`（设备管理：撤销/重命名）
- `app/connect/page.tsx` 底部加一个链接到 `/memory/setup`

### 路由设计

| 路由 | 用途 | 认证 |
|---|---|---|
| `/memory` | 产品介绍 + Memory Node 状态概览 | 公开 |
| `/memory/setup` | 生成激活码 + 输入引导 + 已激活设备 | Cookie session |
| `/memory/devices` | 设备管理（撤销/重命名） | Cookie session |

### `/memory/setup` UI 设计
```
┌──────────────────────────────────────────────┐
│  Memory Node 激活                             │
│                                              │
│  1. 在桌面应用打开 Memory Node                │
│  2. 点击此处生成激活码                        │
│                                              │
│  [生成激活码]                                 │
│                                              │
│  激活码：A1B2C3D4   (5 分钟内有效)            │
│  [复制]                                       │
│                                              │
│  3. 在 Memory Node 桌面应用中粘贴此码完成激活  │
│     首次激活后可离线使用 30 天                 │
│                                              │
│  ─────────────────────────────────────────   │
│  已激活设备（2/3）：                          │
│  · 办公台式机 (Windows 0.1.0) - 2 小时前在线  [撤销]
│  · 测试笔记本 (Windows 0.1.0) - 3 天前在线    [撤销]
│                                              │
│  管理全部设备 →                               │
└──────────────────────────────────────────────┘
```

### 验收标准
- 登录用户可生成激活码（8 位，5 分钟有效）
- 激活码可一键复制
- 显示已激活设备列表 + 撤销按钮（跳转 `/memory/devices` 或就地撤销）
- 未登录用户看到登录提示
- 无 entitlement 的用户看到"暂无权限"提示
- `/connect` 底部有"激活 Memory Node"链接

---

## Migration 与发布顺序

### 数据库变更

5 张新表全部 additive（新增表，不改现有表结构），对生产无影响。`prisma db push` 即可。`User` 新增的 relation 字段不改表结构。

### 发布顺序

```
PR1 (schema) ──→ PR2 (code+activate+限流+Ed25519) ──→ PR3 (devices+refresh)
                                                       ↗
                 PR4 (entitlement admin) ──→ PR6 (/memory UI)
                 PR5 (release manifest) ──↗
```

- PR1 必须先合并
- PR2/PR4/PR5 可并行
- PR3 依赖 PR2（共用 activation-license.ts）
- PR6 依赖 PR2 + PR3

### Vercel 部署

每个 PR 合并到 main 后 Vercel 自动部署。`vercel-build` 中的 `prisma db push` 自动建表。

**关键**：PR1 合并后先在 Neon 验证表创建成功，再合并后续 PR。

### 环境变量（PR2 前配置）

```bash
# 生成 Ed25519 密钥对
openssl genpkey -algorithm ED25519 -out memory_license_private.pem
openssl pkey -in memory_license_private.pem -pubout -out memory_license_public.pem

# Vercel env（注意 PEM 是多行，用换行符或 base64 包装）
MEMORY_LICENSE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

公钥 `memory_license_public.pem` 交给 Memory Node 客户端编译时嵌入（不在网站 env 中）。

---

## 限流配置（PR2 即生效）

| 端点 | 限制 | 窗口 | 存储 |
|---|---|---|---|
| `POST /api/activation/code` | 3 次 | 60 秒 | ActivationAttempt 表 |
| `POST /api/activation/activate` | 10 次 | 60 秒 | ActivationAttempt 表 |
| `POST /api/activation/refresh` | 30 次 | 60 秒 | ActivationAttempt 表 |

清理：Vercel Cron 每 10 分钟删除 1 小时前的 ActivationAttempt 记录。

---

## 输入校验（PR2 即生效）

| 字段 | 格式 | 校验位置 |
|---|---|---|
| `code` | `^[0-9A-Z]{8}$`（8 位 Crockford Base32，大小写不敏感） | activate route |
| `device_id` | UUID v4 | activate/refresh route |
| `client_version` | semver (`^\d+\.\d+\.\d+`) | activate route |
| `platform` | `"windows"` \| `"macos"` | activate route |

---

## 监控与告警

### 需要监控的指标

| 指标 | 来源 | 告警阈值 |
|---|---|---|
| 激活成功率 | activate route | < 80%（可能大量无效码尝试） |
| 激活端点 429 比例 | rate-limit | > 10%（可能被刷） |
| refresh 成功率 | refresh route | < 95%（设备被撤销或订阅过期） |
| 设备激活数 | deviceActivation count | 突然激增（异常） |
| Ed25519 验签失败 | refresh route | 出现即告警（可能伪造） |

### 日志策略

| 信息 | 是否记录 |
|---|---|
| userId | ✅ |
| deviceId | ✅ |
| 操作类型（code/activate/refresh/revoke） | ✅ |
| client_version | ✅ |
| kid（密钥 ID） | ✅ |
| 激活码明文 | ❌（只记前 4 位 `A1B2****`） |
| 许可证明文 | ❌（只记 `license_len` 和 `exp`） |
| 设备名 | ❌（可能含个人信息） |
| IP | ✅（审计用，1 小时后随 ActivationAttempt 清理） |

---

## 验收清单

- [ ] `POST /api/activation/code` 需要 cookie session + 返回 5 分钟有效码（8 位 Base32）
- [ ] 激活码明文**不落库**（DB 只有 SHA-256 codeHash）
- [ ] `POST /api/activation/activate` 不需要 cookie + 输入校验 + 限流 + 事务验证 + 返回 Ed25519 许可证
- [ ] 激活流程在**单个 `prisma.$transaction`** 中（并发安全）
- [ ] 权益检查包含 `status='active'` AND `expiresAt` 未过期
- [ ] 被撤销设备重激活**仍占名额**
- [ ] `POST /api/activation/refresh` Ed25519 验签 + 设备未撤销 + 权益有效 → 返回新许可证
- [ ] `GET /api/activation/devices` 返回用户设备列表
- [ ] `DELETE /api/activation/devices/:id` 撤销设备（不删数据）
- [ ] `GET /api/releases/memory-node/latest` 返回最新版本
- [ ] 许可证是 **Ed25519 签名**的 `payload.sig`（base64url）字符串
- [ ] 许可证含 `kid` 字段（支持密钥轮换）
- [ ] 许可证有效期 30 天
- [ ] 限流持久化（ActivationAttempt 表），随 PR2 上线
- [ ] 设备限制 3 台，超过返回 DEVICE_LIMIT_EXCEEDED
- [ ] entitlement 过期返回 ENTITLEMENT_EXPIRED
- [ ] 版本过低返回 CLIENT_TOO_OLD
- [ ] 限流正常工作（429）
- [ ] 日志不含敏感字段（code/license/deviceName）
- [ ] 网站不保存记忆正文/机构名/基金名/项目名
- [ ] 撤销设备不删除本地数据
- [ ] 订阅过期后本地仍可查看/导出/删除
- [ ] 路由使用 `/memory/setup`（不是 `/connect`）
- [ ] `npx prisma validate` + `npx tsc --noEmit` + `npm run lint` + `npm run build` 全部通过

---

## 已确认的产品决策（U1-U5）

| # | 问题 | 决策 | 影响 PR |
|---|---|---|---|
| U1 | Entitlement 初始授予方式 | 做最小 Admin 授权操作（含操作日志）；脚本仅用于最初几个测试账号 | PR4 |
| U2 | 安装包下载源 | 内测用私有 GitHub Releases；开放给非成员时迁移到阿里云 OSS | PR5 |
| U3 | Windows 代码签名 | 内测不签名；Public Beta 前完成签名 | （客户端，不在本计划） |
| U5 | 支付系统选型 | 继续推迟，先验证激活和设备管理；Entitlement.source 留接口 | 全局 |

---

## 未决问题

| # | 问题 | 当前倾向 |
|---|---|---|
| Q1 | Ed25519 密钥对 kid 格式？ | `key-{year}-{month}`（如 `key-2026-07`） |
| Q2 | ActivationAttempt 清理用 Vercel Cron 还是 TTL？ | Vercel Cron（每 10 分钟，免费版够用） |
| Q3 | 客户端 device_id 卸载重装后是否保留？ | 不保留（卸载即清除 Credential Manager）；重装后是新设备 |
| Q4 | `/memory` 页是否需要展示 Memory Node 功能介绍？ | 需要（让非 Memory Node 用户了解产品） |
| Q5 | Admin 操作日志用独立表还是复用审计机制？ | 复用最小审计（先记到 Entitlement.metadata 的 JSON，量大了再建表） |
