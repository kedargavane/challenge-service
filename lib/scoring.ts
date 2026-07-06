import { prisma } from "./db";
import { RULES } from "./rules";
import { localDateFromDeviceTimestamp, isWithinRange } from "./timezone";

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

/**
 * Scores a single daily activity summary against the steps rule.
 * `summary` shape assumed: { date | recorded_at: string (ISO), steps: number, ... }
 * Confirm exact field names against the live API response.
 */
export async function scoreActivitySummary(
  participantId: string,
  summary: any,
  challengeStart: string,
  challengeEnd: string
) {
  const timestamp = summary.date ?? summary.recorded_at;
  if (!timestamp) return;

  const { date, usedFallback } = localDateFromDeviceTimestamp(timestamp);
  if (usedFallback) {
    console.warn(
      `[scoring] activity summary for participant ${participantId} had no UTC offset — used bare UTC date ${date}. Consider checking the raw payload.`
    );
  }
  if (!isWithinRange(date, challengeStart, challengeEnd)) return;

  const steps = summary.steps ?? summary.step_count ?? 0;
  if (steps >= RULES.steps.thresholdPerDay) {
    await upsertPoint(participantId, "steps", date, RULES.steps.points);
  }
}

/**
 * Scores a single sleep summary against the sleep-duration rule.
 * `summary` shape assumed: { date | start_time: string (ISO), duration_seconds: number, ... }
 */
export async function scoreSleepSummary(
  participantId: string,
  summary: any,
  challengeStart: string,
  challengeEnd: string
) {
  const timestamp = summary.date ?? summary.start_time ?? summary.recorded_at;
  if (!timestamp) return;

  const { date, usedFallback } = localDateFromDeviceTimestamp(timestamp);
  if (usedFallback) {
    console.warn(
      `[scoring] sleep summary for participant ${participantId} had no UTC offset — used bare UTC date ${date}. Consider checking the raw payload.`
    );
  }
  if (!isWithinRange(date, challengeStart, challengeEnd)) return;

  const durationSeconds = summary.duration_seconds ?? summary.total_sleep_seconds ?? 0;
  const hours = durationSeconds / 3600;
  if (hours > RULES.sleep.minHours) {
    await upsertPoint(participantId, "sleep", date, RULES.sleep.points);
  }
}

/**
 * Scores a batch of workout events against the daily workout-minutes rule.
 * Minutes are summed per local day BEFORE comparing to the threshold, so
 * multiple short workouts on the same day stack toward the 30-minute bar.
 * `event` shape assumed: { start_time: string (ISO), duration_seconds: number, ... }
 */
export async function scoreWorkoutEvents(
  participantId: string,
  events: any[],
  challengeStart: string,
  challengeEnd: string
) {
  const minutesByDate: Record<string, number> = {};

  for (const ev of events) {
    const timestamp = ev.start_time ?? ev.recorded_at;
    if (!timestamp) continue;

    const { date, usedFallback } = localDateFromDeviceTimestamp(timestamp);
    if (usedFallback) {
      console.warn(
        `[scoring] workout event for participant ${participantId} had no UTC offset — used bare UTC date ${date}.`
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
