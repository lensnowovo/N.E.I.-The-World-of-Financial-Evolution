# Memory Node ↔ Web Integration Contract

日期：2026-07-13
状态：待工程评审
作者：GLM-5.2（架构分析）

---

## 1. 方案比较与 ADR

### 背景

网站 `nei-pevc.com` 使用自实现 HMAC cookie session（`lib/session.ts`），不是 OAuth2 Authorization Server。桌面客户端 Memory Node 是 Tauri 应用，不是浏览器，无法直接使用 cookie session。需要一个桥接方案让桌面客户端验证用户身份并获得使用授权。

### 方案 A：OAuth 2.0 Authorization Code + PKCE + loopback redirect

**做法**：在网站上构建 OAuth2 AS，桌面应用通过 loopback redirect 拿到 authorization code → 换 access_token + refresh_token。

**评估**：
- 需要新增 `/api/oauth/authorize`、`/api/oauth/token`、`/api/oauth/revoke` 等端点
- 需要实现 client registration、scope 管理、token introspection
- 当前网站只有 OAuth2 **client**（GitHub），没有 AS 能力
- 一人维护的早期产品构建完整 AS 成本过高

**结论**：❌ 否决。架构复杂度不匹配当前阶段。

### 方案 B：OAuth 2.0 Device Authorization Grant (RFC 8628)

**做法**：桌面应用显示一个 code，用户在浏览器里打开 `nei-pevc.com/device` 输入 code 授权，桌面应用轮询拿 token。

**评估**：
- 同样需要 OAuth2 AS
- UX 适合无浏览器设备（TV/IoT），桌面应用可以直接打开浏览器
- 轮询逻辑增加复杂度

**结论**：❌ 否决。基础设施依赖同方案 A。

### 方案 C：一次性激活码 + HMAC 签名许可证（选定 ✅）

**做法**：
1. 用户在浏览器里正常登录 `nei-pevc.com`（复用现有 cookie session）
2. 网站生成一个 5 分钟有效的一次性激活码（`NEI-XXXX-XXXX` 格式）
3. 用户在桌面应用里粘贴激活码
4. 桌面应用发送 `{ code, device_id, device_name, client_version }` 到 `/api/activation/activate`
5. 网站验证激活码关联的 userId + 设备数量限制，返回 HMAC 签名的许可证
6. 桌面应用存储许可证到 Windows Credential Manager
7. 许可证有效期 30 天，到期前桌面应用在线刷新
8. 离线场景下，桌面应用在 30 天窗口内凭签名许可证继续运行

**为什么选这个**：
- ✅ 不需要构建 OAuth2 AS
- ✅ 复用现有 cookie session 验证用户身份
- ✅ HMAC 签名许可证可离线验证（用 SESSION_SECRET 签名，客户端只需要验证签名格式和时间窗口，不持有 secret）
- ✅ 设备数量限制（3 台）在服务端强制
- ✅ 一人维护友好，逻辑清晰可审计
- ✅ 未来可以平滑升级到 OAuth2（许可证格式向后兼容）

**关键安全设计**：许可证用网站的 `SESSION_SECRET` 做 HMAC-SHA256 签名。桌面应用**不持有** `SESSION_SECRET`——它只验证许可证结构完整（签名存在 + 未过期 + 格式正确），签名验证的权威性由在线刷新保证（每次联网都和网站确认许可证有效）。

---

## 2. 信任边界与威胁模型

