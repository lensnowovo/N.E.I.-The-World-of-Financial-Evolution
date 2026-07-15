-- Memory Node 网站端授权系统 PR1：Schema + migration（纯 additive）
-- 依据：docs/contracts/memory-node-web-integration.md §4
-- 仅 CREATE TABLE / CREATE INDEX / ADD FOREIGN KEY。无 DROP / TRUNCATE / DELETE。
-- RateLimitBucket 替代旧的 ActivationAttempt；与 User 无 relation（匿名限流）。
-- 不得用 prisma db push 应用；正式环境由受控流程执行 prisma migrate deploy。

-- CreateTable
CREATE TABLE "ActivationCode" (
    "id" SERIAL NOT NULL,
    "codeHash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "deviceId" TEXT,

    CONSTRAINT "ActivationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceActivation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "clientVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,

    CONSTRAINT "DeviceActivation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "source" TEXT,
    "metadata" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseManifest" (
    "id" SERIAL NOT NULL,
    "product" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "downloadUrl" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "minVersion" TEXT,
    "releaseNotes" TEXT,
    "isLatest" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseManifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" BIGSERIAL NOT NULL,
    "ip" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivationCode_codeHash_key" ON "ActivationCode"("codeHash");
CREATE INDEX "ActivationCode_codeHash_idx" ON "ActivationCode"("codeHash");
CREATE INDEX "DeviceActivation_userId_idx" ON "DeviceActivation"("userId");
CREATE UNIQUE INDEX "DeviceActivation_userId_deviceId_key" ON "DeviceActivation"("userId", "deviceId");
CREATE UNIQUE INDEX "Entitlement_userId_key" ON "Entitlement"("userId");
CREATE INDEX "ReleaseManifest_product_platform_isLatest_idx" ON "ReleaseManifest"("product", "platform", "isLatest");
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");
CREATE UNIQUE INDEX "RateLimitBucket_ip_endpoint_windowStart_key" ON "RateLimitBucket"("ip", "endpoint", "windowStart");

-- AddForeignKey
ALTER TABLE "ActivationCode" ADD CONSTRAINT "ActivationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceActivation" ADD CONSTRAINT "DeviceActivation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
