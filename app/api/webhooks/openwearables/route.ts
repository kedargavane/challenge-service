import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scoreActivitySummary, scoreSleepSummary, scoreWorkoutEvents } from "@/lib/scoring";

/**
 * Receives webhook events from Open Wearables and scores them immediately.
 *
 * NOTE: the exact `event_type` values and payload envelope below are our
 * best assumption based on the documented webhook feature description
 * ("Register webhook endpoints... choosing which event types to subscribe
 * to... POST request sent with the event payload"). Confirm the actual
 * event type strings and payload shape against
 * openwearables.io/docs/api-reference/guides/webhooks when you register
 * the subscription, and adjust the switch statement below to match.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.OPEN_WEARABLES_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = await req.json();
  const { event_type: eventType, user_id: userId, data } = payload;

  if (!userId || !eventType) {
    return NextResponse.json({ error: "malformed payload" }, { status: 400 });
  }

  const participant = await prisma.participant.findFirst({
    where: { openWearablesUserId: userId },
    include: { challenge: true },
  });

  // Not someone in an active challenge — ignore, but still 200 so
  // Open Wearables doesn't retry indefinitely.
  if (!participant) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const start = participant.challenge.startDate.toISOString().slice(0, 10);
  const end = participant.challenge.endDate.toISOString().slice(0, 10);

  try {
    switch (eventType) {
      case "activity.summary.updated":
      case "activity.summary.created":
        // Participants with a preferredProvider get steps scored via the
        // raw-timeseries path on the reconciliation cron instead --
        // that path needs a full day window pull, not a single webhook
        // payload, so we skip it here and let the cron catch it.
        if (!participant.preferredProvider) {
          await scoreActivitySummary(participant.id, data, start, end);
        }
        break;
      case "sleep.session.created":
      case "sleep.summary.created":
        await scoreSleepSummary(participant.id, data, start, end, participant.preferredProvider);
        break;
      case "workout.created":
        await scoreWorkoutEvents(participant.id, [data], start, end, participant.preferredProvider);
        break;
      default:
        // Unrecognized event type — log for visibility but don't fail
        // the webhook delivery.
        console.warn(`[webhook] unhandled event_type: ${eventType}`);
    }
  } catch (err) {
    console.error("[webhook] scoring error", err);
    // Still 200: the nightly reconciliation cron will catch this on
    // its next run since scoring is idempotent.
  }

  return NextResponse.json({ ok: true });
}
