/**
 * Core reconciliation logic, shared between the scheduled cron script
 * and the manual "Reconcile now" button.
 *
 * Branches per participant:
 * - scoringMode "standard" (the default): steps/sleep/workout, using
 *   the participant's own effective start date (participantStartDate,
 *   or the challenge's start date if not set -- e.g. Siva joining late).
 * - scoringMode "weight_only": skips steps/sleep/workout entirely,
 *   scores cumulative weight-loss milestones instead (see
 *   lib/weightScoring.ts) -- e.g. Krishna.
 */
import { prisma } from "./db";
import { getActivitySummaries, getSleepSummaries, getWorkoutEvents } from "./openWearables";
import { scoreActivitySummary, scoreSleepSummary, scoreWorkoutEvents, scoreStepsForProvider } from "./scoring";
import { recordActivityRaw, recordSleepRaw, recordWorkoutsRaw, recordStepsRawForProvider } from "./rawMetrics";
import { scoreWeightMilestones } from "./weightScoring";
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
    const challengeStart = challenge.startDate.toISOString().slice(0, 10);
    const challengeEnd = challenge.endDate.toISOString().slice(0, 10);

    if (today < challengeStart) {
      result.skipped.push(`"${challenge.name}" hasn't started yet`);
      continue;
    }
    if (today > addDaysToDateString(challengeEnd, GRACE_PERIOD_DAYS)) {
      result.skipped.push(`"${challenge.name}" is over`);
      continue;
    }

    for (const participant of challenge.participants) {
      try {
        // Effective start: this participant's own override if set,
        // otherwise the challenge's start date. End date is always the
        // challenge's end date -- only the start can be pushed later.
        const start = participant.participantStartDate
          ? participant.participantStartDate.toISOString().slice(0, 10)
          : challengeStart;
        const end = challengeEnd;

        if (participant.scoringMode === "weight_only") {
          if (participant.startingWeightKg != null && participant.weightGoalKg != null) {
            await scoreWeightMilestones(
              participant.id,
              participant.startingWeightKg,
              participant.weightGoalKg,
              participant.weightMilestoneKg ?? 0.5,
              start,
              end
            );
          }
          result.scored.push(participant.displayName);
          continue;
        }

        // Standard scoring path (steps/sleep/workout).
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
