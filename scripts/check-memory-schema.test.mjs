// Migration safety tests for Memory Node web authorization migrations.
// Run: npm run test:memory-schema   (node --test scripts/check-memory-schema.test.mjs)
//
// Zero-dependency. Reads prisma/schema.prisma and the new migration.sql from
// disk and asserts the additive, contract-aligned shape. Avoids grep/PowerShell
// encoding pitfalls by doing all parsing in Node.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const SCHEMA_PATH = join(root, "prisma", "schema.prisma");
const MIGRATIONS_DIR = join(root, "prisma", "migrations");
const schema = readFileSync(SCHEMA_PATH, "utf8");

function findMigration(suffix) {
  const dirs = readdirSync(MIGRATIONS_DIR).filter(
    (d) => new RegExp(`^\\d+_${suffix}$`).test(d)
  );
  assert.ok(dirs.length === 1, `expected exactly one ${suffix} migration dir, got ${dirs.join(", ") || "none"}`);
  return join(MIGRATIONS_DIR, dirs[0], "migration.sql");
}

const MIGRATION_PATH = findMigration("add_memory_web_entitlements");
const SUBJECT_MIGRATION_PATH = findMigration("add_ratelimitbucket_subject");
const migration = readFileSync(MIGRATION_PATH, "utf8");
const subjectMigration = readFileSync(SUBJECT_MIGRATION_PATH, "utf8");

// Strip SQL line comments (-- to end of line) so documentation comments
// (e.g. "无 DROP / TRUNCATE") don't trip the destructive-op scan.
// Split on \r?\n so CRLF checkouts (Windows) are handled: a trailing \r would
// otherwise make /--.*$/ fail to match (JS `.` does not cross \r), leaving the
// comment — and its "TRUNCATE" wording — intact.
function stripSqlLineComments(sql) {
  return sql
    .split(/\r?\n/)
    .map((l) => l.replace(/--.*$/, ""))
    .join("\n");
}

const migrationNoComments = stripSqlLineComments(migration);
const subjectMigrationNoComments = stripSqlLineComments(subjectMigration);

const TARGET_TABLES = [
  "ActivationCode",
  "DeviceActivation",
  "Entitlement",
  "ReleaseManifest",
  "RateLimitBucket",
];

// ---------------------------------------------------------------------------
// Migration file + additive shape
// ---------------------------------------------------------------------------

test("migration file exists", () => {
  assert.ok(existsSync(MIGRATION_PATH), `missing ${MIGRATION_PATH}`);
  assert.ok(existsSync(SUBJECT_MIGRATION_PATH), `missing ${SUBJECT_MIGRATION_PATH}`);
});

test("migration creates all five target tables", () => {
  for (const t of TARGET_TABLES) {
    const re = new RegExp(`CREATE TABLE "${t}"`);
    assert.ok(re.test(migration), `migration missing CREATE TABLE "${t}"`);
  }
});

test("migration has no destructive operations (additive only)", () => {
  const lowered = migrationNoComments.toLowerCase();
  const forbidden = [
    "drop table",
    "drop column",
    "drop index",
    "drop constraint",
    "drop not",
    "truncate",
    "delete from",
    "--accept-data-loss",
    "--force-reset",
  ];
  for (const op of forbidden) {
    assert.ok(!lowered.includes(op), `migration contains destructive op: "${op}"`);
  }
});

test("migration uses ON DELETE CASCADE for user foreign keys", () => {
  // Contract §4: ActivationCode/DeviceActivation/Entitlement onDelete: Cascade.
  for (const t of ["ActivationCode", "DeviceActivation", "Entitlement"]) {
    const fkRe = new RegExp(
      `ADD CONSTRAINT "${t}_userId_fkey" FOREIGN KEY \\("userId"\\) REFERENCES "User"\\("id"\\) ON DELETE CASCADE`
    );
    assert.ok(fkRe.test(migration), `missing/bad CASCADE FK for ${t}`);
  }
});

test("RateLimitBucket id is BigInt (BIGSERIAL)", () => {
  assert.ok(/CREATE TABLE "RateLimitBucket"[\s\S]*"id" BIGSERIAL NOT NULL/.test(migration));
});

test("migration does not reference legacy ActivationAttempt table", () => {
  assert.ok(
    !/create table "ActivationAttempt"/i.test(migrationNoComments),
    "migration must not resurrect ActivationAttempt"
  );
});

test("subject upgrade migration is transactional and preserves old rows", () => {
  assert.match(subjectMigration, /\bBEGIN\s*;/i, "subject migration must begin a transaction");
  assert.match(subjectMigration, /\bCOMMIT\s*;/i, "subject migration must commit the transaction");
  assert.doesNotMatch(subjectMigrationNoComments, /\b(?:DROP\s+TABLE|DROP\s+COLUMN|TRUNCATE|DELETE\s+FROM)\b/i);
});

