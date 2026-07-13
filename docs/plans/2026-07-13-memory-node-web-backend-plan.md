# Memory Node Web Backend Implementation Plan

日期：2026-07-13
状态：待工程评审
前置文档：`docs/contracts/memory-node-web-integration.md`

---

## PR 拆分总览

| PR | 标题 | 改动范围 | 复杂度 | 前置 |
|----|------|----------|--------|------|
| 1 | Schema + migration | prisma/schema.prisma, db push | S | — |
| 2 | 激活码生成 + 激活端点 | 2 个 API route + lib/activation-license.ts | M | PR1 |
| 3 | 设备管理 + 许可证刷新 | 3 个 API route | M | PR2 |
| 4 | Entitlement 管理（admin） | /admin 页面 + API | M | PR1 |
| 5 | Release manifest API | 1 个 API route | S | PR1 |
| 6 | /connect 页接入激活入口 | 前端页面 | S | PR2 |
| 7 | 限流 + 安全加固 | lib + middleware | S | PR2 |

---

## PR 1: Schema + Migration

### 目标
新增 4 个 Prisma 模型，同步到 Neon。

### 改动文件
- `prisma/schema.prisma`（新增 ActivationCode / DeviceActivation / Entitlement / ReleaseManifest + User relation）
- 不需要手写 SQL migration（使用 `prisma db push`，对共享 Neon 非破坏性 additive）

### 验收标准
- `npx prisma validate` 通过
- `npx prisma generate` 通过
- `npx prisma db push` 成功（在 Neon 上创建 4 张新表）
- `npx tsc --noEmit` 通过（User model 新增 relation 字段不破坏现有类型）
- 现有功能不受影响（新表不参与现有查询）

### 回滚
- `prisma db push` 创建的表可手动 `DROP TABLE` 回滚
- schema 回退到 PR 前 commit

### 监控
- 无（纯 schema 变更，无运行时行为变化）

---

## PR 2: 激活码生成 + 激活端点

### 目标
实现 `POST /api/activation/code`（生成码）和 `POST /api/activation/activate`（验证码 + 签发许可证）。

### 改动文件
- `lib/activation-license.ts`（新建：许可证签名/解析/验证）
- `app/api/activation/code/route.ts`（新建）
- `app/api/activation/activate/route.ts`（新建）
- `lib/rate-limit.ts`（扩展，已有基础设施）

### 核心逻辑

**`lib/activation-license.ts`**：
```typescript
// 签发许可证
export function issueLicense(params: {
  uid: number;
  did: string;
  ent: string;
  vmin: string;
}): string
// 使用 SESSION_SECRET HMAC-SHA256 签名
// 有效期 30 天

// 验证许可证（服务端用，refresh 时验证旧许可证）
export function verifyLicense(license: string): {
  valid: boolean;
  payload?: LicensePayload;
  reason?: string
}
// 验证签名 + 结构
```

**`POST /api/activation/code`**：
1. `getSessionUid()` → uid
2. 检查限流（同 IP 60 秒最多 3 次）
3. 生成 `NEI-` + 6 位 base32
4. 存 `ActivationCode`（expiresAt = now + 5min）
5. 返回 `{ code, expires_in: 300 }`

**`POST /api/activation/activate`**：
1. 检查限流（同 IP 60 秒最多 10 次）
2. 查 `ActivationCode` where code = body.code
3. 校验顺序（见契约文档 §5.2）：
   - exists → expiresAt > now → consumedAt = null
   - client_version ≥ minVersion（查 ReleaseManifest）
   - Entitlement.status = 'active' && plan 含 'memory-node'
   - count(active DeviceActivation where userId) < 3（如果 deviceId 已存在则不计数）
4. 全部通过：
   - `ActivationCode.consumedAt = now`, `consumedByDeviceId = body.device_id`
   - `upsert DeviceActivation`（status: active, lastSeenAt: now）
   - `issueLicense({ uid, did, ent, vmin })`
   - 返回 `{ license, expires_at, user: { nickname, plan } }`

### 测试
- 单元：`issueLicense` + `verifyLicense` 签名/解析正确性
- 集成：生成码 → 激活成功；码过期 → 400；码重复用 → 400；设备超限 → 403
- 安全：无 cookie session 时 `/code` 返回 401；`/activate` 不需要 cookie

### 验收标准
- `tsc --noEmit` 通过
- 手动 curl 测试：生成码 → 激活 → 拿到许可证
- 许可证 base64 decode 后包含正确的 uid/did/exp

### 回滚
- 删 2 个 route + lib 文件
- ActivationCode 记录无副作用（只是 DB 行）