```
┌─────────────────────────────────┐     ┌──────────────────────────────┐
│  nei-pevc.com (Vercel)          │     │  Memory Node (本地 Tauri)     │
│  ┌───────────────────┐          │     │  ┌────────────────────┐       │
│  │ Cookie Session    │←─用户登录─│     │  │ Activation License │       │
│  │ (HMAC signed)     │          │     │  │ (HMAC signed)      │       │
│  ├───────────────────┤          │     │  ├────────────────────┤       │
│  │ ActivationCode    │←─激活码──│     │  │ Credential Manager  │       │
│  │ DeviceActivation  │  交换     │     │  │ (Windows)           │       │
│  │ Entitlement       │  许可证──│───→│  ├────────────────────┤       │
│  │ ReleaseManifest   │          │     │  │ SQLite (记忆正文)   │       │
│  └───────────────────┘          │     │  │ ← 永不上传          │       │
│                                 │     │  └────────────────────┘       │
│  网站只保存：                    │     │  本地只保存：                  │
│  · userId → 设备列表             │     │  · 许可证（HMAC）              │
│  · entitlement 状态              │     │  · 记忆正文                    │
│  · 客户端版本                    │     │  · 机构/基金/项目              │
│  · 设备状态（active/revoked）    │     │  · Agent 会话                  │
│                                 │     │                                │
│  网站不保存：                    │     │  本地不上传：                  │
│  · 记忆正文 ❌                   │     │  · 记忆正文 → 网站 ❌           │
│  · 机构名/基金名/项目名 ❌        │     │  · 机构名/基金名 → 网站 ❌      │
│  · Agent 对话 ❌                 │     │                                │
└─────────────────────────────────┘     └──────────────────────────────┘
```

### 威胁清单

| # | 威胁 | 缓解 | 位置 |
|---|---|---|---|
| T1 | 激活码被截获重放 | 5 分钟过期 + 单次使用 + 绑定 userId | `/api/activation/activate` |
| T2 | 伪造许可证绕过订阅 | HMAC 签名（SESSION_SECRET），客户端不持有密钥 | 客户端验证 + 在线刷新 |
| T3 | 超过 3 台设备同时使用 | 服务端 `DeviceActivation` count + 新激活时检查 | `/api/activation/activate` |
| T4 | 共享激活码给多人 | 激活码绑定生成时的 userId，激活后 deviceId 绑定该 userId | ActivationCode.userId |
| T5 | 离线破解修改系统时钟 | 许可证含签发的 `iat`；客户端允许 7 天时钟偏差；超过 30 天强制在线刷新 | 客户端时钟策略 |
| T6 | 订阅到期后继续使用 | 许可证含 `exp`；超过 30 天在线窗口后客户端进入只读模式（可查看/导出/删除，不可写入新记忆） | 客户端降级逻辑 |
| T7 | 服务器故障时阻断所有用户 | 30 天离线窗口 = fail-open（在窗口内不受服务端影响）；超过窗口 = fail-closed（降级为只读） | 降级边界 |
| T8 | 撤销设备后继续使用 | 撤销只阻止刷新和 MCP Skill 库访问；本地记忆数据不受影响（不远程删数据） | `/api/activation/refresh` |
| T9 | 旧版本客户端有安全漏洞 | ReleaseManifest 含 `minVersion`；激活时拒绝低于最低版本的客户端 | `/api/activation/activate` |
| T10 | 暴力枚举激活码 | 代码格式 `NEI-XXXX-XXXX`（6 位 base32 = 10^9 组合）+ 激活端点限流（每 IP 10 次/分钟） | `lib/rate-limit.ts` |

---

## 3. 完整时序图

### 3a. 首次激活流程

