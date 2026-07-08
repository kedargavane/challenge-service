/**
 * Cron entry point -- thin wrapper around the shared reconciliation
 * engine (lib/reconcileEngine.ts), which is also used by the manual
 * "Reconcile now" button (app/api/reconcile/route.ts).
 */
import { runReconciliation } from "../lib/reconcileEngine";

async function main() {
  const result = await runReconciliation();

  for (const name of result.scored) {
    console.log(`[reconcile] scored participant ${name}`);
  }
  for (const { name, error } of result.errors) {
    console.error(`[reconcile] failed for participant ${name}`, error);
  }
  for (const note of result.skipped) {
    console.log(`[reconcile] ${note}, skipping.`);
  }
}

main()
  .then(() => {
    console.log("[reconcile] done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[reconcile] fatal error", err);
    process.exit(1);
  });
