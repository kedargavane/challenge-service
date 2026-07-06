export function localDateFromWorkout(
  isoTimestamp: string,
  zoneOffset: number | string | null | undefined
): { date: string; usedFallback: boolean } {
  let offsetMinutes: number | null = null;

  if (typeof zoneOffset === "number") {
    offsetMinutes = zoneOffset;
  } else if (typeof zoneOffset === "string") {
    const match = zoneOffset.match(/^([+-])(\d{2}):(\d{2})$/);
    if (match) {
      const sign = match[1] === "-" ? -1 : 1;
      offsetMinutes = sign * (Number(match[2]) * 60 + Number(match[3]));
    }
  }

  if (offsetMinutes === null) {
    return { date: isoTimestamp.slice(0, 10), usedFallback: true };
  }

  const localMs = new Date(isoTimestamp).getTime() + offsetMinutes * 60_000;
  return { date: new Date(localMs).toISOString().slice(0, 10), usedFallback: false };
}

export function isWithinRange(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
