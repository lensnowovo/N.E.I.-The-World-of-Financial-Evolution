# Memory Node ↔ Web Integration Contract

日期：2026-07-13（修订 2026-07-14）
状态：待工程评审（v2，含 Ed25519 修订）
作者：GLM-5.2（架构分析）

---

## 1. 方案比较与 ADR

### 背景

网站 `nei-pevc.com` 使用自实现 HMAC cookie session（`lib/session.ts`），不是 OAuth2 Authorization Server。桌面客户端 Memory Node 是 Tauri 应用，不是浏览器，无法直接使用 cookie session。需要一个桥接方案让桌面客户端验证用户身份并获得使用授权。

### 方案 A：OAuth 2.0 Authorization Code + PKCE + loopback redirect

需要构建完整 OAuth2 AS。当前网站只有 OAuth2 client（GitHub）。一人维护成本过高。

**结论**：❌ 否决。

### 方案 B：OAuth 2.0 Device Authorization Grant (RFC 8628)

同样需要 OAuth2 AS。轮询逻辑增加复杂度。

**结论**：❌ 否决。

### 方案 C：一次性激活码 + Ed25519 签名许可证（选定 ✅）

**做法**：
1. 用户在浏览器里正常登录 `nei-pevc.com`（复用现有 cookie session）
2. 网站生成一个 5 分钟有效的一次性激活码（8 位 Crockford Base32，仅存哈希）
3. 用户在桌面应用里粘贴激活码
4. 桌面应用发送 `{ code, device_id, device_name, client_version }` 到 `/api/activation/activate`
5. 网站在**数据库事务**中验证激活码 + 设备数量限制 + 权益状态 + 权益到期时间，返回 **Ed25519 签名**的许可证
6. 桌面应用存储许可证到 Windows Credential Manager
7. 桌面应用使用内置的 **Ed25519 公钥**离线验证许可证签名
8. 许可证有效期 30 天，到期前桌面应用在线刷新
9. 离线场景下，桌面应用在 30 天 + 7 天宽限窗口内凭签名许可证继续运行

### 为什么不用 HMAC（v1 的错误）

v1 文档使用 `HMAC-SHA256(SESSION_SECRET)` 但同时规定客户端不持有密钥也不验证签名——这意味着用户可以直接篡改本地许可证中的 `exp`、`plan`、`entitlement`、`deviceId`，客户端无法判断真伪。离线窗口长达 37 天，攻击者可以反复伪造未来到期时间。

**Ed25519 非对称签名解决了这个问题**：服务端用私钥签名，客户端用公钥验证。私钥永远不进入客户端二进制。攻击者无法伪造签名。

### 关键设计

| 项 | 规格 |
|---|---|
| **签名算法** | Ed25519（RFC 8032） |
| **服务端密钥** | `MEMORY_LICENSE_PRIVATE_KEY`（Ed25519 私钥，PEM 格式，独立于 `SESSION_SECRET`） |
| **客户端公钥** | `MEMORY_LICENSE_PUBLIC_KEY`（编译时硬编码到 Memory Node 二进制） |
| **密钥轮换** | 许可证含 `kid`（key ID），客户端支持多组公钥；轮换时用新 kid 签名，旧许可证过期后自然失效 |
| **Node.js 签名** | `crypto.sign(null, payload, { key: privateKey, dsaEncoding: 'ieee-p1363' })` |
| **Rust 验证** | `ed25519-dalek` crate，`VerifyingKey::verify_strict()` |

### 为什么选这个（总结）

- ✅ 不需要构建 OAuth2 AS
- ✅ 复用现有 cookie session 验证用户身份
- ✅ Ed25519 签名可离线验证（客户端只持公钥，私钥永远在服务端）
- ✅ 设备数量限制（3 台）在服务端事务中强制
- ✅ 一人维护友好，逻辑清晰可审计
- ✅ `kid` 为未来密钥轮换留接口

---

## 2. 信任边界与威胁模型

