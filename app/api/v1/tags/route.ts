import { NextResponse } from 'next/server';
import {
  SCENE_TAGS,
  INDUSTRY_TAGS,
  CONTENT_TAGS,
  SKILL_TAGS,
  ROLE_TAGS,
  STAGE_GROUPS,
} from '@/lib/tags';

/**
 * GET /api/v1/tags —— 全部分类标签
 *
 * 调用方拿到所有合法的 value + label，用于：
 * - 知道有哪些筛选维度
 * - value → label 反查（API 响应里 value，展示用 label）
 *
 * value 是稳定标识（DB/API/URL 都依赖），label 是中文展示名。
 */
export async function GET() {
  return NextResponse.json({
    data: {
      scenes: SCENE_TAGS, // 工作场景（10）
      industries: INDUSTRY_TAGS, // 行业（9）
      contents: CONTENT_TAGS, // 工作内容（11）
      skillTypes: SKILL_TAGS, // Skill 类型（7）
      roles: ROLE_TAGS, // 身份（3）
      stageGroups: STAGE_GROUPS, // 首页阶段分组（3）
    },
  });
}
