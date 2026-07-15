// Repeatable test suite for the release-safety guard.
// Run: npm run test:release-safety   (node --test scripts/check-release-safety.test.mjs)
//
// These tests feed in-memory configs into the pure audit functions, so they
// never modify the repo's package.json / vercel.json.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  auditAll,
  auditLifecycleScripts,
  auditVercelCommands,
  expandCommand,
} from "./check-release-safety.mjs";

const SAFE_BUILD = "prisma generate && next build";
const DB_PUSH = "prisma db push";

// Helper: run the full audit over an in-memory config.
function audit({ scripts = {}, vercel = {} } = {}) {
  return auditAll({ packageScripts: scripts, vercelConfig: vercel });
}

// Assert that a config is accepted (no violations).
function assertSafe(config, label) {
  const v = audit(config);
  assert.equal(v.length, 0, `${label}: expected NO violations, got\n${JSON.stringify(v, null, 2)}`);
}

// Assert that a config is rejected, optionally requiring specific tokens and/or
// a specific source (e.g. "vercel.json installCommand").
function assertBlocked(config, label, { tokens = [], source } = {}) {
  const v = audit(config);
  assert.ok(v.length > 0, `${label}: expected violations, got none`);
  if (source) {
    assert.ok(
      v.some((x) => x.source === source),
      `${label}: expected a violation from ${source}, got ${v.map((x) => x.source).join(", ")}`
    );
  }
  if (tokens.length > 0) {
    const allHits = v.flatMap((x) => x.hits);
    for (const t of tokens) {
      assert.ok(
        allHits.includes(t),
        `${label}: expected hit "${t}", got ${allHits.join(", ")}`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Should PASS — safe build commands and safe delegation across package managers
// ---------------------------------------------------------------------------

test("direct safe vercel-build passes", () => {
  assertSafe({ scripts: { "vercel-build": SAFE_BUILD } }, "direct safe");
});

test("npm run safe-build delegation passes", () => {
  assertSafe(
    { scripts: { "vercel-build": "npm run safe-build", "safe-build": SAFE_BUILD } },
    "npm run safe-build"
  );
});

test("pnpm safe-build delegation passes", () => {
  assertSafe(
    { scripts: { "vercel-build": "pnpm safe-build", "safe-build": SAFE_BUILD } },
    "pnpm safe-build"
  );
});

test("yarn run safe-build delegation passes", () => {
  assertSafe(
    { scripts: { "vercel-build": "yarn run safe-build", "safe-build": SAFE_BUILD } },
    "yarn run safe-build"
  );
});

test("manual scripts (db:push/setup/db:migrate:deploy) are NOT policed", () => {
  // These exist in the real repo; they must not trip the build-lifecycle guard.
  assertSafe(
    {
      scripts: {
        "vercel-build": SAFE_BUILD,
        build: SAFE_BUILD,
        postinstall: "prisma generate",
        "db:push": DB_PUSH,
        setup: `${DB_PUSH} && tsx prisma/seed.ts`,
        "db:migrate:deploy": "prisma migrate deploy",
      },
    },
    "manual scripts ignored"
  );
});

// ---------------------------------------------------------------------------
// Should FAIL — direct mutating command in vercel-build
// ---------------------------------------------------------------------------

test("vercel-build directly containing prisma db push is blocked", () => {
  assertBlocked(
    { scripts: { "vercel-build": `prisma generate && ${DB_PUSH} --skip-generate && next build` } },
    "direct db push",
    { tokens: ["prisma db push"], source: "package.json scripts.vercel-build" }
  );
});

// ---------------------------------------------------------------------------
// Should FAIL — delegation across all package managers
// (the regex bug previously let pnpm run / yarn run slip through)
// ---------------------------------------------------------------------------

test("npm run db:push delegation is blocked", () => {
  assertBlocked(
    { scripts: { "vercel-build": `prisma generate && npm run db:push && next build`, "db:push": DB_PUSH } },
    "npm run db:push",
    { tokens: ["prisma db push"] }
  );
});

test("npm run-script db:push delegation is blocked", () => {
  assertBlocked(
    { scripts: { "vercel-build": `npm run-script db:push`, "db:push": DB_PUSH } },
    "npm run-script db:push",
    { tokens: ["prisma db push"] }
  );
});

test("pnpm db:push delegation is blocked", () => {
  assertBlocked(
    { scripts: { "vercel-build": `pnpm db:push`, "db:push": DB_PUSH } },
    "pnpm db:push",
    { tokens: ["prisma db push"] }
  );
});

test("pnpm run db:push delegation is blocked", () => {
  assertBlocked(
    { scripts: { "vercel-build": `pnpm run db:push`, "db:push": DB_PUSH } },
    "pnpm run db:push",
    { tokens: ["prisma db push"] }
  );
});

test("yarn db:push delegation is blocked", () => {
  assertBlocked(
    { scripts: { "vercel-build": `yarn db:push`, "db:push": DB_PUSH } },
    "yarn db:push",
    { tokens: ["prisma db push"] }
  );
});

test("yarn run db:push delegation is blocked", () => {
  assertBlocked(
    { scripts: { "vercel-build": `yarn run db:push`, "db:push": DB_PUSH } },
    "yarn run db:push",
    { tokens: ["prisma db push"] }
  );
});

// ---------------------------------------------------------------------------
// Should FAIL — vercel.json buildCommand (direct + delegated)
// ---------------------------------------------------------------------------

test("vercel.json buildCommand direct dangerous command is blocked", () => {
  assertBlocked(
    {
      scripts: { "vercel-build": SAFE_BUILD },
      vercel: { buildCommand: `${DB_PUSH} && next build` },
    },
    "vercel buildCommand direct",
    { tokens: ["prisma db push"], source: "vercel.json buildCommand" }
  );
});

test("vercel.json buildCommand delegating dangerous script is blocked", () => {
  assertBlocked(
    {
      scripts: { "vercel-build": SAFE_BUILD, "db:push": DB_PUSH },
      vercel: { buildCommand: "npm run db:push" },
    },
    "vercel buildCommand delegated",
    { tokens: ["prisma db push"], source: "vercel.json buildCommand" }
  );
});

// ---------------------------------------------------------------------------
// Should FAIL — vercel.json installCommand (direct + delegated)
// (the original guard missed installCommand entirely)
// ---------------------------------------------------------------------------

test("vercel.json installCommand direct dangerous command is blocked", () => {
  assertBlocked(
    {
      scripts: { "vercel-build": SAFE_BUILD },
      vercel: { installCommand: `${DB_PUSH} && npm ci` },
    },
    "vercel installCommand direct",
    { tokens: ["prisma db push"], source: "vercel.json installCommand" }
  );
});

test("vercel.json installCommand delegating dangerous script is blocked", () => {
  assertBlocked(
    {
      scripts: { "vercel-build": SAFE_BUILD, "db:push": DB_PUSH },
      vercel: { installCommand: "yarn db:push && yarn install" },
    },
    "vercel installCommand delegated",
    { tokens: ["prisma db push"], source: "vercel.json installCommand" }
  );
});

// ---------------------------------------------------------------------------
// Should FAIL — destructive flags
// ---------------------------------------------------------------------------

test("--accept-data-loss is blocked", () => {
  assertBlocked(
    { scripts: { "vercel-build": `prisma generate && next build -- ${DB_PUSH} --accept-data-loss` } },
    "accept-data-loss",
    { tokens: ["--accept-data-loss"] }
  );
});

test("--force-reset is blocked", () => {
  assertBlocked(
    { scripts: { "vercel-build": `prisma generate && next build -- ${DB_PUSH} --force-reset` } },
    "force-reset",
    { tokens: ["--force-reset"] }
  );
});

// ---------------------------------------------------------------------------
// Unit-level checks on the exported primitives
// ---------------------------------------------------------------------------

test("expandCommand resolves every supported package-manager form", () => {
  const scripts = { "db:push": DB_PUSH };
  for (const ref of [
    "npm run db:push",
    "npm run-script db:push",
    "pnpm db:push",
    "pnpm run db:push",
    "yarn db:push",
    "yarn run db:push",
  ]) {
    const expanded = expandCommand(ref, scripts);
    assert.ok(
      expanded.includes("prisma db push"),
      `expandCommand did not resolve "${ref}" (got: ${expanded})`
    );
  }
});

test("expandCommand does not capture 'run' as the script name for pnpm/yarn", () => {
  // Regression: the old regex captured `run` here, so db:push never expanded.
  const expanded = expandCommand("pnpm run db:push", { "db:push": DB_PUSH });
  assert.ok(expanded.includes("prisma db push"), `got: ${expanded}`);
  assert.ok(!expanded.includes("==>") === false, "expansion marker should be present"); // sanity
});

test("auditVercelCommands scans both installCommand and buildCommand", () => {
  const v = auditVercelCommands(
    { installCommand: `${DB_PUSH} && npm ci`, buildCommand: `${DB_PUSH} && next build` },
    {}
  );
  const sources = v.map((x) => x.source).sort();
  assert.deepEqual(sources, ["vercel.json buildCommand", "vercel.json installCommand"]);
});

test("auditLifecycleScripts skips absent lifecycle scripts", () => {
  const v = auditLifecycleScripts({ dev: "next dev" }); // none of vercel-build/build/postinstall
  assert.equal(v.length, 0);
});
