# Memory Node Web Backend Implementation Plan

日期：2026-07-13（修订 2026-07-15 → v3）
状态：待工程评审（v3）
前置文档：`docs/contracts/memory-node-web-integration.md`

---

## v2 → v3 变更记录（Codex 审核闭环）

| 项 | v2 | v3 |
|---|---|---|
| 设备上限并发 | 仅锁 ActivationCode，不同码可并发突破 | **事务内锁 `Entitlement` 行**（`FOR UPDATE`），READ COMMITTED 串行化 |
| 限流 | `count()→create()`，有竞态 | **原子时间桶** `RateLimitBucket`（`INSERT ON CONFLICT DO UPDATE RETURNING`） |
| 到期语义 | `exp=iat+30d` 与"订阅过期即只读"冲突 | **`exp=min(iat+30d, ee)`**；payload 加 `ee`/`ga`；宽限不越过 `ee` |
| 时钟回拨 | "系统时间<iat 用 iat"，可绕过 | **凭据存储高水位** `effective_now=max(sys, last_seen_time)`；诚实声明残留风险 |
| Ed25519 示例 | Node 用 `dsaEncoding`，Rust import 冗余 | Node 删 `dsaEncoding`；Rust 改 `ed25519-dalek` 2.x；**固定互操作向量** |
| 数据模型 | `ActivationAttempt`（append-only） | **`RateLimitBucket`**（原子桶） |
| payload 版本 | v1 | **v2**（`ee`/`ga`/`exp` 重算） |
| PR 拆分 | 6 PR | 不变（PR2 仍是激活+限流+签发合并） |

---

## PR 拆分总览

| PR | 标题 | 改动范围 | 复杂度 | 前置 |
|----|------|----------|--------|------|
| 1 | Schema + migration | prisma/schema.prisma | S | — |
| 2 | **激活码 + 激活事务（Entitlement 锁）+ 原子限流 + Ed25519 签发** | 2 API + 4 lib | L | PR1 |
| 3 | 设备管理 + 许可证刷新 | 3 API | M | PR2 |
| 4 | Entitlement 管理（admin） | /admin + API | M | PR1 |
| 5 | Release manifest API | 1 API | S | PR1 |
| 6 | `/memory/setup` + `/memory/devices` 前端 | 2 页 | S | PR2+PR3 |

---

## PR 1: Schema + Migration

### 目标
新增 5 个模型（含 **`RateLimitBucket`** 替代 v2 的 `ActivationAttempt`），同步 Neon。

### 改动文件
- `prisma/schema.prisma`：`ActivationCode` / `DeviceActivation` / `Entitlement`（`userId @unique`，锁目标）/ `ReleaseManifest` / **`RateLimitBucket`**
- `User` 新增 3 个 relation（`RateLimitBucket` 无 relation）
- `prisma db push`（additive）

### 模型要点

```prisma
model ActivationCode {
  id         Int       @id @default(autoincrement())
  codeHash   String    @unique              // SHA-256，不存明文
  userId     Int
  createdAt  DateTime  @default(now())
  expiresAt  DateTime                       // +5min
  consumedAt DateTime?
  deviceId   String?
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
  status        String    @default("active")
  activatedAt   DateTime  @default(now())
  lastSeenAt    DateTime  @default(now())
  revokedAt     DateTime?
  revokeReason  String?
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, deviceId])
  @@index([userId])
}

model Entitlement {
  id         Int       @id @default(autoincrement())
  userId     Int       @unique              // 锁目标：per-user 唯一
  plan       String    @default("free")
  status     String    @default("active")
  startedAt  DateTime  @default(now())
  expiresAt  DateTime?                       // 决定 license.exp 上限
  source     String?
  metadata   String?
  updatedAt  DateTime  @updatedAt
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model ReleaseManifest {
  id           Int      @id @default(autoincrement())
  product      String
  version      String
  platform     String
  downloadUrl  String
  sha256       String
  minVersion   String?
  releaseNotes String?
  isLatest     Boolean  @default(false)
  publishedAt  DateTime @default(now())
  @@index([product, platform, isLatest])
}

model RateLimitBucket {
  id          BigInt    @id @default(autoincrement())
  ip          String
  endpoint    String                         // "code" | "activate" | "refresh"
  windowStart DateTime                       // 对齐到窗口边界
  count       Int      @default(0)
  expiresAt   DateTime                       // windowStart + window + 缓冲
  createdAt   DateTime @default(now())
  @@unique([ip, endpoint, windowStart])      // 原子 upsert 冲突键
  @@index([expiresAt])
}
```

