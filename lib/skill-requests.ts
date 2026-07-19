import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { POST_STATUS } from '@/lib/status';
import { SCENE_TAGS, sceneLabel } from '@/lib/tags';

export const SKILL_REQUEST_STATUSES = ['open', 'claimed', 'solved', 'closed'] as const;
export const SKILL_SOLUTION_STATUSES = ['proposed', 'accepted', 'rejected'] as const;

export type SkillRequestStatus = (typeof SKILL_REQUEST_STATUSES)[number];
export type SkillRequestSort = 'latest' | 'popular';

const SCENES = new Set<string>(SCENE_TAGS.map((item) => item.value));

export class SkillRequestError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = 'INVALID_REQUEST',
  ) {
    super(message);
  }
}

function plain(value: unknown) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeSkillRequestInput(input: {
  title?: unknown;
  description?: unknown;
  scene?: unknown;
  acceptanceCriteria?: unknown;
}) {
  const title = plain(input.title);
  const description = plain(input.description);
  const scene = plain(input.scene);
  const acceptanceCriteria = Array.isArray(input.acceptanceCriteria)
    ? input.acceptanceCriteria.map(plain).filter(Boolean).slice(0, 5)
    : [];

  if (title.length < 5 || title.length > 80) {
    throw new SkillRequestError('需求标题需 5-80 字符');
  }
  if (description.length < 12 || description.length > 1200) {
    throw new SkillRequestError('需求说明需 12-1200 字符');
  }
  if (!SCENES.has(scene)) {
    throw new SkillRequestError('请选择有效的投资工作场景');
  }
  if (acceptanceCriteria.some((item) => item.length > 120)) {
    throw new SkillRequestError('每条验收标准最多 120 字符');
  }

  return { title, description, scene, acceptanceCriteria };
}

export async function createSkillRequest(
  userId: number,
  input: Parameters<typeof normalizeSkillRequestInput>[0],
  source: 'web' | 'mcp' = 'web',
) {
  const data = normalizeSkillRequestInput(input);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [user, recentCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } }),
    prisma.skillRequest.count({ where: { requesterId: userId, createdAt: { gte: since } } }),
  ]);
  if (!user) throw new SkillRequestError('用户不存在', 404, 'USER_NOT_FOUND');
  if (!user.isAdmin && recentCount >= 5) {
    throw new SkillRequestError('每天最多发布 5 条需求，请明天再试', 429, 'DAILY_LIMIT');
  }
  return prisma.skillRequest.create({
    data: {
      requesterId: userId,
      title: data.title,
      description: data.description,
      scene: data.scene,
      acceptanceCriteria: JSON.stringify(data.acceptanceCriteria),
      source,
    },
    select: { id: true, title: true, status: true, createdAt: true },
  });
}

type ListInput = {
  userId?: number | null;
  q?: string | null;
  scene?: string | null;
  status?: SkillRequestStatus | null;
  sort?: SkillRequestSort;
  limit?: number;
};

const requestInclude = {
  requester: { select: { id: true, nickname: true, role: true } },
  claimedBy: { select: { id: true, nickname: true } },
  supports: { select: { userId: true } },
  solutions: {
    orderBy: [{ status: 'asc' as const }, { createdAt: 'desc' as const }],
    include: {
      author: { select: { id: true, nickname: true } },
      post: {
        select: {
          id: true,
          title: true,
          status: true,
          deletedAt: true,
          mcpApproved: true,
          skillAsset: { select: { assetType: true } },
        },
      },
    },
  },
} satisfies Prisma.SkillRequestInclude;

export async function listSkillRequests(input: ListInput = {}) {
  const q = plain(input.q);
  const requestedLimit = Number(input.limit ?? 40);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100)
    : 40;
  const where: Prisma.SkillRequestWhereInput = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (input.scene && SCENES.has(input.scene)) where.scene = input.scene;
  if (input.status && SKILL_REQUEST_STATUSES.includes(input.status)) where.status = input.status;

  const rows = await prisma.skillRequest.findMany({
    where,
    include: requestInclude,
    orderBy:
      input.sort === 'popular'
        ? [{ supports: { _count: 'desc' } }, { createdAt: 'desc' }]
        : { createdAt: 'desc' },
    take: limit,
  });
  return rows.map((row) => serializeRequest(row, input.userId ?? null));
}

export async function getSkillRequest(id: number, userId?: number | null) {
  const row = await prisma.skillRequest.findUnique({ where: { id }, include: requestInclude });
  return row ? serializeRequest(row, userId ?? null) : null;
}

