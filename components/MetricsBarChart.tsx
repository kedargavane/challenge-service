"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Row = { name: string; Steps: number; Sleep: number; Workout: number };

export default function MetricsBarChart({ data }: { data: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--ink-muted)" }} />
        <YAxis tick={{ fontSize: 12, fill: "var(--ink-muted)" }} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Steps" fill="#e8863c" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Sleep" fill="#2f8f8a" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Workout" fill="#6b8f71" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
