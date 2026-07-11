import Nav from "@/components/Nav";
import CompareView from "@/components/CompareView";
import { getChallengeData } from "@/lib/challengeData";
import styles from "../leaderboard/leaderboard.module.css";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const data = await getChallengeData();

  return (
    <main className={styles.page}>
      <Nav active="compare" />
      <header className={styles.header}>
        <h1>Compare</h1>
        <p className={styles.daysLeft}>{data.days.length} days of data</p>
      </header>
      <CompareView
        participants={data.participants.map((p) => ({
          id: p.id,
          name: p.name,
          metByDate: p.metByDate,
          latestWeightKg: p.latestWeightKg,
        }))}
        days={data.days}
      />
    </main>
  );
}
