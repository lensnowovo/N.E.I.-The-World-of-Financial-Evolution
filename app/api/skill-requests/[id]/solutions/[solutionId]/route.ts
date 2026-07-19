import { NextResponse } from 'next/server';
import { getSessionUid } from '@/lib/session';
import { acceptSkillRequestSolution } from '@/lib/skill-requests';
import { skillRequestErrorResponse } from '@/lib/skill-request-api';

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string; solutionId: string }> },
) {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  try {
    const values = await params;
    const requestId = Number(values.id);
    const solutionId = Number(values.solutionId);
    if (!Number.isInteger(requestId) || !Number.isInteger(solutionId)) {
      return NextResponse.json({ error: '编号无效' }, { status: 400 });
    }
    return NextResponse.json(await acceptSkillRequestSolution(requestId, solutionId, uid));
  } catch (error) {
    return skillRequestErrorResponse(error);
  }
}