```
用户        浏览器(nei-pevc.com)     桌面应用(Memory Node)
 │              │                        │
 │──登录────────→│                        │
 │              │ (setSession cookie)     │
 │              │                        │
 │──点击"激活   │                        │
 │  Memory Node"│                        │
 │  →/connect   │                        │
 │              │                        │
 │              │──生成激活码──→          │
 │←─显示码──────│                        │
 │  NEI-A1B2-C3D4 (5min)                │
 │              │                        │
 │──手动输入码──→────────────────────────│
 │              │                        │
 │              │            桌面应用发送 │
 │              │        POST /api/activation/activate
 │              │        { code, device_id, device_name, version }
 │              │←───────────────────────│
 │              │                        │
 │              │ 验证:                  │
 │              │ · 激活码有效+未消费     │
 │              │ · userId 的设备数 < 3   │
 │              │ · client_version ≥ min  │
 │              │ · entitlement 有效      │
 │              │                        │
 │              │ 创建 DeviceActivation  │
 │              │ 生成 HMAC 许可证        │
 │              │                        │
 │              │──返回许可证────────────→│
 │              │  { license, expires_at }│
 │              │                        │
 │              │            桌面应用存储 │
 │              │            许可证到     │
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
    │         验证:          │
    │         · 签名格式正确 │
    │         · 设备未撤销   │
    │         · entitlement  │
    │           仍然有效     │
    │         · 更新 lastSeen│
    │                       │
    │←────新许可证──────────│
    │ { license, expires_at }│
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
// ---------- 激活码（一次性，5 分钟有效）----------
model ActivationCode {
  id            Int       @id @default(autoincrement())
  code          String    @unique           // NEI-XXXX-XXXX
  userId        Int
  createdAt     DateTime  @default(now())
  expiresAt     DateTime                    // createdAt + 5min
  consumedAt    DateTime?                   // 激活时间；null = 未使用
  deviceId      String?                     // 消费该码的设备

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([code])
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
// 解耦设计：source 字段留支付供应商接口，当前手动管理
model Entitlement {
  id          Int       @id @default(autoincrement())
  userId      Int       @unique
  plan        String    @default("free")   // free | memory-node-pro | memory-node-team
  status      String    @default("active")  // active | expired | cancelled | suspended
  startedAt   DateTime  @default(now())
  expiresAt   DateTime?                    // null = 无到期日（free 或终身）
  source      String?                      // "manual" | "stripe" | "alipay"（未来）
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
  sha256          String                       // 安装包校验
  minVersion      String?                      // 允许连接的最低版本；低于则拒绝激活
  releaseNotes    String?
  isLatest        Boolean   @default(false)
  publishedAt     DateTime  @default(now())

  @@index([product, platform, isLatest])
}
```

### 与现有模型的关系

| 现有模型 | 关系 |
|---|---|
| `User` | 1:N DeviceActivation, 1:1 Entitlement, 1:N ActivationCode |
| `UserConsent` | 不变；Memory Node 激活不需要新增 consent type |
| MCP Token (`User.mcpTokenHash`) | 独立于 Memory Node 激活；MCP Token 用于 Skill 库，Memory Node 许可证用于本地记忆 |

---

## 5. HTTP 端点规格

### 5.1 `POST /api/activation/code`

生成一次性激活码。需要网站 cookie session。

**认证**：Cookie session（`getSessionUid`）

**请求**：无 body

**响应 200**：
```json
{
  "code": "NEI-A1B2-C3D4",
  "expires_in": 300
}
```

**错误**：
| 状态码 | 错误码 | 场景 |
|---|---|---|
| 401 | `UNAUTHORIZED` | 未登录 |
| 429 | `RATE_LIMITED` | 每 IP 每 60 秒最多 3 次 |

**实现位置**：`app/api/activation/code/route.ts`
**逻辑**：生成 `NEI-` + 6 位 base32；存 ActivationCode；返回。

---

### 5.2 `POST /api/activation/activate`

用激活码换取许可证。**不需要 cookie session**——这是桌面应用调用的端点。

**认证**：无（激活码本身是凭证）

**请求**：
```json
{
  "code": "NEI-A1B2-C3D4",
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "device_name": "我的笔记本",
  "platform": "windows",
  "client_version": "0.1.0"
}
```

**响应 200**：
```json
{
  "license": "<base64-HMAC-signed-payload>",
  "expires_at": "2026-08-12T10:00:00Z",
  "user": {
    "nickname": "清流VC合伙人",
    "plan": "memory-node-pro"
  }
}
```

**错误**：
| 状态码 | 错误码 | 场景 |
|---|---|---|
| 400 | `INVALID_CODE` | 激活码不存在 |
| 400 | `CODE_EXPIRED` | 激活码超过 5 分钟 |
| 400 | `CODE_CONSUMED` | 激活码已使用 |
| 403 | `DEVICE_LIMIT_EXCEEDED` | 用户已有 3 台 active 设备 |
| 403 | `NO_ENTITLEMENT` | 用户无 Memory Node 权益 |
| 403 | `CLIENT_TOO_OLD` | client_version < ReleaseManifest.minVersion |
| 429 | `RATE_LIMITED` | 每 IP 每 60 秒最多 10 次 |

**实现位置**：`app/api/activation/activate/route.ts`