```
┌─────────────────────────────────┐     ┌──────────────────────────────┐
│  nei-pevc.com (Vercel)          │     │  Memory Node (本地 Tauri)     │
│                                 │     │                                │
│  持有：                          │     │  持有：                         │
│  · SESSION_SECRET (cookie)      │     │  · Ed25519 公钥（编译内置）     │
│  · MEMORY_LICENSE_PRIVATE_KEY   │     │  · 许可证（Ed25519 签名）       │
│    (Ed25519 私钥)               │     │  · 记忆正文（SQLite）           │
│                                 │     │                                │
│  签发：                          │     │  验证：                         │
│  用私钥签名许可证 ──────────────│───→│  用公钥验证签名 ✅              │
│                                 │     │  篡改任何字段 → 签名失效 ❌     │
│  保存（DB）：                    │     │                                │
│  · codeHash (SHA-256)           │     │  不持有：                       │
│  · 设备列表/状态                 │     │  · 私钥 ❌                      │
│  · entitlement                  │     │  · SESSION_SECRET ❌            │
│  · ReleaseManifest              │     │                                │
│                                 │     │  不上传：                       │
│  不保存：                        │     │  · 记忆正文 → 网站 ❌           │
│  · 记忆正文 ❌                   │     │  · 机构/基金/项目名 ❌          │
│  · 机构/基金/项目名 ❌            │     │                                │
│  · Agent 对话 ❌                 │     │                                │
└─────────────────────────────────┘     └──────────────────────────────┘
```

### 威胁清单

| # | 威胁 | 缓解 | 位置 |
|---|---|---|---|
| T1 | 激活码被截获重放 | 5 分钟过期 + 单次使用 + 绑定 userId + 仅存哈希 | `/api/activation/activate` 事务 |
| T2 | **伪造/篡改许可证** | **Ed25519 签名**：客户端用内置公钥离线验证签名；篡改任何字段（exp/plan/did）→ 签名验证失败 | 客户端 `ed25519-dalek` |
| T3 | 超过 3 台设备同时使用 | 服务端事务中 `count(active DeviceActivation)` + 激活原子操作 | `/api/activation/activate` 事务 |
| T4 | 共享激活码给多人 | 激活码绑定生成时的 userId，激活后 deviceId 绑定该 userId | ActivationCode.userId |
| T5 | 离线破解修改系统时钟 | 许可证含签发的 `iat`（Ed25519 签名保护）；客户端允许 7 天时钟偏差；超过 37 天强制在线刷新 | 客户端时钟策略 |
| T6 | 订阅到期后继续使用 | 许可证 `exp` 由 Ed25519 签名保护不可篡改；超过窗口后降级为只读模式 | 客户端降级逻辑 |
| T7 | 服务器故障时阻断所有用户 | 37 天离线窗口（fail-open 在窗口内）；超过窗口 fail-closed（降级为只读） | 降级边界 |
| T8 | 撤销设备后继续使用 | 撤销阻止 refresh 和 MCP Skill 库访问；本地记忆数据不受影响（不远程删数据） | `/api/activation/refresh` |
| T9 | 旧版本客户端有安全漏洞 | ReleaseManifest.minVersion；激活时拒绝低于最低版本 | `/api/activation/activate` |
| T10 | 暴力枚举激活码 | 8 位 Crockford Base32（~40 bit）+ 持久限流（DB 表，每 IP 10 次/分钟） | `ActivationAttempt` 表 |
| T11 | 并发请求突破设备限制 | 激活全流程在单个 DB 事务中（验证码→消耗码→检查设备数→创建设备→签发许可证） | `$transaction` |
| T12 | 被撤销设备重新激活不检查名额 | 激活时检查的是 `status = 'active'` 的设备数；已撤销设备重新激活仍占名额 | activate 事务逻辑 |

---

## 3. 完整时序图

### 3a. 首次激活流程

```
用户        浏览器(nei-pevc.com)     桌面应用(Memory Node)
 │              │                        │
 │──登录────────→│                        │
 │              │ (setSession cookie)     │
 │              │                        │
 │──访问        │                        │
 │  /memory/    │                        │
 │  setup       │                        │
 │              │                        │
 │──点击"生成   │                        │
 │  激活码"     │                        │
 │              │                        │
 │              │──生成激活码──→          │
 │              │  code = 8位Base32      │
 │              │  codeHash = SHA-256    │
 │              │  存 DB(codeHash only)  │
 │←─显示码──────│                        │
 │  A1B2C3D4 (5min)                     │
 │  (明文只显示一次)                     │
 │              │                        │
 │──手动输入码──→────────────────────────│
 │              │                        │
 │              │            桌面应用发送 │
 │              │        POST /api/activation/activate
 │              │        { code, device_id, device_name, version }
 │              │←───────────────────────│
 │              │                        │
 │              │ ╔═══════ DB TRANSACTION ═══════╗
 │              │ ║ 1. hash(code) 查 ActivationCode ║
 │              │ ║    → exists + 未过期 + 未消费    ║
 │              │ ║ 2. client_version ≥ minVersion  ║
 │              │ ║ 3. Entitlement: status=active   ║
 │              │ ║    AND (expiresAt IS NULL       ║
 │              │ ║         OR expiresAt > now)     ║
 │              │ ║ 4. count(active devices) < 3   ║
 │              │ ║    (被撤销设备重新激活也占名额)  ║
 │              │ ║ 5. 消费激活码(consumedAt=now)  ║
 │              │ ║ 6. upsert DeviceActivation     ║
 │              │ ║ 7. Ed25519 签名许可证           ║
 │              │ ╚════════════════════════════════╝
 │              │                        │
 │              │──返回许可证────────────→│
 │              │  { license, expires_at }│
 │              │  (Ed25519 signed)       │
 │              │                        │
 │              │            桌面应用用   │
 │              │            内置公钥验证 │
 │              │            签名 ✅       │
 │              │            存储到       │
 │              │            Credential   │
 │              │            Manager      │
 │              │                        │
 │              │            启动 Memory  │
 │              │            Node 服务    │
```

