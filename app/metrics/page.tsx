"use client";

import { useState } from "react";
import styles from "../leaderboard/leaderboard.module.css";

export default function MetricsPage() {
  const [participantId, setParticipantId] = useState("");
  const [date, setDate] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [bmi, setBmi] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Saving...");
    const res = await fetch("/api/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId,
        date,
        weightKg: weightKg ? Number(weightKg) : null,
        bmi: bmi ? Number(bmi) : null,
      }),
    });
    setStatus(res.ok ? "Saved" : "Something went wrong — try again");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Log your metrics</h1>
      </header>
      <p style={{ color: "var(--ink-muted)" }}>
        Not scored in the challenge — just here so you can compare progress with the group.
      </p>
      <form onSubmit={submit} className={styles.form}>
        <label>
          Participant ID
          <input value={participantId} onChange={(e) => setParticipantId(e.target.value)} required />
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          Weight (kg)
          <input type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
        </label>
        <label>
          BMI
          <input type="number" step="0.1" value={bmi} onChange={(e) => setBmi(e.target.value)} />
        </label>
        <button type="submit">Save entry</button>
      </form>
      {status && <p>{status}</p>}
    </main>
  );
}
