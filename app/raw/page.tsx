import { prisma } from "@/lib/db";
import Nav from "@/components/Nav";
import leaderboardStyles from "../leaderboard/leaderboard.module.css";
import styles from "./raw.module.css";

export const dynamic = "force-dynamic";

type MergedRow = {
  date: string;
  steps: number | null;
  sleepHours: number | null;
  workoutCount: number | null;
  workoutDurationMinutes: number | null;
  weightKg: number | null;
};

export default async function RawPage({
  searchParams,
}: {
  searchParams: { participant?: string };
}) {
  const participants = await prisma.participant.findMany({
    orderBy: { displayName: "asc" },
  });

  if (participants.length === 0) {
    return (
      <main className={leaderboardStyles.page}>
        <Nav active="raw" />
        <div className={leaderboardStyles.empty}>No participants yet.</div>
      </main>
    );
  }

  const selectedId = searchParams.participant ?? participants[0].id;
  const selected = participants.find((p) => p.id === selectedId) ?? participants[0];

  const challenge = await prisma.challenge.findFirst();
  const dateFilter = challenge ? { gte: challenge.startDate } : undefined;

  const rawRows = await prisma.rawDailyMetric.findMany({
    where: { participantId: selected.id, ...(dateFilter ? { date: dateFilter } : {}) },
  });

  const bodyMetricRows = await prisma.bodyMetric.findMany({
    where: { participantId: selected.id, ...(dateFilter ? { date: dateFilter } : {}) },
  });

  // Merge both sources by date -- this matters for weight_only participants
  // (like Krishna), who have body_metrics rows but no raw_daily_metrics
  // rows at all, since steps/sleep/workout scoring never runs for them.
  const merged: Record<string, MergedRow> = {};

  for (const r of rawRows) {
    const dateStr = r.date.toISOString().slice(0, 10);
    merged[dateStr] = {
      date: dateStr,
      steps: r.steps,
      sleepHours: r.sleepHours,
      workoutCount: r.workoutCount,
      workoutDurationMinutes: r.workoutDurationMinutes,
      weightKg: null,
    };
  }

  for (const bm of bodyMetricRows) {
    const dateStr = bm.date.toISOString().slice(0, 10);
    if (!merged[dateStr]) {
      merged[dateStr] = {
        date: dateStr,
        steps: null,
        sleepHours: null,
        workoutCount: null,
        workoutDurationMinutes: null,
        weightKg: bm.weightKg,
      };
    } else {
      merged[dateStr].weightKg = bm.weightKg;
    }
  }

  const rows = Object.values(merged).sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <main className={leaderboardStyles.page}>
      <Nav active="raw" />
      <header className={leaderboardStyles.header}>
        <h1>Raw data</h1>
        <p className={leaderboardStyles.daysLeft}>
          {selected.preferredProvider ? `Source: ${selected.preferredProvider}` : "Default source"}
        </p>
      </header>

      <div className={styles.tabRow}>
        {participants.map((p) => (
          <a
            key={p.id}
            href={`/raw?participant=${p.id}`}
            className={p.id === selected.id ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          >
            {p.displayName}
          </a>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Steps</th>
              <th>Sleep (hrs)</th>
              <th>Workouts</th>
              <th>Workout mins</th>
              <th>Weight (kg)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--ink-muted)", padding: 32 }}>
                  No data recorded yet for {selected.displayName}.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.date}>
                  <td>{r.date}</td>
                  <td className={styles.numCell}>{r.steps ?? "—"}</td>
                  <td className={styles.numCell}>{r.sleepHours ?? "—"}</td>
                  <td className={styles.numCell}>{r.workoutCount ?? "—"}</td>
                  <td className={styles.numCell}>{r.workoutDurationMinutes ?? "—"}</td>
                  <td className={styles.numCell}>{r.weightKg ?? "—"}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </main>
  );
}