function serializeRequest(
  row: Prisma.SkillRequestGetPayload<{ include: typeof requestInclude }>,
  userId: number | null,
) {
  let criteria: string[] = [];
  try {
    const parsed = JSON.parse(row.acceptanceCriteria);
    if (Array.isArray(parsed)) criteria = parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    criteria = [];
  }
  const visibleSolutions = row.solutions.filter(
    (solution) =>
      solution.status !== 'rejected' &&
      solution.post.status === POST_STATUS.PUBLISHED &&
      !solution.post.deletedAt,
  );
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    scene: row.scene,
    sceneLabel: sceneLabel(row.scene),
    source: row.source,
    status: row.status,
    acceptanceCriteria: criteria,
    requester: row.requester,
    claimedBy: row.claimedBy,
    supportCount: row.supports.length,
    supportedByMe: userId ? row.supports.some((support) => support.userId === userId) : false,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    solutions: visibleSolutions.map((solution) => ({
      id: solution.id,
      status: solution.status,
      note: solution.note,
      createdAt: solution.createdAt.toISOString(),
      author: solution.author,
      post: {
        id: solution.post.id,
        title: solution.post.title,
        mcpApproved: solution.post.mcpApproved,
        assetType: solution.post.skillAsset?.assetType ?? null,
      },
    })),
  };
}

export async function toggleSkillRequestSupport(requestId: number, userId: number) {
  const exists = await prisma.skillRequest.findUnique({ where: { id: requestId }, select: { id: true } });
  if (!exists) throw new SkillRequestError('需求不存在', 404, 'NOT_FOUND');
  const removed = await prisma.skillRequestSupport.deleteMany({ where: { requestId, userId } });
  if (removed.count === 0) {
    try {
      await prisma.skillRequestSupport.create({ data: { requestId, userId } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
    }
    return { supported: true };
  }
  return { supported: false };
}

export async function claimSkillRequest(requestId: number, userId: number) {
  const request = await prisma.skillRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new SkillRequestError('需求不存在', 404, 'NOT_FOUND');
  if (request.requesterId === userId) throw new SkillRequestError('不能认领自己发布的需求', 400, 'OWN_REQUEST');
  if (request.status === 'solved' || request.status === 'closed') {
    throw new SkillRequestError('该需求已经结束', 409, 'REQUEST_CLOSED');
  }
  const updated = await prisma.skillRequest.updateMany({
    where: { id: requestId, claimedById: null, status: 'open' },
    data: { claimedById: userId, claimedAt: new Date(), status: 'claimed' },
  });
  if (!updated.count && request.claimedById !== userId) {
    throw new SkillRequestError('该需求已被其他贡献者认领', 409, 'ALREADY_CLAIMED');
  }
  return { claimed: true };
}

export async function submitSkillRequestSolution(
  requestId: number,
  userId: number,
  input: { postId?: unknown; note?: unknown },
) {
  const postId = Number(input.postId);
  const note = plain(input.note).slice(0, 500) || null;
  if (!Number.isInteger(postId) || postId < 1) throw new SkillRequestError('请选择一个有效的 Skill');

  const [request, post] = await Promise.all([
    prisma.skillRequest.findUnique({ where: { id: requestId } }),
    prisma.post.findFirst({
      where: { id: postId, status: POST_STATUS.PUBLISHED, deletedAt: null, skillAsset: { isNot: null } },
      select: { id: true },
    }),
  ]);
  if (!request) throw new SkillRequestError('需求不存在', 404, 'NOT_FOUND');
  if (!post) throw new SkillRequestError('该 Skill 不存在或尚未公开', 400, 'INVALID_SKILL');
  if (request.status === 'solved' || request.status === 'closed') {
    throw new SkillRequestError('该需求已经结束', 409, 'REQUEST_CLOSED');
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const solution = await tx.skillRequestSolution.create({
        data: { requestId, userId, postId, note },
        select: { id: true },
      });
      if (request.status === 'open') {
        await tx.skillRequest.updateMany({
          where: { id: requestId, status: 'open' },
          data: { status: 'claimed', claimedById: userId, claimedAt: new Date() },
        });
      }
      return solution;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new SkillRequestError('这个 Skill 已经提交过了', 409, 'DUPLICATE_SOLUTION');
    }
    throw error;
  }
}

export async function acceptSkillRequestSolution(requestId: number, solutionId: number, userId: number) {
  const [request, user, solution] = await Promise.all([
    prisma.skillRequest.findUnique({ where: { id: requestId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } }),
    prisma.skillRequestSolution.findFirst({ where: { id: solutionId, requestId } }),
  ]);
  if (!request || !solution) throw new SkillRequestError('需求或解决方案不存在', 404, 'NOT_FOUND');
  if (request.requesterId !== userId && !user?.isAdmin) {
    throw new SkillRequestError('只有需求发布者或管理员可以采纳方案', 403, 'FORBIDDEN');
  }
  await prisma.$transaction([
    prisma.skillRequestSolution.updateMany({
      where: { requestId, NOT: { id: solutionId } },
      data: { status: 'rejected' },
    }),
    prisma.skillRequestSolution.update({ where: { id: solutionId }, data: { status: 'accepted' } }),
    prisma.skillRequest.update({ where: { id: requestId }, data: { status: 'solved', solvedAt: new Date() } }),
  ]);
  return { accepted: true };
}
