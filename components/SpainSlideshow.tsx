"use client";

import { useEffect, useState } from "react";

const SLIDES = [
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/Sagrada_Familia_01.jpg",
    quote: "Still fewer steps than climbing this tower would give you.",
    caption: "Sagrada Família, Barcelona",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/Park_Guell_Dragon_Fountain.JPG",
    quote: "Gaudí didn't design stairs for people who skip leg day.",
    caption: "Park Güell, Barcelona",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/The_whole_Alhambra_Granada_Spain.jpg",
    quote: "A thousand years old and still in better shape than your 8,000 steps today.",
    caption: "The Alhambra, Granada",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/Flamenco_Dancer.jpg",
    quote: "Burns more calories than scrolling the leaderboard, probably.",
    caption: "Flamenco, Andalusia",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:FilePath/Marbella_Beach%2C_Costa_Del_Sol%2C_Spain_-_Sept_2008.jpg",
    quote: "Beach body status: still syncing.",
    caption: "Costa del Sol, Marbella",
  },
];

export default function SpainSlideshow() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[index];

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 340,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 32,
        background: "var(--card)",
        border: "1px solid var(--border)",
      }}
    >
      {SLIDES.map((s, i) => (
        <img
          key={s.src}
          src={s.src}
          alt={s.caption}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
cat > app/page.tsx << 'ENDOFFILE'
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
