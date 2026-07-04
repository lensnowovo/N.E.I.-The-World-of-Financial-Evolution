-- Product activity events for admin analytics.
CREATE TABLE "ActivityEvent" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "anonymousId" TEXT,
    "type" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" INTEGER,
    "source" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ActivityEvent_createdAt_idx" ON "ActivityEvent"("createdAt");
CREATE INDEX "ActivityEvent_userId_createdAt_idx" ON "ActivityEvent"("userId", "createdAt");
CREATE INDEX "ActivityEvent_anonymousId_createdAt_idx" ON "ActivityEvent"("anonymousId", "createdAt");
CREATE INDEX "ActivityEvent_type_createdAt_idx" ON "ActivityEvent"("type", "createdAt");
CREATE INDEX "ActivityEvent_entityType_entityId_idx" ON "ActivityEvent"("entityType", "entityId");

ALTER TABLE "ActivityEvent"
ADD CONSTRAINT "ActivityEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
