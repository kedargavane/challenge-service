-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "participant_start_date" DATE,
ADD COLUMN     "scoring_mode" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN     "starting_weight_kg" DOUBLE PRECISION,
ADD COLUMN     "weight_goal_kg" DOUBLE PRECISION,
ADD COLUMN     "weight_milestone_kg" DOUBLE PRECISION DEFAULT 0.5;
