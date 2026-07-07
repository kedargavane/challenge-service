/**
 * Reconciliation job -- run on a schedule (Railway cron) as a safety net
 * alongside the webhook receiver. Also persists raw daily values (steps,
 * sleep hours, workout count/duration) to raw_daily_metrics for the /raw
 * page, using the same source-filtered data as scoring so the numbers
 * shown there match what's actually being scored.
 */
import { prisma } from "../lib/db";
import { getActivitySummaries, getSleepSummaries, getWorkoutEvents } from "../lib/openWearables";
import {
  scoreActivitySummary,
  scoreSleepSummary,
  scoreWorkoutEvents,
  scoreStepsForProvider,
} from "../lib/scoring";
import {
  recordActivityRaw,
  recordSleepRaw,
  recordWorkoutsRaw,
  recordStepsRawForProvider,
} from "../lib/rawMetrics";
import { addDaysToDateString } from "../lib/timezone";

const GRACE_PERIOD_DAYS = 3;

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const challenges = await prisma.challenge.findMany({ include: { participants: true } });

  for (const challenge of challenges) {
    const start = challenge.startDate.toISOString().slice(0, 10);
    const end = challenge.endDate.toISOString().slice(0, 10);

    if (today < start) {
      console.log(`[reconcile] "${challenge.name}" hasn't started yet, skipping.`);
      continue;
    }
    if (today > addDaysToDateString(end, GRACE_PERIOD_DAYS)) {
      console.log(`[reconcile] "${challenge.name}" is over, skipping.`);
      continue;
    }

    for (const participant of challenge.participants) {
      try {
        const [activitySummaries, sleepSummaries, workoutEvents] = await Promise.all([
          getActivitySummaries(participant.openWearablesUserId, start, end),
          getSleepSummaries(participant.openWearablesUserId, start, end),
          getWorkoutEvents(participant.openWearablesUserId, start, end),
        ]);

        // Sleep and workouts: score + record raw, both respecting
        // preferredProvider (each record carries its own source already).
        for (const summary of sleepSummaries) {
          await scoreSleepSummary(participant.id, summary, start, end, participant.preferredProvider);
          await recordSleepRaw(participant.id, summary, start, end, participant.preferredProvider);
        }
        await scoreWorkoutEvents(participant.id, workoutEvents, start, end, participant.preferredProvider);
        await recordWorkoutsRaw(participant.id, workoutEvents, start, end, participant.preferredProvider);

        // Steps: two paths depending on whether this participant needs
        // source isolation.
        if (participant.preferredProvider && participant.timezoneOffsetMinutes != null) {
          await scoreStepsForProvider(
            participant.id,
            participant.openWearablesUserId,
            participant.preferredProvider,
            participant.timezoneOffsetMinutes,
            start,
            end
          );
          await recordStepsRawForProvider(
            participant.id,
            participant.openWearablesUserId,
            participant.preferredProvider,
            participant.timezoneOffsetMinutes,
            start,
            end
          );
        } else {
          for (const summary of activitySummaries) {
            await scoreActivitySummary(participant.id, summary, start, end);
            await recordActivityRaw(participant.id, summary, start, end);
          }
        }

        console.log(`[reconcile] scored participant ${participant.displayName}`);
      } catch (err) {
        console.error(`[reconcile] failed for participant ${participant.displayName}`, err);
      }
    }
  }
}

main()
  .then(() => {
    console.log("[reconcile] done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[reconcile] fatal error", err);
    process.exit(1);
  });
