-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'DEALER', 'ADMIN');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "QueueEntryStatus" AS ENUM ('WAITING', 'OFFERED', 'BOOKED', 'LEFT');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Dealer" (
    "dealerId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "dealerName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dealer_pkey" PRIMARY KEY ("dealerId")
);

-- CreateTable
CREATE TABLE "CarModel" (
    "carModelId" UUID NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarModel_pkey" PRIMARY KEY ("carModelId")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "inventoryId" UUID NOT NULL,
    "dealerId" UUID NOT NULL,
    "carModelId" UUID NOT NULL,
    "variant" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "totalUnits" INTEGER NOT NULL,
    "availableUnits" INTEGER NOT NULL,
    "exShowroom" DECIMAL(12,2) NOT NULL,
    "insurance" DECIMAL(12,2) NOT NULL,
    "rto" DECIMAL(12,2) NOT NULL,
    "accessories" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("inventoryId")
);

-- CreateTable
CREATE TABLE "Queue" (
    "queueId" UUID NOT NULL,
    "carModelId" UUID NOT NULL,
    "variant" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Queue_pkey" PRIMARY KEY ("queueId")
);

-- CreateTable
CREATE TABLE "QueueEntry" (
    "entryId" UUID NOT NULL,
    "queueId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "preferredDealerId" UUID,
    "colorPreference" TEXT,
    "maxBudget" DECIMAL(12,2),
    "status" "QueueEntryStatus" NOT NULL DEFAULT 'WAITING',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueueEntry_pkey" PRIMARY KEY ("entryId")
);

-- CreateTable
CREATE TABLE "Offer" (
    "offerId" UUID NOT NULL,
    "queueEntryId" UUID NOT NULL,
    "inventoryId" UUID NOT NULL,
    "dealerId" UUID NOT NULL,
    "exShowroom" DECIMAL(12,2) NOT NULL,
    "insurance" DECIMAL(12,2) NOT NULL,
    "rto" DECIMAL(12,2) NOT NULL,
    "accessories" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("offerId")
);

-- CreateTable
CREATE TABLE "Booking" (
    "bookingId" UUID NOT NULL,
    "offerId" UUID NOT NULL,
    "queueEntryId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "dealerId" UUID NOT NULL,
    "inventoryId" UUID NOT NULL,
    "priceSnapshot" JSONB NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("bookingId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "logId" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("logId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Dealer_userId_key" ON "Dealer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CarModel_brand_model_key" ON "CarModel"("brand", "model");

-- CreateIndex
CREATE INDEX "Inventory_carModelId_variant_idx" ON "Inventory"("carModelId", "variant");

-- CreateIndex
CREATE INDEX "Inventory_dealerId_active_idx" ON "Inventory"("dealerId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_dealerId_carModelId_variant_color_key" ON "Inventory"("dealerId", "carModelId", "variant", "color");

-- CreateIndex
CREATE INDEX "Queue_city_status_idx" ON "Queue"("city", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Queue_carModelId_variant_city_key" ON "Queue"("carModelId", "variant", "city");

-- CreateIndex
CREATE INDEX "QueueEntry_queueId_status_joinedAt_idx" ON "QueueEntry"("queueId", "status", "joinedAt");

-- CreateIndex
CREATE INDEX "QueueEntry_customerId_status_idx" ON "QueueEntry"("customerId", "status");

-- CreateIndex
CREATE INDEX "QueueEntry_preferredDealerId_idx" ON "QueueEntry"("preferredDealerId");

-- CreateIndex
CREATE UNIQUE INDEX "QueueEntry_queueId_customerId_key" ON "QueueEntry"("queueId", "customerId");

-- CreateIndex
CREATE INDEX "Offer_queueEntryId_status_idx" ON "Offer"("queueEntryId", "status");

-- CreateIndex
CREATE INDEX "Offer_dealerId_status_idx" ON "Offer"("dealerId", "status");

-- CreateIndex
CREATE INDEX "Offer_expiresAt_idx" ON "Offer"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_queueEntryId_dealerId_key" ON "Offer"("queueEntryId", "dealerId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_offerId_key" ON "Booking"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_queueEntryId_key" ON "Booking"("queueEntryId");

-- CreateIndex
CREATE INDEX "Booking_customerId_status_idx" ON "Booking"("customerId", "status");

-- CreateIndex
CREATE INDEX "Booking_dealerId_status_idx" ON "Booking"("dealerId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Dealer" ADD CONSTRAINT "Dealer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("dealerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_carModelId_fkey" FOREIGN KEY ("carModelId") REFERENCES "CarModel"("carModelId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_carModelId_fkey" FOREIGN KEY ("carModelId") REFERENCES "CarModel"("carModelId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("queueId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_preferredDealerId_fkey" FOREIGN KEY ("preferredDealerId") REFERENCES "Dealer"("dealerId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_queueEntryId_fkey" FOREIGN KEY ("queueEntryId") REFERENCES "QueueEntry"("entryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("inventoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("dealerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("offerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_queueEntryId_fkey" FOREIGN KEY ("queueEntryId") REFERENCES "QueueEntry"("entryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("dealerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("inventoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
