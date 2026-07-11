import { prisma } from "../lib/db";
import { RULES } from "../lib/rules";

async function main() {
  const entries = await prisma.manualMetricEntry.findMany({
    where: { status: "confirmed" },
    include: { participant: { include: { challenge: true } } },
  });

  let added = 0;

  for (const e of entries) {
    const challenge = e.participant.challenge;
    const dateStr = e.date.toISOString().slice(0, 10);
    const challengeStart = challenge.startDate.toISOString().slice(0, 10);
    const challengeEnd = challenge.endDate.toISOString().slice(0, 10);
    const inRange = dateStr >= challengeStart && dateStr <= challengeEnd;
    if (!inRange) continue;

    const checks: Array<{ type: "steps" | "sleep" | "workout"; qualifies: boolean; points: number }> = [
      {
        type: "steps",
        qualifies: e.steps != null && e.steps >= RULES.steps.thresholdPerDay,
        points: RULES.steps.points,
      },
      {
        type: "sleep",
        qualifies: e.sleepHours != null && e.sleepHours >= RULES.sleep.minHours,
        points: RULES.sleep.points,
      },
      {
        type: "workout",
        qualifies: e.workoutDurationMinutes != null && e.workoutDurationMinutes >= RULES.workout.minMinutes,
        points: RULES.workout.points,
      },
    ];

    for (const check of checks) {
      if (!check.qualifies) continue;

      const existing = await prisma.pointEvent.findUnique({
        where: {
          participantId_activityType_occurredDate: {
            participantId: e.participantId,
            activityType: check.type,
            occurredDate: e.date,
          },
        },
      });
      if (existing) continue;

      await prisma.pointEvent.create({
        data: {
          participantId: e.participantId,
          activityType: check.type,
          occurredDate: e.date,
          points: check.points,
          source: "manual",
        },
      });
      added += 1;
      console.log(
        `[backfill] added ${check.type} point for ${e.participant.displayName} on ${dateStr}`
      );
    }
  }

  console.log(`[backfill] done -- added ${added} missing point(s)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[backfill] fatal error", err);
    process.exit(1);
  });
