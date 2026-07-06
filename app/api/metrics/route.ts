import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Manual body metrics (weight, BMI, body fat). Never scored — shown only
// for the group to compare progress, since not everyone has a smart scale.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { participantId, date, weightKg, bmi, bodyFatPct, notes } = body;

  if (!participantId || !date) {
    return NextResponse.json({ error: "participantId and date are required" }, { status: 400 });
  }

  const entry = await prisma.bodyMetric.upsert({
    where: { participantId_date: { participantId, date: new Date(date) } },
    update: { weightKg, bmi, bodyFatPct, notes },
    create: { participantId, date: new Date(date), weightKg, bmi, bodyFatPct, notes },
  });

  return NextResponse.json(entry);
}

export async function GET(req: NextRequest) {
  const participantId = req.nextUrl.searchParams.get("participantId");
  if (!participantId) {
    return NextResponse.json({ error: "participantId query param is required" }, { status: 400 });
  }

  const entries = await prisma.bodyMetric.findMany({
    where: { participantId },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(entries);
}
