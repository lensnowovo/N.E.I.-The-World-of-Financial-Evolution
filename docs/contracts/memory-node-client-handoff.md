# N.E.I. Memory Node 客户端接入规范

状态：`v1 / internal beta`  
更新：2026-07-20  
服务端：`https://nei-pevc.com`  
详细安全与并发设计：[memory-node-web-integration.md](./memory-node-web-integration.md)

本文是 `nei-memory-node` 客户端开发的执行入口。它只描述**已经上线的能力**、客户端必须遵守的协议和下一阶段接口边界；后端内部实现以详细契约为准。

## 1. 当前已经上线什么

| 能力 | 状态 | 接口 |
|---|---|---|
| 登录用户生成一次性激活码 | 已上线 | `POST /api/activation/code` |
| 客户端使用激活码换取许可证 | 已上线 | `POST /api/activation/activate` |
| Ed25519 离线许可证签名 | 已上线 | 许可证随激活响应返回 |
| 最多 3 台 active 设备 | 已上线 | 激活事务内强制执行 |
| 原子限流与过期数据清理 | 已上线 | 服务端内部能力 |
| 刷新许可证 | 未实现 | 计划：`POST /api/activation/refresh` |
| 查看及撤销设备 | 未实现 | 计划：`GET/DELETE /api/activation/devices` |
| 查询最新版安装包 | 未实现 | 计划：`GET /api/releases/memory-node/latest` |
| 网站激活/设备管理页面 | 未实现 | 等客户端本体可用后建设 |

客户端 v1 不得假设“计划接口”已经存在，也不要为它们编造兼容逻辑。

## 2. 激活流程

```text
用户登录 nei-pevc.com
        │
        ├─ 网站生成 8 位一次性激活码（5 分钟有效）
        │
        └─ 用户把激活码交给本机 Memory Node
                          │
                          ├─ POST /api/activation/activate
                          ├─ 保存签名许可证
                          └─ 本地验签并进入 FULL 模式
```

生成激活码需要网站 Cookie Session，因此应由网站页面调用，客户端不应收集或保存用户的网站 Cookie。内测阶段在网站 UI 完成前，可由管理员或受控测试脚本生成激活码。

## 3. 生成激活码

### 请求

```http
POST https://nei-pevc.com/api/activation/code
Cookie: <网站登录 Session>
```

无请求体。账号必须具有有效的 `memory-node-pro` 或 `memory-node-team` 权益。

### 成功响应

```json
{
  "code": "A1B2C3D4",
  "expires_in": 300
}
```

激活码为 8 位 Crockford Base32，大小写不敏感；服务端只保存 SHA-256 哈希，明文只返回一次。

### 限流

- IP：3 次 / 60 秒；
- 用户：5 次 / 10 分钟；
- `429` 响应包含 JSON `retry_after` 和 HTTP `Retry-After`。

## 4. 客户端激活

### 请求

```http
POST https://nei-pevc.com/api/activation/activate
Content-Type: application/json
```

```json
{
  "code": "A1B2C3D4",
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "device_name": "Lensn 的 Surface",
  "platform": "windows",
  "client_version": "0.1.0"
}
```

字段约束：

| 字段 | 约束 |
|---|---|
| `code` | 8 位 Crockford Base32 |
| `device_id` | UUID；首次启动生成并稳定保存，不得每次启动重建 |
| `device_name` | trim 后 1–80 字符；禁止控制字符 |
| `platform` | `windows` 或 `macos` |
| `client_version` | 三段 SemVer，如 `0.1.0` |

该接口不需要网站 Cookie。激活码本身是短期、一次性的授权凭据。

### 成功响应

```json
{
  "license": "<payload-base64url>.<signature-base64url>",
  "expires_at": "2026-08-19T10:00:00.000Z",
  "user": {
    "nickname": "Lensn",
    "plan": "memory-node-pro"
  }
}
```

客户端必须原子保存：

- `device_id`；
- `license`；
- 本地时间高水位状态；
- 最近一次成功联网时间。

不得把许可证写入日志、崩溃报告或可公开同步的配置文件。

## 5. 许可证格式与生产公钥

许可证格式：

```text
base64url(payload-json-utf8) + "." + base64url(ed25519-signature-64-bytes)
```

当前 payload 版本为 `2`，当前生产密钥 ID：

