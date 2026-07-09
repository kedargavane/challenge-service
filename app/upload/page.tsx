import { prisma } from "@/lib/db";
import Nav from "@/components/Nav";
import ManualEntryUploader from "@/components/ManualEntryUploader";
import leaderboardStyles from "../leaderboard/leaderboard.module.css";
import styles from "./upload.module.css";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const participants = await prisma.participant.findMany({
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });

  const uploadLogs = await prisma.uploadLog.findMany({
    orderBy: { uploadedAt: "desc" },
    take: 50,
    include: { participant: true, images: true },
  });

  return (
    <main className={leaderboardStyles.page}>
      <Nav active="upload" />
      <header className={leaderboardStyles.header}>
        <h1>Upload screenshots</h1>
      </header>
      <p style={{ color: "var(--ink-muted)", marginBottom: 24 }}>
        For when a wearable sync is missing or wrong — upload a screenshot from Apple Health, Garmin
        Connect, Whoop, or anywhere else, and it'll be read and staged for your review before anything
        gets saved. Data from before the challenge start date is saved for the record but never scores
        points.
      </p>
      <ManualEntryUploader participants={participants} />

      <section className={styles.logSection}>
        <h2>Upload log</h2>
        {uploadLogs.length === 0 ? (
          <p style={{ color: "var(--ink-muted)", fontSize: 13 }}>No uploads yet.</p>
        ) : (
          uploadLogs.map((log) => (
            <div key={log.id} className={styles.logEntry}>
              <div className={styles.logEntryHeader}>
                <span className={styles.logEntryName}>{log.participant.displayName}</span>
                <span className={styles.logEntryTime}>
                  {log.uploadedAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                </span>
              </div>
              <p className={styles.logEntrySummary}>{log.extractedSummary}</p>
              {log.images.length > 0 && (
                <details>
                  <summary className={styles.logImageToggle}>
                    View {log.images.length} uploaded image{log.images.length === 1 ? "" : "s"}
                  </summary>
                  <div className={styles.logImageGrid}>
                    {log.images.map((img) => (
                      <img
                        key={img.id}
                        src={`data:${img.mediaType};base64,${img.base64Data}`}
                        alt={img.fileName ?? "uploaded screenshot"}
                      />
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))
        )}
      </section>
    </main>
  );
}
