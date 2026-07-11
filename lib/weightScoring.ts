import { prisma } from "./db";
import { isWithinRange } from "./timezone";

/**
 * Scores a "weight_only" participant on cumulative weight-loss milestones
 * instead of steps/sleep/workout. Tracks the LOWEST weight recorded to
 * date (not just the latest reading) so a small day-to-day fluctuation
 * upward never costs an already-earned point -- once a milestone is hit,
 * it's permanent, same spirit as everyone else's daily pass/fail metrics.
 *
 * Total possible points = weightGoalKg / weightMilestoneKg (e.g. 3kg goal
 * / 0.5kg milestones = 6 points total), fixed regardless of how many days
 * are left -- this is deliberately a different kind of "max" than the
 * standard participants' day-based one; see lib/challengeData.ts for how
 * the two get normalized into a comparable percentage.
 */
export async function scoreWeightMilestones(
  participantId: string,
  startingWeightKg: number,
  goalKg: number,
  milestoneKg: number,
  challengeStart: string,
  challengeEnd: string
) {
  const metrics = await prisma.bodyMetric.findMany({
    where: { participantId },
    orderBy: { date: "asc" },
  });

  let lowestSoFar = startingWeightKg;
  let milestonesAwarded = 0;
  const totalMilestones = Math.round(goalKg / milestoneKg);

  for (const m of metrics) {
    if (m.weightKg == null) continue;
    const dateStr = m.date.toISOString().slice(0, 10);
    if (!isWithinRange(dateStr, challengeStart, challengeEnd)) continue;

    if (m.weightKg < lowestSoFar) {
      lowestSoFar = m.weightKg;
    }

    const totalLossSoFar = startingWeightKg - lowestSoFar;
    const milestonesReachedByNow = Math.min(
      totalMilestones,
      Math.floor(totalLossSoFar / milestoneKg + 1e-9) // epsilon guards float rounding at exact thresholds
    );

    const newMilestonesToday = milestonesReachedByNow - milestonesAwarded;
    if (newMilestonesToday > 0) {
      const existing = await prisma.pointEvent.findUnique({
        where: {
          participantId_activityType_occurredDate: {
            participantId,
            activityType: "weight",
            occurredDate: m.date,
          },
        },
      });
      if (existing?.source === "manual") {
        // Respect a manual correction for this specific date -- don't
        // recompute over it, but still count its points toward the
        // running total so later days aren't thrown off.
        milestonesAwarded = Math.max(milestonesAwarded, existing.points);
        continue;
      }

      await prisma.pointEvent.upsert({
        where: {
          participantId_activityType_occurredDate: {
            participantId,
            activityType: "weight",
            occurredDate: m.date,
          },
        },
        update: { points: newMilestonesToday, source: "api" },
        create: {
          participantId,
          activityType: "weight",
          occurredDate: m.date,
          points: newMilestonesToday,
          source: "api",
        },
      });
      milestonesAwarded = milestonesReachedByNow;
    }
  }
}
