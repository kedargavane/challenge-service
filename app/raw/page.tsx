import { prisma } from "@/lib/db";
import Nav from "@/components/Nav";
import leaderboardStyles from "../leaderboard/leaderboard.module.css";
import styles from "./raw.module.css";

export const dynamic = "force-dynamic";

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

  const rows = await prisma.rawDailyMetric.findMany({
    where: { participantId: selected.id },
    orderBy: { date: "desc" },
  });

  const bodyMetrics = await prisma.bodyMetric.findMany({
    where: { participantId: selected.id },
  });
  const weightByDate: Record<string, number> = {};
  for (const bm of bodyMetrics) {
    if (bm.weightKg != null) weightByDate[bm.date.toISOString().slice(0, 10)] = bm.weightKg;
  }

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
              rows.map((r) => {
                const dateStr = r.date.toISOString().slice(0, 10);
                return (
                  <tr key={r.id}>
                    <td>{dateStr}</td>
                    <td className={styles.numCell}>{r.steps ?? "—"}</td>
                    <td className={styles.numCell}>{r.sleepHours ?? "—"}</td>
                    <td className={styles.numCell}>{r.workoutCount ?? "—"}</td>
                    <td className={styles.numCell}>{r.workoutDurationMinutes ?? "—"}</td>
                    <td className={styles.numCell}>{weightByDate[dateStr] ?? "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