---

## PR 3: 设备管理 + 许可证刷新

### 目标
实现设备列表、撤销、许可证刷新 3 个端点。

### 改动文件
- `app/api/activation/devices/route.ts`（新建：GET 列表）
- `app/api/activation/devices/[id]/route.ts`（新建：DELETE 撤销）
- `app/api/activation/refresh/route.ts`（新建：POST 刷新许可证）

### 核心逻辑

**`GET /api/activation/devices`**：
1. `getSessionUid()` → uid
2. 查 `DeviceActivation.findMany({ where: { userId: uid } })`
3. 返回 `{ devices: [...], limit: 3 }`

**`DELETE /api/activation/devices/:id`**：
1. `getSessionUid()` → uid
2. 查 `DeviceActivation` where `{ userId: uid, deviceId: id }`
3. 存在 → 设 `status: 'revoked'`, `revokedAt: now`, `revokeReason: 'user_revoke'`
4. 不存在 → 404
5. **不删除任何远端数据**（无远端数据可删；本地数据不受影响）

**`POST /api/activation/refresh`**：
1. 解析 body.license → `verifyLicense()`
2. 查 `DeviceActivation` where `{ userId: payload.uid, deviceId: payload.did, status: 'active' }`
3. 校验：
   - 许可证签名正确
   - 设备存在且 status = 'active'
   - Entitlement.status = 'active'
   - client_version（从 body 或 license payload）≥ minVersion
4. 全部通过：
   - `DeviceActivation.lastSeenAt = now`
   - `issueLicense({ uid, did, ent, vmin })`（新 30 天窗口）
   - 返回新许可证
5. 失败 → 对应错误码（DEVICE_REVOKED / ENTITLEMENT_EXPIRED / CLIENT_TOO_OLD）

### 测试
- 激活后 GET devices → 返回 1 台 active
- DELETE device → status 变 revoked
- revoked device refresh → 403 DEVICE_REVOKED
- 正常 refresh → 新许可证 expires_at 延后 30 天

### 验收标准
- 设备列表正确显示
- 撤销后 refresh 被拒
- 刷新后许可证有效期延长

---

## PR 4: Entitlement 管理（Admin）

### 目标
管理员可以在 /admin 设置用户 entitlement。

### 改动文件
- `app/api/admin/entitlements/route.ts`（GET 列表 + POST 设置）
- `app/admin` 控制台新增 "权益管理" Tab 或区块
- 需要 `requireAdmin()` 守卫

### 核心逻辑

**GET /api/admin/entitlements**：列出所有非 free entitlement
**POST /api/admin/entitlements**：
```json
{ "userId": 42, "plan": "memory-node-pro", "expiresAt": "2026-12-31T23:59:59Z" }
```
- upsert Entitlement
- 记录来源 `source: 'manual'`

### 验收标准
- Admin 可查看所有用户权益
- Admin 可手动授予/修改 entitlement
- 非 admin 访问返回 403

---

## PR 5: Release Manifest API

### 目标
桌面客户端可以检查更新。

### 改动文件
- `app/api/releases/memory-node/latest/route.ts`（GET，公开）

### 核心逻辑
1. 读 `platform` query 参数
2. 查 `ReleaseManifest.findFirst({ where: { product: 'memory-node', platform, isLatest: true } })`
3. 不存在 → 返回 `{ available: false }`
4. 存在 → 返回 manifest

### 验收标准
- 无数据库记录时返回 `{ available: false }`
- 有记录时返回完整 manifest

---

## PR 6: /connect 页接入激活入口

### 目标
用户在 /connect 页面可以生成 Memory Node 激活码。

### 改动文件
- `app/connect/page.tsx`（新增 Memory Node 激活区块）
- 或新建 `app/connect/MemoryNodeActivation.tsx`（client component）

### UI 设计
```
┌────────────────────────────────────────┐
│  Memory Node 濌活                      │
│                                        │
│  [生成激活码] → NEI-A1B2-C3D4 (5分钟)   │
│                                        │
│  在 Memory Node 桌面应用中输入此码完成   │
│  激活。首次激活后可离线使用 30 天。       │
│                                        │
│  已激活设备（2/3）：                     │
│  · 办公台式机 (Windows) - 上次在线 2小时 │
│  · 测试笔记本 (Windows) - 上次在线 3天   │
│  [撤销]                                 │
└────────────────────────────────────────┘
```

### 验收标准
- 登录用户可生成激活码
- 显示已激活设备列表 + 撤销按钮
- 未登录用户看到登录提示
- 无 entitlement 的用户看到"暂无权限"提示

---

