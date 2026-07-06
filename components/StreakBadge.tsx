type Props = { current: number; best: number };

export default function StreakBadge({ current, best }: Props) {
  if (current === 0) {
    return (
      <span style={{ fontSize: 12, color: "var(--ink-muted)" }} title={`Best streak: ${best} days`}>
        No active streak
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 12,
        fontWeight: 600,
        color: "var(--amber-dark)",
        background: "color-mix(in srgb, var(--amber) 15%, white)",
        padding: "3px 8px",
        borderRadius: 999,
      }}
      title={`Best streak: ${best} days`}
    >
      🔥 {current}-day streak
    </span>
  );
}
