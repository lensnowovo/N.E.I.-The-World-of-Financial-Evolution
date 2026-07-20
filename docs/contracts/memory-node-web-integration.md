# Memory Node ↔ Web Integration Contract

日期：2026-07-13（修订 2026-07-15 → v3，2026-07-15 → v3.1）
状态：待工程评审（v3.1，闭环 Codex 第二轮 4 项审核）
作者：GLM-5.2（架构分析）

---

## 0a. v3 → v3.1 变更记录（Codex 第二轮审核闭环）

| # | v3 问题 | v3.1 修复 |
|---|---|---|
| B7 | **同一激活码并发消费仍可双成功**：§5.2.1 在取得 Entitlement 锁**之前**读取 `codeRow` 并检查 `consumedAt`；第二笔持陈旧 `codeRow`，步骤 (e) 按 `id` 无条件 update → 同码可激活两台设备，与 T1 / "同码并发 1 成功 + 1 CODE_CONSUMED" 矛盾 | 初次读码只为取 `userId`；获 Entitlement 锁后**重新读取并重新校验** `ActivationCode`（READ COMMITTED 新快照）；消费改为**条件原子 `UPDATE ... WHERE consumedAt IS NULL AND expiresAt > now RETURNING`**，0 行再回查区分 `CODE_CONSUMED`/`CODE_EXPIRED` |
| B8 | **高水位不会在回拨/冻结后继续推进**：§9 只在启动算一次 `effective_now`，周期任务又把同一个值写回 → 系统时钟被冻结/回拨时值停住，长期不退出的应用尤其明显，T5 缓解结论不成立 | 引入**进程单调时钟增量**：`effective_now = max(system_now, startup_effective + monotonic_elapsed_since_start)`，每次判定与周期持久化都重算；跨重启关机时长仍列残留风险 |
| B9 | **retry_after 错把清理缓冲算进等待时间**：`expiresAt = windowStart + windowMs + 60s` 是清理时间，429 用 `expiresAt - now` 让客户端多等 60s | 拆为 `bucketEnd = windowStart + windowMs`、`expiresAt = bucketEnd + cleanupBuffer`、`retryAfter = ceil((bucketEnd - now)/1000)`；补窗口中段超限的 retry_after 测试 |
| B10 | 发布阻断：分支落后 main，Vercel Preview 对生产 Neon 跑 `db push` 试图删除已上线、含数据的 `McpAccessToken` 表 | rebase 到最新 main（含 `McpAccessToken`），消除 Preview 与生产 schema 漂移；仓库级 P0（Preview 不应对生产库 `db push`）由独立发布流程处理，不在本 docs PR |
| 小项 | 依赖 DB 默认隔离级别；T6 "无残留" 未注明继承 T5/T13 | 激活事务**显式指定** Prisma `isolationLevel: ReadCommitted`；威胁表 T6 注明仍继承 T5/T13 的本地二进制绕过风险 |

---

## 0. v2 → v3 变更记录（Codex 第一轮审核闭环）

| # | v2 问题 | v3 修复 |
|---|---|---|
| B1 | 设备上限并发竞态：只锁 `ActivationCode` 行，同用户两枚不同激活码并发激活可同时通过 `activeCount` 检查，突破 3 台 | 在激活事务内**锁定该用户唯一的 `Entitlement` 行**（`FOR UPDATE`），获锁后再计数；明确依赖 PostgreSQL `READ COMMITTED` 串行化；`Entitlement` 不存在直接 `NO_ENTITLEMENT` |
| B2 | 限流 `count()→create()` 竞态，并发可同时通过 | 改为**原子时间桶计数器** `RateLimitBucket`，`INSERT ... ON CONFLICT DO UPDATE ... RETURNING count` 单语句自增 |
| B3 | 许可证 `exp=iat+30天` 与"订阅过期即只读"语义冲突，离线客户端无法得知服务端权益提前到期 | 统一为 `exp = min(iat+30天, entitlement.expiresAt)`；payload 增加 `ee`（权益到期 epoch，0=无）与 `ga`（是否允许宽限）；宽限不得越过 `ee`；权益致到期不享宽限 |
| B4 | 时钟回拨防护不足："系统时间 < iat 用 iat" 无法阻止反复回拨到 iat 附近 | 引入凭据存储中的 `last_seen_time` 高水位，`effective_now = max(system_now, last_seen_time)`，单调更新；**诚实声明**对本地管理员只能提高绕过成本，T5 由"已关闭"改为"缓解+残留风险" |
| B5 | Ed25519 示例用了不必要的 `dsaEncoding:'ieee-p1363'`，Rust 示例有未使用 import 且 API 版本不明 | Node 删除 `dsaEncoding`（Ed25519 默认输出 raw 64 字节）；Rust 改用 `ed25519-dalek` 2.x API（`VerifyingKey::from_bytes` / `Signature::from_bytes` / `verify_strict`），删 `Signer` import；补充**固定互操作测试向量** |
| B6 | 各章节未同步 | 全文重写：ADR、威胁表、时序图、激活事务伪代码、payload、离线/时钟策略、限流、状态机、错误码、数据模型、未决问题全部对齐 |

---

## 1. 方案比较与 ADR

### 背景

网站 `nei-pevc.com` 使用自实现 HMAC cookie session（`lib/session.ts`），不是 OAuth2 Authorization Server。桌面客户端 Memory Node 是 Tauri 应用，无法直接使用 cookie session。需要一个桥接方案让桌面客户端验证用户身份并获得使用授权。

### 方案比较

| 方案 | 结论 |
|---|---|
| A. OAuth 2.0 Authorization Code + PKCE + loopback redirect | 需构建完整 OAuth2 AS，一人维护成本过高。❌ |
| B. OAuth 2.0 Device Authorization Grant (RFC 8628) | 同样需 OAuth2 AS。❌ |
| C. 一次性激活码 + **Ed25519** 签名许可证 | 复用现有 cookie session；非对称签名可离线验证；适合早期产品。✅ 选定 |

### 选定方案：一次性激活码 + Ed25519（v3 强化版）

1. 用户在浏览器里正常登录 `nei-pevc.com`（复用现有 cookie session）。
2. 网站生成一个 5 分钟有效的一次性激活码（8 位 Crockford Base32，**仅存 SHA-256 哈希**）。
3. 用户在桌面应用里粘贴激活码。
4. 桌面应用发送 `{ code, device_id, device_name, client_version, platform }` 到 `/api/activation/activate`。
5. 网站在**单个数据库事务**中：原子限流验证 → 锁定该用户 `Entitlement` 行 → 验证激活码 → 检查权益（status + 到期）→ 检查设备数 → 消费码 → upsert 设备 → 用 Ed25519 私钥签发许可证。
6. 桌面应用存储许可证到 Windows Credential Manager / macOS Keychain。
7. 桌面应用用内置 Ed25519 公钥**离线验证签名**。
8. 许可证 `exp = min(iat+30天, ee)`，到期前在线刷新；离线时凭高水位时钟判断 `FULL / GRACE / READ_ONLY`。

### 关键设计

| 项 | 规格 |
|---|---|
| **签名算法** | Ed25519（RFC 8032），raw 64 字节签名 |
| **服务端密钥** | `MEMORY_LICENSE_PRIVATE_KEY`（Ed25519 私钥，PEM，**独立于 `SESSION_SECRET`**） |
| **客户端公钥** | 编译时硬编码 `{ kid: [u8;32] }` |
| **密钥轮换** | payload 含 `kid`；客户端持多组公钥 |
| **Node.js 签名** | `crypto.sign(null, payloadBytes, privateKey)`（**不设 `dsaEncoding`**，Ed25519 默认 raw） |
| **Rust 验证** | `ed25519-dalek` 2.x，`VerifyingKey::from_bytes` + `Signature::from_bytes` + `verify_strict` |
| **设备上限并发保护** | 事务内 `SELECT Entitlement ... FOR UPDATE`（per-user 锁），依赖 READ COMMITTED |
| **限流** | 原子时间桶 `RateLimitBucket`（`INSERT ON CONFLICT DO UPDATE RETURNING`） |
| **到期语义** | `exp = min(iat+30天, ee)`；`ga = (ee==0) || (ee > iat+30天)`；宽限不越过 `ee` |
| **时钟** | 高水位 `last_seen_time` + 进程单调时钟：`effective_now = max(system_now, startup_effective + monotonic_elapsed)`（§9） |