**核心验证顺序**：
1. 激活码存在 + 未过期 + 未消费
2. client_version ≥ minVersion（从 ReleaseManifest 查）
3. 用户 entitlement.status === 'active' && plan 含 'memory-node'
4. 用户 active 设备数 < 3（若该 deviceId 已存在则不计数）
5. 所有检查通过 → 消费激活码 + upsert DeviceActivation + 生成许可证

---

### 5.3 `POST /api/activation/refresh`

刷新即将过期的许可证。

**认证**：当前许可证（请求 body 中携带）

**请求**：
```json
{
  "license": "<base64-HMAC-signed-payload>",
  "device_id": "550e8400-..."
}
```

**响应 200**：
```json
{
  "license": "<new-base64-HMAC-signed-payload>",
  "expires_at": "2026-09-11T10:00:00Z"
}
```

**错误**：
| 状态码 | 错误码 | 场景 |
|---|---|---|
| 400 | `INVALID_LICENSE` | 许可证签名格式不正确 |
| 403 | `DEVICE_REVOKED` | 设备已被撤销 |
| 403 | `ENTITLEMENT_EXPIRED` | 订阅已过期 |
| 403 | `CLIENT_TOO_OLD` | 客户端版本低于当前 minVersion |

**实现位置**：`app/api/activation/refresh/route.ts`

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

**实现位置**：`app/api/activation/devices/route.ts`

---

### 5.5 `DELETE /api/activation/devices/:id`

撤销设备。

**认证**：Cookie session

**行为**：
- 设 `DeviceActivation.status = 'revoked'`, `revokedAt = now()`, `revokeReason = 'user_revoke'`
- **不删除任何本地数据**（约束：撤销不等于删数据）
- 被撤销的设备下次 refresh 时收到 `DEVICE_REVOKED`

**实现位置**：`app/api/activation/devices/[id]/route.ts`

---

### 5.6 `GET /api/releases/memory-node/latest?platform=windows`

获取最新客户端版本信息。

**认证**：无（公开，用于客户端自动更新检查）

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

**实现位置**：`app/api/releases/memory-node/latest/route.ts`

---

## 6. 许可证载荷规格

### 载荷结构

```json
{
  "v": 1,
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
| `v` | int | 许可证格式版本，当前固定 1 |
| `uid` | int | nei-pevc.com 用户 ID |
| `did` | string | 设备 UUID |
| `ent` | string | 权益计划（`memory-node-pro` / `memory-node-team`） |
| `iat` | unix ts | 签发时间（秒） |
| `exp` | unix ts | 过期时间（秒），= iat + 30 天 |
| `vmin` | string | 签发时的最低客户端版本 |

### 签名方式

```text
payload = base64url(JSON.stringify(licenseObject))
signature = HMAC-SHA256(payload, SESSION_SECRET)
license = payload + "." + base64url(signature)
```

签名密钥使用 `SESSION_SECRET`（`lib/secret.ts`），与现有 cookie session 相同。网站是唯一持有 `SESSION_SECRET` 的实体。

### 客户端验证策略

桌面应用持有许可证字符串，验证逻辑：

1. 拆分 `payload.signature`
2. 检查 payload 结构完整（v/uid/did/ent/iat/exp/vmin 均存在且类型正确）
3. 检查 `did === 本机 device_id`
4. 检查 `exp > now()`（允许 7 天时钟偏差：`exp + 604800 > now()`）
5. 如果 `exp + 604800 < now()` → 进入只读模式
6. **不做签名验证**（客户端不持有 SESSION_SECRET；签名完整性由在线 refresh 保证）

### 为什么客户端不验证签名？

如果客户端要验证 HMAC 签名，就必须在二进制文件中嵌入 `SESSION_SECRET`。任何人都可以反编译 Tauri 应用提取密钥，然后伪造许可证。

因此：签名是**服务端间验证**机制（refresh 时服务端验证旧许可证签名正确才发新的），客户端只检查结构和时间窗口。真正的授权验证发生在每次联网 refresh 时。

---

## 7. 稳定错误码

| 错误码 | HTTP | 含义 | 客户端行为 |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | 需要 cookie session | 不适用（桌面端不用 cookie） |
| `INVALID_CODE` | 400 | 激活码不存在 | 提示用户检查输入 |
| `CODE_EXPIRED` | 400 | 激活码超过 5 分钟 | 提示用户重新生成 |
| `CODE_CONSUMED` | 400 | 激活码已使用 | 提示用户重新生成 |
| `DEVICE_LIMIT_EXCEEDED` | 403 | 超过 3 台设备 | 提示用户在网站撤销旧设备 |
| `NO_ENTITLEMENT` | 403 | 无 Memory Node 权益 | 引导到购买/联系管理员 |
| `ENTITLEMENT_EXPIRED` | 403 | 订阅已过期 | 引导续费 |
| `CLIENT_TOO_OLD` | 403 | 版本过低 | 强制升级 |
| `DEVICE_REVOKED` | 403 | 设备被撤销 | 引导重新激活 |
| `INVALID_LICENSE` | 400 | 许可证格式错误 | 引导重新激活 |
| `RATE_LIMITED` | 429 | 限流 | 客户端退避重试 |

---

## 8. 设备与许可证状态机

### 设备状态机

```
              activate()
  [none] ────────────────→ [active]
                             │
                    revoke() │ (用户撤销 / 设备超限 / 订阅过期)
                             ↓
                         [revoked]
                             │
                     重新激活 │ (需要先撤销旧设备腾出名额)
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
     │ grace 过期 或 离线
     ↓
  [read_only] ──── 联网成功 + entitlement 有效 ──→ [valid]
     │
     │ 联网成功 + entitlement 过期
     ↓
  [expired] ──── 续费 ──→ [valid]
