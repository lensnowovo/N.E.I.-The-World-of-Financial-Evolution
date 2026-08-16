# N.E.I. Skill 供应链安全运行手册

本手册覆盖已审核 Skill 被篡改、管理员账号异常、MCP 流量攻击和紧急停服。它不替代平台账号 MFA、数据库备份或专业渗透测试。

## 1. 安全不变量

- 投稿正文和附件始终视为不可信输入。
- MCP 只分发已发布、已准入并通过签名校验的不可变 `SkillRevision`。
- 编辑会使内容重新待审、撤销 MCP 准入并吊销旧快照。
- 管理员审核、撤回、编辑和删除必须留下 `AdminAuditLog`。
- 完整性异常时 fail closed：宁可暂时不返回 Skill，也不返回无法验证的正文。

## 2. 首次上线顺序

1. 在 Vercel Production/Preview 配置全新的 `SKILL_INTEGRITY_SECRET`（至少 32 字节，不能复用 `SESSION_SECRET`）。
2. 保持 `MCP_REQUIRE_SIGNED_REVISIONS=false`，保持 `MCP_DISABLED=false`。
3. 通过受控发布流程执行 `prisma migrate deploy`，不要在 Vercel build 中迁移数据库。
4. 在可信管理终端临时设置 `SKILL_BACKFILL_ADMIN_EMAIL`，执行 `npm run db:backfill-skill-revisions`。
5. 核对脚本输出：`created + skipped = total`，且没有任何附件读取失败。
6. 抽查 MCP 的 `search_skills`、`get_skill`、`apply_skill`。
7. 将 Vercel 的 `MCP_REQUIRE_SIGNED_REVISIONS` 改为 `true` 并重新部署。
8. 再次抽查；任何缺失、吊销或签名不匹配的快照都应从发现结果中消失，并且不能被 `get_skill` 读取。

## 3. 发现疑似恶意 Skill

1. 立即设置 `MCP_DISABLED=true` 并重新部署；所有 MCP 请求返回 503，但不删除用户 Token 和收藏。
2. 在管理员控制台撤回对应 Skill 的 MCP 准入并下架公开内容。
3. 保存 `AdminAuditLog`、MCP 调用日志、Vercel 日志和相关数据库快照，不要先清日志。
4. 检查同一管理员、作者、来源 URL 和时间段内的其他修改。
5. 从最后可信 revision 恢复；重新审核后生成新版本，不覆盖旧 revision。
6. 若可能影响用户本地数据或机构材料，按安全事件预案评估通知、Token 撤销和法定报告义务。

## 4. 流量或攻击事件

- Vercel 打开 Attack Challenge Mode；对 `/api/mcp`、`/api/upload`、认证和公开搜索设置 WAF 限流。
- MCP 应用层默认每个 Token 每分钟 240 个 HTTP 请求；上传默认每用户每小时 20 次、每 IP 每小时 60 次。
- 若数据库负载仍上升，先设 `MCP_DISABLED=true`，再判断是否需要暂停上传或只保留静态页面。
- 设置 Vercel、Neon、OSS、Resend 消费预警；不要等账单发生后再处理。

## 5. 每周与每月检查

- 每周查看管理员操作、MCP 429/5xx、异常 Token 和审核积压。
- 每月导出所有有效 `SkillRevision` 的 `postId/version/contentHash/signature` 到独立存储。
- 每月演练一次：撤回一个测试 Skill、开启 MCP 紧急开关、恢复并验证。
- 每季度验证数据库备份可以恢复，而不只是“显示备份成功”。

## 6. 仍需平台侧完成

- GitHub、Vercel、Neon、阿里云、Resend 和管理员邮箱启用 MFA。
- 轮换任何曾粘贴到聊天、截图或日志中的数据库及邮件密钥。
- ECS 关闭公网 3389；22 仅允许可信来源或使用受控 Workbench。
- 管理员高风险操作增加二次验证；当前审计和签名能检测、回滚，但不能阻止一个已经完全接管管理员会话的攻击者主动发起两次操作。
