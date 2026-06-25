/**
 * SEC-002 迁移脚本：把官方/导入 skill 批量设为 mcpApproved=true。
 *
 * 规则（与 PRD acceptance 对齐）：
 *   - 作者 email = library@pevc.local（import-skills / import-batch2/3/4 / import-pharma-skill /
 *     import-storm / import-mcp-setup-prompt 等所有 import-* 脚本搬运者账号）
 *     OR featured = true（管理员精选）
 *   - AND status = 'published'（未发布的草稿/待审/已拒不应进 MCP）
 *   - AND deletedAt IS NULL（软删的帖子不应再进 MCP）
 *   - AND mcpApproved = false（幂等：已 approved 的不动，可重复运行）
 *
 * 用法（repo 根目录）：
 *   set -a; source .env.local; set +a   # 暴露 DATABASE_URL 给进程
 *   npx tsx scripts/migrate-mcp-approved.ts
 *
 * 幂等：where 含 mcpApproved: false，重复运行不会重复更新；不误改普通社区投稿
 *      （社区投稿 author != library@pevc.local && featured 默认 false）。
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** import-* 脚本统一的搬运者账号 email —— 见 scripts/import-skills.ts LIBRARY_USER / 各 import-batch*.ts LIBRARY_EMAIL */
const LIBRARY_EMAIL = 'library@pevc.local';

async function main() {
  console.log('[migrate-mcp-approved] 开始迁移……');

  const libraryUser = await prisma.user.findUnique({
    where: { email: LIBRARY_EMAIL },
    select: { id: true, nickname: true, email: true },
  });
  if (!libraryUser) {
    console.warn(
      `[migrate-mcp-approved] 未找到 library 账号 (${LIBRARY_EMAIL})，仅按 featured=true 迁移`,
    );
  } else {
    console.log(
      `[migrate-mcp-approved] library 账号: id=${libraryUser.id} nickname="${libraryUser.nickname}"`,
    );
  }

  // where: (library 作者 OR featured=true) AND published AND 未软删 AND 当前未 approved
  const where = {
    status: 'published',
    deletedAt: null,
    mcpApproved: false,
    OR: [
      ...(libraryUser ? [{ userId: libraryUser.id }] : []),
      { featured: true },
    ],
  };

  const candidates = await prisma.post.findMany({
    where,
    select: { id: true, title: true, userId: true, featured: true },
  });

  console.log(
    `[migrate-mcp-approved] 待 approve: ${candidates.length} 个 post`,
  );
  if (candidates.length > 0) {
    const byLibrary = libraryUser
      ? candidates.filter((p) => p.userId === libraryUser.id).length
      : 0;
    const byFeatured = candidates.filter((p) => p.featured).length;
    console.log(`  - 其中 ${byLibrary} 个命中 library@pevc.local 作者`);
    console.log(`  - 其中 ${byFeatured} 个命中 featured=true`);
    for (const p of candidates) {
      console.log(`    #${p.id}${p.featured ? ' [featured]' : ''} ${p.title}`);
    }
  }

  const result = await prisma.post.updateMany({
    where,
    data: { mcpApproved: true },
  });

  console.log(
    `[migrate-mcp-approved] ✅ 完成：${result.count} 个 post → mcpApproved=true`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('[migrate-mcp-approved] ❌ 失败:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