### 3b. 在线刷新流程（许可证过期前 5 天内）

```
桌面应用                nei-pevc.com
    │                       │
    │ POST /api/activation/refresh
    │ { license: "当前许可证", device_id }│
    │─────────────────────→│
    │                       │
    │         验证 Ed25519 签名 │
    │         · 签名有效       │
    │         · 设备未撤销     │
    │         · Entitlement    │
    │           status=active  │
    │           AND 未过期     │
    │         · 更新 lastSeen  │
    │                       │
    │←────新许可证──────────│
    │ { license, expires_at }│
    │ (重新 Ed25519 签名)     │
    │                       │
    │ 替换 Credential Manager│
    │ 中的旧许可证           │
```

### 3c. 离线超时降级流程

```
桌面应用(离线 30+ 天)
    │
    │ 检测到许可证过期
    │ + 无法连接 nei-pevc.com
    │
    ├─→ 进入"只读模式"
    │   · 可查看已有记忆
    │   · 可导出全部数据
    │   · 可删除本地数据
    │   · ❌ 不能写入新记忆
    │   · ❌ 不能创建新会话
    │   · 提示用户："请联网刷新授权"
    │
    │ 用户联网后
    │
    ├─→ 自动尝试 refresh
    │   · 成功 → 恢复全部功能
    │   · entitlement 已过期 → 提示续费
    │   · 设备被撤销 → 提示重新激活
```

---

## 4. 服务端数据模型草案

### 新增 Prisma 模型

```prisma
// ---------- 激活码（一次性，5 分钟有效，仅存哈希）----------
model ActivationCode {
  id            Int       @id @default(autoincrement())
  codeHash      String    @unique           // SHA-256(code)，不存明文
  userId        Int
  createdAt     DateTime  @default(now())
  expiresAt     DateTime                    // createdAt + 5min
  consumedAt    DateTime?                   // 激活时间；null = 未使用
  deviceId      String?                     // 消费该码的设备

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([codeHash])
  @@index([userId])
}

// ---------- 设备激活记录 ----------
model DeviceActivation {
  id            Int       @id @default(autoincrement())
  userId        Int
  deviceId      String                     // 客户端生成的 UUID v4
  deviceName    String                     // 用户可读名，如 "我的笔记本"
  platform      String                     // "windows" | "macos"
  clientVersion String                     // "0.1.0"
  status        String    @default("active") // active | revoked
  activatedAt   DateTime  @default(now())
  lastSeenAt    DateTime  @default(now())
  revokedAt     DateTime?
  revokeReason  String?                    // user_revoke | limit_exceeded | subscription_expired

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, deviceId])
  @@index([userId])
}

// ---------- 订阅权益 ----------
// 解耦设计：source 字段留支付供应商接口
model Entitlement {
  id          Int       @id @default(autoincrement())
  userId      Int       @unique
  plan        String    @default("free")   // free | memory-node-pro | memory-node-team
  status      String    @default("active")  // active | expired | cancelled | suspended
  startedAt   DateTime  @default(now())
  expiresAt   DateTime?                    // null = 无到期日
  source      String?                      // "manual" | "stripe" | "alipay"
  metadata    String?                      // JSON：支付流水号等
  updatedAt   DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ---------- 客户端发布清单 ----------
model ReleaseManifest {
  id              Int       @id @default(autoincrement())
  product         String                       // "memory-node"
  version         String                       // semver: "0.1.0"
  platform        String                       // "windows" | "macos"
  downloadUrl     String
  sha256          String
  minVersion      String?                      // 允许连接的最低版本
  releaseNotes    String?
  isLatest        Boolean   @default(false)
  publishedAt     DateTime  @default(now())

  @@index([product, platform, isLatest])
}

// ---------- 激活尝试记录（持久限流）----------
// 替代内存限流（Vercel 多实例下不可靠）
model ActivationAttempt {
  id          Int      @id @default(autoincrement())
  ip          String
  endpoint    String                      // "code" | "activate" | "refresh"
  createdAt   DateTime @default(now())

  @@index([ip, endpoint, createdAt])
}
```

