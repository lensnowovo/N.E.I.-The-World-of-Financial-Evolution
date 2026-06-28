import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/db';
import { POST_STATUS } from '@/lib/status';
import { sanitizeHtml } from '@/lib/validate';
import { normalizePublicText } from '@/lib/public-url';
import { contentLabel, industryLabel, sceneLabel, skillLabel } from '@/lib/tags';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return new Response('Not found', { status: 404 });

  const post = await prisma.post.findFirst({
    where: {
      id,
      status: POST_STATUS.PUBLISHED,
      deletedAt: null,
    },
    select: {
      title: true,
      body: true,
      tagScene: true,
      tagIndustry: true,
      tagContent: true,
      author: { select: { nickname: true, role: true } },
      skillAsset: { select: { assetType: true } },
      _count: { select: { stars: true } },
    },
  });

  if (!post) return new Response('Not found', { status: 404 });

  const assetLabel = post.skillAsset?.assetType ? skillLabel(post.skillAsset.assetType) : 'Skill';
  const contentTags = parseTagContent(post.tagContent).slice(0, 2).map((tag) => contentLabel(tag));
  const tags = [
    sceneLabel(post.tagScene),
    post.tagIndustry ? industryLabel(post.tagIndustry) : null,
    ...contentTags,
    assetLabel,
  ].filter(Boolean);
  const description = cleanExcerpt(normalizePublicText(sanitizeHtml(post.body)), 94);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: '#f5efe2',
          color: '#3a2a1f',
          border: '18px solid #e4d5bd',
          fontFamily: 'serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 34, letterSpacing: 5, color: '#8a6b43' }}>N.E.I.</div>
            <div style={{ fontSize: 22, color: '#8a6b43' }}>New Era Investors</div>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              fontSize: 22,
              color: '#6f5b49',
              border: '2px solid #d8c7ab',
              padding: '10px 18px',
            }}
          >
            <span>{assetLabel}</span>
            <span>·</span>
            <span>{sceneLabel(post.tagScene)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ fontSize: 60, lineHeight: 1.12, maxWidth: 1010 }}>
            {truncate(post.title, 46)}
          </div>
          {description && (
            <div style={{ fontSize: 28, lineHeight: 1.42, maxWidth: 980, color: '#6f5b49' }}>
              {description}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 24,
            borderTop: '2px solid #d8c7ab',
            paddingTop: 24,
            color: '#6f5b49',
          }}
        >
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 22 }}>
            {tags.slice(0, 5).map((tag) => (
              <span key={tag} style={{ padding: '6px 12px', border: '1px solid #d8c7ab' }}>
                {tag}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 22, whiteSpace: 'nowrap' }}>
            {post.author.nickname} · {post._count.stars} Stars
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

function parseTagContent(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function cleanExcerpt(html: string, maxLength: number) {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  return truncate(text, maxLength);
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}
