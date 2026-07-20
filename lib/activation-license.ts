/**
 * Memory Node 离线许可证签发/验证（契约 §6 / §18）。
 *
 * - 算法：Ed25519（RFC 8032）。Node `crypto.sign(null, data, key)` 返回 raw 64 字节签名，
 *   **不要**设置 `dsaEncoding`（它只影响 ECDSA/DSA，对 Ed25519 无意义）。
 * - payload v2，统一到期语义：`exp = min(iat + 30天, ee)`；`ga = (ee==0) || (ee > iat+30天)`。
 * - 离线判定（客户端）：ee/ga/exp 全部嵌入签名 payload，篡改任一字节即验签失败。
 *
 * 模块仅依赖 node:crypto，不引入 Prisma，便于离线单测与跨语言互操作向量校验。
 * issueLicense 默认从 MEMORY_LICENSE_PRIVATE_KEY 读取私钥；测试可通过 opts.privateKey 注入。
 */
import {
  createPrivateKey,
  sign,
  verify,
  type KeyObject,
} from 'node:crypto';

export const LICENSE_PAYLOAD_VERSION = 2;
export const CURRENT_KID = 'key-2026-07';
const THIRTY_DAYS_SEC = 30 * 86400;

export interface LicensePayload {
  v: number;
  kid: string;
  uid: number;
  did: string;
  ent: string;
  ee: number; // 权益到期 epoch 秒；0 = 无到期
  iat: number; // 签发时间（秒）
  exp: number; // = min(iat + 30天, ee)
  ga: boolean; // 是否允许宽限
  vmin: string; // 签发时最低客户端版本
}

function epochSec(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

/**
 * 由签发时间与权益到期计算 exp / ee / ga（纯函数，离线可测）。
 *
 * - ee = entitlementExpiresAt ? epoch : 0
 * - exp = (ee==0 || ee > iat+30d) ? iat+30d : ee   // 权益更短则截断
 * - ga  = (ee==0) || (ee > iat+30d)                // 权益活过自然窗口才允许宽限
 */
export function computeExpiry(
  iat: number,
  entitlementExpiresAt: Date | null
): { exp: number; ee: number; ga: boolean } {
  const expRaw = iat + THIRTY_DAYS_SEC;
  const ee = entitlementExpiresAt ? epochSec(entitlementExpiresAt) : 0;
  const exp = ee === 0 || ee > expRaw ? expRaw : ee;
  const ga = ee === 0 || ee > expRaw;
  return { exp, ee, ga };
}

let cachedPrivateKey: KeyObject | null = null;

function getPrivateKey(override?: KeyObject): KeyObject {
  if (override) return override;
  if (cachedPrivateKey) return cachedPrivateKey;
  const pem = process.env.MEMORY_LICENSE_PRIVATE_KEY;
  if (!pem) {
    throw new Error(
      'MEMORY_LICENSE_PRIVATE_KEY is not set; cannot issue licenses.'
    );
  }
  cachedPrivateKey = createPrivateKey({ key: Buffer.from(pem, 'utf8'), format: 'pem' });
  return cachedPrivateKey;
}

export interface IssueLicenseArgs {
  uid: number;
  did: string;
  ent: string;
  entitlementExpiresAt: Date | null;
  vmin: string;
}

export interface IssueLicenseOptions {
  /** 测试用：注入私钥（默认读 MEMORY_LICENSE_PRIVATE_KEY）。 */
  privateKey?: KeyObject;
  /** 测试用：覆盖 kid（默认 CURRENT_KID）。 */
  kid?: string;
  /** 测试用：固定签发时间。 */
  now?: Date;
}

/**
 * 签发许可证，返回 `{ license, exp }`。license 形如 `payloadBase64url.sigBase64url`。
 */
export function issueLicense(
  args: IssueLicenseArgs,
  opts?: IssueLicenseOptions
): { license: string; exp: number } {
  const iat = epochSec(opts?.now ?? new Date());
  const { exp, ee, ga } = computeExpiry(iat, args.entitlementExpiresAt);
  const payload: LicensePayload = {
    v: LICENSE_PAYLOAD_VERSION,
    kid: opts?.kid ?? CURRENT_KID,
    uid: args.uid,
    did: args.did,
    ent: args.ent,
    ee,
    iat,
    exp,
    ga,
    vmin: args.vmin,
  };
  // 字段顺序固定 → JSON.stringify 输出确定字节序（互操作向量依赖此顺序）。
  const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
  const signature = sign(null, payloadBytes, getPrivateKey(opts?.privateKey));
  return {
    license: payloadBytes.toString('base64url') + '.' + signature.toString('base64url'),
    exp,
  };
}

export type VerifyLicenseResult =
  | { ok: true; payload: LicensePayload }
  | {
      ok: false;
      reason: 'MALFORMED' | 'UNKNOWN_KID' | 'BAD_SIG_LEN' | 'INVALID_SIGNATURE';
    };

/**
 * 验证许可证签名。publicKeyForKid 由调用方提供（kid → 公钥）。
 * 验签在原始 payload 字节上进行，**不**重新序列化，确保与 Rust 侧一致。
 */
export function verifyLicense(
  license: string,
  publicKeyForKid: (kid: string) => KeyObject | undefined
): VerifyLicenseResult {
  const dot = license.indexOf('.');
  if (dot < 0) return { ok: false, reason: 'MALFORMED' };
  const payloadB64 = license.slice(0, dot);
  const sigB64 = license.slice(dot + 1);

  let payloadBytes: Buffer;
  let sigBytes: Buffer;
  let payload: LicensePayload;
  try {
    payloadBytes = Buffer.from(payloadB64, 'base64url');
    sigBytes = Buffer.from(sigB64, 'base64url');
    payload = JSON.parse(payloadBytes.toString('utf8')) as LicensePayload;
  } catch {
    return { ok: false, reason: 'MALFORMED' };
  }
  if (sigBytes.length !== 64) return { ok: false, reason: 'BAD_SIG_LEN' };

  const pub = publicKeyForKid(payload.kid);
  if (!pub) return { ok: false, reason: 'UNKNOWN_KID' };

  const valid = verify(null, payloadBytes, pub, sigBytes);
  if (!valid) return { ok: false, reason: 'INVALID_SIGNATURE' };
  return { ok: true, payload };
}
