"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/upload/upload.module.css";

type Participant = { id: string; displayName: string };

type PendingEntry = {
  id: string;
  date: string;
  steps: number | null;
  sleepHours: number | null;
  workoutCount: number | null;
  workoutDurationMinutes: number | null;
  weightKg: number | null;
};

// Four-step flow: 1) pick a person, 2) upload screenshots, 3) AI extracts
// + shows editable rows, 4) confirm writes to the DB and scores it.
export default function ManualEntryUploader({ participants }: { participants: Participant[] }) {
  const [step, setStep] = useState<"select" | "upload" | "review">("select");
  const [selected, setSelected] = useState<Participant | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [entries, setEntries] = useState<PendingEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const router = useRouter();

  function reset() {
    setStep("select");
    setSelected(null);
    setFiles([]);
    setEntries([]);
    setError(null);
    setSavedMsg(null);
  }

  function pickParticipant(p: Participant) {
    setSelected(p);
    setStep("upload");
    setError(null);
  }

  async function processScreenshots() {
    if (!selected || files.length === 0) return;
    setProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append("participantId", selected.id);
    for (const f of files) formData.append("screenshots", f);

    try {
      const res = await fetch("/api/manual-entries/extract", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Extraction failed");

      setEntries(
        data.entries.map((e: any) => ({
          id: e.id,
          date: e.date.slice(0, 10),
          steps: e.steps,
          sleepHours: e.sleepHours,
          workoutCount: e.workoutCount,
          workoutDurationMinutes: e.workoutDurationMinutes,
          weightKg: e.weightKg,
        }))
      );
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setProcessing(false);
    }
  }

  function updateEntry(id: string, field: keyof PendingEntry, value: string) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        if (field === "date") return { ...e, date: value };
        return { ...e, [field]: value === "" ? null : Number(value) };
      })
    );
  }

  async function confirmAndSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/manual-entries/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      const rangeNote =
        data.outsideRangeCount > 0
          ? ` (${data.outsideRangeCount} day(s) were outside the challenge window -- data saved, no points awarded)`
          : "";
      setSavedMsg(`Saved and scored ${data.count} day(s) for ${selected?.displayName}.${rangeNote}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  // Step 1: pick a person
  if (step === "select") {
    return (
      <div className={styles.userGrid}>
        {participants.map((p) => (
          <button key={p.id} className={styles.userCard} onClick={() => pickParticipant(p)}>
            {p.displayName}
          </button>
        ))}
      </div>
    );
  }

  // Step 2: upload screenshots
  if (step === "upload") {
    return (
      <div>
        <button className={styles.backLink} onClick={reset}>
          ← Choose a different person
        </button>
        <p style={{ marginBottom: 12 }}>
          Uploading for <strong>{selected?.displayName}</strong>
        </p>
        <div className={styles.dropzone}>
          <p>Upload screenshots (steps, sleep, or workout screens — any mix, multiple at once)</p>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </div>
        {files.length > 0 && (
          <p className={styles.fileList}>{files.length} file(s) selected</p>
        )}
        <button
          className={styles.primaryButton}
          onClick={processScreenshots}
          disabled={files.length === 0 || processing}
        >
          {processing ? "Processing…" : "Process screenshots"}
        </button>
        {error && <p className={styles.errorMsg}>{error}</p>}
      </div>
    );
  }

  // Step 3 + 4: review, edit, confirm
  return (
    <div>
      <button className={styles.backLink} onClick={reset}>
        ← Start over
      </button>
      <p style={{ marginBottom: 12 }}>
        Review extracted data for <strong>{selected?.displayName}</strong> — edit anything that looks
        wrong before saving.
      </p>
      <table className={styles.reviewTable}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Steps</th>
            <th>Sleep (hrs)</th>
            <th>Workouts</th>
            <th>Workout mins</th>
            <th>Weight (kg)</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>
                <input
                  type="date"
                  value={e.date}
                  onChange={(ev) => updateEntry(e.id, "date", ev.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={e.steps ?? ""}
                  onChange={(ev) => updateEntry(e.id, "steps", ev.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.1"
                  value={e.sleepHours ?? ""}
                  onChange={(ev) => updateEntry(e.id, "sleepHours", ev.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={e.workoutCount ?? ""}
                  onChange={(ev) => updateEntry(e.id, "workoutCount", ev.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.1"
                  value={e.workoutDurationMinutes ?? ""}
                  onChange={(ev) => updateEntry(e.id, "workoutDurationMinutes", ev.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.1"
                  value={e.weightKg ?? ""}
                  onChange={(ev) => updateEntry(e.id, "weightKg", ev.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className={styles.primaryButton} onClick={confirmAndSave} disabled={saving}>
        {saving ? "Saving…" : "Confirm & save"}
      </button>
      {error && <p className={styles.errorMsg}>{error}</p>}
      {savedMsg && <p className={styles.statusMsg}>{savedMsg}</p>}
    </div>
  );
}
