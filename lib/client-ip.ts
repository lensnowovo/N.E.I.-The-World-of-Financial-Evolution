/**
 * 客户端 IP 解析（契约 §11「客户端 IP 读取顺序」）。
 *
 * 安全模型：**不**把客户端可任意控制的请求头当作安全边界。只信任由可信边缘
 * （Vercel）注入/覆写的头，且只接受**合法的 IPv4/IPv6 单值**。
 *
 * 读取顺序（取首个合法者）：
 *   1. x-real-ip          （Vercel 单值，最可信）
 *   2. x-forwarded-for    （取最左一项；仅当无 x-real-ip 时作为受控兜底）
 *   3. x-vercel-forwarded-for（同上）
 *   4. 'unknown'
 *
 * 对代理头只验证最左一项；最左项非法时不会跳过它去信任后续值。
 * 拒绝：超长值、非 IP 字符串、带端口/协议等异常 → 回退下一可信头或 'unknown'。
 *
 * 纯函数模块（仅依赖 node:net），不引入 Prisma，便于离线单测。
 */
import { isIP } from 'node:net';

/** IPv4 最长 15，IPv6 最长 39；45 为合理上限。超长一律视为非法。 */
export const MAX_IP_LEN = 45;

/** 合法 IPv4/IPv6 单值，且长度不超过上限。 */
export function isValidIp(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  if (v.length === 0 || v.length > MAX_IP_LEN) return false;
  // net.isIP 返回 0（非法）/ 4 / 6。
  // 额外拒绝带端口（"1.2.3.4:5678"）或协议前缀等——net.isIP 已会拒绝这些。
  return isIP(v) !== 0;
}

/** 只验证代理头最左一项；无值或最左项非法则返回 null。 */
function leftmostValidIp(headerVal: string | null): string | null {
  if (!headerVal) return null;
  const candidate = headerVal.split(',', 1)[0]?.trim() ?? '';
  return isValidIp(candidate) ? candidate : null;
}

export interface HeadersLike {
  get(name: string): string | null;
}

/**
 * 解析客户端 IP。返回合法 IP，或 'unknown'（调用方可用其作为共享的「IP 未知」限流键，
 * 比「完全不限」安全）。绝不返回未校验的原始头值。
 */
export function getClientIp(headers: HeadersLike): string {
  // 1. x-real-ip：Vercel 注入的单值。
  const xrip = leftmostValidIp(headers.get('x-real-ip'));
  if (xrip) return xrip;

  // 2. x-forwarded-for：仅作受控兜底，只验证最左项。
  const xff = leftmostValidIp(headers.get('x-forwarded-for'));
  if (xff) return xff;

  // 3. x-vercel-forwarded-for：同上。
  const xvff = leftmostValidIp(headers.get('x-vercel-forwarded-for'));
  if (xvff) return xvff;

  return 'unknown';
}

/** 兼容旧签名：直接传 Request/NextRequest。 */
export function getClientIpFromRequest(req: { headers: HeadersLike }): string {
  return getClientIp(req.headers);
}
