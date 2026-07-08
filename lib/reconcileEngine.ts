/**
 * Core reconciliation logic, shared between the scheduled cron script
 * (scripts/reconcile.ts) and the manual "Reconcile now" button on the
 * leaderboard (app/api/reconcile/route.ts). Kept in one place so both
 * paths can never drift apart.
 */
import { prisma } from "./db";
import { getActivitySummaries, getSleepSummaries, getWorkoutEvents } from "./openWearables";
import { scoreActivitySummary, scoreSleepSummary, scoreWorkoutEvents, scoreStepsForProvider } from "./scoring";
import { recordActivityRaw, recordSleepRaw, recordWorkoutsRaw, recordStepsRawForProvider } from "./rawMetrics";
import { addDaysToDateString } from "./timezone";

const GRACE_PERIOD_DAYS = 3;

export type ReconcileResult = {
  scored: string[];
  errors: { name: string; error: string }[];
  skipped: string[];
};

export async function runReconciliation(): Promise<ReconcileResult> {
  const today = new Date().toISOString().slice(0, 10);
  const challenges = await prisma.challenge.findMany({ include: { participants: true } });

  const result: ReconcileResult = { scored: [], errors: [], skipped: [] };

  for (const challenge of challenges) {
    const start = challenge.startDate.toISOString().slice(0, 10);
    const end = challenge.endDate.toISOString().slice(0, 10);

    if (today < start) {
      result.skipped.push(`"${challenge.name}" hasn't started yet`);
      continue;
    }
    if (today > addDaysToDateString(end, GRACE_PERIOD_DAYS)) {
      result.skipped.push(`"${challenge.name}" is over`);
      continue;
    }

    for (const participant of challenge.participants) {
      try {
        const [activitySummaries, sleepSummaries, workoutEvents] = await Promise.all([
          getActivitySummaries(participant.openWearablesUserId, start, end),
          getSleepSummaries(participant.openWearablesUserId, start, end),
          getWorkoutEvents(participant.openWearablesUserId, start, end),
        ]);

        for (const summary of sleepSummaries) {
          await scoreSleepSummary(participant.id, summary, start, end, participant.preferredProvider);
          await recordSleepRaw(participant.id, summary, start, end, participant.preferredProvider);
        }
        await scoreWorkoutEvents(participant.id, workoutEvents, start, end, participant.preferredProvider);
        await recordWorkoutsRaw(participant.id, workoutEvents, start, end, participant.preferredProvider);

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

        result.scored.push(participant.displayName);
      } catch (err) {
        result.errors.push({
          name: participant.displayName,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return result;
}