### 验收标准
- `prisma validate` / `prisma generate` / `prisma db push` / `tsc --noEmit` 通过
- 现有功能不受影响

### 回滚
- `DROP TABLE` + schema 回退

---

## PR 2: 激活码 + 激活事务（Entitlement 锁）+ 原子限流 + Ed25519 签发

### 目标
1. `POST /api/activation/code`（仅存哈希）
2. `POST /api/activation/activate`（**事务内锁 Entitlement** + 统一到期 + Ed25519 签发）
3. `lib/activation-license.ts`（Ed25519 签发/验证，payload v2，**不设 `dsaEncoding`**）
4. `lib/rate-limit.ts`（**原子时间桶**）
5. `lib/activation-code.ts`（8 位 Crockford Base32 + SHA-256）
6. 输入校验

### 改动文件
- `lib/activation-code.ts`（新建）
- `lib/activation-license.ts`（新建，Ed25519，payload v2）
- `lib/rate-limit.ts`（新建，原子桶 `checkAndConsume`）
- `lib/ip.ts`（新建，Vercel 可信 IP 读取）
- `app/api/activation/code/route.ts`
- `app/api/activation/activate/route.ts`

### 核心逻辑

#### `lib/activation-code.ts`
```typescript
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // 去除 I/L/O/U
export function generateActivationCode(): string { /* crypto.randomBytes(5) → 8 位 */ }
export function hashActivationCode(code: string): string {
  return crypto.createHash("sha256").update(code.toUpperCase()).digest("hex"); // 大小写不敏感
}
```

#### `lib/rate-limit.ts`（原子桶）
```typescript
export async function checkAndConsume(
  ip: string, endpoint: string, limit: number, windowMs: number
): Promise<{ allowed: boolean; retryAfter: number }> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs + 60_000);

  const rows = await prisma.$queryRaw<Array<{ new_count: bigint }>>`
    INSERT INTO "RateLimitBucket"
      ("ip", "endpoint", "windowStart", "count", "expiresAt", "createdAt")
    VALUES (${ip}, ${endpoint}, ${windowStart}, 1, ${expiresAt}, ${new Date(now)})
    ON CONFLICT ("ip", "endpoint", "windowStart")
    DO UPDATE SET "count" = "RateLimitBucket"."count" + 1
    RETURNING "count" AS new_count
  `;
  const newCount = Number(rows[0].new_count);
  if (newCount > limit) {
    return { allowed: false, retryAfter: Math.ceil((expiresAt.getTime() - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}
```
> 原子性：单语句 `INSERT ON CONFLICT DO UPDATE RETURNING` 由行锁串行化，无 count→create 竞态。Vercel Cron 每 10 分钟清理过期桶。

#### `lib/activation-license.ts`（Ed25519，payload v2）
```typescript
const privateKey = crypto.createPrivateKey(
  Buffer.from(process.env.MEMORY_LICENSE_PRIVATE_KEY!, "utf8")
);
const CURRENT_KID = "key-2026-07";
const THIRTY_DAYS = 30 * 86400;

export function issueLicense(p: {
  uid: number; did: string; ent: string;
  entitlementExpiresAt: Date | null; vmin: string;
}): { license: string; exp: number } {
  const iat = Math.floor(Date.now() / 1000);
  const expRaw = iat + THIRTY_DAYS;
  const ee = p.entitlementExpiresAt ? Math.floor(p.entitlementExpiresAt.getTime() / 1000) : 0;
  const exp = (ee === 0 || ee > expRaw) ? expRaw : ee;
  const ga = (ee === 0) || (ee > expRaw);

  const payload = { v: 2, kid: CURRENT_KID, uid: p.uid, did: p.did, ent: p.ent,
                    ee, iat, exp, ga, vmin: p.vmin };
  const payloadBytes = Buffer.from(JSON.stringify(payload), "utf8");
  const signature = crypto.sign(null, payloadBytes, privateKey); // raw 64 字节，不设 dsaEncoding
  return { license: `${payloadBytes.toString("base64url")}.${signature.toString("base64url")}`, exp };
}

export function verifyLicense(license: string) {
  // refresh 时用同一密钥对验旧许可证（服务端持私钥对象，可 derive 公钥验签）
  // 失败 → INVALID_LICENSE
}
```

