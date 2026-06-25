# AGENTS.md

Repository-level operating rules for AI coding agents working on `nei-pevc.com`.

This file is intended for Codex, GLM-5.2, Claude Code, and any other agentic coding tools used by the maintainer. It defines how agents should read the project, propose changes, edit code, verify work, and interact with GitHub.

## Project identity

- Product: `nei-pevc.com`
- Repository: `lensnowovo/N.E.I.-The-World-of-Financial-Evolution`
- Canonical repository: this repository
- Production site: <https://nei-pevc.com>
- Primary maintainer / owner: `lensnowovo`

N.E.I. is a PEVC AI Skill Hub, Prompt Library, and MCP workflow platform. It serves private-market users such as PE / VC / FA / industrial investment professionals.

## Maintainer model

This project uses a lightweight owner-led model:

- `lensnowovo` owns product direction, deployment, infrastructure, secrets, release decisions, and final merges.
- Community contributors may submit Issues and Pull Requests.
- AI agents may assist with planning, implementation, review, and verification.
- AI agents must not make product-governance decisions without explicit maintainer instruction.

## Branch and GitHub workflow

- `main` represents the production branch.
- Do not push directly to `main` once branch protection is enabled.
- All non-trivial changes should go through a Pull Request.
- PRs must pass the required CI check: `Lint, typecheck, and validate schema`.
- Never use force push on `main`.
- Never rewrite shared history unless the maintainer explicitly asks.
- Keep PRs small and reviewable.

Recommended branch naming:

- `codex/<short-task-name>`
- `glm/<short-task-name>`
- `docs/<short-task-name>`
- `fix/<short-task-name>`

## Agent labels

GitHub Issues may use these labels to route work:

- `ready-for-agent`: ready for AI-assisted planning or implementation.
- `ready-for-codex`: suitable for Codex architecture, auditing, or implementation.
- `ready-for-glm`: suitable for GLM-5.2 execution through the local coding workflow.
- `needs-owner-decision`: blocked on a product, governance, security, or business decision from `lensnowovo`.
- `security`: security, privacy, permissions, token, or secret-related issue.
- `mcp`: MCP server, token, onboarding, tool, or client integration.
- `content`: Skill, Prompt, Workflow, template, or content contribution.
- `beta-readiness`: launch readiness or public beta hardening.
- `operations`: admin, moderation, reporting, monitoring, or daily operations.

## Required reading before meaningful changes

Before changing behavior, read:

1. `README.md`
2. `NOTICE.md`
3. `CONTRIBUTING.md`
4. `prisma/schema.prisma`
5. Relevant files under `app/`, `components/`, `lib/`, `scripts/`

For MCP changes, also inspect:

- `app/api/mcp/route.ts`
- `app/connect/page.tsx`
- `app/security/page.tsx`
- `lib/mcp-safety.ts`
- token, auth, favorite, and logging helpers in `lib/`

## Security rules

Agents must not:

- Print, commit, upload, or summarize full secrets.
- Commit `.env`, `.env.local`, production tokens, database URLs, API keys, MCP tokens, or private user data.
- Add dependencies that execute remote code without a clear reason.
- Add MCP tools that read local files, upload user documents, or call external systems without explicit maintainer approval.
- Broaden CORS, auth bypasses, admin access, or public APIs without explicit security review.
- Store BP, financial models, IC materials, LP lists, or other confidential materials in repository files.

If a possible secret is found, report only the file path and variable name. Do not repeat the secret value.

## MCP safety boundaries

N.E.I. MCP should default to:

- distributing Skill / Workflow content;
- respecting user favorites and MCP admission status;
- using revocable tokens;
- avoiding storage of sensitive user prompt bodies;
- producing clear errors;
- not reading local files;
- not uploading user files;
- not silently calling third-party services.

Any change that expands MCP permissions must be treated as security-sensitive and should be labeled `security` and `mcp`.

## Local verification commands

Use the project package manager: npm.

Baseline checks:

```bash
npm run lint
npx tsc --noEmit --pretty false
npx prisma validate
```

For production-impacting changes, also run:

```bash
npm run build
```

For public Skill detail changes:

```bash
npm run smoke:public-posts
```

For online smoke testing:

```bash
npm run smoke:public-posts -- --base https://nei-pevc.com
```

If a command fails, report:

- failed command;
- short error summary;
- likely cause;
- suggested fix;
- whether the failure blocks merge.

## Pull Request expectations

Every PR should explain:

- what changed;
- why it matters;
- affected files or modules;
- tests / checks run;
- security and privacy impact;
- screenshots for UI changes where useful.

AI-generated PRs should disclose the tool used, for example:

- `Implemented with Codex`
- `Implemented with GLM-5.2 via local Claude Code workflow`
- `Reviewed by Codex`

## Content contribution rules

For Skill / Prompt / Workflow contributions, prefer clear structure:

- applicable role;
- usage scenario;
- required input material;
- step-by-step method;
- expected output;
- example input;
- example output;
- safety boundary;
- unsuitable scenarios.

High-quality content may become MCP-ready after maintainer review.

## When to stop and ask the maintainer

Stop and ask `lensnowovo` before:

- changing authentication, sessions, MCP token behavior, or admin permissions;
- changing database schema in a way that requires migration planning;
- adding paid services or new infrastructure;
- changing deployment, domain, Vercel, or production environment variables;
- deleting user-facing features;
- rewriting major architecture;
- making legal, licensing, ownership, or attribution changes;
- exposing private data or changing privacy boundaries.

## Operating principle

Move fast, but keep trust intact.

For `nei-pevc.com`, credibility with PEVC users depends on security, clarity, and reliable workflow execution. Prefer small, verified, reversible changes over large speculative rewrites.