### User 模型新增 relation

```prisma
// 在现有 User model 中添加：
activationCodes  ActivationCode[]
deviceActivations DeviceActivation[]
entitlement      Entitlement?
```

### 与现有模型的关系

| 现有模型 | 关系 |
|---|---|
| `User` | 1:N DeviceActivation, 1:1 Entitlement, 1:N ActivationCode |
| `UserConsent` | 不变 |
| MCP Token (`User.mcpTokenHash`) | 独立于 Memory Node 激活 |

---

## 5. HTTP 端点规格

### 5.1 `POST /api/activation/code`

生成一次性激活码。需要网站 cookie session。

**认证**：Cookie session（`getSessionUid`）

**限流**：持久限流（`ActivationAttempt` 表），同 IP 60 秒 3 次。

**请求**：无 body

**响应 200**：
```json
{
  "code": "A1B2C3D4",
  "expires_in": 300
}
```

**错误**：
| 状态码 | 错误码 | 场景 |
|---|---|---|
| 401 | `UNAUTHORIZED` | 未登录 |
| 429 | `RATE_LIMITED` | 超限 |

**实现要点**：
- 生成 8 位 Crockford Base32 随机码（~40 bit 熵）
- 计算 `codeHash = SHA-256(code)`
- 存 ActivationCode（只存 codeHash，不存明文）
- 明文 code 只在响应中返回一次

---

### 5.2 `POST /api/activation/activate`

用激活码换取许可证。**不需要 cookie session**。

**限流**：持久限流，同 IP 60 秒 10 次。

**请求**：
```json
{
  "code": "A1B2C3D4",
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "device_name": "我的笔记本",
  "platform": "windows",
  "client_version": "0.1.0"
}
```

**响应 200**：
```json
{
  "license": "<base64-Ed25519-signed-payload>",
  "expires_at": "2026-08-13T10:00:00Z",
  "user": {
    "nickname": "清流VC合伙人",
    "plan": "memory-node-pro"
  }
}
```

**错误**：
| 状态码 | 错误码 | 场景 |
|---|---|---|
| 400 | `INVALID_CODE` | 激活码哈希不匹配 |
| 400 | `CODE_EXPIRED` | 超过 5 分钟 |
| 400 | `CODE_CONSUMED` | 已使用 |
| 403 | `DEVICE_LIMIT_EXCEEDED` | 已有 3 台 active 设备 |
| 403 | `NO_ENTITLEMENT` | 无 Memory Node 权益 |
| 403 | `ENTITLEMENT_EXPIRED` | Entitlement.status != 'active' 或 expiresAt ≤ now |
| 403 | `CLIENT_TOO_OLD` | client_version < minVersion |
| 429 | `RATE_LIMITED` | 超限 |

**核心验证（全部在单个 `prisma.$transaction` 中）**：

```
BEGIN TRANSACTION

1. codeHash = SHA-256(body.code)
2. row = SELECT ActivationCode WHERE codeHash = codeHash FOR UPDATE
3. if !row → INVALID_CODE
4. if row.expiresAt < now → CODE_EXPIRED
5. if row.consumedAt != null → CODE_CONSUMED

6. release = SELECT ReleaseManifest WHERE isLatest = true AND platform = body.platform
7. if body.client_version < release.minVersion → CLIENT_TOO_OLD

8. ent = SELECT Entitlement WHERE userId = row.userId
9. if !ent || ent.plan NOT IN ('memory-node-pro','memory-node-team') → NO_ENTITLEMENT
10. if ent.status != 'active' → ENTITLEMENT_EXPIRED
11. if ent.expiresAt IS NOT NULL AND ent.expiresAt <= now → ENTITLEMENT_EXPIRED

12. activeCount = SELECT COUNT(*) FROM DeviceActivation
      WHERE userId = row.userId AND status = 'active'
      AND deviceId != body.device_id   -- 排除自身：已 active 的设备刷新时不重复计数
13. if activeCount >= 3 → DEVICE_LIMIT_EXCEEDED
    注意：被撤销设备重新激活时，因 status != 'active' 已不在计数中，
    所以会按剩余 active 设备数检查名额——重新激活不会豁免设备上限。

14. UPDATE ActivationCode SET consumedAt = now, deviceId = body.device_id
15. UPSERT DeviceActivation SET status = 'active', lastSeenAt = now, ...

16. license = Ed25519_sign(payload, MEMORY_LICENSE_PRIVATE_KEY)

COMMIT
```

