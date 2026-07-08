import { NextResponse } from "next/server";
import { runReconciliation } from "@/lib/reconcileEngine";

// Manual trigger for the "Reconcile now" button on the leaderboard.
// No auth beyond whatever protects the dashboard itself -- this is a
// friend-group tool, not a public endpoint with untrusted traffic.
export async function POST() {
  try {
    const result = await runReconciliation();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
