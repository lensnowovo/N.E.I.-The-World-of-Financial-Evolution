-- Memory Node 限流：RateLimitBucket 增加语义中立的 subject 列（P2-3）。
-- 冲突键由 (ip, endpoint, windowStart) 改为 (subject, endpoint, windowStart)，
-- 使限流主体既可为合法 IP，也可为 "user:<id>"，避免把 userId 伪造成 IP。
-- ip 改为可选，仅作观测。保留并回填已有桶记录；无 DROP TABLE / DROP COLUMN / TRUNCATE。
-- 由受控发布流程在正式环境执行 prisma migrate deploy；不得用 prisma db push。

BEGIN;

-- 先以可空列加入，确保已有 RateLimitBucket 记录可以升级。
ALTER TABLE "RateLimitBucket" ADD COLUMN "subject" TEXT;

-- 旧冲突键就是规范化前的 IP；空白/异常历史值归入共享 unknown 桶。
UPDATE "RateLimitBucket"
SET "subject" = COALESCE(NULLIF(BTRIM("ip"), ''), 'unknown');

-- 回填完成后再收紧约束；ip 降为可选观测列。
ALTER TABLE "RateLimitBucket"
ALTER COLUMN "subject" SET NOT NULL,
ALTER COLUMN "ip" DROP NOT NULL;

-- 新索引先创建成功，再在同一事务内移除旧索引；任何失败都会整体回滚。
CREATE UNIQUE INDEX "RateLimitBucket_subject_endpoint_windowStart_key" ON "RateLimitBucket"("subject", "endpoint", "windowStart");

DROP INDEX "RateLimitBucket_ip_endpoint_windowStart_key";

COMMIT;
