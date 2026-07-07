-- CreateTable
CREATE TABLE "raw_daily_metrics" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "steps" INTEGER,
    "sleep_hours" DOUBLE PRECISION,
    "workout_count" INTEGER,
    "workout_duration_minutes" DOUBLE PRECISION,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "raw_daily_metrics_participant_id_date_key" ON "raw_daily_metrics"("participant_id", "date");

-- AddForeignKey
ALTER TABLE "raw_daily_metrics" ADD CONSTRAINT "raw_daily_metrics_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
