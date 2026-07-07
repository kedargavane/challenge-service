import { prisma } from "./db";
import { RULES } from "./rules";
import { localDateFromWorkout, isWithinRange, addDaysToDateString } from "./timezone";
import { getStepsTimeseries } from "./openWearables";

async function upsertPoint(
  participantId: string,
  activityType: keyof typeof RULES,
  occurredDate: string,
  points: number
) {
  await prisma.pointEvent.upsert({
    where: {
      participantId_activityType_occurredDate: {
        participantId,
        activityType,
        occurredDate: new Date(occurredDate),
      },
    },
    update: { points },
    create: {
      participantId,
      activityType,
      occurredDate: new Date(occurredDate),
      points,
    },
  });
}

// ---------------------------------------------------------------------
// Default path: trust Open Wearables' own daily summaries. Confirmed
// empirically correct for at least one real case (source resolution and
// day-bucketing both matched a manual raw-data recomputation). Use this
// unless a participant has a preferredProvider set.
// ---------------------------------------------------------------------

export async function scoreActivitySummary(
  participantId: string,
  summary: any,
  challengeStart: string,
  challengeEnd: string
) {
  const date = summary.date;
  if (!date || !isWithinRange(date, challengeStart, challengeEnd)) return;

  const steps = summary.steps ?? 0;
  if (steps >= RULES.steps.thresholdPerDay) {
    await upsertPoint(participantId, "steps", date, RULES.steps.points);
  }
}

// ---------------------------------------------------------------------
// Sleep and workouts: these come back as individual records each tagged
// with source.provider, so filtering to one provider is just a matter of
// skipping records that don't match -- no raw-data pull needed, and no
// extra timezone handling since each record's own `date` (sleep) or our
// existing localDateFromWorkout fallback (workouts) still applies.
// ---------------------------------------------------------------------

export async function scoreSleepSummary(
  participantId: string,
  summary: any,
  challengeStart: string,
  challengeEnd: string,
  preferredProvider?: string | null
) {
  if (preferredProvider && summary.source?.provider !== preferredProvider) return;

  const date = summary.date;
  if (!date || !isWithinRange(date, challengeStart, challengeEnd)) return;

  const durationMinutes = summary.duration_minutes ?? 0;
  const hours = durationMinutes / 60;
  if (hours > RULES.sleep.minHours) {
    await upsertPoint(participantId, "sleep", date, RULES.sleep.points);
  }
}

export async function scoreWorkoutEvents(
  participantId: string,
  events: any[],
  challengeStart: string,
  challengeEnd: string,
  preferredProvider?: string | null
) {
  const minutesByDate: Record<string, number> = {};

  for (const ev of events) {
    if (preferredProvider && ev.source?.provider !== preferredProvider) continue;

    const timestamp = ev.start_time;
    if (!timestamp) continue;

    const { date, usedFallback } = localDateFromWorkout(timestamp, ev.zone_offset);
    if (usedFallback) {
      console.warn(
        `[scoring] workout ${ev.id ?? "(no id)"} for participant ${participantId} had no zone_offset -- used bare UTC date ${date}.`
      );
    }
    if (!isWithinRange(date, challengeStart, challengeEnd)) continue;

    const minutes = (ev.duration_seconds ?? 0) / 60;
    minutesByDate[date] = (minutesByDate[date] ?? 0) + minutes;
  }

  for (const [date, totalMinutes] of Object.entries(minutesByDate)) {
    if (totalMinutes > RULES.workout.minMinutes) {
      await upsertPoint(participantId, "workout", date, RULES.workout.points);
    }
  }
}

// ---------------------------------------------------------------------
// Steps via raw timeseries, filtered to one provider. Only used when a
// participant has preferredProvider set -- /summaries/activity has no
// per-source breakdown, so this is the only way to isolate one device.
// Raw records have zone_offset: null (confirmed empirically), so we
// compute each day's true UTC window ourselves using the participant's
// stored timezoneOffsetMinutes.
// ---------------------------------------------------------------------

export async function scoreStepsForProvider(
  participantId: string,
  userId: string,
  preferredProvider: string,
  timezoneOffsetMinutes: number,
  challengeStart: string,
  challengeEnd: string
) {
  let date = challengeStart;
  while (date <= challengeEnd) {
    const windowStartMs = new Date(`${date}T00:00:00Z`).getTime() - timezoneOffsetMinutes * 60_000;
    const windowEndMs = windowStartMs + 24 * 60 * 60_000;

    const records = await getStepsTimeseries(
      userId,
      new Date(windowStartMs).toISOString(),
      new Date(windowEndMs).toISOString()
    );

    const totalSteps = records
      .filter((r: any) => r.source?.provider === preferredProvider)
      .reduce((sum: number, r: any) => sum + (r.value ?? 0), 0);

    if (totalSteps >= RULES.steps.thresholdPerDay) {
      await upsertPoint(participantId, "steps", date, RULES.steps.points);
    }

    date = addDaysToDateString(date, 1);
  }
}
