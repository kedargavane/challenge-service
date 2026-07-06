/**
 * Determines which calendar date a wearable device recorded a reading in,
 * using the UTC offset embedded in the timestamp itself — NOT a stored
 * per-person timezone, and NOT a single timezone applied to everyone.
 * This is deliberate: it means someone traveling mid-challenge still gets
 * scored against wherever they actually were when the reading happened.
 *
 * Expects ISO 8601 timestamps. Two shapes are handled:
 *   "2026-07-01T22:15:00+05:30"  -> offset present, use it directly
 *   "2026-07-01T16:45:00Z"       -> bare UTC, no offset recoverable here
 *
 * IMPORTANT: before relying on this in production, confirm against the
 * live instance's Swagger docs (/docs) whether /summaries/activity,
 * /summaries/sleep, and /events/workouts actually return the offset on
 * the normalized response, or whether some providers collapse it to
 * bare UTC. If the latter, the offset may still be recoverable from the
 * raw payload (S3 raw payload storage) for that record — see the
 * `usedFallback` flag this function returns so callers can log/flag it
 * rather than silently mis-bucketing a day.
 */
export function localDateFromDeviceTimestamp(isoTimestamp: string): {
  date: string; // YYYY-MM-DD
  usedFallback: boolean;
} {
  const offsetMatch = isoTimestamp.match(/([+-]\d{2}:\d{2})$/);

  if (!offsetMatch) {
    // No offset embedded. Falling back to the bare UTC date. If precise
    // local-day attribution matters for this provider, recover the
    // original timestamp from the raw payload instead of trusting this.
    return { date: isoTimestamp.slice(0, 10), usedFallback: true };
  }

  const offset = offsetMatch[1];
  const sign = offset.startsWith("-") ? -1 : 1;
  const [ohStr, omStr] = offset.slice(1).split(":");
  const offsetMinutes = sign * (Number(ohStr) * 60 + Number(omStr));

  const utcMs = new Date(isoTimestamp).getTime();
  const localMs = utcMs + offsetMinutes * 60_000;
  const local = new Date(localMs);

  return { date: local.toISOString().slice(0, 10), usedFallback: false };
}

export function isWithinRange(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