```text
key-2026-07
```

客户端必须按 `kid` 选择公钥，并对**原始 payload 字节**执行 Ed25519 `verify_strict`，不得解析后重新序列化再验签。

### 生产公钥

PEM：

```pem
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAh8pgXXBIoJdc4H1tGKzfWBaf0XSy0PqupTNNQ+MazG0=
-----END PUBLIC KEY-----
```

Ed25519 raw public key（32 bytes）：

```text
87ca605d7048a0975ce07d6d18acdf58169fd174b2d0faaea5334d43e31acc6d
```

SHA-256 指纹：

```text
66393d8746087b15e5322a307fbc709b9739c6eaad085d7fd59ac7a626ff8659
```

Rust 客户端应将 raw 32 bytes 编译进 `LICENSE_PUBLIC_KEYS`。私钥只存在于 Vercel Production 和管理员本机受保护备份，绝不进入客户端仓库。

## 6. Payload 与本地状态

```json
{
  "v": 2,
  "kid": "key-2026-07",
  "uid": 42,
  "did": "550e8400-e29b-41d4-a716-446655440000",
  "ent": "memory-node-pro",
  "ee": 0,
  "iat": 1784512800,
  "exp": 1787104800,
  "ga": true,
  "vmin": "0.1.0"
}
```

- `did` 必须等于本机稳定保存的 `device_id`；
- `ee`：权益到期 epoch 秒，`0` 表示无固定到期；
- `exp`：许可证正常窗口到期；
- `ga`：是否允许 7 天宽限；
- `vmin`：最低允许客户端版本。

客户端状态判定：

```text
effective_now = max(system_now, startup_effective + monotonic_elapsed)

effective_now <= exp
  → FULL

effective_now > exp
且 ga == true
且 effective_now <= min(exp + 7 天, ee == 0 ? Infinity : ee)
  → GRACE（全功能，但提示联网刷新）

其他情况
  → READ_ONLY
```

`READ_ONLY` 必须允许用户查看、搜索、导出和删除自己的本地数据；禁止新增或修改记忆。任何授权失败都不得删除、加密勒索或远程锁死用户数据。

## 7. 稳定错误码

| 错误码 | HTTP | 客户端行为 |
|---|---:|---|
| `INVALID_REQUEST` | 400 | 检查字段格式，不自动重试 |
| `INVALID_CODE` | 400 | 提示检查激活码 |
| `CODE_EXPIRED` | 400 | 引导重新生成 |
| `CODE_CONSUMED` | 400 | 引导重新生成 |
| `DEVICE_LIMIT_EXCEEDED` | 403 | 引导用户在网站撤销旧设备；页面尚未上线时联系管理员 |
| `DEVICE_ALREADY_ACTIVE` | 403 | 不得生成新 `device_id` 冒充新机器；应恢复本机原许可证或联系管理员 |
| `NO_ENTITLEMENT` | 403 | 引导申请内测资格 |
| `ENTITLEMENT_EXPIRED` | 403 | 进入只读并提示续期 |
| `CLIENT_TOO_OLD` | 403 | 强制升级客户端 |
| `RATE_LIMITED` | 429 | 按 `retry_after` 退避，不要循环重试 |
| `ACTIVATION_UNAVAILABLE` | 500 | 保留本地状态，稍后人工重试 |

## 8. 客户端实现顺序

1. 生成并安全持久化稳定 `device_id`；
2. 内置 `key-2026-07` 生产公钥；
3. 实现许可证解析与 Ed25519 严格验签；
4. 实现 FULL / GRACE / READ_ONLY 状态机和单调时间高水位；
5. 实现一次性激活码输入与 `/activate` 调用；
6. 原子保存许可证，失败时保留旧许可证；
7. 为未来 `/refresh`、设备撤销和版本接口预留模块边界，但当前不要调用不存在的接口；
8. 用网站契约中的固定互操作向量和生产公钥各完成一组测试。

## 9. 数据边界

授权接口只接收设备标识、设备显示名、平台和客户端版本。以下内容不得上传到网站授权系统：

- 机构、基金、项目和记忆正文；
- 用户文件、BP、财务模型和投委会材料；
- 本地目录、文件名和搜索查询；
- Agent 对话内容。

Memory Node 本地数据与网站授权元数据必须保持物理和逻辑分离。