### 为什么不用 HMAC（v1 的错误）

v1 用 `HMAC-SHA256(SESSION_SECRET)` 但客户端不持密钥也不验证签名——用户可篡改本地许可证中的 `exp`/`plan`/`entitlement`/`did`，客户端无法判断真伪。Ed25519 非对称签名让私钥永远不进入客户端二进制，攻击者无法伪造签名。

---

## 2. 信任边界与威胁模型

```
┌─────────────────────────────────┐     ┌──────────────────────────────┐
│  nei-pevc.com (Vercel)          │     │  Memory Node (本地 Tauri)     │
│                                 │     │                                │
│  持有：                          │     │  持有：                         │
│  · SESSION_SECRET (cookie)      │     │  · Ed25519 公钥（编译内置）     │
│  · MEMORY_LICENSE_PRIVATE_KEY   │     │  · 许可证（Ed25519 签名）       │
│    (Ed25519 私钥)               │     │  · last_seen_time（高水位）     │
│                                 │     │  · 记忆正文（SQLite）           │
│  保存（DB）：                    │     │                                │
│  · codeHash (SHA-256)           │     │  验证：                         │
│  · Entitlement（含 expiresAt）   │     │  · 离线 Ed25519 验签 ✅         │
│  · 设备列表/状态                 │     │  · ee/exp/ga 决定 FULL/GRACE/RO│
│  · RateLimitBucket（原子桶）     │     │  · 高水位时钟防回拨             │
│  · ReleaseManifest              │     │                                │
│                                 │     │  不持有：私钥 ❌ / SESSION_SECRET│
│  签发：Ed25519 签名许可证 ──────│───→ │                                │
│                                 │     │  不上传：记忆正文/机构/基金/项目│
│  不保存：记忆正文 / 机构名 /     │     │                                │
│  基金名 / 项目名 / Agent 对话 ❌  │     │                                │
└─────────────────────────────────┘     └──────────────────────────────┘
```

### 威胁清单

| # | 威胁 | 缓解 | 残留风险 |
|---|---|---|---|
| T1 | 激活码截获重放 | 5 分钟过期 + 绑定 userId + 仅存哈希 + **获 Entitlement 锁后重校验 + 条件原子 UPDATE 消费**（同码并发只一笔成功，B7） | 无 |
| T2 | 伪造/篡改许可证 | **Ed25519 离线验签**：篡改 payload 任意字节 → 验签失败 | 无（无私钥） |
| T3 | 超 3 台设备并发激活 | 事务内**锁定 Entitlement 行**（per-user）+ 显式 `ReadCommitted` 计数 | 无（见 §5.2） |
| T4 | 共享激活码给多人 | 激活码绑定生成时 userId，激活后 deviceId 绑定该 userId | 无 |
| T5 | 离线破解/时钟回拨 | 高水位 `last_seen_time` + **进程单调时钟增量** + 有界 30+7 天窗口 + 周期刷新推送服务端时间 | **有**：本地管理员可改时钟/凭据存储/打补丁/关机期回拨；只能提高成本（见 §9） |
| T6 | 订阅到期后继续使用 | `exp=min(iat+30d, ee)`；`ee` 嵌入签名 payload；权益致到期 `ga=false`，到期即只读无宽限 | 继承 T5/T13：本地二进制可被篡改以无视 `ee`/`exp`（非签名层风险） |
| T7 | 服务器故障阻断用户 | 窗口内 fail-open（FULL/GRACE）；超窗口 fail-closed（READ_ONLY，数据不丢） | 无 |
| T8 | 撤销设备后继续使用 | 撤销阻止 refresh 与 Skill MCP；本地记忆不受影响 | 仅离线窗口内可用旧许可证（设计内行为） |
| T9 | 旧版客户端安全漏洞 | `ReleaseManifest.minVersion`；激活/刷新时拒绝低版本 | 无 |
| T10 | 暴力枚举激活码 | 8 位 Crockford Base32（~40 bit）+ **原子桶**持久限流 | 无（原子性见 §11） |
| T11 | 并发突破设备上限 | Entitlement 行锁串行化 + **显式 `ReadCommitted`** 计数 | 无 |
| T12 | 撤销设备重激活绕过名额 | 计数只算 `status='active'`；被撤销设备重激活时按剩余 active 设备数检查 | 无 |
| T13 | 本地管理员离线永久使用 | Ed25519 防伪造 + 有界离线窗口 + 高水位**+进程单调时钟** + 可选服务端 lastSeen 异常检测 | **有**：纯离线许可无法绝对防本地管理员（见 §9 诚实声明） |

---

## 3. 完整时序图

### 3a. 首次激活流程（v3）

```
用户        浏览器(nei-pevc.com)          桌面应用(Memory Node)
 │              │                              │
 │──登录────────→│ (setSession cookie)          │
 │──访问 /memory/setup                          │
 │──点击"生成激活码"                            │
 │              │ 原子限流(RateLimitBucket) ✅    │
 │              │ code = 8位 Crockford Base32   │
 │              │ codeHash = SHA-256(code)      │
 │              │ 存 ActivationCode(codeHash)   │
 │←─显示码 A1B2C3D4 (5min，明文只显一次)────────│
 │                                             │
 │──手动输入码到桌面应用────────────────────────→│
 │                                             │
 │                              桌面应用 POST /api/activation/activate
 │                              { code, device_id, device_name, version, platform }
 │              │←─────────────────────────────│
 │              │                              │
 │              │ ╔═══ DB TRANSACTION (显式 ReadCommitted) ═══╗
 │              │ ║ 0. 原子限流(RateLimitBucket) — 事务外或首条 ║
 │              │ ║ 1. 查 ActivationCode(codeHash) → 取 userId    ║（初读非权威）
 │              │ ║ 2. SELECT Entitlement WHERE userId=? FOR UPDATE║← per-user 锁
 │              │ ║    不存在 → NO_ENTITLEMENT                     ║
 │              │ ║    status≠active 或 expiresAt≤now → EXPIRED    ║
 │              │ ║ 3. 重校验 ActivationCode（获锁后新快照）        ║← 闭合同码并发（B7）
 │              │ ║    已消费 → CODE_CONSUMED；过期 → CODE_EXPIRED  ║
 │              │ ║ 4. client_version ≥ minVersion                 ║
 │              │ ║ 5. count(active DeviceActivation，不含本 did)<3 ║← 获锁后计数
 │              │ ║ 6. 条件原子 UPDATE 消费码（WHERE 未消费且未过期）║← 防御纵深（B7）
 │              │ ║ 7. upsert DeviceActivation(status=active)      ║
 │              │ ║ 8. exp=min(iat+30d, ee); ga=ee>iat+30d||ee==0   ║
 │              │ ║ 9. Ed25519 签发许可证(v2 payload)              ║
 │              │ ╚════════════════════════════════════════════════╝
 │              │                              │
 │              │──返回许可证──────────────────→│ { license, expires_at }
 │              │   (payload.sig，含 ee/exp/ga)  │
 │              │                              │
 │              │                  内置公钥验签 ✅
 │              │                  写 license + last_seen_time 到
 │              │                  Credential Manager
 │              │                              │
 │              │                  effective_now=max(sys, last_seen)
 │              │                  now ≤ exp → FULL
```