---

### 5.3 `POST /api/activation/refresh`

刷新即将过期的许可证。

**限流**：持久限流，同 IP 60 秒 30 次。

**请求**：
```json
{
  "license": "<base64-Ed25519-signed-payload>",
  "device_id": "550e8400-..."
}
```

**响应 200**：
```json
{
  "license": "<new-base64-Ed25519-signed-payload>",
  "expires_at": "2026-09-12T10:00:00Z"
}
```

**错误**：
| 状态码 | 错误码 | 场景 |
|---|---|---|
| 400 | `INVALID_LICENSE` | Ed25519 签名验证失败 |
| 403 | `DEVICE_REVOKED` | 设备已被撤销 |
| 403 | `ENTITLEMENT_EXPIRED` | 订阅已过期 |
| 403 | `CLIENT_TOO_OLD` | 版本过低 |

**服务端验证流程**：
1. Ed25519 验证签名（用公钥或根据 kid 选择对应公钥）
2. 解析 payload → uid, did, ent, exp, vmin
3. 查 DeviceActivation where `{ userId: uid, deviceId: did }`
4. 设备 status != 'active' → DEVICE_REVOKED
5. Entitlement status != 'active' 或过期 → ENTITLEMENT_EXPIRED
6. 通过 → 更新 lastSeenAt + 签发新许可证

---

### 5.4 `GET /api/activation/devices`

列出用户所有设备。

**认证**：Cookie session

**响应 200**：
```json
{
  "devices": [
    {
      "device_id": "550e8400-...",
      "device_name": "办公台式机",
      "platform": "windows",
      "client_version": "0.1.0",
      "status": "active",
      "activated_at": "2026-07-13T10:00:00Z",
      "last_seen_at": "2026-08-10T15:30:00Z"
    }
  ],
  "limit": 3
}
```

---

### 5.5 `DELETE /api/activation/devices/:id`

撤销设备。

**认证**：Cookie session

**行为**：
- 设 `status = 'revoked'`, `revokedAt = now()`, `revokeReason = 'user_revoke'`
- **不删除任何本地数据**
- 被撤销的设备下次 refresh 时收到 `DEVICE_REVOKED`
- 被撤销的设备释放名额（active count -1），允许激活新设备

---

### 5.6 `GET /api/releases/memory-node/latest?platform=windows`

获取最新客户端版本信息。

**认证**：无（公开）

**响应 200**：
```json
{
  "version": "0.1.0",
  "platform": "windows",
  "download_url": "https://...",
  "sha256": "abc123...",
  "min_version": "0.0.1",
  "release_notes": "首个内测版本"
}
```

---

## 6. 许可证载荷规格（Ed25519）

### 载荷结构

```json
{
  "v": 1,
  "kid": "key-2026-07",
  "uid": 42,
  "did": "550e8400-e29b-41d4-a716-446655440000",
  "ent": "memory-node-pro",
  "iat": 1720800000,
  "exp": 1723392000,
  "vmin": "0.1.0"
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `v` | int | 许可证格式版本，当前 1 |
| `kid` | string | 签名密钥 ID，用于密钥轮换。客户端按 kid 查找对应公钥 |
| `uid` | int | nei-pevc.com 用户 ID |
| `did` | string | 设备 UUID |
| `ent` | string | 权益计划 |
| `iat` | unix ts | 签发时间（秒） |
| `exp` | unix ts | 过期时间（秒），= iat + 30 天 |
| `vmin` | string | 签发时的最低客户端版本 |

### 签名方式（Ed25519）

**服务端签发**（Node.js）：
```javascript
const crypto = require('crypto');
const payload = Buffer.from(JSON.stringify(licenseObject), 'utf8');
const signature = crypto.sign(null, payload, {
  key: process.env.MEMORY_LICENSE_PRIVATE_KEY, // Ed25519 PEM
  dsaEncoding: 'ieee-p1363',                   // RFC 8032 raw format
});
const license = payload.toString('base64url') + '.' + signature.toString('base64url');
```

**客户端验证**（Rust, `ed25519-dalek`）：
```rust
use ed25519_dalek::{VerifyingKey, Signer, Verifier};

