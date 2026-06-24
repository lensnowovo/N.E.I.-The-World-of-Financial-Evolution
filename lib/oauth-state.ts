import crypto from 'crypto';
import { cookies } from 'next/headers';
import { SESSION_SECRET } from './secret';

/**
 * GitHub OAuth state 参数（CSRF 防护）。
 *
 * 单次使用的签名 state token —— 形如 `{base64url(payload)}.{base64url(hmac)}`，
 * 与 session cookie 同样的 HMAC 签名方式（key 来自 SESSION_SECRET），
 * 同时被写入一个短存活、SameSite=Lax 的 cookie。
 *
 * 回调时：query.state 必须与 cookie.state 严格相等且签名/过期校验通过，
 * 否则视为 CSRF 攻击并拒绝。cookie 在校验后立即清除（one-shot）。
 *
 * 为什么不用纯 random nonce：签名让攻击者无法凭空构造一个能通过校验的
 * state，确保 cookie↔query 配对只能由本服务器发起。
 */

const STATE_COOKIE_NAME = 'pevc_oauth_state';
const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 分钟，足够用户在 GitHub 完成授权

function sign(payload: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
}

/**
 * 生成一个签名 state token，并写入短期 cookie。
 * 返回值需作为 `state` 参数追加到 GitHub authorize URL。
 */
export async function issueOAuthState(): Promise<string> {
  const nonce = crypto.randomBytes(16).toString('base64url');
  const data = JSON.stringify({ nonce, exp: Date.now() + STATE_MAX_AGE_MS });
  const b64 = Buffer.from(data).toString('base64url');
  const token = `${b64}.${sign(b64)}`;

  const store = await cookies();
  store.set(STATE_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(STATE_MAX_AGE_MS / 1000),
    secure: process.env.NODE_ENV === 'production',
  });

  return token;
}

/**
 * 校验 query 中的 state 是否与 cookie 匹配、签名是否有效、是否过期。
 * 无论结果如何都会清掉 state cookie（one-shot，防止重放）。
 */
export async function verifyOAuthState(queryState: string | null): Promise<boolean> {
  const store = await cookies();
  const c = store.get(STATE_COOKIE_NAME);

  // 始终清掉 cookie，无论结果如何 —— state 是一次性的
  store.set(STATE_COOKIE_NAME, '', { path: '/', maxAge: 0 });

  if (!c?.value || !queryState) return false;
  // 先做常量时间比较之外的最严格检查：cookie 与 query 必须严格相等
  // （签名只证明 state 来自本服务器；相等比较证明调用方拿到的 state 就是发到浏览器的那一份）
  if (c.value.length !== queryState.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(c.value), Buffer.from(queryState))) return false;

  const [b64, sig] = queryState.split('.');
  if (!b64 || !sig) return false;
  if (sign(b64) !== sig) return false;

  try {
    const data = JSON.parse(Buffer.from(b64, 'base64url').toString());
    if (typeof data.exp !== 'number') return false;
    if (data.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}