#### `POST /api/activation/code`
1. `getSessionUid()` → 401 if 缺失
2. 权益检查（status=active 且未过期）→ 否则 `NO_ENTITLEMENT` / `ENTITLEMENT_EXPIRED`
3. `checkAndConsume(ip, "code", 3, 60_000)` → 超限 429
4. `code = generateActivationCode()`；`codeHash = hashActivationCode(code)`
5. 存 `ActivationCode`（只存 codeHash，expiresAt=now+5min）
6. 返回 `{ code, expires_in: 300 }`（明文只一次）

#### `POST /api/activation/activate`（**事务核心**）
事务外：原子限流 + 输入校验。事务内（伪代码与契约 §5.2.1 一致）：
1. 查 `ActivationCode(codeHash)` → `INVALID_CODE` / `CODE_EXPIRED` / `CODE_CONSUMED`
2. **`SELECT Entitlement WHERE userId=? FOR UPDATE`**（`$queryRaw`，参数化）→ 不存在 `NO_ENTITLEMENT`；status/expiry 校验
3. 版本门
4. `count(active DeviceActivation, 不含本 did) < 3` → 否则 `DEVICE_LIMIT_EXCEEDED`
5. 消费码 + upsert 设备
6. `issueLicense({ uid, did, ent, entitlementExpiresAt, vmin })`（exp=min(iat+30d, ee)）
7. 返回 `{ license, expires_at, user }`

> **READ COMMITTED 必需**：Prisma `$transaction` 在 Postgres 默认即此级别。锁 Entitlement 行后，并发同用户激活串行化，第二笔事务的设备计数看到第一笔已提交设备。

### 测试（PR2）

**单元**：
- `generateActivationCode` → 8 位 Crockford Base32
- `hashActivationCode` 大小写不敏感
- `issueLicense`：`ee=0 → exp=iat+30d, ga=true`；`ee=iat+20d → exp=iat+20d, ga=false`；`ee=iat+60d → exp=iat+30d, ga=true`
- `verifyLicense`：篡改 payload 任一字节 → 失败；错密钥 → 失败
- `checkAndConsume`：第 limit 个允许、第 limit+1 个拒绝

**集成**：
- 生成码 → 激活 → 拿到 `payload.sig`；`openssl` + 公钥验签通过
- 码过期 → `CODE_EXPIRED`；码重用 → `CODE_CONSUMED`
- 设备超限（3 active）→ `DEVICE_LIMIT_EXCEEDED`
- `ent.status='expired'` 或 `expiresAt` 过去 → `ENTITLEMENT_EXPIRED`
- **被撤销设备重激活 + 已 3 active → `DEVICE_LIMIT_EXCEEDED`**（T12）
- `client_version` 过低 → `CLIENT_TOO_OLD`
- 限流：第 11 次 activate → 429

**并发（关键，见 §"并发测试"）**：
- 两枚有效激活码并发激活同一用户第 3、4 台设备 → **只有一笔成功**，另一笔 `DEVICE_LIMIT_EXCEEDED`
- 并发 50 次 `/code` → 恰好 3 个 200，其余 429

**安全**：
- `/code` 无 cookie → 401；`/activate` 不需 cookie
- 日志不含 code 明文（前 4 位 `A1B2****`）和 license 明文

### 验收标准
- `tsc --noEmit` 通过
- curl 生成码 → 激活 → `openssl pkeyutl`/`pkey` 验签通过
- `RateLimitBucket` 有写入；并发测试见下

### 回滚
- 删 2 route + 4 lib 文件；DB 数据可保留/清理

---

## PR 3: 设备管理 + 许可证刷新

### 改动文件
- `app/api/activation/devices/route.ts`（GET）
- `app/api/activation/devices/[id]/route.ts`（DELETE 撤销）
- `app/api/activation/refresh/route.ts`（POST）

### 核心逻辑

**GET devices**：`getSessionUid` → `findMany(orderBy lastSeenAt desc)` → `{ devices, limit: 3 }`

