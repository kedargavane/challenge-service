-- AlterTable
ALTER TABLE "point_events" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'api';

-- AlterTable
ALTER TABLE "raw_daily_metrics" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'api';

-- CreateTable
CREATE TABLE "manual_metric_entries" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "steps" INTEGER,
    "sleep_hours" DOUBLE PRECISION,
    "workout_count" INTEGER,
    "workout_duration_minutes" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "manual_metric_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manual_metric_entries_participant_id_date_key" ON "manual_metric_entries"("participant_id", "date");

-- AddForeignKey
ALTER TABLE "manual_metric_entries" ADD CONSTRAINT "manual_metric_entries_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
