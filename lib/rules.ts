// Fixed-point scoring rules for the challenge.
// Kept as data (not hardcoded logic) so thresholds can be tuned without
// touching the scoring engine itself.
export const RULES = {
  steps: {
    thresholdPerDay: 8000,
    points: 1,
  },
  sleep: {
    minHours: 7, // strictly greater than
    points: 1,
  },
  workout: {
    minMinutes: 30, // strictly greater than; minutes are summed across all
    // workouts logged on the same local day, so two 20-minute sessions
    // stack toward the threshold. Change to "any single workout > 30 min"
    // in lib/scoring.ts if you'd rather require one continuous session.
    points: 1,
  },
} as const;

export type ActivityType = keyof typeof RULES;
