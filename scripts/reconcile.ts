/**
 * Reconciliation job — run on a schedule (Railway cron) as a safety net
 * alongside the webhook receiver.
 *
 * Design notes:
 * - Always re-pulls from the challenge's start_date to end_date, not
 *   "since last run." This ensures late joiners get fully backfilled
 *   rather than only scored from whenever they connected.
 * - No per-participant timezone handling needed here: each summary/event
 *   carries its own local date (via lib/timezone.ts), so this job can run
 *   at any time of day for any participant without worrying about whose
 *   "midnight" it is.
 * - Scoring is idempotent (unique constraint on participant+activity+date),
 *   so re-processing the full challenge window on every run is safe and
 *   cheap for a small friend group. At larger scale, narrow the pulled
 *   range to a rolling lookback (e.g. last 3-4 days) instead.
 */
import { prisma } from "../lib/db";
import { getActivitySummaries, getSleepSummaries, getWorkoutEvents } from "../lib/openWearables";
import { scoreActivitySummary, scoreSleepSummary, scoreWorkoutEvents } from "../lib/scoring";
import { addDaysToDateString } from "../lib/timezone";

const GRACE_PERIOD_DAYS = 3; // keep reconciling briefly after end_date in case of late-arriving data

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

        for (const summary of activitySummaries) {
          await scoreActivitySummary(participant.id, summary, start, end);
        }
        for (const summary of sleepSummaries) {
          await scoreSleepSummary(participant.id, summary, start, end);
        }
        await scoreWorkoutEvents(participant.id, workoutEvents, start, end);

        console.log(`[reconcile] scored participant ${participant.displayName}`);
      } catch (err) {
        // One participant failing shouldn't stop the rest of the group
        // from being reconciled.
        console.error(`[reconcile] failed for participant ${participant.displayName}`, err);
      }
    }
  }

  // Auto-revoke provider connections for challenges that have just ended.
  for (const challenge of challenges) {
    const end = challenge.endDate.toISOString().slice(0, 10);
    if (today === end) {
      console.log(`[reconcile] "${challenge.name}" ends today — consider revoking provider connections.`);
      // Disconnect calls are deliberately not automated here yet — provider
      // support for API-driven disconnect varies (confirmed for Garmin,
      // others progressively added). Verify current support before wiring
      // this up to run automatically. See lib/openWearables.ts:disconnectProvider
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
