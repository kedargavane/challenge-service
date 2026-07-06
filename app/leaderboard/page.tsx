import { prisma } from "@/lib/db";
import styles from "./leaderboard.module.css";

export const dynamic = "force-dynamic";

async function getLeaderboard() {
  const participants = await prisma.participant.findMany({
    include: { pointEvents: true, challenge: true },
  });

  return participants
    .map((p) => {
      const totals = { steps: 0, sleep: 0, workout: 0 };
      for (const e of p.pointEvents) {
        if (e.activityType in totals) {
          totals[e.activityType as keyof typeof totals] += e.points;
        }
      }
      const total = totals.steps + totals.sleep + totals.workout;
      return { id: p.id, name: p.displayName, total, totals, challenge: p.challenge };
    })
    .sort((a, b) => b.total - a.total);
}

export default async function LeaderboardPage() {
  const rows = await getLeaderboard();
  const challenge = rows[0]?.challenge;
  const daysLeft = challenge
    ? Math.max(0, Math.ceil((new Date(challenge.endDate).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>{challenge?.name ?? "Challenge leaderboard"}</h1>
        {daysLeft !== null && <p className={styles.daysLeft}>{daysLeft} days left</p>}
      </header>

      {rows.length === 0 ? (
        <div className={styles.empty}>No participants yet — add some to get started.</div>
      ) : (
        <div className={styles.board}>
          {rows.map((r, i) => (
            <div key={r.id} className={i === 0 ? `${styles.row} ${styles.leader}` : styles.row}>
              <div className={styles.rank}>#{i + 1}</div>
              <div className={styles.name}>{r.name}</div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Steps</span>
                <span className={styles.statValue}>{r.totals.steps}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Sleep</span>
                <span className={styles.statValue}>{r.totals.sleep}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Workout</span>
                <span className={styles.statValue}>{r.totals.workout}</span>
              </div>
              <div className={styles.total}>{r.total}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
