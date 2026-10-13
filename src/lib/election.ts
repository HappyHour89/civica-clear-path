// Tuesday, November 3, 2026 (the first Tuesday after the first Monday in November).
export const ELECTION_DAY = { year: 2026, monthIndex: 10, day: 3 } as const;

export type Countdown =
  | { phase: "before"; days: number; hours: number; minutes: number; seconds: number }
  | { phase: "today" }
  | { phase: "after" };

// Counts down to local midnight at the start of Election Day.
export function countdownTo(now: Date): Countdown {
  const start = new Date(ELECTION_DAY.year, ELECTION_DAY.monthIndex, ELECTION_DAY.day);
  const end = new Date(ELECTION_DAY.year, ELECTION_DAY.monthIndex, ELECTION_DAY.day + 1);
  if (now >= end) return { phase: "after" };
  if (now >= start) return { phase: "today" };
  const totalSeconds = Math.floor((start.getTime() - now.getTime()) / 1000);
  return {
    phase: "before",
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}
