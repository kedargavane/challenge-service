/**
 * Thin client for the Open Wearables REST API.
 *
 * Endpoint paths and parameters below were confirmed directly against a
 * running instance's /openapi.json:
 *   GET /api/v1/users/{user_id}/summaries/activity
 *   GET /api/v1/users/{user_id}/summaries/sleep
 *   GET /api/v1/users/{user_id}/events/workouts
 * All three take user_id as a PATH parameter, plus query params:
 * start_date, end_date, cursor, limit, sort_order.
 * Auth header: X-Open-Wearables-API-Key
 *
 * Response envelope confirmed against real responses:
 * { "data": [...], "pagination": { "next_cursor", "has_more", ... } }
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
  return payload.pagination?.has_more ? payload.pagination.next_cursor ?? null : null;
}

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

export async function disconnectProvider(userId: string, provider: string) {
  const res = await fetch(`${BASE_URL}/api/v1/users/${userId}/providers/${provider}`, {
    method: "DELETE",
    headers: { "X-Open-Wearables-API-Key": API_KEY },
  });
  return res.ok;
}
