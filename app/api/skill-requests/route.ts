import { NextResponse } from 'next/server';
import { getSessionUid } from '@/lib/session';
import { trackActivity } from '@/lib/activity';
import { withMetrics } from '@/lib/metrics';
import {
  createSkillRequest,
  listSkillRequests,
  SKILL_REQUEST_STATUSES,
  type SkillRequestSort,
  type SkillRequestStatus,
} from '@/lib/skill-requests';
import { skillRequestErrorResponse } from '@/lib/skill-request-api';

export const GET = withMetrics('GET /api/skill-requests', listRequests);
export const POST = withMetrics('POST /api/skill-requests', createRequest);

async function listRequests(req: Request) {
  const url = new URL(req.url);
  const uid = await getSessionUid();
  const rawStatus = url.searchParams.get('status');
  const status = rawStatus && SKILL_REQUEST_STATUSES.includes(rawStatus as SkillRequestStatus)
    ? (rawStatus as SkillRequestStatus)
    : null;
  const sort: SkillRequestSort = url.searchParams.get('sort') === 'popular' ? 'popular' : 'latest';
  const items = await listSkillRequests({
    userId: uid,
    q: url.searchParams.get('q'),
    scene: url.searchParams.get('scene'),
    status,
    sort,
    limit: Number(url.searchParams.get('limit') || 60),
  });
  return NextResponse.json({ items, total: items.length });
}

async function createRequest(req: Request) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录后发布需求' }, { status: 401 });
  try {
    const data = await req.json();
    const request = await createSkillRequest(uid, data, 'web');
    trackActivity({
      type: 'skill_request_create',
      userId: uid,
      entityType: 'skill_request',
      entityId: request.id,
      source: 'web',
    });
    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    return skillRequestErrorResponse(error);
  }
}
