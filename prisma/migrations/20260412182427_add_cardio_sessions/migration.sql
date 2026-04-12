-- AlterTable
ALTER TABLE "Day" ADD COLUMN     "activityType" TEXT NOT NULL DEFAULT 'WORKOUT';

-- CreateTable
CREATE TABLE "CardioSession" (
    "id" SERIAL NOT NULL,
    "dayId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "durationMinutes" INTEGER,
    "avgHeartRate" INTEGER,
    "elevationM" INTEGER,
    "avgPaceMinKm" DOUBLE PRECISION,
    "avgSpeedKmh" DOUBLE PRECISION,
    "calories" INTEGER,
    "notes" TEXT,

    CONSTRAINT "CardioSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardioSession_dayId_key" ON "CardioSession"("dayId");

-- AddForeignKey
ALTER TABLE "CardioSession" ADD CONSTRAINT "CardioSession_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