**DELETE device**：设 `status='revoked', revokedAt, revokeReason='user_revoke'`；不删数据；释放名额。

**POST refresh**（`checkAndConsume(ip, "refresh", 30, 60_000)`）：
1. `verifyLicense(body.license)` → 失败 `INVALID_LICENSE`
2. 解析 `{ uid, did, ent, ee }`
3. 查 `DeviceActivation`；status≠active → `DEVICE_REVOKED`
4. 查 `Entitlement`；status≠active 或 expiresAt≤now → `ENTITLEMENT_EXPIRED`
5. 通过 → 更新 `lastSeenAt`；**重算** `exp=min(iat'+30d, ee)`、`ga`，重签

### 测试
- 激活后 GET devices → 1 active
- DELETE → revoked
- revoked refresh → `DEVICE_REVOKED`
- 正常 refresh → exp 延后 30 天（或被 ee 截断）
- 篡改 license exp → `INVALID_LICENSE`
- entitlement 过期后 refresh → `ENTITLEMENT_EXPIRED`
- **refresh 后 license.exp 被当前 ee 截断**（entitlement 仅剩 10 天 → exp=now+10d, ga=false）

### 验收标准
- 设备列表正确；撤销后 refresh 被拒；刷新后有效期符合 `min(30d, ee)`

---

## PR 4: Entitlement 管理（Admin）

### 改动文件
- `app/api/admin/entitlements/route.ts`（GET + POST）
- `/admin` 新增"权益管理"区块 + 操作日志

### 核心逻辑
- GET：列出非 free entitlement（分页）
- POST：`{ userId, plan, status, expiresAt, source }` upsert + 记日志（`source='manual'`）

### 验收标准
- Admin 可查看/授予/续期；每次操作有日志；非 admin → 403

> **U1**：最小 Admin 操作页 + 日志；脚本仅用于最初几个测试账号。

---

## PR 5: Release Manifest API

### 改动文件
- `app/api/releases/memory-node/latest/route.ts`（GET，公开）

### 核心逻辑
- 读 `platform` → 查 `isLatest` → 返回 manifest 或 `{ available: false }`

> **U2**：内测 GitHub Releases；开放时迁阿里云 OSS。

---

## PR 6: `/memory/setup` + `/memory/devices` 前端

### 改动文件
- `app/memory/page.tsx`（介绍 + 状态概览，公开）
- `app/memory/setup/page.tsx`（生成码 + 输入引导 + 已激活设备）
- `app/memory/devices/page.tsx`（撤销/重命名）
- `app/connect/page.tsx` 底部加链接到 `/memory/setup`

### `/memory/setup` UI
```
┌──────────────────────────────────────────────┐
│  Memory Node 激活                             │
│  [生成激活码]                                 │
│  激活码：A1B2C3D4   (5 分钟有效)  [复制]      │
│  在桌面应用粘贴此码完成激活，首激活后可离线 30 天 │
│  ─────────────────────────────────────────   │
│  已激活设备（2/3）：                          │
│  · 办公台式机 (Windows 0.1.0) - 2 小时前  [撤销]│
│  · 测试笔记本 (Windows 0.1.0) - 3 天前    [撤销]│
│  管理全部设备 →                               │
└──────────────────────────────────────────────┘
```

### 验收标准
- 登录用户生成 8 位码（5 分钟）；一键复制；显示设备 + 撤销
- 未登录 → 登录提示；无 entitlement → "暂无权限"
- `/connect` 底部有"激活 Memory Node"链接

---

## 并发与互操作测试（新增，跨 PR）

### 并发测试（B1/B2 闭环）

| 测试 | 步骤 | 期望 |
|---|---|---|
| **设备上限并发** | 用户已有 2 active 设备；并发 2 笔 activate（2 枚不同有效激活码，第 3、4 台设备） | **恰好 1 笔成功，另 1 笔 `DEVICE_LIMIT_EXCEEDED`**；最终 active=3 |
| **同码并发** | 同一激活码并发 2 笔 activate | 1 笔成功，另 1 笔 `CODE_CONSUMED` |
| **限流并发** | 并发 50 笔 `/code`（同 IP） | 恰好 3 笔 200，其余 429；`RateLimitBucket.count` 最终=50，但放行数=3 |
| **限流跨窗口** | 窗口边界前后各 10 笔 | 两窗口分别计 3（可接受 fuzziness，记录于测试报告） |

