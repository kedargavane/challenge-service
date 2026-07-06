import "./globals.css";

export const metadata = {
  title: "Challenge leaderboard",
  description: "Group fitness challenge leaderboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
