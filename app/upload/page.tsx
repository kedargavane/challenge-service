import { prisma } from "@/lib/db";
import Nav from "@/components/Nav";
import ManualEntryUploader from "@/components/ManualEntryUploader";
import leaderboardStyles from "../leaderboard/leaderboard.module.css";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const participants = await prisma.participant.findMany({
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
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
        gets saved.
      </p>
      <ManualEntryUploader participants={participants} />
    </main>
  );
}
