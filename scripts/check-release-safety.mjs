#!/usr/bin/env node
// Release-safety guard.
//
// Ensures the automated Vercel build lifecycle can NEVER mutate a database.
// A previous build ran `prisma db push` during every build (Preview AND
// Production), which risked modifying — or silently dropping — tables in the
// shared production database when Preview and Production share DATABASE_URL.
//
// What it checks (the "automated build lifecycle"):
//   - package.json scripts that run unattended: `vercel-build`, `build`,
//     `postinstall`.
//   - vercel.json command fields Vercel runs unattended: `installCommand`,
//     `buildCommand`.
//
// How it checks:
//   Each command is expanded by recursively inlining package-manager script
//   references (`npm run X`, `npm run-script X`, `pnpm X`, `pnpm run X`,
//   `yarn X`, `yarn run X`), so a command that delegates to a mutating helper
//   (e.g. `vercel-build: "pnpm db:push && next build"`) is still caught. The
//   fully expanded string is then scanned for forbidden database-mutating
//   tokens.
//
// It does NOT police manual/operator scripts (`db:push`, `setup`,
// `db:migrate:deploy`, etc.) — those are intentionally invoked by humans
// against a known target and are out of scope for the build pipeline.
//
// The core audit logic is exported as pure functions so the test suite can
// feed in-memory configs without touching real files. The CLI entry below
// only reads package.json/vercel.json and sets the exit code.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Configuration (exported for tests).
// ---------------------------------------------------------------------------

// package.json scripts that Vercel (or a local `npm install`/`npm run build`)
// executes unattended during a build. These must be build-only and must never
// touch a database.
export const LIFECYCLE_SCRIPTS = ["vercel-build", "build", "postinstall"];

// vercel.json command fields that Vercel runs unattended for both Preview and
// Production deployments. installCommand runs during dependency install and
// is just as much part of the lifecycle as buildCommand.
export const VERCEL_AUTOMATED_COMMAND_FIELDS = ["installCommand", "buildCommand"];

// Commands that mutate database structure/data, or destructive flags. Matched
// as substrings (case-insensitive) against the expanded command.
export const FORBIDDEN_TOKENS = [
  "prisma db push",
  "prisma migrate deploy",
  "prisma migrate dev",
  "prisma migrate reset",
  "prisma migrate resolve",
  "prisma db seed",
  "prisma db execute",
  "--accept-data-loss",
  "--force-reset",
];

// ---------------------------------------------------------------------------
// Pure core (no I/O, safe to unit-test).
// ---------------------------------------------------------------------------

// Matches package-manager script references and captures the script name
// (group 1). Supports:
//   npm run X          npm run-script X      (run/run-script required for npm)
//   pnpm X              pnpm run X            (run optional for pnpm)
//   yarn X              yarn run X            (run optional for yarn)
// `run`/`run-script` is required for npm because `npm X` is not a valid
// arbitrary-script invocation, while pnpm and yarn both run scripts bare.
//
// Built fresh inside expandCommand() per call so recursive calls never share
// regex `lastIndex` state (a shared global regex corrupts the parent loop).
export function buildRefPattern() {
  return /(?:^|[\s&|;])(?:npm\s+(?:run|run-script)|pnpm(?:\s+run)?|yarn(?:\s+run)?)\s+([A-Za-z0-9:_-]+)/g;
}

// Recursively inline script references inside `command`, returning the fully
// expanded string. `visited` guards against reference cycles.
export function expandCommand(command, scripts, visited = new Set()) {
  if (typeof command !== "string") return "";
  const resolved = scripts || {};
  const parts = [];
  let cursor = 0;
  for (const match of command.matchAll(buildRefPattern())) {
    // match[0] begins at the separator char (or index 0); preserve text before
    // it, then the whole match, then continue after it.
    parts.push(command.slice(cursor, match.index));
    parts.push(match[0]);
    cursor = match.index + match[0].length;
    const refName = match[1];
    if (visited.has(refName)) continue; // cycle: stop expanding this branch
    const referenced = resolved[refName];
    if (referenced !== undefined) {
      parts.push("  ==>  ");
      parts.push(
        expandCommand(referenced, resolved, new Set([...visited, refName]))
      );
    }
  }
  parts.push(command.slice(cursor));
  return parts.join("");
}