## PR 7: 限流 + 安全加固

### 目标
对激活相关 API 加限流和输入校验。

### 改动文件
- `lib/rate-limit.ts`（已有，确保激活端点接入）
- 各 activation route 中加输入校验（code 格式 `NEI-XXXX-XXXX`、device_id UUID 格式、client_version semver 格式）

### 限流配置

| 端点 | 限制 |
|---|---|
| `POST /api/activation/code` | 同 IP 60 秒 3 次 |
| `POST /api/activation/activate` | 同 IP 60 秒 10 次 |
| `POST /api/activation/refresh` | 同 IP 60 秒 30 次 |

### 输入校验

| 字段 | 格式 | 校验位置 |
|---|---|---|
| `code` | `^NEI-[A-Z2-7]{4}-[A-Z2-7]{4}$` | activate route |
| `device_id` | UUID v4 | activate/refresh route |
| `client_version` | semver (`^\d+\.\d+\.\d+`) | activate route |
| `platform` | `"windows"` \| `"macos"` | activate route |

### 验收标准
- 超限请求返回 429
- 格式错误的请求返回 400
- 日志不打印 code 或 license 明文

---

## Migration 与发布顺序

### 数据库变更

所有 4 张新表都是 **additive**（新增表，不改现有表结构），对生产无影响。使用 `prisma db push` 即可。

**注意**：`User` model 需要新增 4 个 relation 字段（`activationCodes`, `deviceActivations`, `entitlement`, 对 ReleaseManifest 不需要 relation）。Prisma relation 字段不改变数据库表结构（只是外键方向），所以 `db push` 不会破坏现有数据。

### 发布顺序

```
PR1 (schema) ──→ PR2 (code+activate) ──→ PR3 (devices+refresh)
                                          ↗
              PR4 (entitlement admin) ──→ PR6 (/connect UI) ──→ PR7 (hardening)
              PR5 (release manifest) ──↗
```

PR1 必须先合并。PR2/PR4/PR5 可以并行。PR3 依赖 PR2。PR6 依赖 PR2+PR3。PR7 最后。

### Vercel 部署

每个 PR 合并到 main 后 Vercel 自动部署。`vercel-build` 中的 `prisma db push` 会自动创建新表。

**关键**：PR1 合并后，先在 Neon 上验证表创建成功，再合并后续 PR。

---

## 监控与告警

### 需要监控的指标

| 指标 | 来源 | 告警阈值 |
|---|---|---|
| 激活成功率 | activate route | < 80%（可能大量无效码尝试） |
| 激活端点 429 比例 | rate-limit | > 10%（可能被刷） |
| refresh 成功率 | refresh route | < 95%（可能大量设备被撤销或订阅过期） |
| 设备激活数 | DeviceActivation count | 突然激增（异常） |

### 日志策略

| 信息 | 是否记录 |
|---|---|
| userId | ✅ |
| deviceId | ✅ |
| 操作类型（code/activate/refresh/revoke） | ✅ |
| client_version | ✅ |
| 激活码明文 | ❌（只记录前 4 位 `NEI-XX**`） |
| 许可证明文 | ❌（只记录 `license_len` 和 `exp`） |
| 设备名 | ❌（可能含个人信息） |
| IP | ✅（审计用，限时保留） |

---

## 验收清单

- [ ] `POST /api/activation/code` 需要 cookie session + 返回 5 分钟有效码
- [ ] `POST /api/activation/activate` 不需要 cookie + 验证码 + 检查设备数 + 检查 entitlement + 返回许可证
- [ ] `POST /api/activation/refresh` 验证旧许可证 + 返回新许可证
- [ ] `GET /api/activation/devices` 返回用户设备列表
- [ ] `DELETE /api/activation/devices/:id` 撤销设备（不删远端数据）
- [ ] `GET /api/releases/memory-node/latest` 返回最新版本
- [ ] 许可证是 HMAC-SHA256 签名的 base64url 字符串
- [ ] 许可证有效期 30 天
- [ ] 设备限制 3 台，超过返回 DEVICE_LIMIT_EXCEEDED
- [ ] entitlement 过期返回 ENTITLEMENT_EXPIRED
- [ ] 版本过低返回 CLIENT_TOO_OLD
- [ ] 限流正常工作（429）
- [ ] 日志不含敏感字段
- [ ] 网站不保存记忆正文/机构名/基金名/项目名
- [ ] 撤销设备不删除本地数据
- [ ] 订阅过期后本地仍可查看/导出/删除
- [ ] `npx prisma validate` + `npx tsc --noEmit` + `npm run lint` + `npm run build` 全部通过
