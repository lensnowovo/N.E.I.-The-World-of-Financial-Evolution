// Real PostgreSQL upgrade test for the RateLimitBucket subject migration.
// Gated on TEST_DATABASE_URL and always uses an isolated throwaway schema.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const SKIP = !TEST_DATABASE_URL;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const prismaCli = join(root, "node_modules", "prisma", "build", "index.js");
const initialMigration = join(
  root,
  "prisma",
  "migrations",
  "20260715120000_add_memory_web_entitlements",
  "migration.sql"
);
const subjectMigration = join(
  root,
  "prisma",
  "migrations",
  "20260720000000_add_ratelimitbucket_subject",
  "migration.sql"
);

function withSchema(databaseUrl, schema) {
  const url = new URL(databaseUrl);
  url.searchParams.set("schema", schema);
  return url.toString();
}

function executeSql(databaseUrl, { file, sql }) {
  const args = [prismaCli, "db", "execute", "--url", databaseUrl];
  if (file) args.push("--file", file);
  else args.push("--stdin");
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    input: sql,
    env: process.env,
  });
  assert.equal(
    result.status,
    0,
    `prisma db execute failed: ${result.error?.message ?? ""}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`
  );
}

test("subject migration upgrades populated RateLimitBucket without data loss", { skip: SKIP }, async () => {
  const schema = `memory_upgrade_${process.pid}_${Date.now()}`;
  const admin = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
  const scopedUrl = withSchema(TEST_DATABASE_URL, schema);
  let scoped;

  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    executeSql(scopedUrl, {
      sql: 'CREATE TABLE "User" ("id" SERIAL NOT NULL, CONSTRAINT "User_pkey" PRIMARY KEY ("id"));',
    });
    executeSql(scopedUrl, { file: initialMigration });
    executeSql(scopedUrl, {
      sql: `
        INSERT INTO "RateLimitBucket" ("ip", "endpoint", "windowStart", "count", "expiresAt")
        VALUES
          ('203.0.113.7', '/code', '2026-07-20T00:00:00Z', 2, '2026-07-20T00:02:00Z'),
          ('   ', '/activate', '2026-07-20T00:00:00Z', 1, '2026-07-20T00:02:00Z');
      `,
    });

    executeSql(scopedUrl, { file: subjectMigration });

    scoped = new PrismaClient({ datasources: { db: { url: scopedUrl } } });
    const rows = await scoped.$queryRawUnsafe(
      'SELECT "ip", "subject", "endpoint", "count" FROM "RateLimitBucket" ORDER BY "endpoint"'
    );
    assert.deepEqual(rows, [
      { ip: "   ", subject: "unknown", endpoint: "/activate", count: 1 },
      { ip: "203.0.113.7", subject: "203.0.113.7", endpoint: "/code", count: 2 },
    ]);

    const columns = await scoped.$queryRawUnsafe(`
      SELECT "column_name", "is_nullable"
      FROM information_schema.columns
      WHERE table_schema = '${schema}' AND table_name = 'RateLimitBucket'
        AND column_name IN ('ip', 'subject')
      ORDER BY column_name
    `);
    assert.deepEqual(columns, [
      { column_name: "ip", is_nullable: "YES" },
      { column_name: "subject", is_nullable: "NO" },
    ]);

    await assert.rejects(
      scoped.$executeRawUnsafe(`
        INSERT INTO "RateLimitBucket" ("ip", "subject", "endpoint", "windowStart", "count", "expiresAt")
        VALUES ('198.51.100.8', '203.0.113.7', '/code', '2026-07-20T00:00:00Z', 1, '2026-07-20T00:03:00Z')
      `),
      (error) => error?.meta?.code === "23505" || /already exists|duplicate key/i.test(String(error))
    );
  } finally {
    if (scoped) await scoped.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.$disconnect();
  }
});
