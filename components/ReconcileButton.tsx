"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReconcileButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/reconcile", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reconcile failed");

      setStatus("done");
      setMessage(
        `Scored ${data.scored.length} participant${data.scored.length === 1 ? "" : "s"}` +
          (data.errors.length > 0 ? ` (${data.errors.length} error${data.errors.length === 1 ? "" : "s"})` : "")
      );
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button
        onClick={handleClick}
        disabled={status === "loading"}
        style={{
          fontSize: 13,
          fontWeight: 600,
          padding: "8px 14px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: status === "loading" ? "var(--bg)" : "var(--card)",
          color: "var(--ink)",
          cursor: status === "loading" ? "default" : "pointer",
        }}
      >
        {status === "loading" ? "Reconciling…" : "Reconcile now"}
      </button>
      {message && (
        <span style={{ fontSize: 12, color: status === "error" ? "#b8632a" : "var(--ink-muted)" }}>
          {message}
        </span>
      )}
    </div>
  );
}