// 公钥编译时内置，按 kid 选择
let pubkey = PUBKEYS.get(&license.kid)?;
let payload_bytes = base64url_decode(payload_str)?;
let sig_bytes = base64url_decode(sig_str)?;
let verifying_key = VerifyingKey::from_bytes(&pubkey)?;
verifying_key.verify(&payload_bytes, &Signature::from_bytes(&sig_bytes)?)?;
// 签名验证通过后，解析 payload JSON 并检查 exp
```

### 密钥管理

| 项 | 说明 |
|---|---|
| 密钥对生成 | `openssl genpkey -algorithm ED25519 -out private.pem`；`openssl pkey -in private.pem -pubout -out public.pem` |
| 服务端存储 | Vercel env: `MEMORY_LICENSE_PRIVATE_KEY`（PEM 格式） |
| 客户端内置 | Memory Node 编译时嵌入 `LICENSE_PUBLIC_KEYS: { "key-2026-07": [32 bytes] }` |
| 密钥轮换 | 生成新密钥对 → 新 Vercel env + 新客户端版本（内置新公钥）→ 新签发的许可证用新 kid → 旧许可证自然过期 |
| 不复用 | **不使用 SESSION_SECRET**（cookie session 密钥与许可证密钥完全独立） |

### 客户端验证策略

桌面应用收到许可证后：

1. 拆分 `payload.signature`
2. 按 `payload.kid` 查找对应公钥
3. **Ed25519 验证签名**（`ed25519_dalek::verify_strict`）→ 签名不对则拒绝
4. 检查 `did === 本机 device_id`
5. 检查 `exp + 604800(7天宽限) > now()`
6. 如果 `exp < now()` 且在宽限期内 → 全功能 + 提示联网刷新
7. 如果 `exp + 604800 < now()` → 只读模式

**关键变化（vs v1）**：客户端**必须**验证 Ed25519 签名。篡改 payload 中任何字节都会导致签名验证失败。攻击者没有私钥，无法伪造有效许可证。

---

## 7. 稳定错误码

| 错误码 | HTTP | 含义 | 客户端行为 |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | 需要 cookie session | 不适用（桌面端不用 cookie） |
| `INVALID_CODE` | 400 | 激活码哈希不匹配 | 提示用户检查输入 |
| `CODE_EXPIRED` | 400 | 超过 5 分钟 | 提示用户重新生成 |
| `CODE_CONSUMED` | 400 | 已使用 | 提示用户重新生成 |
| `DEVICE_LIMIT_EXCEEDED` | 403 | 超过 3 台 active 设备 | 提示用户在网站撤销旧设备 |
| `NO_ENTITLEMENT` | 403 | 无 Memory Node 权益 | 引导到购买/联系管理员 |
| `ENTITLEMENT_EXPIRED` | 403 | Entitlement.status != active 或 expiresAt ≤ now | 引导续费 |
| `CLIENT_TOO_OLD` | 403 | 版本过低 | 强制升级 |
| `DEVICE_REVOKED` | 403 | 设备被撤销 | 引导重新激活 |
| `INVALID_LICENSE` | 400 | Ed25519 签名验证失败 | 引导重新激活 |
| `RATE_LIMITED` | 429 | 超限 | 客户端退避重试 |

---

## 8. 设备与许可证状态机

### 设备状态机

```
              activate()
  [none] ────────────────→ [active] ←─── 重新激活(仍检查名额)
                             │
                    revoke() │
                             ↓
                         [revoked]
                             │
                     重新激活 │
                     (需要 active 设备 < 3，
                      即使本设备之前被撤销)
                             ↓
                         [active]
```

### 许可证客户端状态机

```
  [valid] ──── exp 接近(5天内) 且可联网 ──→ [refreshing] ──→ [valid]
     │                                                        ↑
     │ exp 过期 + 可联网                                       │
     ↓                                                        │
  [grace](7天宽限) ──── 联网成功 ──────────────────────────────┘
     │
     │ grace 过期 或 离线 > 37天
     ↓
  [read_only] ──── 联网成功 + entitlement 有效 ──→ [valid]
     │
     │ 联网成功 + entitlement 过期
     ↓
  [expired] ──── 续费 ──→ [valid]
