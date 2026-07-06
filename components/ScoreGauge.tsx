type Props = {
  label: string;
  value: number;
  max: number;
  accent?: string;
};

export default function ScoreGauge({ label, value, max, accent = "--amber" }: Props) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * pct;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={`var(${accent})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform="rotate(-90 50 50)"
        />
        <text
          x="50"
          y="47"
          textAnchor="middle"
          fontSize="20"
          fontWeight="700"
          fill="var(--ink)"
          fontFamily="Space Grotesk, sans-serif"
        >
          {value}
        </text>
        <text x="50" y="63" textAnchor="middle" fontSize="9" fill="var(--ink-muted)" fontFamily="Inter, sans-serif">
          / {max} pts
        </text>
      </svg>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{label}</span>
    </div>
  );
}
