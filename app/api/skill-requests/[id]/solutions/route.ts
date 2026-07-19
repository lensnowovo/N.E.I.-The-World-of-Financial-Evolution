import { NextResponse } from 'next/server';
import { getSessionUid } from '@/lib/session';
import { submitSkillRequestSolution } from '@/lib/skill-requests';
import { skillRequestErrorResponse } from '@/lib/skill-request-api';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  try {
    const id = Number((await params).id);
    if (!Number.isInteger(id)) return NextResponse.json({ error: '需求编号无效' }, { status: 400 });
    const data = await req.json();
    const solution = await submitSkillRequestSolution(id, uid, data);
    return NextResponse.json(solution, { status: 201 });
  } catch (error) {
    return skillRequestErrorResponse(error);
  }
}
