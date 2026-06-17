# PEVC Skills Platform V1 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the current generic post feed into a PEVC Skills Map + discovery platform where Skill Assets are first-class citizens, discovered through a work-scene × asset-type matrix.

**Architecture:** Keep the existing Next.js 14 + Prisma + SQLite + Tailwind stack. Extend the Post model with SkillAsset metadata. Add a dedicated Skills Map page as the homepage discovery experience. Refactor the feed to center on Skill Asset cards with type-specific visual identity. Fix critical bugs (sanitizeHtml) along the way. All changes stay compatible with SQLite.

**Tech Stack:** Next.js 14.2 App Router, Prisma 5, SQLite, Tailwind CSS 3, TipTap rich editor, existing "knight codex" design system.

---

## Phase 0: Critical Bug Fixes (Foundation)

### Task 0.1: Fix sanitizeHtml regex

**Files:**
- Modify: `lib/validate.ts`

**Step 1: Fix the regex interpolation**

Replace line 20 in `lib/validate.ts` — change the single-quoted string to use `new RegExp()` so the ALLOWED array is properly interpolated:

```ts
export function sanitizeHtml(html: string): string {
  const allowedPattern = ALLOWED.join('|');
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(new RegExp(`<(?!\\/?(?:${allowedPattern})\\b)[^>]*>`, 'gi'), '');
}
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add lib/validate.ts
git commit -m "fix: sanitizeHtml regex — ALLOWED tags were never interpolated"
```

---

### Task 0.2: Add POST_STATUS constants

**Files:**
- Create: `lib/status.ts`
- Modify: `app/api/posts/route.ts` — replace `'published'` magic strings
- Modify: `app/posts/[id]/page.tsx` — replace `'published'` magic string
- Modify: `lib/feed.ts` — replace `'published'` magic string

**Step 1: Create status constants**

Create `lib/status.ts`:

```ts
export const POST_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
} as const;

export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS];
```

**Step 2: Replace magic strings**

In `app/api/posts/route.ts`, `app/posts/[id]/page.tsx`, `lib/feed.ts`:
- Import `POST_STATUS` from `@/lib/status`
- Replace `'published'` with `POST_STATUS.PUBLISHED`

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add lib/status.ts app/api/posts/route.ts app/posts/[id]/page.tsx lib/feed.ts
git commit -m "feat: add POST_STATUS constants, replace magic strings"
```

---

### Task 0.3: Fix formatCount for large numbers

**Files:**
- Modify: `lib/format.ts`

**Step 1: Fix formatCount**

```ts
export function formatCount(n: number): string {
  if (n >= 10000) return `${Math.floor(n / 10000)}万+`;
  if (n >= 1000) return `${Math.floor(n / 1000)}k+`;
  return String(n);
}
```

**Step 2: Commit**

```bash
git add lib/format.ts
git commit -m "fix: formatCount returns dynamic values instead of always 1k+"
```

---

## Phase 1: Data Model — SkillAsset as First-Class Citizen

### Task 1.1: Add SkillAsset model to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/add-skill-asset.md` (documentation only)

**Step 1: Add SkillAsset model**

Add to `prisma/schema.prisma`:

```prisma
model SkillAsset {
  id          Int      @id @default(autoincrement())
  postId      Int      @unique
  assetType   String   // prompt / agent-skill / workflow / tool-stack / template / api-script / case-study
  sourceUrl   String?
  installHint String?
  usageNotes  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@index([assetType])
}
```

Add relation to Post model:

```prisma
  skillAsset   SkillAsset?
```

