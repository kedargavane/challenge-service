import Link from "next/link";

export default function Nav({ active }: { active: "leaderboard" | "compare" | "raw" }) {
  const linkStyle = (isActive: boolean): React.CSSProperties => ({
    fontSize: 13,
    fontWeight: 600,
    padding: "6px 12px",
    borderRadius: 8,
    color: isActive ? "var(--ink)" : "var(--ink-muted)",
    background: isActive ? "var(--card)" : "transparent",
    border: isActive ? "1px solid var(--border)" : "1px solid transparent",
    textDecoration: "none",
  });

  return (
    <nav style={{ display: "flex", gap: 8, marginBottom: 24 }}>
      <Link href="/leaderboard" style={linkStyle(active === "leaderboard")}>
        Leaderboard
      </Link>
      <Link href="/compare" style={linkStyle(active === "compare")}>
        Compare
      </Link>
      <Link href="/raw" style={linkStyle(active === "raw")}>
        Raw
      </Link>
    </nav>
  );
}
