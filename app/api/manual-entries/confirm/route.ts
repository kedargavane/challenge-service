import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { RULES } from "@/lib/rules";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const entries: Array<{
    id: string;
    steps?: number | null;
    sleepHours?: number | null;
    workoutCount?: number | null;
    workoutDurationMinutes?: number | null;
    weightKg?: number | null;
  }> = body.entries ?? [];

  let count = 0;
  let outsideRangeCount = 0;

  for (const e of entries) {
    const existing = await prisma.manualMetricEntry.findUnique({
      where: { id: e.id },
      include: { participant: { include: { challenge: true } } },
    });
    if (!existing) continue;

    const updated = await prisma.manualMetricEntry.update({
      where: { id: e.id },
      data: {
        steps: e.steps ?? null,
        sleepHours: e.sleepHours ?? null,
        workoutCount: e.workoutCount ?? null,
        workoutDurationMinutes: e.workoutDurationMinutes ?? null,
        weightKg: e.weightKg ?? null,
        status: "confirmed",
        confirmedAt: new Date(),
      },
    });

    if (updated.weightKg != null) {
      await prisma.bodyMetric.upsert({
        where: { participantId_date: { participantId: updated.participantId, date: updated.date } },
        update: { weightKg: updated.weightKg },
        create: { participantId: updated.participantId, date: updated.date, weightKg: updated.weightKg },
      });
    }

    await prisma.rawDailyMetric.upsert({
      where: { participantId_date: { participantId: updated.participantId, date: updated.date } },
      update: {
        steps: updated.steps ?? undefined,
        sleepHours: updated.sleepHours ?? undefined,
        workoutCount: updated.workoutCount ?? undefined,
        workoutDurationMinutes: updated.workoutDurationMinutes ?? undefined,
        source: "manual",
      },
      create: {
        participantId: updated.participantId,
        date: updated.date,
        steps: updated.steps,
        sleepHours: updated.sleepHours,
        workoutCount: updated.workoutCount,
        workoutDurationMinutes: updated.workoutDurationMinutes,
        source: "manual",
      },
    });

    const challenge = existing.participant.challenge;
    const dateStr = updated.date.toISOString().slice(0, 10);
    const challengeStart = challenge.startDate.toISOString().slice(0, 10);
    const challengeEnd = challenge.endDate.toISOString().slice(0, 10);
    const inRange = dateStr >= challengeStart && dateStr <= challengeEnd;

    if (!inRange) {
      outsideRangeCount += 1;
      count += 1;
      continue;
    }

    if (updated.steps != null && updated.steps >= RULES.steps.thresholdPerDay) {
      await prisma.pointEvent.upsert({
        where: {
          participantId_activityType_occurredDate: {
            participantId: updated.participantId,
            activityType: "steps",
            occurredDate: updated.date,
          },
        },
        update: { points: RULES.steps.points, source: "manual" },
        create: {
          participantId: updated.participantId,
          activityType: "steps",
          occurredDate: updated.date,
          points: RULES.steps.points,
          source: "manual",
        },
      });
    }

    if (updated.sleepHours != null && updated.sleepHours > RULES.sleep.minHours) {
      await prisma.pointEvent.upsert({
        where: {
          participantId_activityType_occurredDate: {
            participantId: updated.participantId,
            activityType: "sleep",
            occurredDate: updated.date,
          },
        },
        update: { points: RULES.sleep.points, source: "manual" },
        create: {
          participantId: updated.participantId,
          activityType: "sleep",
          occurredDate: updated.date,
          points: RULES.sleep.points,
          source: "manual",
        },
      });
    }

    if (updated.workoutDurationMinutes != null && updated.workoutDurationMinutes >= RULES.workout.minMinutes) {
      await prisma.pointEvent.upsert({
        where: {
          participantId_activityType_occurredDate: {
            participantId: updated.participantId,
            activityType: "workout",
            occurredDate: updated.date,
          },
        },
        update: { points: RULES.workout.points, source: "manual" },
        create: {
          participantId: updated.participantId,
          activityType: "workout",
          occurredDate: updated.date,
          points: RULES.workout.points,
          source: "manual",
        },
      });
    }

    count += 1;
  }

  return NextResponse.json({ ok: true, count, outsideRangeCount });
}
