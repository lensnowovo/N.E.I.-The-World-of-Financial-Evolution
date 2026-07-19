import { NextResponse } from 'next/server';
import { getSessionUid } from '@/lib/session';
import { claimSkillRequest } from '@/lib/skill-requests';
import { skillRequestErrorResponse } from '@/lib/skill-request-api';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  try {
    const id = Number((await params).id);
    if (!Number.isInteger(id)) return NextResponse.json({ error: '需求编号无效' }, { status: 400 });
    return NextResponse.json(await claimSkillRequest(id, uid));
  } catch (error) {
    return skillRequestErrorResponse(error);
  }
}