### 3b. 在线刷新流程

```
桌面应用                nei-pevc.com
    │  原子限流(RateLimitBucket, refresh, 30/min) ✅
    │  POST /api/activation/refresh
    │  { license, device_id }
    │─────────────────────→│
    │         Ed25519 验签（按 kid 选公钥）
    │         · 签名有效
    │         · DeviceActivation status=active（未撤销）
    │         · Entitlement status=active 且 expiresAt>now
    │         · 更新 lastSeenAt
    │         · 重算 exp=min(iat'+30d, ee)、ga
    │←────新许可证──────────│ { license, expires_at }
    │  替换 Credential Manager 旧许可证
    │  更新 last_seen_time = effective_now（单调）
```

### 3c. 离线超时降级流程（统一到期 + 高水位时钟）

```
桌面应用（离线）
   effective_now = max(system_now, startup_effective + monotonic_elapsed)   # 见 §9
   │
   ├─ effective_now ≤ exp                          → FULL
   ├─ ga 且 effective_now ≤ min(exp+7d, ee 或 ∞)   → GRACE（全功能 + 提示联网刷新）
   └─ 否则                                         → READ_ONLY
        · 可查看/导出/删除本地数据
        · 不能写新记忆、不能建新会话
        · 提示联网刷新或续费

   注：若 exp 是因 ee 截断（ga=false），到期后直接 READ_ONLY，无 GRACE。
   用户联网后自动尝试 refresh：
        · 成功且权益有效 → FULL
        · 权益过期 → 提示续费（READ_ONLY）
        · 设备被撤销 → 提示重新激活
```

---

## 4. 服务端数据模型（v3）

### 新增 Prisma 模型

```prisma
// ---------- 激活码（一次性，5 分钟有效，仅存哈希）----------
model ActivationCode {
  id         Int       @id @default(autoincrement())
  codeHash   String    @unique              // SHA-256(code)，不存明文
  userId     Int
  createdAt  DateTime  @default(now())
  expiresAt  DateTime                       // createdAt + 5min
  consumedAt DateTime?                      // 激活时间；null = 未使用
  deviceId   String?
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([codeHash])
}

// ---------- 设备激活记录 ----------
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

// ---------- 订阅权益（解锁设备上限的 per-user 锁行）----------
model Entitlement {
  id         Int       @id @default(autoincrement())
  userId     Int       @unique              // 唯一：作为 per-user 锁目标
  plan       String    @default("free")
  status     String    @default("active")
  startedAt  DateTime  @default(now())
  expiresAt  DateTime?                       // null = 无到期；决定 license.exp 上限
  source     String?
  metadata   String?
  updatedAt  DateTime  @updatedAt
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ---------- 客户端发布清单 ----------
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

// ---------- 原子时间桶限流（替代 v2 的 ActivationAttempt）----------
model RateLimitBucket {
  id          BigInt    @id @default(autoincrement())
  ip          String
  endpoint    String                        // "code" | "activate" | "refresh"
  windowStart DateTime                      // 对齐到窗口边界
  count       Int      @default(0)
  expiresAt   DateTime                      // windowStart + window + 清理缓冲
  createdAt   DateTime @default(now())

  @@unique([ip, endpoint, windowStart])     // 原子 upsert 的冲突键
  @@index([expiresAt])                      // 支撑定期清理
}
```

### User 模型新增 relation

```prisma
activationCodes   ActivationCode[]
deviceActivations DeviceActivation[]
entitlement       Entitlement?
```

> 注：`RateLimitBucket` 与 `User` 无 relation（匿名限流）。所有 5 张新表都是 additive。

---

## 5. HTTP 端点规格

### 5.1 `POST /api/activation/code`

生成一次性激活码。需要网站 cookie session。

**认证**：Cookie session（`getSessionUid`）
**限流**：原子桶 `checkAndConsume(ip, "code", 3, 60_000)`

**请求**：无 body
**响应 200**：`{ "code": "A1B2C3D4", "expires_in": 300 }`

| 状态码 | 错误码 | 场景 |
|---|---|---|
| 401 | `UNAUTHORIZED` | 未登录 |
| 403 | `NO_ENTITLEMENT` / `ENTITLEMENT_EXPIRED` | 无权益或权益过期（不允许浪费发码额度） |
| 429 | `RATE_LIMITED` | 超限（含 `retry_after`） |

**实现要点**：8 位 Crockford Base32（去除 I/L/O/U）；`codeHash = SHA-256(code.toUpperCase())`；只存 `codeHash`；明文只返回一次。

---

### 5.2 `POST /api/activation/activate`

用激活码换许可证。**不需要 cookie session。**

**限流**：原子桶 `checkAndConsume(ip, "activate", 10, 60_000)`
**请求**：
```json
{ "code": "A1B2C3D4", "device_id": "550e8400-...", "device_name": "我的笔记本",
  "platform": "windows", "client_version": "0.1.0" }
```
**响应 200**：
```json
{ "license": "<payload.sig>", "expires_at": "2026-08-13T10:00:00Z",
  "user": { "nickname": "清流VC合伙人", "plan": "memory-node-pro" } }
```

| 状态码 | 错误码 | 场景 |
|---|---|---|
| 400 | `INVALID_CODE` / `CODE_EXPIRED` / `CODE_CONSUMED` | 码哈希不匹配 / 过期 / 已用 |
| 403 | `DEVICE_LIMIT_EXCEEDED` | active 设备已达 3（含并发安全） |
| 403 | `NO_ENTITLEMENT` | 无 Memory Node 权益，或 Entitlement 不存在 |
| 403 | `ENTITLEMENT_EXPIRED` | `status≠active` 或 `expiresAt≤now` |
| 403 | `CLIENT_TOO_OLD` | `client_version < minVersion` |
| 429 | `RATE_LIMITED` | 超限 |

#### 5.2.1 激活事务伪代码（并发安全核心）

