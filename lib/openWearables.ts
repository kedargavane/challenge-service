/**
 * Thin client for the Open Wearables REST API.
 *
 * Endpoint paths and parameters below were confirmed directly against a
 * running instance's /openapi.json (not guessed from public docs):
 *   GET /api/v1/users/{user_id}/summaries/activity
 *   GET /api/v1/users/{user_id}/summaries/sleep
 *   GET /api/v1/users/{user_id}/events/workouts
 * All three take user_id as a PATH parameter (not a query param), plus
 * query params: start_date, end_date, cursor, limit, sort_order.
 * Auth header: X-Open-Wearables-API-Key
 *
 * Response envelope shape (cursor-based pagination) was not independently
 * confirmed at time of writing -- extractItems() below handles a few likely
 * shapes defensively. If reconcile.ts logs an empty result set despite
 * data existing, log the raw payload once to confirm the actual shape and
 * adjust extractItems()/fetchAllPages() accordingly.
 */

const BASE_URL = process.env.OPEN_WEARABLES_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.OPEN_WEARABLES_API_KEY ?? "";

async function owFetch(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Open-Wearables-API-Key": API_KEY },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Open Wearables API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function extractItems(payload: any): any[] {
  return payload.items ?? payload.data ?? [];
}

function extractNextCursor(payload: any): string | null {
  // Confirmed real shape: pagination.has_more (boolean) + pagination.next_cursor
  return payload.pagination?.has_more ? payload.pagination.next_cursor ?? null : null;
}

/**
 * Follows cursor pagination to collect every page for a date range.
 * Given this is a small friend-group challenge, page counts will be tiny --
 * this is a safety net for anyone with a long history, not a perf concern.
 */
async function fetchAllPages(basePath: string, params: URLSearchParams): Promise<any[]> {
  const results: any[] = [];
  let cursor: string | null = null;

  do {
    const query = new URLSearchParams(params);
    if (cursor) query.set("cursor", cursor);
    const payload = await owFetch(`${basePath}?${query.toString()}`);
    results.push(...extractItems(payload));
    cursor = extractNextCursor(payload);
  } while (cursor);

  return results;
}

export async function getActivitySummaries(userId: string, startDate: string, endDate: string) {
  return fetchAllPages(
    `/api/v1/users/${userId}/summaries/activity`,
    new URLSearchParams({ start_date: startDate, end_date: endDate })
  );
}

export async function getSleepSummaries(userId: string, startDate: string, endDate: string) {
  return fetchAllPages(
    `/api/v1/users/${userId}/summaries/sleep`,
    new URLSearchParams({ start_date: startDate, end_date: endDate })
  );
}

export async function getWorkoutEvents(userId: string, startDate: string, endDate: string) {
  return fetchAllPages(
    `/api/v1/users/${userId}/events/workouts`,
    new URLSearchParams({ start_date: startDate, end_date: endDate })
  );
}

/**
 * Revoke a participant's provider connection at the end of the challenge.
 * Path not independently confirmed against /openapi.json yet -- check
 * for a /api/v1/users/{user_id}/providers/{provider} DELETE route (or
 * similar) before relying on this in the auto-revoke step.
 */
/**
 * Raw per-sample timeseries data. Used only for participants with a
 * preferredProvider set -- lets us filter to exactly one source and sum
 * steps ourselves, since /summaries/activity pre-aggregates across all
 * sources into one number with no way to isolate a single provider after
 * the fact. Confirmed against a real instance: zone_offset is null on
 * every record, so callers must supply their own day-boundary timestamps
 * (see lib/scoring.ts:scoreStepsForProvider).
 */
export async function getStepsTimeseries(userId: string, startTimeISO: string, endTimeISO: string) {
  return fetchAllPages(
    `/api/v1/users/${userId}/timeseries`,
    new URLSearchParams({ start_time: startTimeISO, end_time: endTimeISO, types: 'steps', limit: '100' })
  );
}

export async function disconnectProvider(userId: string, provider: string) {
  const res = await fetch(`${BASE_URL}/api/v1/users/${userId}/providers/${provider}`, {
    method: "DELETE",
    headers: { "X-Open-Wearables-API-Key": API_KEY },
  });
  return res.ok;
}
