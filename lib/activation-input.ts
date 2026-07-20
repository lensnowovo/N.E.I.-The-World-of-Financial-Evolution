/**
 * 激活接口输入校验与长度限制（P2-1）。纯函数，便于离线单测。
 *
 * - 先限长度再做正则，杜绝超长输入消耗正则引擎或落库。
 * - device_name：trim 后 1–80 字符，禁止控制字符。
 * - 其余字段：长度上限 + 格式正则。
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const PLATFORMS = new Set(['windows', 'macos']);

import { isValidCodeFormat } from './activation-code';

// 控制字符（含 DEL）一律禁止进入 device_name。
const CONTROL_CHAR_RE = /[\x00-\x1F\x7F]/;

export const LIMITS = {
  CODE_MAX: 16,
  DEVICE_ID_MAX: 64,
  DEVICE_NAME_MIN: 1,
  DEVICE_NAME_MAX: 80,
  CLIENT_VERSION_MAX: 32,
} as const;

export interface ActivationInput {
  code: string;
  deviceId: string;
  deviceName: string;
  platform: string;
  clientVersion: string;
}

/** 校验通过返回规范化后的输入；否则返回 null（调用方返回 400 INVALID_REQUEST）。 */
export function validateActivationInput(raw: unknown): ActivationInput | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.code !== 'string' || typeof r.device_id !== 'string' ||
      typeof r.device_name !== 'string' || typeof r.platform !== 'string' ||
      typeof r.client_version !== 'string') {
    return null;
  }

  const code = r.code;
  const deviceId = r.device_id;
  const platform = r.platform;
  const clientVersion = r.client_version;

  // 长度先行（先限长度再正则）。
  if (code.length > LIMITS.CODE_MAX) return null;
  if (deviceId.length > LIMITS.DEVICE_ID_MAX) return null;
  if (clientVersion.length > LIMITS.CLIENT_VERSION_MAX) return null;

  // Crockford Base32 8 位（大小写不敏感；排除 I/L/O/U）——用 activation-code 的权威校验。
  if (!isValidCodeFormat(code)) return null;
  if (!UUID_RE.test(deviceId)) return null;
  if (!PLATFORMS.has(platform)) return null;
  if (!SEMVER_RE.test(clientVersion)) return null;

  // device_name：trim 后 1–80，禁止控制字符。
  const deviceName = r.device_name.trim();
  if (deviceName.length < LIMITS.DEVICE_NAME_MIN || deviceName.length > LIMITS.DEVICE_NAME_MAX) {
    return null;
  }
  if (CONTROL_CHAR_RE.test(deviceName)) return null;

  return { code, deviceId, deviceName, platform, clientVersion };
}