```typescript
// ── 事务外：原子限流 + 输入校验 ──
const ip = getClientIp(req);
const rl = await checkAndConsume(ip, "activate", 10, 60_000);   // 原子桶，见 §11
if (!rl.allowed) return error(429, "RATE_LIMITED", { retry_after: rl.retryAfter });

validateCodeFormat(body.code);        // ^[0-9A-HJKMNP-TV-Z]{8}$（Crockford，大小写不敏感）
validateUuid(body.device_id);
validateSemver(body.client_version);
validatePlatform(body.platform);      // "windows" | "macos"

// ── 单个事务（显式 ReadCommitted）：锁 Entitlement → 重校验码 → 计数 → 消费 → 签发 ──
//     不依赖 DB 默认隔离级别；显式声明 ReadCommitted 是 §5.2.2 串行化论证的前提。
const result = await prisma.$transaction(
  async (tx) => {
    const codeHash = hashActivationCode(body.code);

    // (a) 初次读码：仅为取得 userId + 早期快速失败（此处校验**非权威**，
    //     并发判定必须在获锁后重校验，见 (b2) 与 (e)）。
    const codeRow = await tx.activationCode.findUnique({ where: { codeHash } });
    if (!codeRow) throw new ActivationError(400, "INVALID_CODE");

    // (b) 锁定该用户唯一的 Entitlement 行（per-user 串行化点）。
    //     Prisma 不直接暴露 FOR UPDATE，用参数化 $queryRaw（禁止拼接）。
    //     列名用 Prisma 实际生成的引号 camelCase。
    const ents = await tx.$queryRaw<
      Array<{ id: number; plan: string; status: string; expiresAt: Date | null }>
    >`SELECT id, plan, status, "expiresAt" FROM "Entitlement"
      WHERE "userId" = ${codeRow.userId} FOR UPDATE`;
    const ent = ents[0];
    if (!ent) throw new ActivationError(403, "NO_ENTITLEMENT");
    if (!["memory-node-pro", "memory-node-team"].includes(ent.plan))
      throw new ActivationError(403, "NO_ENTITLEMENT");
    if (ent.status !== "active") throw new ActivationError(403, "ENTITLEMENT_EXPIRED");
    if (ent.expiresAt && ent.expiresAt.getTime() <= Date.now())
      throw new ActivationError(403, "ENTITLEMENT_EXPIRED");

    // (b2) 权威重校验激活码：持有 Entitlement 锁之后重新读取（READ COMMITTED
    //      新快照）。同码并发请求在此串行化：第二笔此时必然看到第一笔已提交的
    //      consumedAt。这是闭合"同码并发双消费"的关键，不能省略。
    const codeFresh = await tx.activationCode.findUnique({ where: { codeHash } });
    if (!codeFresh) throw new ActivationError(400, "INVALID_CODE");
    if (codeFresh.expiresAt.getTime() < Date.now()) throw new ActivationError(400, "CODE_EXPIRED");
    if (codeFresh.consumedAt) throw new ActivationError(400, "CODE_CONSUMED");

    // (c) 版本门
    const release = await tx.releaseManifest.findFirst({
      where: { product: "memory-node", platform: body.platform, isLatest: true },
    });
    if (release?.minVersion && semverLt(body.client_version, release.minVersion))
      throw new ActivationError(403, "CLIENT_TOO_OLD");

    // (d) 设备计数：必须在持有 Entitlement 锁之后执行。
    //     不含 body.device_id 自身（已 active 的设备刷新/重激活不重复计数）。
    //     被撤销设备因 status≠active 自然不计入 → 重激活仍受 3 台限制（T12）。
    const activeCount = await tx.deviceActivation.count({
      where: { userId: codeRow.userId, status: "active", deviceId: { not: body.device_id } },
    });
    if (activeCount >= 3) throw new ActivationError(403, "DEVICE_LIMIT_EXCEEDED");

    // (e) 原子消费激活码（防御纵深）：带条件的 UPDATE，仅当未消费且未过期时成功。
    //     即使 (b2) 的重读被未来某次重构遗漏，此处 0 行也能阻止双消费。
    //     返回 0 行时回查区分 CODE_CONSUMED / CODE_EXPIRED。
    const now = new Date();
    const consumed = await tx.$queryRaw<
      Array<{ id: number }>
    >`UPDATE "ActivationCode"
       SET "consumedAt" = ${now}, "deviceId" = ${body.device_id}
       WHERE id = ${codeFresh.id}
         AND "consumedAt" IS NULL
         AND "expiresAt" > ${now}
       RETURNING id`;
    if (consumed.length === 0) {
      const probe = await tx.activationCode.findUnique({ where: { id: codeFresh.id } });
      if (probe?.consumedAt) throw new ActivationError(400, "CODE_CONSUMED");
      throw new ActivationError(400, "CODE_EXPIRED");
    }

    // (e2) upsert 设备（码已成功消费，此处失败会回滚整笔事务，包括消费；符合预期）
    await tx.deviceActivation.upsert({
      where: { userId_deviceId: { userId: codeRow.userId, deviceId: body.device_id } },
      create: { userId: codeRow.userId, deviceId: body.device_id, deviceName: body.device_name,
                platform: body.platform, clientVersion: body.client_version, status: "active" },
      update: { deviceName: body.device_name, platform: body.platform,
                clientVersion: body.client_version, status: "active",
                lastSeenAt: new Date(), revokedAt: null, revokeReason: null },
    });

    // (f) 签发许可证：exp = min(iat+30d, ee)
    const issued = issueLicense({
      uid: codeRow.userId, did: body.device_id, ent: ent.plan,
      entitlementExpiresAt: ent.expiresAt,   // null → 无上限
      vmin: release?.minVersion ?? "0.0.1",
    });
    return issued;   // { license, exp }
  },
  { isolationLevel: "ReadCommitted" },   // 显式声明，不依赖 DB 默认值（小项）
);

const user = await prisma.user.findUnique({ where: { id: /* uid from license */ } });
return Response.json({
  license: result.license,
  expires_at: new Date(result.exp * 1000).toISOString(),
  user: { nickname: user?.nickname, plan: /* from license */ },
});
```

#### 5.2.2 为什么能串行化同一用户的并发激活（设备上限 + 同码消费）

1. `Entitlement.userId` 是 `@unique`，**每个用户恰好一行**（或零行）。它是天然的 per-user 锁目标。
2. `SELECT ... FOR UPDATE` 获取该行的**排他行锁**。**同一用户**的任何并发激活——无论是不同激活码还是同一激活码——都瞄准同一 `Entitlement` 行 → 第二笔阻塞，直到第一笔提交或回滚。
3. 隔离级别 **READ COMMITTED**（事务**显式声明** `isolationLevel: ReadCommitted`，不依赖 DB 默认）：每条语句在**语句开始时**取最新已提交快照；`FOR UPDATE` 在阻塞解除后会**重新获取**被锁行的最新已提交版本。
4. 因此第二笔事务：
   - 步骤 (d) 的 `count()` **必然看到**第一笔已提交的新设备 → 计数为 3 → 拒绝第 4 台。**设备上限竞态关闭（B1）。**
   - 步骤 (b2) 的**重读** `ActivationCode` **必然看到**第一笔已提交的 `consumedAt` → `CODE_CONSUMED`；即使重读被遗漏，步骤 (e) 的**条件原子 UPDATE** 也会返回 0 行阻止消费。**同码双消费竞态关闭（B7）。**

> **必须 READ COMMITTED 且显式声明**：若将 DB 改为 `REPEATABLE READ`/`SERIALIZABLE`，事务快照在更早处冻结，"锁后重读/计数"模式将**不再安全**（第二笔可能看不到第一笔的提交）。本契约**显式**用 Prisma `isolationLevel: "ReadCommitted"` 声明，不依赖数据库默认值。

> **不要只依赖 ActivationCode 的 FOR UPDATE**：同一用户两枚不同激活码是两行，互不阻塞；设备上限保护必须来自唯一的 Entitlement 行锁。同码消费保护则来自"锁后重读 + 条件原子 UPDATE"双重保险，而非 ActivationCode 行锁。

> **消费失败回滚**：步骤 (e2) 的 upsert 或 (f) 之后若抛错，整笔 `$transaction` 回滚，包括 (e) 的消费——码不会被白白消耗。

> **备选方案**：per-user 串行化也可用 `pg_advisory_xact_lock(hashtext('ent:' || userId))` 咨询锁，效果相同且不依赖某张具体表。本契约首选 Entitlement 行锁（语义清晰、与已有查询复用）。

> **P1-1 重复 deviceId**：激活码与设备绑定后，若 `userId + deviceId` 已 `active`，新激活码返回 `DEVICE_ALREADY_ACTIVE` 且**不消费激活码**——防止多台机器共用同一 `deviceId` 只占一个名额。已撤销设备允许重新激活，并正常占用一个 active 名额（计数只算 `status='active'`）。

> **⚠️ v1 设备限制是服务端软限制（诚实声明）**：`deviceId` 是客户端生成的随机 UUID，**不是硬件可信身份**。完全控制本机的用户可复制本地身份（复制凭据存储里的许可证 + 同一 `deviceId`）或修改客户端以绕过。本设计阻止的是「正常多账户/多设备滥用」与「并发竞态突破上限」，**无法**对抗有动机的本地绕过。正式商业化前应考虑「设备密钥对 + 公钥绑定 + proof-of-possesion」，使每台物理设备持有独立私钥。本 PR 不实现完整设备密钥体系。

---

### 5.3 `POST /api/activation/refresh`

