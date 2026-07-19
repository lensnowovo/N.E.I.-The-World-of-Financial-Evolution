-- CreateTable
CREATE TABLE "SkillRequest" (
    "id" SERIAL NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "claimedById" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "acceptanceCriteria" TEXT NOT NULL DEFAULT '[]',
    "source" TEXT NOT NULL DEFAULT 'web',
    "status" TEXT NOT NULL DEFAULT 'open',
    "claimedAt" TIMESTAMP(3),
    "solvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillRequestSupport" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillRequestSupport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillRequestSolution" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillRequestSolution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkillRequest_status_createdAt_idx" ON "SkillRequest"("status", "createdAt");
CREATE INDEX "SkillRequest_scene_status_idx" ON "SkillRequest"("scene", "status");
CREATE INDEX "SkillRequest_requesterId_createdAt_idx" ON "SkillRequest"("requesterId", "createdAt");
CREATE INDEX "SkillRequest_claimedById_idx" ON "SkillRequest"("claimedById");
CREATE UNIQUE INDEX "SkillRequestSupport_requestId_userId_key" ON "SkillRequestSupport"("requestId", "userId");
CREATE INDEX "SkillRequestSupport_userId_createdAt_idx" ON "SkillRequestSupport"("userId", "createdAt");
CREATE UNIQUE INDEX "SkillRequestSolution_requestId_postId_key" ON "SkillRequestSolution"("requestId", "postId");
CREATE INDEX "SkillRequestSolution_requestId_status_idx" ON "SkillRequestSolution"("requestId", "status");
CREATE INDEX "SkillRequestSolution_userId_createdAt_idx" ON "SkillRequestSolution"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "SkillRequest" ADD CONSTRAINT "SkillRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SkillRequest" ADD CONSTRAINT "SkillRequest_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SkillRequestSupport" ADD CONSTRAINT "SkillRequestSupport_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SkillRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SkillRequestSupport" ADD CONSTRAINT "SkillRequestSupport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SkillRequestSolution" ADD CONSTRAINT "SkillRequestSolution_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SkillRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SkillRequestSolution" ADD CONSTRAINT "SkillRequestSolution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SkillRequestSolution" ADD CONSTRAINT "SkillRequestSolution_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