Also add `updatedAt DateTime @updatedAt` to Post model (it's missing).

**Step 2: Push schema**

Run: `npx prisma db push --force-reset --accept-data-loss`
Then: `npm run db:seed`

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add SkillAsset model with sourceUrl/installHint/usageNotes"
```

---

### Task 1.2: Update seed data for SkillAsset

**Files:**
- Modify: `prisma/seed.ts`

**Step 1: Update seed to create SkillAsset records**

For each existing post in the seed, add a `skillAsset` creation alongside the post. Map existing `tagSkill` values to `assetType`:

```ts
// After creating each post:
await tx.skillAsset.create({
  data: {
    postId: post.id,
    assetType: post.tagSkill || 'prompt',
    sourceUrl: null,
    installHint: null,
    usageNotes: null,
  },
});
```

**Step 2: Reset and reseed**

Run: `npx prisma db push --force-reset --accept-data-loss && npm run db:seed`

**Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed data creates SkillAsset records for all posts"
```

---

## Phase 2: Asset Type Helpers & Tags Enhancement

### Task 2.1: Add asset-type-specific helper text

**Files:**
- Modify: `lib/tags.ts`

**Step 1: Add ASSET_TYPE_HELPERS constant**

Add to `lib/tags.ts` after `roleColor`:

```ts
export const ASSET_TYPE_HELPERS: Record<string, { body: string; installHint: string; usageNotes: string }> = {
  prompt: {
    body: '建议包含：Prompt 原文、输入示例、期望输出格式、适用场景说明。',
    installHint: '说明使用这个 Prompt 需要的模型或工具（如 ChatGPT、Claude 等）。',
    usageNotes: '说明这个 Prompt 适合谁使用、在什么场景下使用效果最好。',
  },
  'agent-skill': {
    body: '建议包含：SKILL.md 全文或核心结构、安装步骤、使用方法。',
    installHint: '提供 SKILL.md 的安装方式（如放置路径、Claude Code 命令等）。',
    usageNotes: '说明这个 Agent Skill 的适用场景、注意事项和已知限制。',
  },
  workflow: {
    body: '建议包含：完整工作流步骤、每步输入/输出、可复现的操作说明。',
    installHint: '说明工作流中需要的工具、环境和前置条件。',
    usageNotes: '说明这个 Workflow 适合的场景、预期产出和常见问题。',
  },
  'tool-stack': {
    body: '建议包含：工具组合清单、每个工具的作用、组合使用的步骤。',
    installHint: '列出所有工具的安装或注册方式。',
    usageNotes: '说明这个工具组合适合谁、核心优势和替代方案。',
  },
  template: {
    body: '建议包含：模板用途说明、使用步骤、填写要点。模板文件请作为附件上传。',
    installHint: '说明模板格式（Word / Excel / PPT / Markdown 等）和打开方式。',
    usageNotes: '说明模板适合的场景和自定义建议。',
  },
  'api-script': {
    body: '建议包含：脚本用途、完整代码或核心逻辑、运行方式。',
    installHint: '说明运行环境、依赖安装和环境变量配置。',
    usageNotes: '说明脚本的使用场景、输入输出格式和注意事项。',
  },
  'case-study': {
    body: '建议包含：项目背景、方法论、完整步骤、结果和复盘总结。',
    installHint: '说明复现这个案例需要的工具和数据。',
    usageNotes: '说明这个案例的适用范围和可借鉴的要点。',
  },
};
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add lib/tags.ts
git commit -m "feat: add ASSET_TYPE_HELPERS for per-type publish guidance"
```

---

## Phase 3: Skills Map Page — The Discovery Engine

### Task 3.1: Create Skills Map data query

**Files:**
- Create: `lib/skills-map.ts`

**Step 1: Implement getSkillsMap query**

Create `lib/skills-map.ts`:

```ts
import { prisma } from '@/lib/db';
import { POST_STATUS } from '@/lib/status';
import { SCENE_TAGS, SKILL_TAGS } from '@/lib/tags';

export type SkillsMapCell = {
  scene: string;
  assetType: string;
  count: number;
  featured: {
    id: number;
    title: string;
    author: { nickname: string; role: string };
  } | null;
};

export type SkillsMapStats = {
  totalAssets: number;
  activeScenes: number;
  topAssetType: { value: string; label: string; count: number } | null;
};

export async function getSkillsMap() {
  const posts = await prisma.post.findMany({
    where: { status: POST_STATUS.PUBLISHED, skillAsset: { isNot: null } },
    include: {
      author: { select: { id: true, nickname: true, role: true, avatarUrl: true } },
      skillAsset: true,
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  const grouped = new Map<string, typeof posts>();
  const activeSceneValues = new Set<string>();
  const assetTypeCounts = new Map<string, number>();

  for (const post of posts) {
    if (!post.skillAsset) continue;
    if (!post.tagScene) continue;

    activeSceneValues.add(post.tagScene);
    const at = post.skillAsset.assetType;
    assetTypeCounts.set(at, (assetTypeCounts.get(at) ?? 0) + 1);

    const key = `${post.tagScene}::${at}`;
    grouped.set(key, [...(grouped.get(key) ?? []), post]);
  }

  // Build 70 cells (10 scenes × 7 types)
  const cells: SkillsMapCell[] = [];
  for (const scene of SCENE_TAGS) {
    for (const skill of SKILL_TAGS) {
      const key = `${scene.value}::${skill.value}`;
      const items = grouped.get(key) ?? [];
      const featured = items[0];
      cells.push({
        scene: scene.value,
        assetType: skill.value,
        count: items.length,
        featured: featured
          ? { id: featured.id, title: featured.title, author: { nickname: featured.author.nickname, role: featured.author.role } }
          : null,
      });
    }
  }

  // Stats
  let topAssetType: SkillsMapStats['topAssetType'] = null;
  for (const [value, count] of assetTypeCounts) {
    if (!topAssetType || count > topAssetType.count) {
      const tag = SKILL_TAGS.find((s) => s.value === value);
      topAssetType = { value, label: tag?.label ?? value, count };
    }
  }

  return {
    cells,
    stats: { totalAssets: posts.length, activeScenes: activeSceneValues.size, topAssetType },
  };
}
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add lib/skills-map.ts
git commit -m "feat: add getSkillsMap query with stats and cell data"
```

---

### Task 3.2: Create Skills Map page

**Files:**
- Create: `app/skills-map/page.tsx`

**Step 1: Implement the Skills Map page**

Create `app/skills-map/page.tsx` — a server component that:
1. Calls `getSkillsMap()`
2. Renders a header with stats (total assets, active scenes, top type)
3. Desktop: matrix grid (10 scenes × 7 types), each cell shows count + featured title + author role, links to filtered feed
4. Mobile: grouped cards by scene
5. Uses existing design system: `Card`, `SkillChip`, `SceneChip` components, parchment color tokens
6. "发布 Skill Asset" button links to `/publish`

Key design:
- Non-empty cells: `bg-vellum hover:bg-linen`, show count in `text-wax-red font-semibold`, featured title, author role
- Empty cells: `bg-paper-edge border-dashed`, show "等待贡献"
- Each cell links to `/?scene={scene}&assetType={type}`

**Step 2: Add Skills Map to navigation**

In `components/chrome/SiteHeader.tsx`, add "Skills Map" nav link (between 目录 and 检索).

**Step 3: Verify build and visually test**

Run: `npm run build`, then `npm run dev`
Visit: `http://localhost:3000/skills-map`

**Step 4: Commit**

```bash
git add app/skills-map/page.tsx components/chrome/SiteHeader.tsx
git commit -m "feat: add Skills Map page with scene×type matrix and responsive layout"
```

---

## Phase 4: Homepage as Discovery Surface

### Task 4.1: Redesign homepage

**Files:**
- Modify: `app/page.tsx`

**Step 1: Restructure homepage**

The homepage should communicate "PEVC Skills Map + Community" immediately:

1. **Hero section** — Title "PEVC Skills Map", one-line description, two CTAs: "探索 Skills Map" (primary, links to `/skills-map`) and "发布 Skill Asset" (secondary, links to `/publish`). Show 3 stat pills (total assets, active scenes, top type) from `getSkillsMap()`.
2. **Featured cells** — Up to 8 non-empty Skills Map cells as quick-discovery cards, each linking to filtered feed.
3. **Feed** — Keep existing FilterBar + PostCard list below, but rename heading from "卷宗目录" to "最新 Skill Assets".

Fetch both `getSkillsMap()` and `fetchFeed()` in parallel.

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: homepage redesigned as Skills Map discovery surface"
```

---

## Phase 5: Publish Flow — Asset-Type-Aware

### Task 5.1: Update publish API to create SkillAsset

**Files:**
- Modify: `app/api/posts/route.ts`

**Step 1: Extend POST handler**

In the POST handler, after creating the Post, also create a SkillAsset:

```ts
await tx.skillAsset.create({
  data: {
    postId: post.id,
    assetType: tagSkill || 'prompt',
    sourceUrl: sourceUrl || null,
    installHint: installHint || null,
    usageNotes: usageNotes || null,
  },
});
```

Wrap in `prisma.$transaction`. Accept new fields: `sourceUrl`, `installHint`, `usageNotes`.

Add validation:
- `sourceUrl`: optional, must start with `http://` or `https://` if provided
- `installHint`: optional, max 2000 chars
- `usageNotes`: optional, max 2000 chars

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add app/api/posts/route.ts
git commit -m "feat: publish API creates SkillAsset with metadata"
```

---

### Task 5.2: Enhance PublishForm with asset-type guidance

**Files:**
- Modify: `app/publish/PublishForm.tsx`

**Step 1: Restructure form sections**

1. **Skill 类型 (Section I)** — Move to top. Make required. Use prominent grid with ring highlight on selected. Show `desc` from SKILL_TAGS.
2. **标题 + 正文 (Section II)** — Add helper text above RichEditor based on `ASSET_TYPE_HELPERS[assetType]?.body`. Only show when assetType is selected.
3. **分类标签 (Section III)** — Scene required (existing), Industry optional, Content max 3, Skill type auto-set from Section I (remove separate skill selector).
4. **Skill 资产信息 (Section IV)** — Source URL, Install Hint (with per-type placeholder from ASSET_TYPE_HELPERS), Usage Notes.
5. **附件 (Section V)** — Add context-aware text: "建议上传模板文件" for template type, "建议将脚本文件上传" for api-script type.

**Step 2: Add client-side validation**

- assetType required
- sourceUrl must be valid URL if provided
- Match server-side schema

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add app/publish/PublishForm.tsx
git commit -m "feat: publish form with asset-type-aware guidance and metadata fields"
```

---

## Phase 6: Detail Page — Skill Asset Panel

### Task 6.1: Redesign post detail page

**Files:**
- Modify: `app/posts/[id]/page.tsx`

**Step 1: Add Skill Asset panel**

When `skillAsset` exists:
1. Show asset type prominently as a wax-red badge at top (not a generic chip)
2. Add a dedicated "Skill 资产信息" panel with styled border (`border-wax-red/30 bg-vellum/50`):
   - Source URL as clickable link
   - Install Hint — if assetType is `api-script`, render in monospace `bg-ink-brown text-sepia` block
   - Usage Notes — same monospace treatment for api-script
   - If `agent-skill`, show note: "这是一个 Agent Skill 资产。SKILL.md 文件可从下方附件获取。"
3. Rename attachment section header based on type: "模板文件" for template, "资源文件" otherwise
4. Keep existing: comments, likes, favorites, downloads, sidebar

**Step 2: Update query to include skillAsset**

In the detail page query, add `skillAsset: true` to the Prisma include.

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add app/posts/[id]/page.tsx
git commit -m "feat: detail page shows Skill Asset panel with type-specific styling"
```

---

## Phase 7: Skill Asset Card Identity

### Task 7.1: Enhance PostCard for Skill Asset identity

**Files:**
- Modify: `components/PostCard.tsx`

**Step 1: Add asset type badge to card**

Each card should show:
1. **Skill type icon** — Use `SkillIcon` component with the asset type
2. **Scene chip** — Always visible (most useful filter dimension)
3. **Download count** if attachments exist — replace generic attachment icon count with download count

The card layout (top to bottom):
- Row 1: SkillIcon + skill label (left), Scene chip (right)
- Row 2: Title
- Row 3: Excerpt (2 lines)
- Row 4: Author + role badge + time
- Row 5: Interaction bar (like/comment/bookmark/download-count)

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add components/PostCard.tsx
git commit -m "feat: PostCard shows Skill Asset type icon and scene chip"
```

---

## Phase 8: Update Feed Data Layer

### Task 8.1: Update feed queries to include SkillAsset

**Files:**
- Modify: `lib/feed.ts`
- Modify: `app/api/posts/route.ts`

**Step 1: Add skillAsset to Prisma includes**

In both `fetchFeed()` and the API GET handler, add `skillAsset: true` to the include.

**Step 2: Include skillAsset in PostCardData type**

In `components/PostCard.tsx`, extend `PostCardData` to include:
```ts
skillAsset: {
  id: number;
  assetType: string;
} | null;
```

Map it from the Prisma result.

**Step 3: Deduplicate feed logic**

Extract the shared where-clause builder and like/fav fetching into `lib/feed.ts`. Have the API route import from there instead of duplicating.

**Step 4: Verify build**

Run: `npm run build`

**Step 5: Commit**

```bash
git add lib/feed.ts app/api/posts/route.ts components/PostCard.tsx
git commit -m "feat: feed includes SkillAsset data, deduplicate query logic"
```

---

## Phase 9: README & Documentation

### Task 9.1: Update README

**Files:**
- Modify: `README.md`

**Step 1: Rewrite README**

Document:
- Product: PEVC Skills Map + Community Platform
- Post vs SkillAsset relationship
- Skills Map purpose (scene × type matrix)
- Four-dimensional tag system
- Local setup commands (including `npx prisma db push --force-reset && npm run db:seed` for full reset)
- V1.0 simplifications vs PRD

Keep concise.

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for Skills Map platform architecture"
```

---

## Phase 10: Final Verification

### Task 10.1: Full build and DB reset

**Step 1: Run full reset**

```bash
npx prisma db push --force-reset --accept-data-loss
npm run db:seed
npm run build
```

**Step 2: Manual smoke test checklist**

- [ ] `http://localhost:3000` — Homepage shows Skills Map preview + stats + feed
- [ ] `http://localhost:3000/skills-map` — Matrix renders, cells show counts, links work
- [ ] `http://localhost:3000/publish` — Asset type prominent, helper text appears, Skill metadata fields present
- [ ] Publish a test asset → redirects to detail page
- [ ] Detail page shows Skill Asset panel with type badge
- [ ] PostCard in feed shows type icon and scene chip
- [ ] Filter by scene/assetType from Skills Map cells works
- [ ] Comments, likes, favorites still work
- [ ] Login/register still works

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: final V1 polish and verification"
```

---

## Task Dependency Graph

```
Phase 0 (bug fixes) → all other phases
Phase 1 (SkillAsset model) → Phase 2, 3, 5, 6, 7, 8
Phase 2 (helpers) → Phase 5
Phase 3 (Skills Map) → Phase 4
Phase 4 (homepage) — independent of 5-8
Phase 5 (publish) → Phase 6
Phase 6 (detail page) — independent of 7-8
Phase 7 (card identity) — independent of 5-6
Phase 8 (feed data) — depends on 7 (PostCardData type)
Phase 9 (README) — after all phases
Phase 10 (verify) — last
```

## Estimated Complexity

| Phase | Scope | Risk |
|-------|-------|------|
| 0: Bug fixes | 3 small changes | Low |
| 1: Data model | Schema + seed migration | Medium (DB migration) |
| 2: Tags helpers | Add constants | Low |
| 3: Skills Map | New page + query | Medium (new feature) |
| 4: Homepage | Restructure existing page | Low |
| 5: Publish flow | Extend API + form | Medium (form changes) |
| 6: Detail page | Extend existing page | Low |
| 7: Card identity | Modify component | Low |
| 8: Feed data | Deduplicate + extend | Medium (refactor) |
| 9: README | Documentation | Low |
| 10: Verify | Build + test | Low |

**Total: ~10 phases, ~15 commits, estimated 4-6 hours of implementation.**
