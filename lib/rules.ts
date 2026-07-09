export const RULES = {
  steps: {
    thresholdPerDay: 8000,
    points: 1,
  },
  sleep: {
    minHours: 7,
    points: 1,
  },
  workout: {
    minMinutes: 30, // >= this threshold; minutes are summed across all
    // workouts logged on the same local day, so two 20-minute sessions
    // stack toward the threshold.
    points: 1,
  },
} as const;

export type ActivityType = keyof typeof RULES;
