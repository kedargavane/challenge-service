"use client";

import { useMemo, useState } from "react";
import boardStyles from "@/app/leaderboard/leaderboard.module.css";
import styles from "./compare.module.css";
import TrendLineChart from "@/components/TrendLineChart";

type MetricSet = { steps: boolean; sleep: boolean; workout: boolean };
type Participant = { id: string; name: string; metByDate: Record<string, MetricSet>; latestWeightKg: number | null };

const METRICS: { key: keyof MetricSet; label: string; accent: string }[] = [
  { key: "steps", label: "Steps", accent: "var(--amber)" },
  { key: "sleep", label: "Sleep", accent: "var(--teal)" },
  { key: "workout", label: "Workout", accent: "var(--sage)" },
];

export default function CompareView({ participants, days }: { participants: Participant[]; days: string[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>(participants.map((p) => p.id));
  const [selectedMetrics, setSelectedMetrics] = useState<(keyof MetricSet)[]>(["steps", "sleep", "workout"]);
  const [range, setRange] = useState<[number, number]>([0, Math.max(0, days.length - 1)]);

  const visibleDays = useMemo(() => days.slice(range[0], range[1] + 1), [days, range]);
  const visibleParticipants = participants.filter((p) => selectedIds.includes(p.id));

  function toggleId(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleMetric(key: keyof MetricSet) {
    setSelectedMetrics((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  }

  const trendData = useMemo(() => {
    const running: Record<string, number> = {};
    for (const p of visibleParticipants) running[p.name] = 0;

    return visibleDays.map((d) => {
      const row: Record<string, number | string> = { date: d.slice(5) };
      for (const p of visibleParticipants) {
        const met = p.metByDate[d];
        let pts = 0;
        if (met) {
          for (const m of selectedMetrics) if (met[m]) pts += 1;
        }
        running[p.name] += pts;
        row[p.name] = running[p.name];
      }
      return row;
    });
  }, [visibleDays, visibleParticipants, selectedMetrics]);

  return (
    <div>
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Participants</span>
          <div className={styles.chipRow}>
            {participants.map((p) => (
              <button
                key={p.id}
                className={selectedIds.includes(p.id) ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                onClick={() => toggleId(p.id)}
                type="button"
              >
                {p.name}
                {p.latestWeightKg != null && (
                  <span style={{ opacity: 0.6, marginLeft: 6 }}>({p.latestWeightKg} kg)</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Metrics</span>
          <div className={styles.chipRow}>
            {METRICS.map((m) => (
              <button
                key={m.key}
                className={selectedMetrics.includes(m.key) ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                onClick={() => toggleMetric(m.key)}
                type="button"
                style={selectedMetrics.includes(m.key) ? { borderColor: m.accent } : undefined}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Date range</span>
          <div className={styles.rangeRow}>
            <select
              value={range[0]}
              onChange={(e) => setRange([Number(e.target.value), range[1]])}
              className={styles.select}
            >
              {days.map((d, i) => (
                <option key={d} value={i} disabled={i > range[1]}>
                  {d}
                </option>
              ))}
            </select>
            <span className={styles.rangeSep}>to</span>
            <select
              value={range[1]}
              onChange={(e) => setRange([range[0], Number(e.target.value)])}
              className={styles.select}
            >
              {days.map((d, i) => (
                <option key={d} value={i} disabled={i < range[0]}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <section className={boardStyles.chartSection}>
        <p className={boardStyles.eyebrow}>Cumulative points</p>
        <div className={boardStyles.chartCard}>
          <TrendLineChart data={trendData} seriesNames={visibleParticipants.map((p) => p.name)} />
        </div>
      </section>

      {visibleDays.length > 0 && visibleParticipants.length > 0 && (
        <section className={boardStyles.gridSection}>
          <div className={boardStyles.gridSectionHeader}>
            <h2>Daily detail</h2>
          </div>
          <div className={boardStyles.gridScroll}>
            <div
              className={boardStyles.gridHeaderRow}
              style={{ "--day-count": visibleDays.length } as React.CSSProperties}
            >
              <div className={boardStyles.gridNameCol} />
              {visibleDays.map((d) => (
                <div key={d} className={boardStyles.gridDayLabel}>
                  {Number(d.slice(8, 10))}
                </div>
              ))}
            </div>

            {visibleParticipants.map((p) => (
              <div
                key={p.id}
                className={boardStyles.gridRow}
                style={{ "--day-count": visibleDays.length } as React.CSSProperties}
              >
                <div className={boardStyles.gridNameCol}>{p.name}</div>
                {visibleDays.map((d) => {
                  const met = p.metByDate[d] ?? { steps: false, sleep: false, workout: false };
                  return (
                    <div key={d} className={boardStyles.gridCell} title={d}>
                      {selectedMetrics.includes("steps") && (
                        <span className={met.steps ? `${boardStyles.dot} ${boardStyles.dotStepsOn}` : boardStyles.dot} />
                      )}
                      {selectedMetrics.includes("sleep") && (
                        <span className={met.sleep ? `${boardStyles.dot} ${boardStyles.dotSleepOn}` : boardStyles.dot} />
                      )}
                      {selectedMetrics.includes("workout") && (
                        <span className={met.workout ? `${boardStyles.dot} ${boardStyles.dotWorkoutOn}` : boardStyles.dot} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
