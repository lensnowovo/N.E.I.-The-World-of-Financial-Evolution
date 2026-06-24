/**
 * Admin bootstrap helper.
 *
 * 首批管理员通过环境变量 ADMIN_BOOTSTRAP_EMAILS 引导（逗号分隔），
 * 仅在用户 **创建** 时生效（register / github callback 新建 / seed）。
 * 后续的管理员授予/撤销应由已有的 admin 在控制台操作（见 US-014）。
 *
 * 大小写不敏感：对比前对双方都做 toLowerCase + trim。
 */

function getAdminBootstrapEmails(): Set<string> {
  const raw = process.env.ADMIN_BOOTSTRAP_EMAILS;
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0)
  );
}

/**
 * 给定 email，判断是否应在创建时引导为 admin。
 * email 入参做 trim + toLowerCase 后与 env 列表比对。
 */
export function shouldBootstrapAdmin(email: string): boolean {
  if (!email) return false;
  return getAdminBootstrapEmails().has(email.trim().toLowerCase());
}
