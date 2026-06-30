import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { prisma } from '@/lib/db';

/**
 * 文件存储抽象层。
 *
 * 生产环境（Vercel）用 Cloudflare R2（S3 兼容）——serverless 重启后文件不丢。
 * 本地开发（没配 R2 环境变量）自动 fallback 到本地 uploads/ 目录。
 *
 * 4 个函数签名不变，调用方（upload API、download API、AI 转写、import 脚本）零改动。
 */

// —— S3 兼容对象存储配置（支持阿里云 OSS / Cloudflare R2 / AWS S3）——
const S3_ENDPOINT = process.env.S3_ENDPOINT; // 如 https://oss-cn-hangzhou.aliyuncs.com
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL; // 公开访问域名
const S3_REGION = process.env.S3_REGION || 'auto'; // OSS 填如 oss-cn-hangzhou

// 是否启用对象存储（4 个核心配置都有才启用）
const useS3 = !!(S3_ENDPOINT && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY && S3_BUCKET_NAME);
const useDatabaseStorage = !useS3 && !!process.env.VERCEL;

// 本地 fallback
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export function isObjectStorageConfigured(): boolean {
  return useS3;
}

export function getStorageBackend(): 's3' | 'database' | 'local' {
  if (useS3) return 's3';
  if (useDatabaseStorage) return 'database';
  return 'local';
}

// S3 client（懒加载）
let _s3: S3Client | null = null;
function s3(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID!,
        secretAccessKey: S3_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3;
}

/**
 * 生成存储 key（共用）
 */
function generateKey(originalName: string): string {
  const ext = path.extname(originalName).slice(0, 16);
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

/** 从文件名扩展名推断 MIME（上传到 R2/S3 时写入对象 Content-Type 元数据） */
const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  mp4: 'video/mp4',
  zip: 'application/zip',
  md: 'text/markdown',
  txt: 'text/plain',
};

function mimeFromName(name: string): string {
  const ext = path.extname(name).slice(1).toLowerCase();
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

// ============================================================
// 公共 API（签名与旧版完全一致）
// ============================================================

export async function ensureUploadDir() {
  if (useS3) return; // 对象存储不需要建目录
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function saveBuffer(buf: Buffer, originalName: string): Promise<string> {
  const key = generateKey(originalName);

  if (useS3) {
    await s3().send(
      new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: buf,
        ContentType: mimeFromName(originalName),
      }),
    );
    return key;
  }

  if (useDatabaseStorage) {
    await prisma.storedFile.create({
      data: {
        key,
        data: buf,
        mimeType: mimeFromName(originalName),
      },
    });
    return key;
  }

  // 本地 fallback
  await ensureUploadDir();
  await fs.writeFile(path.join(UPLOAD_DIR, key), buf);
  return key;
}

export async function readFileByKey(key: string): Promise<Buffer> {
  const safe = path.basename(key); // 防穿越

  if (useS3) {
    const res = await s3().send(
      new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: safe,
      }),
    );
    // S3 Body 是 Readable，转 Buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as any) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  if (useDatabaseStorage) {
    const row = await prisma.storedFile.findUnique({
      where: { key: safe },
      select: { data: true },
    });
    if (!row) throw new Error('Stored file not found');
    return Buffer.from(row.data);
  }

  // 本地 fallback
  return fs.readFile(path.join(UPLOAD_DIR, safe));
}

export async function removeKey(key: string): Promise<void> {
  const safe = path.basename(key);

  if (useS3) {
    try {
      await s3().send(
        new DeleteObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: safe,
        }),
      );
    } catch {
      /* ignore */
    }
    return;
  }

  if (useDatabaseStorage) {
    try {
      await prisma.storedFile.delete({ where: { key: safe } });
    } catch {
      /* ignore */
    }
    return;
  }

  // 本地 fallback
  try {
    await fs.unlink(path.join(UPLOAD_DIR, safe));
  } catch {
    /* ignore */
  }
}

/**
 * 获取文件的公开访问 URL（对象存储公开读用，本地不需要）。
 */
export function getPublicUrl(key: string): string | null {
  if (!useS3 || !S3_PUBLIC_URL) return null;
  return `${S3_PUBLIC_URL}/${path.basename(key)}`;
}
