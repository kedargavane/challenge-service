import { prisma } from "@/lib/db";
import styles from "./leaderboard.module.css";
import ScoreGauge from "@/components/ScoreGauge";
import MetricsBarChart from "@/components/MetricsBarChart";

export const dynamic = "force-dynamic";

const DEFAULT_CHALLENGE_NAME = "LGMF Spain-Fit Challenge";
const GAUGE_ACCENTS = ["--amber", "--teal", "--sage", "--amber-dark", "--teal-dark", "--sage-dark"];

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

async function getLeaderboardData() {
  const participants = await prisma.participant.findMany({
    include: { pointEvents: true, challenge: true },
  });

  const rows = participants
    .map((p) => {
      const totals = { steps: 0, sleep: 0, workout: 0 };
      const metByDate: Record<string, { steps: boolean; sleep: boolean; workout: boolean }> = {};

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
      return { id: p.id, name: p.displayName, total, totals, metByDate, challenge: p.challenge };
    })
    .sort((a, b) => b.total - a.total);

  return rows;
}

export default async function LeaderboardPage() {
  const rows = await getLeaderboardData();
  const challenge = rows[0]?.challenge;
  const daysLeft = challenge
    ? Math.max(0, Math.ceil((new Date(challenge.endDate).getTime() - Date.now()) / 86_400_000))
    : null;

  const today = toDateStr(new Date());
  const challengeStart = challenge ? toDateStr(new Date(challenge.startDate)) : today;
  const challengeEndRaw = challenge ? toDateStr(new Date(challenge.endDate)) : today;
  const gridEnd = challengeEndRaw < today ? challengeEndRaw : today;
  const days = challenge ? buildDayList(challengeStart, gridEnd) : [];
  const maxPossiblePoints = days.length * 3;

  const chartData = rows.map((r) => ({
    name: r.name,
    Steps: r.totals.steps,
    Sleep: r.totals.sleep,
    Workout: r.totals.workout,
  }));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>{challenge?.name ?? DEFAULT_CHALLENGE_NAME}</h1>
        {daysLeft !== null && <p className={styles.daysLeft}>{daysLeft} days left</p>}
      </header>

      {rows.length === 0 ? (
        <div className={styles.empty}>No participants yet — add some to get started.</div>
      ) : (
        <>
          <section className={styles.gaugeSection}>
            <p className={styles.eyebrow}>Progress</p>
            <div className={styles.gaugeRow}>
              {rows.map((r, i) => (
                <ScoreGauge
                  key={r.id}
                  label={r.name}
                  value={r.total}
                  max={maxPossiblePoints}
                  accent={GAUGE_ACCENTS[i % GAUGE_ACCENTS.length]}
                />
              ))}
            </div>
          </section>

          <p className={styles.eyebrow}>Leaderboard</p>
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

          <section className={styles.chartSection}>
            <p className={styles.eyebrow}>Compare</p>
            <div className={styles.chartCard}>
              <MetricsBarChart data={chartData} />
            </div>
          </section>

          {days.length > 0 && (
            <section className={styles.gridSection}>
              <div className={styles.gridSectionHeader}>
                <h2>Daily activity</h2>
                <div className={styles.legend}>
                  <span className={styles.legendItem}>
                    <span className={styles.legendSwatch} style={{ background: "var(--amber)" }} />
                    Steps ≥ 8,000
                  </span>
                  <span className={styles.legendItem}>
                    <span className={styles.legendSwatch} style={{ background: "var(--teal)" }} />
                    Sleep &gt; 7h
                  </span>
                  <span className={styles.legendItem}>
                    <span className={styles.legendSwatch} style={{ background: "var(--sage)" }} />
                    Workout &gt; 30min
                  </span>
                </div>
              </div>

              <div className={styles.gridScroll}>
                <div
                  className={styles.gridHeaderRow}
                  style={{ "--day-count": days.length } as React.CSSProperties}
                >
                  <div className={styles.gridNameCol} />
                  {days.map((d) => (
                    <div key={d} className={styles.gridDayLabel}>
                      {Number(d.slice(8, 10))}
                    </div>
                  ))}
                </div>

                {rows.map((r) => (
                  <div
                    key={r.id}
                    className={styles.gridRow}
                    style={{ "--day-count": days.length } as React.CSSProperties}
                  >
                    <div className={styles.gridNameCol}>{r.name}</div>
                    {days.map((d) => {
                      const met = r.metByDate[d] ?? { steps: false, sleep: false, workout: false };
                      return (
                        <div key={d} className={styles.gridCell} title={d}>
                          <span className={met.steps ? `${styles.dot} ${styles.dotStepsOn}` : styles.dot} />
                          <span className={met.sleep ? `${styles.dot} ${styles.dotSleepOn}` : styles.dot} />
                          <span className={met.workout ? `${styles.dot} ${styles.dotWorkoutOn}` : styles.dot} />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