```

---

## 9. 离线许可与时钟策略

### 30 天 + 7 天宽限

许可证 `exp = iat + 2592000`（30 天）。Ed25519 签名保护 `iat` 和 `exp` 不可篡改。客户端在 `exp + 604800`（7天）内仍可全功能使用，超过后进入只读。

### 时钟回拨防护

| 时钟状态 | 客户端行为 |
|---|---|
| 系统时间 > exp + 7 天 | 只读模式 |
| 系统时间 ∈ [exp, exp+7天] | 全功能 + 提示刷新 |
| 系统时间 < iat | 以 iat 为基准计算窗口（Ed25519 签名保护 iat 不可篡改） |
| 系统时间正常 | 正常 |

### Fail-safe / Fail-closed 边界

| 场景 | 行为 | 策略 |
|---|---|---|
| 离线 < 30 天 | 全功能 | Fail-open |
| 离线 30-37 天 | 全功能 + 提示刷新 | Fail-open |
| 离线 > 37 天 | 只读（可查看/导出/删除） | Fail-closed |
| 订阅过期 + 离线 | 只读 | Fail-closed |
| 设备被撤销 + 离线 | 只读 | Fail-closed |
| 永远不联网 | 37 天后降级为只读，数据不丢 | 保护用户数据 |

**关键原则**：降级永远不删除数据。用户始终可以查看、导出和删除本地记忆。

---

## 10. Release Manifest Schema

```json
{
  "product": "memory-node",
  "version": "0.1.0",
  "platform": "windows",
  "download_url": "https://github.com/lensnowovo/nei-memory-node/releases/download/v0.1.0/MemoryNode-Setup-0.1.0.exe",
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "min_version": "0.0.1",
  "release_notes": "首个内测版本",
  "is_latest": true,
  "published_at": "2026-07-13T10:00:00Z"
}
```

下载源：内测阶段使用**私有 GitHub Releases**；向非仓库成员开放时迁移到阿里云 OSS。

客户端在以下时机检查更新：
1. 启动时
2. 每 24 小时
3. 激活/刷新许可证时

---

## 11. 限流策略（持久化）

Vercel 多实例下内存限流不可靠。使用数据库表 `ActivationAttempt` 做持久限流。

### 限流逻辑

```typescript
function checkRateLimit(ip: string, endpoint: string, limit: number, windowMs: number): boolean {
  const since = new Date(Date.now() - windowMs);
  const count = await prisma.activationAttempt.count({
    where: { ip, endpoint, createdAt: { gte: since } }
  });
  if (count >= limit) return false; // 超限

  await prisma.activationAttempt.create({ data: { ip, endpoint } });
  return true; // 放行
}

