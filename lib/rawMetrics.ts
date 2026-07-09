import { prisma } from "./db";
import { localDateFromWorkout, isWithinRange, addDaysToDateString } from "./timezone";
import { getStepsTimeseries } from "./openWearables";

async function upsertRaw(
  participantId: string,
  date: string,
  data: { steps?: number; sleepHours?: number; workoutCount?: number; workoutDurationMinutes?: number }
) {
  // Never let automated sync overwrite a manually-confirmed screenshot
  // entry for this date -- see app/api/manual-entries/confirm/route.ts.
  const existing = await prisma.rawDailyMetric.findUnique({
    where: { participantId_date: { participantId, date: new Date(date) } },
  });
  if (existing?.source === "manual") return;

  await prisma.rawDailyMetric.upsert({
    where: { participantId_date: { participantId, date: new Date(date) } },
    update: { ...data, source: "api" },
    create: { participantId, date: new Date(date), ...data, source: "api" },
  });
}

/** Records raw daily steps from a /summaries/activity entry (default path, no provider filter). */
export async function recordActivityRaw(
  participantId: string,
  summary: any,
  challengeStart: string,
  challengeEnd: string
) {
  const date = summary.date;
  if (!date || !isWithinRange(date, challengeStart, challengeEnd)) return;
  await upsertRaw(participantId, date, { steps: summary.steps ?? 0 });
}

/** Records raw sleep hours from a /summaries/sleep entry, respecting preferredProvider. */
export async function recordSleepRaw(
  participantId: string,
  summary: any,
  challengeStart: string,
  challengeEnd: string,
  preferredProvider?: string | null
) {
  if (preferredProvider && summary.source?.provider !== preferredProvider) return;
  const date = summary.date;
  if (!date || !isWithinRange(date, challengeStart, challengeEnd)) return;
  const hours = (summary.duration_minutes ?? 0) / 60;
  await upsertRaw(participantId, date, { sleepHours: Math.round(hours * 100) / 100 });
}

/** Records raw workout count + total minutes per day, respecting preferredProvider. */
export async function recordWorkoutsRaw(
  participantId: string,
  events: any[],
  challengeStart: string,
  challengeEnd: string,
  preferredProvider?: string | null
) {
  const byDate: Record<string, { count: number; minutes: number }> = {};

  for (const ev of events) {
    if (preferredProvider && ev.source?.provider !== preferredProvider) continue;
    const timestamp = ev.start_time;
    if (!timestamp) continue;

    const { date } = localDateFromWorkout(timestamp, ev.zone_offset);
    if (!isWithinRange(date, challengeStart, challengeEnd)) continue;

    if (!byDate[date]) byDate[date] = { count: 0, minutes: 0 };
    byDate[date].count += 1;
    byDate[date].minutes += (ev.duration_seconds ?? 0) / 60;
  }

  for (const [date, agg] of Object.entries(byDate)) {
    await upsertRaw(participantId, date, {
      workoutCount: agg.count,
      workoutDurationMinutes: Math.round(agg.minutes * 100) / 100,
    });
  }
}

/**
 * Records raw daily steps for a provider-filtered participant, pulling
 * from raw /timeseries the same way scoreStepsForProvider does -- just
 * storing every day's total unconditionally instead of only when it
 * crosses the scoring threshold.
 */
export async function recordStepsRawForProvider(
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

    await upsertRaw(participantId, date, { steps: Math.round(totalSteps) });

    date = addDaysToDateString(date, 1);
  }
}