**限流**：原子桶 `checkAndConsume(ip, "refresh", 30, 60_000)`
**请求**：`{ "license": "<payload.sig>", "device_id": "..." }`
**响应 200**：`{ "license": "<new>", "expires_at": "..." }`

| 状态码 | 错误码 | 场景 |
|---|---|---|
| 400 | `INVALID_LICENSE` | Ed25519 验签失败 / 结构损坏 |
| 403 | `DEVICE_REVOKED` | 设备被撤销（status≠active） |
| 403 | `ENTITLEMENT_EXPIRED` | 权益 status≠active 或过期 |
| 403 | `CLIENT_TOO_OLD` | 版本过低 |
| 429 | `RATE_LIMITED` | 超限 |

**服务端流程**：
1. Ed25519 验签（按 payload.kid 选公钥）；失败 → `INVALID_LICENSE`。
2. 解析 `{ uid, did, ent, ee, exp }`。
3. 查 `DeviceActivation { userId: uid, deviceId: did }`；status≠active → `DEVICE_REVOKED`。
4. 查 `Entitlement`；status≠active 或 `expiresAt≤now` → `ENTITLEMENT_EXPIRED`。
5. 通过 → 更新 `lastSeenAt`，**重算** `exp=min(iat'+30d, ee)`、`ga`，重签许可证。

---

### 5.4 `GET /api/activation/devices`

Cookie session。返回 `{ devices: [...], limit: 3 }`（按 `lastSeenAt desc`）。

### 5.5 `DELETE /api/activation/devices/:id`

Cookie session。设 `status='revoked', revokedAt=now, revokeReason='user_revoke'`。**不删任何数据**；释放名额供新设备激活。

### 5.6 `GET /api/releases/memory-node/latest?platform=windows`

公开。返回 manifest 或 `{ available: false }`。

---

## 6. 许可证载荷（v3，Ed25519）

### 载荷结构

```json
{
  "v": 2,
  "kid": "key-2026-07",
  "uid": 42,
  "did": "550e8400-e29b-41d4-a716-446655440000",
  "ent": "memory-node-pro",
  "ee": 0,
  "iat": 1720800000,
  "exp": 1723392000,
  "ga": true,
  "vmin": "0.1.0"
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `v` | int | 许可证格式版本，**v3 契约为 2** |
| `kid` | string | 签名密钥 ID，用于轮换 |
| `uid` | int | 用户 ID |
| `did` | string | 设备 UUID |
| `ent` | string | 权益计划 |
| `ee` | int | 权益到期（epoch 秒）；**0 = 无到期**。嵌入签名 payload，供客户端离线判定 |
| `iat` | int | 签发时间（秒） |
| `exp` | int | **`= min(iat + 30天, ee)`**；ee=0 时为 iat+30天 |
| `ga` | bool | **是否允许宽限**：`(ee == 0) || (ee > iat + 30天)`，即权益比自然许可证窗口活得更久 |
| `vmin` | string | 签发时的最低客户端版本 |

### 到期/宽限规则（统一语义）

**服务端签发时**：
```
THIRTY_DAYS = 30 * 86400
exp_raw = iat + THIRTY_DAYS
ee      = entitlement.expiresAt ? epoch(entitlement.expiresAt) : 0
exp     = (ee == 0 || ee > exp_raw) ? exp_raw : ee     // 权益更短则截断
ga      = (ee == 0) || (ee > exp_raw)                  // 权益活过自然窗口才允许宽限
```

**客户端离线判定**（`effective_now` 见 §9 高水位时钟）：
```
GRACE_WINDOW = 7 * 86400
if effective_now <= exp:
    mode = FULL
elif ga AND effective_now <= min(exp + GRACE_WINDOW, ee == 0 ? Infinity : ee):
    mode = GRACE       # 全功能 + 提示联网刷新
else:
    mode = READ_ONLY   # 可查看/导出/删除，不可写
```

**语义自洽性**：
- `ee=0`（无到期）：`exp=iat+30d`，`ga=true`，宽限到 `exp+7d`。✓
- `ee=iat+20d`（权益更短）：`exp=iat+20d=ee`，`ga=false`，到期即 `READ_ONLY`，**无宽限**。✓
- `ee=iat+60d`（权益更长）：`exp=iat+30d`，`ga=true`，宽限到 `min(iat+37d, iat+60d)=iat+37d`。✓
- 任何时候 `effective_now > ee`（当 `ee>0`）必然落到 `READ_ONLY`，因为宽限上界不超过 `ee`。✓

> 关键：`ee` 被 Ed25519 签名保护，客户端可**独立**执行"权益过期即无宽限"，无需联网。

### 签名方式（Ed25519，详见 §18 互操作）

**Node.js 签发**（不设 `dsaEncoding`，Ed25519 默认 raw 64 字节）：
```javascript
const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
const signature = crypto.sign(null, payloadBytes, privateKey);
const license = payloadBytes.toString('base64url') + '.' + signature.toString('base64url');
```

**Rust 验证**（`ed25519-dalek` 2.x，按 `kid` 选 `[u8;32]` 公钥，`verify_strict`）。

### 密钥管理

| 项 | 说明 |
|---|---|
| 生成 | `openssl genpkey -algorithm ED25519 -out private.pem`；`openssl pkey -in private.pem -pubout -out public.pem` |
| 服务端 | Vercel env `MEMORY_LICENSE_PRIVATE_KEY`（PEM） |
| 客户端 | 编译时嵌入 `LICENSE_PUBLIC_KEYS: { kid → [u8;32] }` |
| 轮换 | 新 kid + 新客户端版本（含新公钥）；新签发用新 kid；旧许可证 exp 后自然失效 |
| 独立 | **不使用 `SESSION_SECRET`**（cookie session 密钥与许可证密钥完全独立） |

---

## 7. 稳定错误码

| 错误码 | HTTP | 含义 | 客户端行为 |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | 需要 cookie session | — |
| `INVALID_CODE` | 400 | 激活码哈希不匹配 | 提示检查输入 |
| `CODE_EXPIRED` | 400 | 超 5 分钟 | 重新生成 |
| `CODE_CONSUMED` | 400 | 已使用 | 重新生成 |
| `DEVICE_LIMIT_EXCEEDED` | 403 | active 设备达 3（并发安全） | 在网站撤销旧设备 |
| `DEVICE_ALREADY_ACTIVE` | 403 | 该 `deviceId` 已 active，不允许凭新激活码覆盖/重激活 | 用新 deviceId 或先撤销旧设备 |
| `NO_ENTITLEMENT` | 403 | 无权益 / Entitlement 不存在 | 引导购买/联系管理员 |
| `ENTITLEMENT_EXPIRED` | 403 | 权益 status≠active 或 expiresAt≤now | 引导续费 |
| `CLIENT_TOO_OLD` | 403 | 版本过低 | 强制升级 |
| `DEVICE_REVOKED` | 403 | 设备被撤销 | 重新激活 |
| `INVALID_LICENSE` | 400 | Ed25519 验签失败 | 重新激活 |
| `RATE_LIMITED` | 429 | 超限（含 `retry_after`） | 客户端退避重试 |

---

## 8. 状态机（v3 统一到期）

### 设备状态机

```
              activate()（持 Entitlement 锁，受 3 台限制）
  [none] ────────────────────────────→ [active]
                                         ↑
                                  重新激活
                                  （仍受 3 台限制；
                                   被撤销设备重激活时
                                   因 status≠active 不计入，
                                   按剩余 active 设备数检查）
                          revoke() │
                                   ↓
                               [revoked]
