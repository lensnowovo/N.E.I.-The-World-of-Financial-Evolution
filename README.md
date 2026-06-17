# PEVC Skills Map + Community Platform V1.0

面向一级市场（VC / PE / FA）从业者的技能资产发现与分享社区。

## 产品定位

PEVC Skills Map 是一个围绕投资工作流的技能资产社区。用户可以发布、发现、评论、收藏和下载可复用的技能资产。

**核心概念：**
- **Post** -- 通用内容壳：标题、正文、作者、状态、浏览/评论/点赞/收藏。所有 Skill Asset 都是一个 Post。
- **SkillAsset** -- 扩展 Post 的资产元数据：类型（Prompt / Agent Skill / Workflow / Tool Stack / Template / API-Script / Case Study）、来源链接、安装说明、使用心得。
- **Skills Map** -- 按工作场景 x 资产类型的矩阵发现界面。
- **四维标签** -- 工作场景（10）x 行业赛道（9）x 工作内容（11）x 资产类型（7）。

## 技术栈

- **Next.js 14** App Router + Server Components
- **React 18** + **Tailwind CSS**（骑士感手抄本设计系统）
- **Prisma 5** + **SQLite**（生产可换 PostgreSQL）
- **TipTap** 富文本编辑器
- HMAC 签名 cookie 会话 + bcryptjs 密码哈希

## 本地启动

```bash
npm install
npx prisma db push --force-reset --accept-data-loss && npm run db:seed
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 测试账号

| 邮箱 | 密码 | 身份 | 昵称 |
|------|------|------|------|
| vc@pevc.dev | password123 | VC | 清流VC合伙人 |
| pe@pevc.dev | password123 | PE | PE研究员小李 |
| fa@pevc.dev | password123 | FA | FA-王经理 |
| vc2@pevc.dev | password123 | VC | AI赛道分析师 |

**邮箱验证码（开发模式）：** 所有邮箱通用 `123456`

## 已实现功能

| 模块 | 状态 | 说明 |
|------|------|------|
| Skills Map | done | 工作场景 x 资产类型矩阵 + 统计 + 响应式 |
| Skill Asset 发布 | done | 7 种资产类型 + 类型专属引导 + 元数据 + 附件 |
| Feed 流 | done | 时间倒序 + 四维筛选 + 搜索 + 去重查询层 |
| 搜索页 | done | 独立检索页 + 空状态引导 + 维度速查 |
| 内容详情 | done | Skill Asset 面板 + 正文 + 附件 + 评论 + 点赞/收藏 |
| 评论 | done | 两级嵌套、删除 |
| 文件上传 / 下载 | done | 拖拽上传、下载计数 |
| 个人主页 | done | 发布 / 点赞 / 收藏 三 Tab + 关注 |
| 内容状态 | done | POST_STATUS 常量（draft / pending / published / rejected） |

## 项目结构

```
pevc-platform/
├── app/                        # Next.js App Router
│   ├── api/                    # REST API 路由
│   │   ├── auth/               # 注册 / 登录 / 邮箱验证码 / me / logout
│   │   ├── sms/send/           # 邮箱验证码（dev 模式返回固定值）
│   │   ├── posts/              # 内容 CRUD + 互动（点赞/收藏）
│   │   ├── comments/           # 评论删除 / 点赞
│   │   ├── upload/             # 附件上传 / 删除
│   │   ├── files/[id]/download # 附件下载
│   │   └── users/[id]/follow/  # 关注 / 取消关注
│   ├── (pages)/
│   │   ├── page.tsx            # 首页 Feed
│   │   ├── login/              # 登录
│   │   ├── register/           # 注册（两步）
│   │   ├── publish/            # 发布（含 Skill Asset 类型引导）
│   │   ├── search/             # 独立检索页
│   │   ├── skills-map/         # Skills Map 矩阵页
│   │   ├── posts/[id]/         # 详情
│   │   └── profile/[id]/       # 个人主页（三 Tab + 关注）
│   ├── design-system/          # 设计系统预览页
│   ├── layout.tsx              # 全局布局 + 顶部导航
│   └── globals.css             # Tailwind 入口 + 手抄本主题
├── components/
│   ├── TopNav.tsx              # 顶部导航栏
│   ├── PostCard.tsx            # Feed 卡片
│   ├── FilterBar.tsx           # 四维筛选栏
│   ├── RichEditor.tsx          # TipTap 富文本编辑器
│   ├── AttachmentUploader.tsx  # 拖拽上传
│   ├── AttachmentList.tsx      # 附件列表
│   ├── CommentSection.tsx      # 两级嵌套评论
│   ├── FollowButton.tsx        # 关注按钮
│   ├── auth/AuthFrame.tsx      # 登录/注册通用框架
│   ├── chrome/SiteHeader.tsx   # 站点头部
│   ├── chrome/SiteFooter.tsx   # 站点底部
│   ├── icons/                  # 手抄本风格图标
│   │   ├── Crest.tsx           # 家徽
│   │   ├── FileSeal.tsx        # 文件封印
│   │   ├── Ornament.tsx        # 花饰
│   │   ├── RoleBadge.tsx       # 角色徽章
│   │   └── SkillIcon.tsx       # 资产类型图标
│   └── ui/                     # 基础 UI 组件
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Chip.tsx
│       ├── Input.tsx
│       └── Skeleton.tsx
├── lib/                        # 业务层
│   ├── db.ts                   # Prisma 客户端
│   ├── session.ts              # cookie 会话（HMAC 签名）
│   ├── storage.ts              # 文件存储（本地 uploads/）
│   ├── tags.ts                 # 四维分类常量 + ASSET_TYPE_HELPERS
│   ├── status.ts               # POST_STATUS 常量（draft/pending/published/rejected）
│   ├── skills-map.ts           # Skills Map 矩阵数据聚合
│   ├── feed.ts                 # Feed 查询层（去重、筛选、分页）
│   ├── validate.ts             # 校验 / XSS 过滤
│   ├── format.ts               # 格式化辅助
│   └── cn.ts                   # clsx + tailwind-merge 工具
├── prisma/
│   ├── schema.prisma           # 数据模型（含 SkillAsset、UserFollow）
│   ├── seed.ts                 # 种子数据
│   └── dev.db                  # SQLite 文件（自动生成）
├── uploads/                    # 本地附件存储
└── tailwind.config.ts          # 手抄本设计系统主题
```

## V1.0 简化（vs PRD）

| PRD 要求 | V1.0 实现 | 后续 |
|----------|-----------|------|
| 内容审核 | 直接 published，POST_STATUS 常量已就位 | 管理后台 + pending 流转 |
| 短信网关 | 固定验证码 `123456` | 接入邮件服务商 |
| 文件存储 OSS | 本地 `uploads/` | OSS SDK + 签名 URL |
| 全文检索 | LIKE 查询 | Elasticsearch |

## 关键命令

```bash
npm run dev          # 开发
npm run build        # 生产构建
npm run start        # 生产启动
npm run setup        # db:push + db:seed
npx prisma db push --force-reset --accept-data-loss && npm run db:seed  # 完整重置
npx prisma studio    # 数据库可视化
```
