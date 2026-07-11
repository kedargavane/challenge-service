import Nav from "@/components/Nav";
import SpainSlideshow from "@/components/SpainSlideshow";
import styles from "./leaderboard/leaderboard.module.css";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <Nav active="leaderboard" />
      <header className={styles.header}>
        <h1>LGMF Spain-Fit Challenge</h1>
      </header>
      <SpainSlideshow />
      <div style={{ textAlign: "center", marginTop: -8 }}>
        
          href="/leaderboard"
          style={{
            display: "inline-block",
            fontSize: 14,
            fontWeight: 600,
            padding: "12px 24px",
            borderRadius: 8,
            background: "var(--amber)",
            color: "white",
            textDecoration: "none",
          }}
        >
          View the leaderboard →
        </a>
      </div>
    </main>
  );
}
