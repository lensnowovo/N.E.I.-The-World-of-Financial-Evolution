import { NextResponse } from 'next/server';
import { SOCIAL_INTERACTIONS_DISABLED_MESSAGE } from '@/lib/community-features';

export async function POST() {
  return NextResponse.json({ error: SOCIAL_INTERACTIONS_DISABLED_MESSAGE }, { status: 410 });
}