```

---

## 9. 离线许可与时钟策略

### 30 天离线窗口

许可证 `exp = iat + 2592000`（30 天）。客户端在 `exp` 前可完全离线使用。

### 时钟回拨防护

| 时钟状态 | 客户端行为 |
|---|---|
| 系统时间 > exp + 7 天 | 进入只读模式 |
| 系统时间 ∈ [exp, exp+7天] | 正常使用 + 提示"请联网刷新" |
| 系统时间 < iat | 检测到时钟回拨，以 iat 为基准计算窗口 |
| 系统时间正常 | 正常 |

宽限期：7 天（`604800` 秒）。窗口 = 30 天 + 7 天 = 37 天最大离线使用。

### Fail-safe / Fail-closed 边界

| 场景 | 行为 | 策略 |
|---|---|---|
| 离线 < 30 天 | 全功能 | Fail-open |
| 离线 30-37 天 | 全功能 + 提示刷新 | Fail-open |
| 离线 > 37 天 | 只读（可查看/导出/删除） | Fail-closed（写入受限） |
| 订阅过期 + 离线 | 同上，只读 | Fail-closed |
| 设备被撤销 + 离线 | 同上，只读 | Fail-closed |
| 永远不联网 | 37 天后降级为只读，数据不丢 | 保护用户数据 |

**关键原则**：降级永远不删除数据。用户始终可以查看、导出和删除本地记忆。

---

## 10. Release Manifest Schema

```json
{
  "product": "memory-node",
  "version": "0.1.0",
  "platform": "windows",
  "download_url": "https://releases.nei-pevc.com/memory-node/0.1.0/windows/MemoryNode-Setup-0.1.0.exe",
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "min_version": "0.0.1",
  "release_notes": "首个内测版本",
  "is_latest": true,
  "published_at": "2026-07-13T10:00:00Z"
}
```

客户端在以下时机检查更新：
1. 启动时
2. 每 24 小时
3. 激活/刷新许可证时（服务端可在 refresh 响应中附带 `force_update` 字段）

如果 `client_version < min_version`：
- 激活端点返回 `CLIENT_TOO_OLD` (403)
- 客户端显示"版本过低，请升级"并阻止使用

---

## 11. 隐私字段清单

### 网站保存的 Memory Node 相关数据

| 字段 | 来源 | 敏感度 | 说明 |
|---|---|---|---|
| `DeviceActivation.deviceId` | 客户端 UUID v4 | 低 | 随机生成，不绑定硬件 |
| `DeviceActivation.deviceName` | 用户输入 | 低 | 如"我的笔记本" |
| `DeviceActivation.platform` | 客户端 | 无 | "windows" |
| `DeviceActivation.clientVersion` | 客户端 | 无 | "0.1.0" |
| `DeviceActivation.lastSeenAt` | 服务端 | 低 | 最后刷新时间 |
| `Entitlement.plan` | 管理/支付 | 低 | "memory-node-pro" |
| `Entitlement.source` | 支付供应商 | 中 | 支付渠道标识 |
| `Entitlement.metadata` | 支付供应商 | 中 | 流水号等 |
| `ActivationCode.code` | 服务端生成 | 低 | 5 分钟后失效 |

### 网站不保存的数据

| 数据 | 为什么不存 |
|---|---|
| 记忆正文 | 产品约束：记忆只存本地 |
| 机构名 | 产品约束：不上传 |
| 基金名 | 产品约束：不上传 |
| 项目名 | 产品约束：不上传 |
| Agent 对话 | 产品约束：不监听 |
| 用户文件/BP | 产品约束：不读文件 |
| 硬件序列号/MAC | 隐私：deviceId 是随机 UUID |

---

## 12. 兼容与版本策略

### 许可证格式版本

当前 `v: 1`。未来如果许可证结构变更：
- `v: 2` 的许可证与 `v: 1` 共存
- refresh 端点检测旧版本 → 返回新版本
- 客户端不支持新版本时 → 提示升级

### 客户端版本策略

| 版本类型 | 含义 | 来源 |
|---|---|---|
| `client_version` | 当前客户端版本 | 客户端自报 |
| `min_version` | 允许连接的最低版本 | ReleaseManifest |

### API 版本策略

所有激活 API 路径不含版本号（`/api/activation/activate`）。如果需要破坏性变更：
- 新增 `/api/activation/v2/activate`
- 旧端点保留 6 个月
- 客户端通过 ReleaseManifest 知道用哪个版本

---

## 13. 未决问题

| # | 问题 | 当前倾向 | 需要决策者 |
|---|---|---|---|
| U1 | Entitlement 初始如何授予？手动改 DB？还是建管理页？ | 先手动 DB update（Beta），后续做 /admin 管理 | 用户 |
| U2 | 下载 URL 放哪里？Vercel 静态？Cloudflare R2？GitHub Releases？ | 倾向 GitHub Releases（免费、自动 SHA256） | 用户 |
| U3 | Windows 安装包是否需要代码签名证书？ | Beta 阶段不需要（SmartScreen 警告可接受），正式发布需要 | 用户 |
| U4 | macOS 版本何时启动？ | 等 Windows 内测退出条件达成后 | 用户 |
| U5 | 支付系统选型？Stripe / 支付宝 / 微信支付？ | 留到 Beta 后；Entitlement.source 解耦设计支持后接 | 用户 |
| U6 | 设备 deviceId 是否需要在客户端卸载时通知服务端？ | 不需要；服务端通过 lastSeenAt 自动判断 | 无需决策 |
| U7 | 许可证是否需要 nonce 防重放？ | refresh 端点不需要（许可证包含 deviceId + exp，重放无收益） | 无需决策 |

---

## 14. 网站端 vs Memory Node 端职责分工

| 职责 | 网站 (nei-pevc.com) | Memory Node (本地) |
|---|---|---|
| 用户注册/登录 | ✅ 全部 | ❌ 不做 |
| 激活码生成 | ✅ | ❌ |
| 激活码验证 + 许可证签发 | ✅ | ❌ |
| 设备管理（列表/撤销） | ✅ | ❌（只读自己的 deviceId） |
| 订阅/权益管理 | ✅ | ❌ |
| 客户端版本管理 | ✅ | ❌（只检查） |
| 记忆存储 | ❌ | ✅ 全部本地 |
| 记忆读写/继承/隔离 | ❌ | ✅ |
| MCP 服务（记忆） | ❌ | ✅（loopback only） |
| MCP 服务（Skill 库） | ✅ | ❌ |
| Agent 会话管理 | ❌ | ✅ |
| 两阶段写入确认 | ❌ | ✅ |
| 数据导出/导入/删除 | ❌ | ✅ |
| 自动更新检查 | ❌ | ✅（向网站请求 ReleaseManifest） |
| 许可证验证（在线） | ✅（refresh） | 发起请求 |
| 许可证验证（离线） | ❌ | ✅（检查结构+时间） |
