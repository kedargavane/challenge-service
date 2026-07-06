import { prisma } from "./db";
import { RULES } from "./rules";
import { localDateFromWorkout, isWithinRange } from "./timezone";

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

export async function scoreSleepSummary(
  participantId: string,
  summary: any,
  challengeStart: string,
  challengeEnd: string
) {
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
  challengeEnd: string
) {
  const minutesByDate: Record<string, number> = {};

  for (const ev of events) {
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
