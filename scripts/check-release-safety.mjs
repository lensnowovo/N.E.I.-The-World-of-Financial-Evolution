#!/usr/bin/env node
// Release-safety guard.
//
// Ensures the automated Vercel build lifecycle can NEVER mutate a database.
// A previous build ran `prisma db push` during every Preview Deployment,
// which risked modifying (or dropping tables in) the shared production
// database. This guard makes that class of regression fail CI loudly.
//
// What it checks:
//   - package.json lifecycle scripts that run unattended during a Vercel
//     build: `vercel-build`, `build`, `postinstall`.
//   - vercel.json `buildCommand` (the actual entry Vercel invokes).
//
// How it checks:
//   Each command is expanded by recursively inlining `npm run X` /
//   `npm run-script X` / `yarn X` / `pnpm X` references, so a script that
//   delegates to a mutating helper (e.g. `vercel-build: "npm run db:push
//   && next build"`) is still caught. The fully expanded string is then
//   scanned for forbidden database-mutating tokens.
//
// It does NOT police manual/operator scripts (`db:push`, `setup`,
// `db:migrate:deploy`, etc.) — those are intentionally invoked by humans
// against a known target and are out of scope for the build pipeline.
//
// Exit code 0 = safe, 1 = regression found.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Scripts that Vercel runs automatically during a build. These must be
// build-only and must never touch a database.
const LIFECYCLE_SCRIPTS = ["vercel-build", "build", "postinstall"];

// Commands that mutate database structure or data, or destructive flags.
// Matched as substrings (case-insensitive) against the expanded command.
const FORBIDDEN_TOKENS = [
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

// Matches `npm run X` / `npm run-script X` / `yarn X` / `pnpm X` script
// references. Built fresh inside expandCommand() so recursive calls never
// share regex `lastIndex` state (a shared global regex corrupts the parent
// loop and can blow the stack / string length).
function buildRefPattern() {
  return /(?:^|[\s&|;])(?:npm run|npm run-script|yarn|pnpm)\s+([A-Za-z0-9:_-]+)/g;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

// Recursively inline `npm run X` references inside `command`, returning the
// fully expanded string. `visited` guards against reference cycles.
function expandCommand(command, scripts, visited = new Set()) {
  if (typeof command !== "string") return "";
  const parts = [];
  let cursor = 0;
  for (const match of command.matchAll(buildRefPattern())) {
    parts.push(command.slice(cursor, match.index));
    parts.push(match[0]);
    cursor = match.index + match[0].length;
    const refName = match[1];
    if (visited.has(refName)) continue; // cycle: stop expanding this branch
    const referenced = scripts[refName];
    if (referenced !== undefined) {
      parts.push("  ==>  ");
      parts.push(expandCommand(referenced, scripts, new Set([...visited, refName])));
    }
  }
  parts.push(command.slice(cursor));
  return parts.join("");
}

function findForbidden(expanded) {
  const lowered = expanded.toLowerCase();
  return FORBIDDEN_TOKENS.filter((token) => lowered.includes(token));
}

function checkPackageJson(pkg) {
  const scripts = pkg.scripts || {};
  const violations = [];
  for (const name of LIFECYCLE_SCRIPTS) {
    const raw = scripts[name];
    if (raw === undefined) continue; // missing lifecycle script is fine
    const expanded = expandCommand(raw, scripts);
    const hits = findForbidden(expanded);
    if (hits.length > 0) {
      violations.push({
        source: `package.json scripts.${name}`,
        raw,
        expanded,
        hits,
      });
    }
  }
  return violations;
}

function checkVercelJson() {
  let vercel;
  try {
    vercel = readJson(join(root, "vercel.json"));
  } catch {
    return []; // no vercel.json -> nothing to check
  }
  const buildCommand = typeof vercel.buildCommand === "string" ? vercel.buildCommand : "";
  // If buildCommand delegates to an npm script, resolve it against package.json
  // so the same expansion/scan applies; otherwise scan the literal.
  const pkg = readJson(join(root, "package.json"));
  const scripts = pkg.scripts || {};
  const expanded = expandCommand(buildCommand, scripts);
  const hits = findForbidden(expanded);
  if (hits.length === 0) return [];
  return [
    {
      source: "vercel.json buildCommand",
      raw: buildCommand,
      expanded,
      hits,
    },
  ];
}

function fail(message) {
  console.error(`✗ release-safety: ${message}`);
  process.exit(1);
}

function main() {
  const pkg = readJson(join(root, "package.json"));
  const violations = [...checkPackageJson(pkg), ...checkVercelJson()];

  if (violations.length === 0) {
    console.log(
      "✓ release-safety: no database-mutating commands in the build lifecycle (vercel-build, build, postinstall, vercel.json)."
    );
    return;
  }

  console.error(
    "✗ release-safety: forbidden database-mutating command(s) found in the build lifecycle."
  );
  console.error(
    "  The Vercel build (Preview AND Production) must never run prisma db push,\n" +
      "  prisma migrate deploy, or any other DB-mutating command. Production\n" +
      "  migrations are applied separately via a controlled, human-triggered step.\n"
  );
  for (const v of violations) {
    console.error(`  ${v.source}`);
    console.error(`    command : ${v.raw}`);
    console.error(`    expanded: ${v.expanded}`);
    console.error(`    blocked : ${v.hits.join(", ")}`);
  }
  console.error(
    "\n  Fix: remove the mutating command from the build lifecycle. Apply production\n" +
      "  schema changes with `npm run db:migrate:deploy` in a controlled release step,\n" +
      "  never inside vercel-build/build/postinstall. Run `npm run check:release-safety`\n" +
      "  locally to re-check."
  );
  process.exit(1);
}

main();
