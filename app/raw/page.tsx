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
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--ink-muted)", padding: 32 }}>
                  No data recorded yet for {selected.displayName}.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.date.toISOString().slice(0, 10)}</td>
                  <td className={styles.numCell}>{r.steps ?? "—"}</td>
                  <td className={styles.numCell}>{r.sleepHours ?? "—"}</td>
                  <td className={styles.numCell}>{r.workoutCount ?? "—"}</td>
                  <td className={styles.numCell}>{r.workoutDurationMinutes ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