```

### 许可证客户端状态机（离线，基于 ee/exp/ga + 高水位）

```
  effective_now = max(system_now, startup_effective + monotonic_elapsed)   # 见 §9

  [FULL] ── effective_now ≤ exp ──────────────────────────────── [FULL]
     │
     │ effective_now > exp
     ↓
  判定 ga：
   · ga=true 且 effective_now ≤ min(exp+7d, ee 或 ∞)  → [GRACE]（全功能+提示刷新）
   · 否则                                              → [READ_ONLY]
     │
     │ GRACE 内联网 refresh 成功
     ↓
  [FULL]
     │
     │ 联网 refresh：
     │   权益有效 → [FULL]
     │   权益过期 → [READ_ONLY]（提示续费）
     │   设备撤销 → 重新激活流程
```

---

## 9. 离线许可与时钟策略（v3）

### 统一离线窗口

许可证 `exp = min(iat+30天, ee)`，由 Ed25519 签名保护不可篡改。宽限 7 天（`ga=true` 时），且**不越过 `ee`**。

### 时钟回拨：本地高水位 + 进程单调时钟（残留风险诚实声明）

桌面应用在**安全凭据存储**（Windows Credential Manager / macOS Keychain）中保存 `last_seen_time`（epoch 秒）。**v3.1 关键修正**：`effective_now` 不能只在启动时算一次，否则系统时钟被冻结/回拨时它停住不前进（尤其长期不退出的应用）。引入**进程单调时钟增量**，每次许可证判定与周期持久化都重新计算。

```
# 进程级常量（启动时固定一次）
startup_wall        = system_clock_seconds()                       # 启动时的墙钟
startup_monotonic   = monotonic_clock_seconds()                    # Rust Instant::now() / Win QueryUnbiasedInterruptTime，不受墙钟调整影响
startup_effective   = max(startup_wall, persisted_last_seen_time ?? 0)

# 每次需要 effective_now 时（许可证判定 / 周期持久化 / 刷新成功）都重算：
function compute_effective_now():
  system_now         = system_clock_seconds()
  monotonic_elapsed  = monotonic_clock_seconds() - startup_monotonic   # 单调、不可回拨
  monotonic_estimate = startup_effective + monotonic_elapsed           # 本次进程内始终前进
  effective_now      = max(system_now, monotonic_estimate)
  return effective_now

on_startup:
  persisted_last_seen_time = read_credential("last_seen_time")   # 首次 null
  if persisted_last_seen_time != null and startup_wall < persisted_last_seen_time - 300:
      record_local_diagnostic("clock_rollback_at_startup",
                              { startup_wall, persisted_last_seen_time })
      set_user_flag("recommend_network_time_resync")             # 警告，不阻断
  evaluate_license(compute_effective_now())                      # 见 §6 / §8

on_license_evaluation / on_healthy_run_periodically / on_refresh_success:
  eff = compute_effective_now()
  if eff > persisted_last_seen_time:                             # 单调：只增不减
      write_credential("last_seen_time", eff)
      persisted_last_seen_time = eff
  evaluate_license(eff)
```

**性质（v3.1 修正后）**：
- `monotonic_elapsed` 来自不受墙钟调整影响的单调时钟（Rust `Instant` / Windows 单调 API），**进程运行期间始终前进、不可回拨**。
- 即便系统墙钟被冻结或回拨，`monotonic_estimate = startup_effective + monotonic_elapsed` 仍随真实流逝时间增长 → `effective_now` **在单次运行期间真实推进**，许可证到期照常生效。**T5 缓解结论成立（B8 闭合）。**
- `effective_now` 取 `max(system_now, monotonic_estimate)`：墙钟正常时不冤枉用户；墙钟异常时单调估计兜底。
- 周期 refresh 把权威的 `effective_now` 写回 `last_seen_time`，校准漂移，并跨重启传递高水位。
- 检测到回拨只记录**本地诊断信息**，**不上传**任何记忆/项目数据。

### ⚠️ 残留风险（诚实声明）

**纯离线许可无法对"完全控制本机的本地管理员"做到绝对防护。** 一个能控制 OS、二进制和凭据存储的本地管理员可以：
- 删除或改写 `last_seen_time`（跨重启时高水位丢失）；
- **关机期间回拨时钟**：进程重启后 `monotonic_elapsed` 归零，`startup_effective = max(墙钟, last_seen)`，若 `last_seen` 被改小或墙钟被回拨，本次启动基线可被压低（关机时长无法在客户端可靠获知）；
- 给二进制打补丁跳过时钟检查或单调时钟读取；
- 在时钟冻结的虚拟机里运行并定期重置 `last_seen_time`。

Ed25519 能**防止伪造许可证**，但**无法强制客户端"尊重" `exp`**。本设计的防护目标是**提高绕过成本并限制离线窗口**，而非绝对防破解：
- 高水位 + 进程单调时钟击败"随手回拨"与"长期不退出后冻结时钟"；
- 有界 30+7 天窗口封顶免费使用时长；
- 周期 refresh 推送权威服务端时间并刷新高水位；
- （可选）服务端对 `DeviceActivation.lastSeenAt` 间隙做异常检测。

因此威胁表 **T5 / T13 标注为"缓解 + 残留风险"，而非"已关闭"**。这对一个本地优先的记忆工具产品（非高价值 DRM 内容）是可接受的工程权衡。

---

## 10. Release Manifest

```json
{
  "product": "memory-node", "version": "0.1.0", "platform": "windows",
  "download_url": "https://github.com/.../MemoryNode-Setup-0.1.0.exe",
  "sha256": "e3b0c44...", "min_version": "0.0.1",
  "release_notes": "首个内测版本", "is_latest": true,
  "published_at": "2026-07-13T10:00:00Z"
}
```

内测用**私有 GitHub Releases**；向非成员开放时迁移到阿里云 OSS。客户端在启动 / 每 24h / 激活刷新时检查更新。

---

## 11. 限流策略（原子时间桶）

### 模型与原子消费

`RateLimitBucket`（见 §4），唯一键 `(subject, endpoint, windowStart)`。

> **P2-3 subject 列**：冲突键由 `ip` 改为语义中立的 `subject`——既装合法 IP，也装 `"user:<id>"`（发码的用户维度限流），避免把 userId 伪造成 IP。`ip` 保留为可选观测列。

```typescript
// 单语句原子自增：INSERT 新桶(count=1) 或 ON CONFLICT 自增，RETURNING 自增后的 count。
// 冲突路径会对该桶行加锁，并发 upsert 在同一桶上串行，每次 +1，互不丢失。
const CLEANUP_BUFFER_MS = 60_000; // 桶过期后再保留一小段时间，供 Cron 清理

