import styles from "./leaderboard.module.css";
import ScoreGauge from "@/components/ScoreGauge";
import MetricsBarChart from "@/components/MetricsBarChart";
import TrendLineChart from "@/components/TrendLineChart";
import StreakBadge from "@/components/StreakBadge";
import Nav from "@/components/Nav";
import ReconcileButton from "@/components/ReconcileButton";
import SpainSlideshow from "@/components/SpainSlideshow";
import { getChallengeData, buildCumulativeSeries } from "@/lib/challengeData";

export const dynamic = "force-dynamic";

const DEFAULT_CHALLENGE_NAME = "LGMF Spain-Fit Challenge";
const GAUGE_ACCENTS = ["--amber", "--teal", "--sage", "--amber-dark", "--teal-dark", "--sage-dark"];

export default async function LeaderboardPage() {
  const data = await getChallengeData();
  const { participants: rows, days, maxPossiblePoints, daysLeft, challengeName } = data;

  const chartData = rows.map((r) => ({
    name: r.name,
    Steps: r.totals.steps,
    Sleep: r.totals.sleep,
    Workout: r.totals.workout,
  }));

  const trendData = buildCumulativeSeries(days, rows);
  const trendSeriesNames = rows.map((r) => r.name);

  return (
    <main className={styles.page}>
      <Nav active="leaderboard" />

      <header className={styles.header}>
        <h1>{challengeName ?? DEFAULT_CHALLENGE_NAME}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {daysLeft !== null && <p className={styles.daysLeft}>{daysLeft} days left</p>}
          <ReconcileButton />
        </div>
      </header>

      <SpainSlideshow />

      {rows.length === 0 ? (
        <div className={styles.empty}>No participants yet — add some to get started.</div>
      ) : (
        <>
          <section className={styles.gaugeSection}>
            <p className={styles.eyebrow}>Progress</p>
            <div className={styles.gaugeRow}>
              {rows.map((r, i) => (
                <div key={r.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <ScoreGauge
                    label={r.name}
                    value={r.total}
                    max={r.ownMaxPossiblePoints}
                    percent={r.percentComplete}
                    accent={GAUGE_ACCENTS[i % GAUGE_ACCENTS.length]}
                  />
                  <StreakBadge current={r.currentStreak} best={r.bestStreak} />
                </div>
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
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Weight</span>
                  <span className={styles.statValue}>{r.latestWeightKg != null ? `${r.latestWeightKg} kg` : "—"}</span>
                </div>
                <div className={styles.total}>
                  {r.total}
                  <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-muted)", marginLeft: 4 }}>
                    ({r.percentComplete}%)
                  </span>
                </div>
              </div>
            ))}
          </div>

          <section className={styles.chartSection}>
            <p className={styles.eyebrow}>Trend</p>
            <div className={styles.chartCard}>
              <TrendLineChart data={trendData} seriesNames={trendSeriesNames} />
            </div>
          </section>

          <section className={styles.chartSection}>
            <p className={styles.eyebrow}>Compare totals</p>
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
