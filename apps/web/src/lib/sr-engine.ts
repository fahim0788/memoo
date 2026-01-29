export type CardState = {
  reps: number;
  intervalDays: number;
  ease: number;
  nextReviewAt: number; // ms
  lastReviewedAt: number | null;
  successCount: number;
  failureCount: number;
};

export function defaultCardState(now = Date.now()): CardState {
  return {
    reps: 0,
    intervalDays: 0,
    ease: 2.0,
    nextReviewAt: now,
    lastReviewedAt: null,
    successCount: 0,
    failureCount: 0
  };
}

function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }
function addDaysMs(ms: number, days: number) { const d = new Date(ms); d.setDate(d.getDate() + days); return d.getTime(); }

export function gradeCard(state: CardState, ok: boolean, now = Date.now()): CardState {
  const s = { ...state };
  if (ok) {
    s.successCount += 1;
    s.reps += 1;
    s.ease = clamp(s.ease + 0.10, 1.3, 2.5);
    if (s.reps === 1) s.intervalDays = 1;
    else if (s.reps === 2) s.intervalDays = 3;
    else s.intervalDays = Math.max(1, Math.round(s.intervalDays * s.ease));
  } else {
    s.failureCount += 1;
    s.reps = 0;
    s.ease = clamp(s.ease - 0.20, 1.3, 2.5);
    s.intervalDays = 1;
  }
  s.lastReviewedAt = now;
  s.nextReviewAt = addDaysMs(now, s.intervalDays);
  return s;
}
