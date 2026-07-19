import { NextResponse } from 'next/server';
import { SkillRequestError } from '@/lib/skill-requests';

export function skillRequestErrorResponse(error: unknown) {
  if (error instanceof SkillRequestError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: '请求内容不是有效 JSON' }, { status: 400 });
  }
  console.error('[skill-requests]', error);
  return NextResponse.json({ error: '服务暂时不可用，请稍后重试' }, { status: 500 });
}
