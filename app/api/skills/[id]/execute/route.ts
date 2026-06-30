export const dynamic = 'force-dynamic';

/**
 * Website-side Skill execution has been intentionally retired.
 *
 * N.E.I. only distributes Skill / Workflow content. Users should execute skills
 * in their trusted Agent clients through MCP, so model tokens, local files and
 * project materials stay under the user's own client boundary.
 */
export async function POST() {
  return Response.json(
    {
      error: '网站内执行 Skill 已下线，请通过 MCP 在你的 Agent 客户端中调用。',
      code: 'WEBSITE_EXECUTION_RETIRED',
      connectUrl: '/connect',
    },
    { status: 410 },
  );
}