async function checkAndConsume(
  ip: string, endpoint: string, limit: number, windowMs: number
): Promise<{ allowed: boolean; retryAfter: number }> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const bucketEnd = new Date(windowStart.getTime() + windowMs);        // 桶真正结束时间
  const expiresAt = new Date(bucketEnd.getTime() + CLEANUP_BUFFER_MS); // 清理时间（>bucketEnd）

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
    // retryAfter 基于 bucketEnd（客户端可重试的真实时间），不含清理缓冲（B9）
    return { allowed: false, retryAfter: Math.ceil((bucketEnd.getTime() - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}
```

**时间窗口**：固定窗口。`windowStart = floor(now / windowMs) * windowMs`。例如 `windowMs=60000` → 对齐到每分钟 `:00`，桶覆盖 `[windowStart, bucketEnd)`。三者区分（**B9 修正**）：
- `bucketEnd = windowStart + windowMs`：桶**真正结束**时间，429 的 `retryAfter` 据此计算。
- `expiresAt = bucketEnd + cleanupBuffer`：清理时间（略晚于 `bucketEnd`），仅供 Cron 删除，**不计入客户端等待**。
- `retryAfter = ceil((bucketEnd - now) / 1000)`：客户端应在桶结束后重试。

**为什么不会超发**：读-改-写在**单条 SQL** 内完成，由 `ON CONFLICT` 的行锁串行化。并发请求命中同一桶时，DB 保证 `count` 逐次 +1；判定基于 `RETURNING` 的自增后值，因此第 `(limit+1)` 个请求及之后全部被拒，**恰好 `limit` 个成功**。无 count→create 竞态。

**固定窗口边界 fuzziness**：窗口切换瞬间可能短时间内进入 ~2×limit 请求（跨两个相邻窗口）。对登录/激活场景可接受；若需更严格可改滑动窗口（成本更高，暂不引入）。

**清理**：Vercel Cron 每日 03:00 UTC：`DELETE FROM "RateLimitBucket" WHERE "expiresAt" < NOW();`（`expiresAt` 索引支撑，兼容 Vercel Hobby 每日 Cron 限制）。

### 限流配置

| 端点 | 限制 | 窗口 |
|---|---|---|
| `POST /api/activation/code` | 3 | 60s |
| `POST /api/activation/activate` | 10 | 60s |
| `POST /api/activation/refresh` | 30 | 60s |

### 客户端 IP 读取顺序（Vercel）

```typescript
// 实现：lib/client-ip.ts。只信任 Vercel 注入/覆写的代理头，且只接受合法
// IPv4/IPv6 单值（net.isIP 校验，长度 ≤ 45）。多段拼接/超长/非 IP → 'unknown'。
function getClientIp(req: Request | NextRequest): string {
  // 1. x-real-ip：Vercel 单值，最可信。
  // 2. x-forwarded-for：仅作受控兜底，取最左一项。
  // 3. x-vercel-forwarded-for：同上。
  // 4. 'unknown'（作为「IP 未知」的共享限流桶，比完全不限安全）。
}
```

读取顺序与校验（**P1-2 加固**）：
- **优先 `x-real-ip`**（Vercel 连接端单值），`x-forwarded-for` 仅作受控兜底（取最左一项）。
- 每个候选值用 `net.isIP` 校验为合法 IPv4/IPv6，且长度 ≤ 45；带端口/协议/多段伪造一律拒绝。
- 全部非法时回退 `unknown`，**不**把未校验的原始头值写入 `RateLimitBucket.ip`。

> **⚠️ 代理头信任边界（残留风险）**：上述头之所以可信，依赖 Vercel 边缘用真实 TCP 连接**覆写**客户端自带的同名头。若部署在非 Vercel、或经未受控代理直连，**禁止**直接信任 `X-Forwarded-For`（客户端可伪造）。本设计的 IP 限流是**反滥用**手段，不是强身份边界；用户维度限流（`subject="user:<uid>"`，P2-3）才是抗「换 IP」的主防线。

### 清理 Cron（P1-2 + P2-4）

Vercel Cron 每日 03:00 UTC 调用 `POST/GET /api/cron/cleanup-rate-limits`（`vercel.json` crons），由 Project Settings → Environment Variables 中的 `CRON_SECRET` 保护；Vercel 自动以 `Authorization: Bearer` 注入，未授权 → 401。删除：

- `RateLimitBucket.expiresAt < now`（过期限流桶）；
- `ActivationCode.expiresAt < now − 保留期`（默认 7 天；仍有效/未过保留期的一律保留）。

返回 `{ rate_limit_buckets_deleted, activation_codes_deleted }`，不暴露数据库错误。

> **信任边界**：上述头之所以可信，是因为 Vercel 边缘**覆写**了客户端自带的同名头。若部署在非 Vercel 或未经可信代理直连，**禁止**直接信任 `X-Forwarded-For`（客户端可伪造），应改用 socket 对端地址或配置可信代理计数。

---

## 12. 隐私字段清单

### 网站保存的 Memory Node 相关数据

| 字段 | 敏感度 | 说明 |
|---|---|---|
| `ActivationCode.codeHash` | 低 | SHA-256，不存明文 |
| `DeviceActivation.deviceId/deviceName/platform/clientVersion` | 低 | deviceId 是随机 UUID，不绑硬件 |
| `DeviceActivation.lastSeenAt` | 低 | 最后刷新时间（可选用于异常检测） |
| `Entitlement.plan/status/expiresAt` | 低 | 权益元数据 |
| `Entitlement.source/metadata` | 中 | 支付渠道/流水号 |
| `RateLimitBucket.ip` | 中 | 限时保留（`expiresAt` 后清理） |

### 网站不保存

记忆正文 / 机构名 / 基金名 / 项目名 / Agent 对话 / 用户文件 / 硬件序列号 / 激活码明文 / 许可证明文。

---

## 13. 路由设计

Memory Node 激活**不放在 `/connect`**。独立路由：

| 路由 | 用途 | 认证 |
|---|---|---|
| `/memory` | 产品介绍 + 状态概览 | 公开 |
| `/memory/setup` | 生成激活码 + 输入引导 + 已激活设备 | Cookie session |
| `/memory/devices` | 设备管理（撤销/重命名） | Cookie session |
| `/connect` | Skill MCP 连接（不变），底部加链接到 `/memory/setup` | Cookie session |

---

## 14. 兼容与版本策略

- **许可证 payload**：当前 `v=2`。结构变更时升 `v`；refresh 检测旧版本 → 返回新版本。
- **密钥轮换**：新 kid + 新客户端（含新公钥 + 保留旧公钥）；新签发用新 kid；旧许可证 exp 后自然失效。
- **API 版本**：路径不含版本号；破坏性变更新增 `/api/activation/v2/`，旧端点保留 6 个月。

---

## 15. 环境变量

| 变量 | 必需 | 说明 |
|---|---|---|
| `MEMORY_LICENSE_PRIVATE_KEY` | ✅ | Ed25519 私钥（PEM） |
| `SESSION_SECRET` | 已有 | Cookie session，与许可证无关 |
| `DATABASE_URL` | 已有 | Neon PostgreSQL |

不新增其他环境变量。激活码用 `crypto.randomBytes`，无需外部密钥。

---

## 16. 已确认的产品决策

| # | 问题 | 决策 |
|---|---|---|
| U1 | Entitlement 初始授予 | 最小 Admin 授权操作（含操作日志）；脚本仅用于最初几个测试账号 |
| U2 | 安装包下载源 | 内测私有 GitHub Releases；开放时迁移阿里云 OSS |
| U3 | Windows 代码签名 | 内测不签名；Public Beta 前完成 |
| U5 | 支付系统选型 | 继续推迟，先验证激活/设备管理；`Entitlement.source` 留接口 |

---

## 17. 未决问题

| # | 问题 | 当前倾向 |
|---|---|---|
| Q1 | `kid` 格式？ | `key-{year}-{month}` |
| Q2 | `RateLimitBucket` 清理方式？ | Vercel Cron（每日 03:00 UTC） |
| Q3 | device_id 卸载重装后保留？ | 不保留；重装即新设备 |
| Q4 | `/memory` 是否需功能介绍？ | 需要 |
| Q5 | Admin 操作日志载体？ | 先写 `Entitlement.metadata` JSON，量大再建表 |
| Q6 | 是否引入滑动窗口限流？ | 否（固定窗口对登录/激活足够） |
| Q7 | 服务端是否对 `lastSeenAt` 做异常检测？ | P2 视风险引入（可选） |

---

## 18. Ed25519 跨语言互操作

### 18.1 Node.js 签发（生产）

```javascript
const crypto = require("crypto");

const privateKey = crypto.createPrivateKey(
  Buffer.from(process.env.MEMORY_LICENSE_PRIVATE_KEY, "utf8")
);
const CURRENT_KID = "key-2026-07";
const THIRTY_DAYS = 30 * 86400;

function issueLicense({ uid, did, ent, entitlementExpiresAt, vmin }) {
  const iat = Math.floor(Date.now() / 1000);
  const expRaw = iat + THIRTY_DAYS;
  const ee = entitlementExpiresAt ? Math.floor(entitlementExpiresAt.getTime() / 1000) : 0;
  const exp = (ee === 0 || ee > expRaw) ? expRaw : ee;
  const ga = (ee === 0) || (ee > expRaw);

  const payload = { v: 2, kid: CURRENT_KID, uid, did, ent, ee, iat, exp, ga, vmin };
  const payloadBytes = Buffer.from(JSON.stringify(payload), "utf8");

  // Ed25519：crypto.sign(null, ...) 返回 raw 64 字节签名。
  // 不要设置 dsaEncoding —— 它只影响 ECDSA/DSA，对 Ed25519 无意义。
  const signature = crypto.sign(null, payloadBytes, privateKey);

  return {
    license: payloadBytes.toString("base64url") + "." + signature.toString("base64url"),
    exp,
  };
}
```

### 18.2 Rust 验证（`ed25519-dalek` 2.x，可编译）

```toml
# Cargo.toml
ed25519-dalek = "2"
base64 = "0.22"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

```rust
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use ed25519_dalek::{Signature, VerifyingKey};
use serde::Deserialize;

// 编译时内置：kid → 32 字节公钥。
// 下方为测试向量公钥（仅测试，绝不上生产）。
const LICENSE_PUBLIC_KEYS: &[(&str, [u8; 32])] = &[
    (
        "key-test-vector",
        [
            0xed, 0xbd, 0x3f, 0x13, 0x67, 0xba, 0xf7, 0x6f,
            0x34, 0xbc, 0x6a, 0x17, 0xa3, 0x2d, 0xed, 0x54,
            0xf2, 0x3a, 0x6f, 0x21, 0x9b, 0xdc, 0x4f, 0xd2,
            0x0d, 0x6c, 0x41, 0x7b, 0xd3, 0x4f, 0x83, 0x93,
        ],
    ),
];

#[derive(Deserialize)]
pub struct LicensePayload {
    pub v: u8,
    pub kid: String,
    pub uid: i64,
    pub did: String,
    pub ent: String,
    pub ee: i64,
    pub iat: i64,
    pub exp: i64,
    pub ga: bool,
    pub vmin: String,
}

#[derive(Debug)]
pub enum LicenseError {
    Malformed,
    UnknownKid,
    BadKey,
    BadSigLen,
    InvalidSignature,
}

/// 验证许可证签名并返回 payload。调用方随后用 effective_now 判定 FULL/GRACE/READ_ONLY。
pub fn verify_license(license: &str) -> Result<LicensePayload, LicenseError> {
    let (payload_b64, sig_b64) = license.split_once('.').ok_or(LicenseError::Malformed)?;

    let payload_bytes = URL_SAFE_NO_PAD
        .decode(payload_b64)
        .map_err(|_| LicenseError::Malformed)?;
    let sig_bytes = URL_SAFE_NO_PAD
        .decode(sig_b64)
        .map_err(|_| LicenseError::Malformed)?;

    // 先解析 payload 以取 kid（验签在原始 payload 字节上进行，不重新序列化）
    let payload: LicensePayload =
        serde_json::from_slice(&payload_bytes).map_err(|_| LicenseError::Malformed)?;

    let pub_bytes = LICENSE_PUBLIC_KEYS
        .iter()
        .find(|(kid, _)| *kid == payload.kid)
        .map(|(_, pk)| *pk)
        .ok_or(LicenseError::UnknownKid)?;

    // ed25519-dalek 2.x API：
    let verifying_key =
        VerifyingKey::from_bytes(&pub_bytes).map_err(|_| LicenseError::BadKey)?;

    let sig_arr: [u8; 64] = sig_bytes
        .as_slice()
        .try_into()
        .map_err(|_| LicenseError::BadSigLen)?;
    let signature = Signature::from_bytes(&sig_arr); // 2.x：接 &[u8;64]，infallible

    // verify_strict 是 VerifyingKey 的 inherent 方法，无需 import Verifier trait
    verifying_key
        .verify_strict(&payload_bytes, &signature)
        .map_err(|_| LicenseError::InvalidSignature)?;

    Ok(payload)
}
```

> 关于 import：仅 `use ed25519_dalek::{Signature, VerifyingKey};`。**不**需要 `Signer`（仅签名侧用）、**不**需要 `Verifier`（`verify_strict` 是 inherent 方法）。

### 18.3 固定互操作测试向量（仅测试夹具，禁止用于生产）

> 以下值由 Node.js `crypto.sign(null, payloadBytes, testPrivateKey)` 生成，自验通过；篡改 payload 任一字节后验签失败。Rust 实现必须能验证通过。

```
kid:                key-test-vector
public key (hex):   edbd3f1367baf76f34bc6a17a32ded54f23a6f219bdc4fd20d6c417bd34f8393
public key [u8;32]: [0xed,0xbd,0x3f,0x13,0x67,0xba,0xf7,0x6f,
                    0x34,0xbc,0x6a,0x17,0xa3,0x2d,0xed,0x54,
                    0xf2,0x3a,0x6f,0x21,0x9b,0xdc,0x4f,0xd2,
                    0x0d,0x6c,0x41,0x7b,0xd3,0x4f,0x83,0x93]

payload JSON（被签名的精确字节）:
{"v":2,"kid":"key-test-vector","uid":42,"did":"550e8400-e29b-41d4-a716-446655440000","ent":"memory-node-pro","ee":0,"iat":1720800000,"exp":1723392000,"ga":true,"vmin":"0.1.0"}

payload base64url:
eyJ2IjoyLCJraWQiOiJrZXktdGVzdC12ZWN0b3IiLCJ1aWQiOjQyLCJkaWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbnQiOiJtZW1vcnktbm9kZS1wcm8iLCJlZSI6MCwiaWF0IjoxNzIwODAwMDAwLCJleHAiOjE3MjMzOTIwMDAsImdhIjp0cnVlLCJ2bWluIjoiMC4xLjAifQ

signature base64url（64 字节 raw）:
D2t_qcgTdHFETLKDQ3XShhuyMD7HCyjtAH5w_tsxgs41VXH3IGJOon4RXFNoq8c-7JMB4OTYSzS2FyzjbsvEBQ

license（payload.sig）:
<上面 payload base64url>.<上面 signature base64url>

test private key PEM（仅 fixtures/nei_license_test_key.pem，禁止上生产）:
-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIJjku/Q96QGT2fmm9Uqf5QDqXHV/tSzZjBP60OKSCDsV
-----END PRIVATE KEY-----
```

**互操作断言（测试用例）**：
1. Node `crypto.sign(null, payloadBytes, testPrivateKey)` 产出上方 signature。
2. Rust `verify_license(license)` 用测试公钥 → `Ok(payload)`，字段全部匹配。
3. 翻转 payload base64url 任一字节 → Rust 返回 `InvalidSignature`。
4. 用错误公钥 → `InvalidSignature`。
5. 签名长度 ≠ 64 字节 → `BadSigLen`。

---

## 19. 网站端 vs Memory Node 端职责分工

| 职责 | 网站 | Memory Node |
|---|---|---|
| 用户注册/登录 | ✅ | ❌ |
| 激活码生成（仅存哈希） | ✅ | ❌ |
| 激活验证 + Ed25519 签发（事务 + Entitlement 锁） | ✅ | ❌ |
| 设备管理（列表/撤销） | ✅ | ❌ |
| 订阅/权益管理 | ✅ | ❌ |
| 客户端版本管理 | ✅ | ❌ |
| 原子限流 | ✅ | ❌ |
| 许可证验签 + FULL/GRACE/READ_ONLY 判定（离线） | ❌ | ✅ |
| 高水位时钟 + 回拨检测 | ❌ | ✅ |
| 记忆存储 | ❌ | ✅ 全部本地 |
| MCP 服务（记忆） | ❌ | ✅（loopback only） |
| MCP 服务（Skill 库） | ✅ | ❌ |
| 数据导出/导入/删除 | ❌ | ✅ |
