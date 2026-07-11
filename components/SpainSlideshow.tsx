"use client";

import { useEffect, useState } from "react";

// Images from Wikimedia Commons via the stable Special:FilePath redirect
// (always points at the current version of the file, freely licensed).
const SLIDES = [
  {
    src: "/spain/sagrada-familia.jpg",
    quote: "Still fewer steps than climbing this tower would give you.",
    caption: "Sagrada Família, Barcelona",
  },
  {
    src: "/spain/park-guell.jpg",
    quote: "Gaudí didn't design stairs for people who skip leg day.",
    caption: "Park Güell, Barcelona",
  },
  {
    src: "/spain/alhambra.jpg",
    quote: "A thousand years old and still in better shape than your 8,000 steps today.",
    caption: "The Alhambra, Granada",
  },
  {
    src: "/spain/flamenco.jpg",
    quote: "Burns more calories than scrolling the leaderboard, probably.",
    caption: "Flamenco, Andalusia",
  },
  {
    src: "/spain/costa-del-sol.jpg",
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
            height: "100%",
            objectFit: "cover",
            opacity: i === index ? 1 : 0,
            transition: "opacity 1s ease-in-out",
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.05) 50%)",
        }}
      />

      <div style={{ position: "absolute", bottom: 20, left: 24, right: 24, color: "white" }}>
        <p
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 20,
            marginBottom: 6,
            textShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
        >
          {slide.quote}
        </p>
        <p style={{ fontSize: 12, opacity: 0.85 }}>{slide.caption}</p>
      </div>

      <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 6 }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              border: "none",
              cursor: "pointer",
              background: i === index ? "white" : "rgba(255,255,255,0.4)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
