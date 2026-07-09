import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractMetricsFromScreenshots } from "@/lib/anthropicVision";

// Step 2-3 of the manual upload flow: takes uploaded screenshots, runs
// vision extraction, stages the results as status="pending" rows, and
// permanently logs the upload (with the actual images) so anyone can
// revisit what was uploaded and when -- see UploadLog/UploadedImage.
// Does NOT touch point_events or raw_daily_metrics yet -- that only
// happens after a human reviews and confirms (see /confirm).
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const participantId = formData.get("participantId") as string | null;
  const files = formData.getAll("screenshots") as File[];

  if (!participantId || files.length === 0) {
    return NextResponse.json(
      { error: "participantId and at least one screenshot are required" },
      { status: 400 }
    );
  }

  try {
    const images = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return {
          fileName: file.name || null,
          base64: buffer.toString("base64"),
          mediaType: file.type || "image/png",
        };
      })
    );

    const extracted = await extractMetricsFromScreenshots(
      images.map((i) => ({ base64: i.base64, mediaType: i.mediaType }))
    );

    const saved = [];
    for (const row of extracted) {
      if (!row.date) continue;
      const entry = await prisma.manualMetricEntry.upsert({
        where: { participantId_date: { participantId, date: new Date(row.date) } },
        update: {
          steps: row.steps ?? null,
          sleepHours: row.sleepHours ?? null,
          workoutCount: row.workoutCount ?? null,
          workoutDurationMinutes: row.workoutDurationMinutes ?? null,
          status: "pending",
        },
        create: {
          participantId,
          date: new Date(row.date),
          steps: row.steps ?? null,
          sleepHours: row.sleepHours ?? null,
          workoutCount: row.workoutCount ?? null,
          workoutDurationMinutes: row.workoutDurationMinutes ?? null,
          status: "pending",
        },
      });
      saved.push(entry);
    }

    const datesFound = extracted.map((r) => r.date).filter(Boolean).sort();
    const summary =
      datesFound.length > 0
        ? `${datesFound.length} day(s) extracted: ${datesFound.join(", ")}`
        : "No dates could be extracted";

    await prisma.uploadLog.create({
      data: {
        participantId,
        extractedSummary: summary,
        images: {
          create: images.map((img) => ({
            fileName: img.fileName,
            mediaType: img.mediaType,
            base64Data: img.base64,
          })),
        },
      },
    });

    saved.sort((a, b) => b.date.getTime() - a.date.getTime());
    return NextResponse.json({ entries: saved });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
