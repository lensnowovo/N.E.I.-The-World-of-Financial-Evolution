-- CreateTable
CREATE TABLE "McpAccessToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "clientType" TEXT,
    "tokenHash" TEXT NOT NULL,
    "tokenHint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "McpAccessToken_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "McpCallLog" ADD COLUMN "tokenId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "McpAccessToken_tokenHash_key" ON "McpAccessToken"("tokenHash");
CREATE INDEX "McpAccessToken_userId_revokedAt_idx" ON "McpAccessToken"("userId", "revokedAt");
CREATE INDEX "McpAccessToken_userId_createdAt_idx" ON "McpAccessToken"("userId", "createdAt");
CREATE INDEX "McpCallLog_tokenId_createdAt_idx" ON "McpCallLog"("tokenId", "createdAt");

-- AddForeignKey
ALTER TABLE "McpAccessToken" ADD CONSTRAINT "McpAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "McpCallLog" ADD CONSTRAINT "McpCallLog_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "McpAccessToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;
