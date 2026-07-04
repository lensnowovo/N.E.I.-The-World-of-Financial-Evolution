/**
 * 微信 JS-SDK 签名逻辑。
 *
 * 流程：AppID + AppSecret → access_token → jsapi_ticket → SHA1 签名。
 * access_token 和 ticket 有效期 7200 秒，缓存在模块级变量（同一 serverless 实例内共享）。
 */

const WX_API = 'https://api.weixin.qq.com/cgi-bin';

let cachedAccessToken: { token: string; expiresAt: number } | null = null;
let cachedTicket: { ticket: string; expiresAt: number } | null = null;

function getAppId(): string {
  const id = process.env.WECHAT_APP_ID;
  if (!id) throw new Error('WECHAT_APP_ID 未配置');
  return id;
}

function getSecret(): string {
  const secret = process.env.WECHAT_APP_SECRET;
  if (!secret) throw new Error('WECHAT_APP_SECRET 未配置');
  return secret;
}

async function fetchAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt) {
    return cachedAccessToken.token;
  }
  const appId = getAppId();
  const secret = getSecret();
  const url = `${WX_API}/token?grant_type=client_credential&appid=${appId}&secret=${secret}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.errcode) {
    throw new Error(`微信 access_token 获取失败: ${data.errcode} ${data.errmsg}`);
  }
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000, // 提前 5 分钟过期
  };
  return data.access_token;
}

async function fetchJsapiTicket(): Promise<string> {
  if (cachedTicket && Date.now() < cachedTicket.expiresAt) {
    return cachedTicket.ticket;
  }
  const token = await fetchAccessToken();
  const url = `${WX_API}/ticket/getticket?access_token=${token}&type=jsapi`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.errcode) {
    throw new Error(`微信 jsapi_ticket 获取失败: ${data.errcode} ${data.errmsg}`);
  }
  cachedTicket = {
    ticket: data.ticket,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };
  return data.ticket;
}

function randomStr(len = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function sha1(input: string): string {
  const { createHash } = require('crypto');
  return createHash('sha1').update(input).digest('hex');
}

export type WechatSignature = {
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
};

export async function generateSignature(url: string): Promise<WechatSignature> {
  const ticket = await fetchJsapiTicket();
  const nonceStr = randomStr();
  const timestamp = Math.floor(Date.now() / 1000);
  const string1 = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
  const signature = sha1(string1);
  return { appId: getAppId(), timestamp, nonceStr, signature };
}