export function findForbidden(expanded) {
  const lowered = String(expanded).toLowerCase();
  return FORBIDDEN_TOKENS.filter((token) => lowered.includes(token));
}

// Audit package.json lifecycle scripts. `scripts` is the pkg.scripts object.
export function auditLifecycleScripts(scripts) {
  const resolved = scripts || {};
  const violations = [];
  for (const name of LIFECYCLE_SCRIPTS) {
    const raw = resolved[name];
    if (raw === undefined) continue; // missing lifecycle script is fine
    const expanded = expandCommand(raw, resolved);
    const hits = findForbidden(expanded);
    if (hits.length > 0) {
      violations.push({
        source: `package.json scripts.${name}`,
        field: name,
        raw,
        expanded,
        hits,
      });
    }
  }
  return violations;
}

// Audit vercel.json automated command fields. `vercelConfig` is the parsed
// vercel.json; `scripts` is pkg.scripts (used to resolve delegated refs).
export function auditVercelCommands(vercelConfig, scripts) {
  const resolved = vercelConfig || {};
  const violations = [];
  for (const field of VERCEL_AUTOMATED_COMMAND_FIELDS) {
    const raw = resolved[field];
    if (typeof raw !== "string") continue; // field absent or non-string: skip
    const expanded = expandCommand(raw, scripts || {});
    const hits = findForbidden(expanded);
    if (hits.length > 0) {
      violations.push({
        source: `vercel.json ${field}`,
        field,
        raw,
        expanded,
        hits,
      });
    }
  }
  return violations;
}

// Audit everything in one call. Accepts an in-memory config so tests don't
// touch the filesystem.
export function auditAll({ packageScripts, vercelConfig } = {}) {
  return [
    ...auditLifecycleScripts(packageScripts),
    ...auditVercelCommands(vercelConfig, packageScripts),
  ];
}

// Render violations into a human-readable report string.
export function formatReport(violations) {
  if (!violations || violations.length === 0) {
    return {
      ok: true,
      message:
        "✓ release-safety: no database-mutating commands in the build lifecycle " +
        "(package.json vercel-build/build/postinstall, vercel.json installCommand/buildCommand).",
    };
  }
  const lines = [
    "✗ release-safety: forbidden database-mutating command(s) found in the build lifecycle.",
    "  The Vercel build (Preview AND Production) must never run prisma db push,",
    "  prisma migrate deploy, or any other DB-mutating command. Production",
    "  migrations are applied separately via a controlled, human-triggered step.",
    "",
  ];
  for (const v of violations) {
    lines.push(`  ${v.source}`);
    lines.push(`    command : ${v.raw}`);
    lines.push(`    expanded: ${v.expanded}`);
    lines.push(`    blocked : ${v.hits.join(", ")}`);
  }
  lines.push(
    "",
    "  Fix: remove the mutating command from the build lifecycle. Apply production",
    "  schema changes with `npm run db:migrate:deploy` in a controlled release step,",
    "  never inside vercel-build/build/postinstall or vercel.json install/buildCommand.",
    "  Run `npm run check:release-safety` locally to re-check."
  );
  return { ok: false, message: lines.join("\n") };
}

// ---------------------------------------------------------------------------
// CLI entry (only runs when executed directly).
// ---------------------------------------------------------------------------

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function isMainModule() {
  try {
    return (
      fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")
    );
  } catch {
    return false;
  }
}

function runCli() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const root = join(__dirname, "..");
  const pkg = readJson(join(root, "package.json"));
  let vercelConfig = {};
  try {
    vercelConfig = readJson(join(root, "vercel.json"));
  } catch {
    // no vercel.json -> nothing to check from Vercel side
  }
  const violations = auditAll({
    packageScripts: pkg.scripts,
    vercelConfig,
  });
  const report = formatReport(violations);
  if (report.ok) {
    console.log(report.message);
    return;
  }
  console.error(report.message);
  process.exitCode = 1;
}

if (isMainModule()) {
  runCli();
}
