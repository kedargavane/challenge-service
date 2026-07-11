import { prisma } from "./db";

export type MetricSet = { steps: boolean; sleep: boolean; workout: boolean };

export type ParticipantData = {
  id: string;
  name: string;
  totals: { steps: number; sleep: number; workout: number };
  total: number;
  metByDate: Record<string, MetricSet>;
  currentStreak: number;
  bestStreak: number;
  latestWeightKg: number | null;
};

export type ChallengeData = {
  challengeName: string | null;
  daysLeft: number | null;
  days: string[];
  maxPossiblePoints: number;
  participants: ParticipantData[];
};

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildDayList(start: string, end: string): string[] {
  const days: string[] = [];
  const cur = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cur <= last) {
    days.push(toDateStr(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

function computeStreaks(days: string[], metByDate: Record<string, MetricSet>) {
  let best = 0;
  let running = 0;

  for (const d of days) {
    const met = metByDate[d];
    const fullHouse = !!(met && met.steps && met.sleep && met.workout);
    running = fullHouse ? running + 1 : 0;
    best = Math.max(best, running);
  }

  let current = 0;
  let sawAnyData = false;
  for (let i = days.length - 1; i >= 0; i--) {
    const met = metByDate[days[i]];
    if (!met && !sawAnyData) continue;
    sawAnyData = true;
    const fullHouse = !!(met && met.steps && met.sleep && met.workout);
    if (fullHouse) current += 1;
    else break;
  }

  return { current, best };
}

export async function getChallengeData(): Promise<ChallengeData> {
  const participants = await prisma.participant.findMany({
    include: { pointEvents: true, challenge: true, bodyMetrics: true },
  });

  const challenge = participants[0]?.challenge ?? null;
  const today = toDateStr(new Date());
  const startDate = challenge ? toDateStr(new Date(challenge.startDate)) : today;
  const endDateRaw = challenge ? toDateStr(new Date(challenge.endDate)) : today;
  const gridEnd = endDateRaw < today ? endDateRaw : today;
  const days = challenge ? buildDayList(startDate, gridEnd) : [];
  const maxPossiblePoints = days.length * 3;

  const daysLeft = challenge
    ? Math.max(0, Math.ceil((new Date(challenge.endDate).getTime() - Date.now()) / 86_400_000))
    : null;

  const participantData: ParticipantData[] = participants
    .map((p) => {
      const totals = { steps: 0, sleep: 0, workout: 0 };
      const metByDate: Record<string, MetricSet> = {};

      for (const e of p.pointEvents) {
        if (e.activityType in totals) {
          totals[e.activityType as keyof typeof totals] += e.points;
        }
        const dateKey = toDateStr(new Date(e.occurredDate));
        if (!metByDate[dateKey]) metByDate[dateKey] = { steps: false, sleep: false, workout: false };
        if (e.activityType === "steps") metByDate[dateKey].steps = true;
        if (e.activityType === "sleep") metByDate[dateKey].sleep = true;
        if (e.activityType === "workout") metByDate[dateKey].workout = true;
      }

      const total = totals.steps + totals.sleep + totals.workout;
      const { current, best } = computeStreaks(days, metByDate);

      const latestWeight = p.bodyMetrics
        .slice()
        .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

      return {
        id: p.id,
        name: p.displayName,
        totals,
        total,
        metByDate,
        currentStreak: current,
        bestStreak: best,
        latestWeightKg: latestWeight?.weightKg ?? null,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    challengeName: challenge?.name ?? null,
    daysLeft,
    days,
    maxPossiblePoints,
    participants: participantData,
  };
}

export function buildCumulativeSeries(days: string[], participants: ParticipantData[]) {
  const running: Record<string, number> = {};
  for (const p of participants) running[p.name] = 0;

  return days.map((d) => {
    const row: Record<string, number | string> = { date: d.slice(5) };
    for (const p of participants) {
      const met = p.metByDate[d];
      const pointsToday = met ? (met.steps ? 1 : 0) + (met.sleep ? 1 : 0) + (met.workout ? 1 : 0) : 0;
      running[p.name] += pointsToday;
      row[p.name] = running[p.name];
    }
    return row;
  });
}
