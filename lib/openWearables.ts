/**
 * Thin client for the Open Wearables REST API.
 *
 * NOTE: endpoint paths and response envelope shapes below are based on
 * publicly documented examples (X-Open-Wearables-API-Key header, paginated
 * { items, total, ... } and cursor { data, pagination, metadata } response
 * shapes, and /api/v1/summaries/... and /api/v1/events/... path patterns).
 * Confirm exact paths and field names against your running instance's
 * Swagger UI at {OPEN_WEARABLES_API_URL}/docs before relying on this in
 * production — some fields (e.g. exact activity/sleep field names) are
 * inferred from provider documentation, not the OpenAPI spec itself.
 */

const BASE_URL = process.env.OPEN_WEARABLES_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.OPEN_WEARABLES_API_KEY ?? "";

async function owFetch(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Open-Wearables-API-Key": API_KEY },
    // Reconciliation runs server-side on a schedule — no need for the
    // Next.js data cache to hold onto responses between runs.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Open Wearables API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function extractItems(payload: any): any[] {
  // Handles either response envelope shape documented by Open Wearables.
  return payload.items ?? payload.data ?? [];
}

export async function getActivitySummaries(userId: string, startDate: string, endDate: string) {
  const payload = await owFetch(
    `/api/v1/summaries/activity?user_id=${userId}&start_date=${startDate}&end_date=${endDate}`
  );
  return extractItems(payload);
}

export async function getSleepSummaries(userId: string, startDate: string, endDate: string) {
  const payload = await owFetch(
    `/api/v1/summaries/sleep?user_id=${userId}&start_date=${startDate}&end_date=${endDate}`
  );
  return extractItems(payload);
}

export async function getWorkoutEvents(userId: string, startDate: string, endDate: string) {
  const payload = await owFetch(
    `/api/v1/events/workouts?user_id=${userId}&start_date=${startDate}&end_date=${endDate}`
  );
  return extractItems(payload);
}

/**
 * Revoke a participant's provider connection at the end of the challenge.
 * As of the docs reviewed, full API-driven deregistration is confirmed
 * for Garmin; other providers are being added progressively. Verify
 * current support for Fitbit/Whoop before relying on this for every
 * provider — for unsupported ones, disconnecting via the dashboard UI
 * may still be a manual step.
 */
export async function disconnectProvider(userId: string, provider: string) {
  const res = await fetch(`${BASE_URL}/api/v1/users/${userId}/providers/${provider}`, {
    method: "DELETE",
    headers: { "X-Open-Wearables-API-Key": API_KEY },
  });
  return res.ok;
}
