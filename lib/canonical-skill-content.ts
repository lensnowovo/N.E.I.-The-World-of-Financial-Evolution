import fs from 'node:fs/promises';
import path from 'node:path';
import { readFileByKey } from '@/lib/storage';

type SkillAttachment = {
  fileName: string;
  mimeType: string;
  storageKey: string;
};

const TEXT_SKILL_EXTENSION = /\.(md|markdown|txt)$/i;
const MAX_SKILL_BYTES = 2 * 1024 * 1024;

/**
 * Resolve the canonical, Agent-readable Skill source.
 *
 * Post.body is an editorial introduction for people browsing the website. For
 * Skills with a markdown attachment, MCP must return the attachment instead of
 * accidentally executing that introduction as the Skill instruction.
 */
export async function readCanonicalSkillContent(
  attachments: SkillAttachment[],
  fallbackText: string,
): Promise<string> {
  const attachment = attachments.find(
    (item) => TEXT_SKILL_EXTENSION.test(item.fileName) || item.mimeType === 'text/markdown',
  );
  if (!attachment) return fallbackText;

  let buffer: Buffer;
  try {
    const safe = path.basename(attachment.storageKey);
    buffer = await fs.readFile(path.join(process.cwd(), 'public', 'file-cache', safe));
  } catch {
    try {
      buffer = await readFileByKey(attachment.storageKey);
    } catch {
      throw new Error(`Canonical Skill source is unavailable: ${attachment.fileName}`);
    }
  }

  if (buffer.length === 0 || buffer.length > MAX_SKILL_BYTES) {
    throw new Error(`Canonical Skill source has an invalid size: ${attachment.fileName}`);
  }
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '').trim();
  if (!text) throw new Error(`Canonical Skill source is empty: ${attachment.fileName}`);
  return text;
}