> 并发测试可用 `Promise.all` + 多请求实现；DB 断言 `count(DeviceActivation status=active)` = 3。

### Ed25519 互操作测试（B5 闭环）

**测试夹具**（`fixtures/nei_license_test_key.pem`，仅测试）：
```
-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIJjku/Q96QGT2fmm9Uqf5QDqXHV/tSzZjBP60OKSCDsV
-----END PRIVATE KEY-----
```
公钥 `[u8;32]`（见契约 §18.3）。

**Node 测试**（`lib/activation-license.test.ts`）：
```typescript
// 用测试私钥签发固定 payload，断言产出 == 契约 §18.3 的 payload/sig base64url
const testKey = crypto.createPrivateKey(fs.readFileSync("fixtures/nei_license_test_key.pem"));
// issueLicenseWithKey(payload, testKey) === {
//   payloadB64: "eyJ2Ijoy...",
//   sigB64:     "D2t_qcgT..."
// }
```

**Rust 测试**（Memory Node 侧 `verify_license` 单元测试）：
```rust
#[test]
fn verifies_official_vector() {
    let license = concat!(
        "eyJ2Ijoy...（payload base64url）",
        ".",
        "D2t_qcgT...（signature base64url）"
    );
    let p = verify_license(license).expect("must verify");
    assert_eq!(p.uid, 42);
    assert_eq!(p.kid, "key-test-vector");
    assert_eq!(p.ee, 0);
    assert!(p.ga);
}

#[test]
fn rejects_tampered_payload() {
    // 翻转 payload base64url 首字符
    let tampered = /* payload[0] flipped */ + "." + sig;
    assert!(matches!(verify_license(&tampered), Err(InvalidSignature)));
}
```

**断言**：
- Node 签发 == 固定向量
- Rust `verify_license(向量)` → Ok
- 翻转 payload 任一字节 → `InvalidSignature`
- 错公钥 → `InvalidSignature`；签名≠64 字节 → `BadSigLen`

> 测试私钥**只在夹具**，CI 与生产构建禁止读取；明确标注"NEVER PRODUCTION"。

---

## Migration 与发布顺序

5 张新表 additive；`prisma db push` 即可。`User` relation 字段不改表结构。

```
PR1 (schema) ──→ PR2 (activate+事务+限流+Ed25519) ──→ PR3 (devices+refresh)
                                                  ↗
              PR4 (entitlement admin) ──→ PR6 (/memory UI)
              PR5 (release manifest) ──↗
```

PR1 先合并；PR2/PR4/PR5 并行；PR3 依赖 PR2；PR6 依赖 PR2+PR3。PR1 合并后先在 Neon 验证建表，再合并后续。

### Vercel Cron（PR2 上线时配置）
- 每 10 分钟：`DELETE FROM "RateLimitBucket" WHERE "expiresAt" < NOW();`

### 环境变量（PR2 前）
```bash
openssl genpkey -algorithm ED25519 -out memory_license_private.pem
# Vercel env（PEM 多行，用 \n 或 base64 包装）
MEMORY_LICENSE_PRIVATE_KEY="<PEM with \n>"
```
公钥 `memory_license_public.pem` 交 Memory Node 编译内置（不在网站 env）。

---

## 限流配置

| 端点 | 限制 | 窗口 | 存储 |
|---|---|---|---|
| `POST /api/activation/code` | 3 | 60s | RateLimitBucket（原子） |
| `POST /api/activation/activate` | 10 | 60s | RateLimitBucket（原子） |
| `POST /api/activation/refresh` | 30 | 60s | RateLimitBucket（原子） |

---

## 输入校验

| 字段 | 格式 | 校验位置 |
|---|---|---|
| `code` | `^[0-9A-Z]{8}$`（Crockford，大小写不敏感） | activate |
| `device_id` | UUID v4 | activate/refresh |
| `client_version` | semver | activate |
| `platform` | `"windows"` \| `"macos"` | activate |

---

## 监控与告警

