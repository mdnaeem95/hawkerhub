-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderUpdates" BOOLEAN NOT NULL DEFAULT true,
    "promotions" BOOLEAN NOT NULL DEFAULT true,
    "newFeatures" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTicket" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" JSONB NOT NULL,
    "receiptChecked" BOOLEAN NOT NULL DEFAULT false,
    "receiptStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");

-- CreateIndex
CREATE INDEX "PushToken_token_idx" ON "PushToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTicket_ticketId_key" ON "NotificationTicket"("ticketId");

-- CreateIndex
CREATE INDEX "NotificationTicket_userId_idx" ON "NotificationTicket"("userId");

-- CreateIndex
CREATE INDEX "NotificationTicket_ticketId_idx" ON "NotificationTicket"("ticketId");
