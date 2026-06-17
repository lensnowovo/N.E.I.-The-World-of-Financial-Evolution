import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { POST_STATUS } from '@/lib/status';
import { SCENE_TAGS, SKILL_TAGS } from '@/lib/tags';

/**
 * GET /api/v1/stats —— 站点统计
 *
 * 返回已发布 skill 的总数、按场景/类型的分布。
 * 调用方能用来展示「这里有多少内容」「哪个场景最丰富」。
 */
export async function GET() {
  const where = { status: POST_STATUS.PUBLISHED, skillAsset: { isNot: null } };

  const [totalSkills, bySceneRaw, bySkillRaw] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.groupBy({ by: ['tagScene'], where, _count: true }),
    prisma.post.groupBy({ by: ['tagSkill'], where, _count: true }),
  ]);

  // 把 value 补上 label，方便调用方直接展示
  const sceneLabelMap = new Map<string, string>(SCENE_TAGS.map((t) => [t.value, t.label]));
  const skillLabelMap = new Map<string, string>(SKILL_TAGS.map((t) => [t.value, t.label]));

  const byScene = bySceneRaw
    .map((s) => ({
      value: s.tagScene,
      label: sceneLabelMap.get(s.tagScene) ?? s.tagScene,
      count: s._count,
    }))
    .sort((a, b) => b.count - a.count);

  const bySkillType = bySkillRaw
    .map((s) => ({
      value: s.tagSkill,
      label: skillLabelMap.get(s.tagSkill ?? '') ?? s.tagSkill ?? '',
      count: s._count,
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    data: {
      totalSkills,
      byScene,
      bySkillType,
    },
  });
}