test("subject upgrade adds nullable, backfills, then sets NOT NULL", () => {
  const addAt = subjectMigration.search(/ADD COLUMN\s+"subject"\s+TEXT\s*;/i);
  const backfillAt = subjectMigration.search(/UPDATE\s+"RateLimitBucket"[\s\S]*SET\s+"subject"/i);
  const notNullAt = subjectMigration.search(/ALTER COLUMN\s+"subject"\s+SET NOT NULL/i);
  assert.ok(addAt >= 0, "subject must initially be added nullable");
  assert.ok(backfillAt > addAt, "existing rows must be backfilled after adding subject");
  assert.ok(notNullAt > backfillAt, "NOT NULL must be applied only after backfill");
  assert.match(
    subjectMigration,
    /COALESCE\(NULLIF\(BTRIM\("ip"\),\s*''\),\s*'unknown'\)/i,
    "subject backfill must preserve valid old IPs and normalize blank values"
  );
});

test("subject upgrade creates the new unique index before dropping the old one", () => {
  const createAt = subjectMigration.indexOf('CREATE UNIQUE INDEX "RateLimitBucket_subject_endpoint_windowStart_key"');
  const dropAt = subjectMigration.indexOf('DROP INDEX "RateLimitBucket_ip_endpoint_windowStart_key"');
  assert.ok(createAt >= 0, "missing new subject unique index");
  assert.ok(dropAt > createAt, "old index must be dropped only after the new index succeeds");
});

// ---------------------------------------------------------------------------
// Schema-level invariants (contract §4)
// ---------------------------------------------------------------------------

function modelBlock(name) {
  // multiline flag so ^ matches line starts (model body ends with a `}` line)
  const re = new RegExp(`model ${name} \\{([\\s\\S]*?)^\\}`, "m");
  const m = schema.match(re);
  assert.ok(m, `schema missing model ${name}`);
  return m[1];
}

test("schema does not contain ActivationAttempt model", () => {
  assert.ok(!/\bmodel ActivationAttempt\b/.test(schema), "ActivationAttempt must not exist");
});

test("RateLimitBucket has unique(subject,endpoint,windowStart), subject key + ip optional, and index(expiresAt)", () => {
  const block = modelBlock("RateLimitBucket");
  // P2-3: 冲突键由 ip 改为 subject；ip 降为可选观测列。
  assert.ok(
    /@@unique\(\[subject,\s*endpoint,\s*windowStart\]\)/.test(block),
    "missing unique(subject,endpoint,windowStart)"
  );
  assert.ok(/subject\s+String\b/.test(block), "missing subject String column");
  assert.ok(/ip\s+String\?/.test(block), "ip must be optional (String?)");
  assert.ok(/@@index\(\[expiresAt\]\)/.test(block), "missing index([expiresAt])");
});

test("ActivationCode stores only codeHash (no plaintext code field)", () => {
  const block = modelBlock("ActivationCode");
  assert.ok(/codeHash\s+String\s+@unique/.test(block), "codeHash must be @unique String");
  // No column literally named "code" that would imply plaintext storage.
  assert.ok(!/^\s*code\s+String\b/m.test(block), "plaintext `code` column must not exist");
});

test("Entitlement.userId is @unique (per-user lock target)", () => {
  const block = modelBlock("Entitlement");
  assert.ok(/userId\s+Int\s+@unique/.test(block), "Entitlement.userId must be @unique");
});

test("DeviceActivation has @@unique([userId, deviceId])", () => {
  const block = modelBlock("DeviceActivation");
  assert.ok(/@@unique\(\[userId,\s*deviceId\]\)/.test(block));
});

test("ReleaseManifest has @@index([product, platform, isLatest])", () => {
  const block = modelBlock("ReleaseManifest");
  assert.ok(/@@index\(\[product,\s*platform,\s*isLatest\]\)/.test(block));
});

test("User has the three new relations", () => {
  const block = modelBlock("User");
  assert.ok(/activationCodes\s+ActivationCode\[\]/.test(block), "missing activationCodes");
  assert.ok(/deviceActivations\s+DeviceActivation\[\]/.test(block), "missing deviceActivations");
  assert.ok(/entitlement\s+Entitlement\?/.test(block), "missing entitlement");
});

test("RateLimitBucket has no User relation", () => {
  const block = modelBlock("RateLimitBucket");
  assert.ok(!/\bUser\b/.test(block), "RateLimitBucket must not reference User");
});
