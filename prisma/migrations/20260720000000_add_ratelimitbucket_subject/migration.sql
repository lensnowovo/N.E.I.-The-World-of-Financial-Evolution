-- Memory Node 限流：RateLimitBucket 增加语义中立的 subject 列（P2-3）。
-- 冲突键由 (ip, endpoint, windowStart) 改为 (subject, endpoint, windowStart)，
-- 使限流主体既可为合法 IP，也可为 "user:<id>"，避免把 userId 伪造成 IP。
-- ip 改为可选，仅作观测。纯 additive：无 DROP TABLE / DROP COLUMN / TRUNCATE。
-- 由受控发布流程在正式环境执行 prisma migrate deploy；不得用 prisma db push。

-- DropIndex
DROP INDEX "RateLimitBucket_ip_endpoint_windowStart_key";

-- AlterTable
ALTER TABLE "RateLimitBucket" ADD COLUMN     "subject" TEXT NOT NULL,
ALTER COLUMN "ip" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitBucket_subject_endpoint_windowStart_key" ON "RateLimitBucket"("subject", "endpoint", "windowStart");