| 指标 | 来源 | 阈值 |
|---|---|---|
| 激活成功率 | activate | < 80% |
| 429 比例 | rate-limit | > 10% |
| refresh 成功率 | refresh | < 95% |
| 设备激活数 | deviceActivation | 突增 |
| Ed25519 验签失败 | refresh | 出现即告警 |
| `DEVICE_LIMIT_EXCEEDED` 并发命中 | activate | 持续增长可能并发攻击 |

### 日志策略

| 信息 | 记录 |
|---|---|
| userId / deviceId / 操作类型 / client_version / kid | ✅ |
| 激活码明文 | ❌（前 4 位 `A1B2****`） |
| 许可证明文 | ❌（`license_len`、`exp`、`ee`、`ga`） |
| 设备名 | ❌ |
| IP | ✅（随 `RateLimitBucket.expiresAt` 清理） |

---

## 验收清单

- [ ] `POST /api/activation/code` 需 cookie + 返回 8 位码（5 分钟）；明文不落库
- [ ] `POST /api/activation/activate` 原子限流 + 输入校验 + 事务（**锁 Entitlement**）+ 返回 Ed25519 许可证
- [ ] 激活在**单个 `prisma.$transaction`**（READ COMMITTED）内
- [ ] **两枚有效激活码并发激活同一用户第 3、4 台设备 → 恰好 1 笔成功**
- [ ] 权益检查含 `status='active'` AND `expiresAt` 未过期
- [ ] `exp = min(iat+30d, ee)`；payload v2 含 `ee`/`ga`
- [ ] 权益致到期 `ga=false`，到期即只读无宽限
- [ ] 被撤销设备重激活仍占名额
- [ ] `POST /api/activation/refresh` 验签 + 未撤销 + 权益有效 → 新许可证（重算 exp）
- [ ] `GET /api/activation/devices` / `DELETE` / `GET releases` 正常
- [ ] 限流**原子**（`RateLimitBucket` `INSERT ON CONFLICT`），并发测试通过
- [ ] IP 只信 Vercel 注入头（x-real-ip / x-forwarded-for 最左）
- [ ] 日志不含敏感字段
- [ ] 路由 `/memory/setup`（非 `/connect`）
- [ ] Ed25519 Node（无 dsaEncoding）/ Rust（ed25519-dalek 2.x）**互操作向量**通过
- [ ] `prisma validate` + `tsc --noEmit` + `lint` + `build` 通过

---

## 已确认决策（U1-U5）

| # | 决策 |
|---|---|
| U1 | 最小 Admin 授权 + 操作日志；脚本仅初始测试账号 |
| U2 | 内测 GitHub Releases；开放迁阿里云 OSS |
| U3 | 内测不签名；Public Beta 前签名 |
| U5 | 推迟支付，先验证激活/设备管理；`Entitlement.source` 留接口 |

---

## 未决问题

| # | 问题 | 倾向 |
|---|---|---|
| Q1 | kid 格式？ | `key-{year}-{month}` |
| Q2 | RateLimitBucket 清理？ | Vercel Cron 10min |
| Q3 | device_id 卸载重装？ | 不保留 |
| Q4 | `/memory` 介绍页？ | 需要 |
| Q5 | Admin 日志载体？ | 先 `Entitlement.metadata` JSON |
| Q6 | 滑动窗口限流？ | 否（固定窗口足够） |
| Q7 | 服务端 lastSeen 异常检测？ | P2 视风险 |
| Q8 | 客户端高水位 `last_seen_time` 是否独立于 license 存？ | 是（同一凭据存储，独立 key） |

---

## 残留风险（诚实记录）

| 风险 | 性质 | 接受理由 |
|---|---|---|
| 本地管理员可绕过离线时钟（T5/T13） | 纯离线许可不可绝对防本地管理员 | Ed25519 防伪造 + 有界 30+7 天窗口 + 高水位提高成本；产品为本地记忆工具，非 DRM 内容 |
| 固定窗口限流边界可短时 ~2×limit | 时间桶固有 | 登录/激活场景可接受；需严格时改滑动窗口 |
| `RateLimitBucket` 写入压力 | 高并发刷接口时表增长 | Vercel Cron 清理 + `expiresAt` 索引；极端情况迁 Upstash Redis |
| READ COMMITTED 被改隔离级别 | 部署误操作 | 文档强制要求；Prisma 默认即此级别；上线前校验 DB 隔离级别 |