// 定期清理（Vercel Cron 每 10 分钟）
// DELETE FROM ActivationAttempt WHERE createdAt < now() - 1 hour
```

### 限流配置

| 端点 | 限制 | 窗口 |
|---|---|---|
| `POST /api/activation/code` | 3 次 | 60 秒 |
| `POST /api/activation/activate` | 10 次 | 60 秒 |
| `POST /api/activation/refresh` | 30 次 | 60 秒 |

**重要**：限流必须**与激活 API 同时上线**，不能推迟到最后一个"安全加固"PR。

---

## 12. 隐私字段清单

### 网站保存的 Memory Node 相关数据

| 字段 | 来源 | 敏感度 | 说明 |
|---|---|---|---|
| `ActivationCode.codeHash` | 服务端 SHA-256 | 低 | 不存明文 |
| `DeviceActivation.deviceId` | 客户端 UUID v4 | 低 | 随机生成，不绑硬件 |
| `DeviceActivation.deviceName` | 用户输入 | 低 | 如"我的笔记本" |
| `DeviceActivation.platform` | 客户端 | 无 | "windows" |
| `DeviceActivation.clientVersion` | 客户端 | 无 | "0.1.0" |
| `DeviceActivation.lastSeenAt` | 服务端 | 低 | 最后刷新时间 |
| `Entitlement.plan` | 管理/支付 | 低 | "memory-node-pro" |
| `Entitlement.source` | 支付供应商 | 中 | 支付渠道标识 |
| `Entitlement.metadata` | 支付供应商 | 中 | 流水号等 |
| `ActivationAttempt.ip` | 请求 | 中 | 限时保留（1 小时后清理） |

### 网站不保存的数据

| 数据 | 原因 |
|---|---|
| 记忆正文 | 产品约束 |
| 机构名/基金名/项目名 | 产品约束 |
| Agent 对话 | 产品约束 |
| 用户文件/BP | 产品约束 |
| 硬件序列号/MAC | 隐私：deviceId 是随机 UUID |
| 激活码明文 | 安全：只存 SHA-256 |
| 许可证明文 | 不存（每次签发新许可证） |

---

## 13. 路由设计

Memory Node 激活**不放在 `/connect`**（Skill MCP 连接页）。使用独立路由：

| 路由 | 用途 | 认证 |
|---|---|---|
| `/memory` | Memory Node 产品介绍 + 状态概览 | 公开 |
| `/memory/setup` | 生成激活码 + 输入引导 + 已激活设备列表 | Cookie session |
| `/memory/devices` | 设备管理（撤销/重命名） | Cookie session |
| `/connect` | Skill MCP 连接（不变），底部加链接到 `/memory/setup` | Cookie session |

---

## 14. 兼容与版本策略

### 许可证格式版本

当前 `v: 1`。未来结构变更：新版本与旧版本共存；refresh 检测旧版本 → 返回新版本。

### 密钥轮换

1. 生成新 Ed25519 密钥对（新 kid: `key-2027-01`）
2. 更新 Vercel env: `MEMORY_LICENSE_PRIVATE_KEY`
3. 发布新客户端版本（内置新公钥 + 保留旧公钥）
4. 新签发的许可证用新 kid
5. 旧许可证（旧 kid）在 exp 后自然失效
6. 客户端同时持有新旧公钥，可验证两种许可证

### API 版本策略

所有激活 API 路径不含版本号。破坏性变更时新增 `/api/activation/v2/`，旧端点保留 6 个月。

---

## 15. 环境变量

| 变量 | 必需 | 说明 |
|---|---|---|
| `MEMORY_LICENSE_PRIVATE_KEY` | ✅ | Ed25519 私钥（PEM 格式）。`openssl genpkey -algorithm ED25519` 生成 |
| `SESSION_SECRET` | 已有 | Cookie session 用，与许可证无关 |
| `DATABASE_URL` | 已有 | Neon PostgreSQL |

**不新增其他环境变量**。激活码用 `crypto.randomBytes` 生成，无需外部密钥。

---

## 16. 已确认的产品决策

| # | 问题 | 决策 | 决策者 |
|---|---|---|---|
| U1 | Entitlement 初始授予方式 | 做最小 Admin 授权操作（含操作日志）；脚本仅用于最初几个测试账号 | 用户 |
| U2 | 安装包下载源 | 内测用私有 GitHub Releases；开放给非成员时迁移到阿里云 OSS | 用户 |
| U3 | Windows 代码签名 | 内测不签名；Public Beta 前完成签名 | 用户 |
| U5 | 支付系统选型 | 继续推迟，先验证激活和设备管理 | 用户 |

---

## 17. 未决问题

| # | 问题 | 当前倾向 |
|---|---|---|
| Q1 | 许可证 `kid` 的具体值格式？ | `key-{year}-{month}`（如 `key-2026-07`） |
| Q2 | ActivationAttempt 清理用 Vercel Cron 还是 TTL？ | Vercel Cron（每 10 分钟，免费版够用） |
| Q3 | 客户端 device_id 在卸载重装后是否保留？ | 不保留（卸载即清除 Credential Manager）；重装后是新设备 |
| Q4 | `/memory` 页是否需要展示 Memory Node 的功能介绍？ | 需要（让非 Memory Node 用户了解产品） |

---

## 18. 网站端 vs Memory Node 端职责分工

| 职责 | 网站 | Memory Node |
|---|---|---|
| 用户注册/登录 | ✅ | ❌ |
| 激活码生成（仅存哈希） | ✅ | ❌ |
| 激活码验证 + Ed25519 许可证签发 | ✅（事务） | ❌ |
| 设备管理（列表/撤销） | ✅ | ❌（只读自己的 deviceId） |
| 订阅/权益管理 | ✅ | ❌ |
| 客户端版本管理 | ✅ | ❌（只检查） |
| 持久限流 | ✅ | ❌ |
| 许可证签名验证（离线） | ❌ | ✅（Ed25519 公钥） |
| 记忆存储 | ❌ | ✅ 全部本地 |
| MCP 服务（记忆） | ❌ | ✅（loopback only） |
| MCP 服务（Skill 库） | ✅ | ❌ |
| 数据导出/导入/删除 | ❌ | ✅ |
