// Habit types, the streak rule, and the operation model used to save changes.
//
// As with goals, a change is one small operation applied to the stored list, so
// a save touches only the habit you changed and every operation can be sent
// again safely.

export interface Habit {
  id: string;
  name: string;
  color: string;
  /** Dates the habit was completed, as YYYY-MM-DD in local time. */
  history: string[];
  /** Do it every X days: 1 is daily, 2 is every other day, 7 is weekly. */
  frequency: number;
}

export type HabitOp =
  | { type: "add"; habit: Habit }
  | { type: "remove"; id: string }
  /** Mark one date done or not done. Stated outright rather than flipped, so a resend cannot undo itself. */
  | { type: "set"; id: string; date: string; done: boolean }
  | { type: "update"; id: string; set: { name?: string; color?: string; frequency?: number } }
  | { type: "order"; ids: string[] };

const isStr = (v: unknown): v is string => typeof v === "string";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isHabitOp(op: unknown): op is HabitOp {
  if (!op || typeof op !== "object") return false;
  const o = op as Record<string, unknown>;
  switch (o.type) {
    case "add":
      return !!o.habit && typeof o.habit === "object" && isStr((o.habit as Habit).id);
    case "remove":
      return isStr(o.id);
    case "set":
      return isStr(o.id) && isStr(o.date) && DATE_RE.test(o.date) && typeof o.done === "boolean";
    case "update":
      return isStr(o.id) && !!o.set && typeof o.set === "object";
    case "order":
      return Array.isArray(o.ids) && o.ids.every(isStr);
    default:
      return false;
  }
}

/** A habit with only the fields the app understands, so stored data stays clean. */
function sanitize(habit: Habit): Habit {
  return {
    ...habit,
    name: String(habit.name ?? "").slice(0, 200),
    color: isStr(habit.color) ? habit.color : "orange",
    frequency: Number.isFinite(habit.frequency) ? Math.max(1, Math.round(habit.frequency)) : 1,
    history: Array.isArray(habit.history) ? habit.history.filter((d) => isStr(d) && DATE_RE.test(d)) : [],
  };
}

/** Apply operations to the stored habit list. Pure, total, and shared by browser and server. */
export function applyHabitOps(list: Habit[], ops: HabitOp[]): Habit[] {
  let next = Array.isArray(list) ? [...list] : [];

  for (const op of ops) {
    if (!isHabitOp(op)) continue;

    if (op.type === "add") {
      const i = next.findIndex((h) => h.id === op.habit.id);
      if (i === -1) next.push(sanitize(op.habit));
      else next[i] = sanitize(op.habit);
      continue;
    }

    if (op.type === "remove") {
      next = next.filter((h) => h.id !== op.id);
      continue;
    }

    if (op.type === "order") {
      const byId = new Map(next.map((h) => [h.id, h]));
      const seen = new Set<string>();
      const ordered: Habit[] = [];
      for (const id of op.ids) {
        const h = byId.get(id);
        if (h && !seen.has(id)) {
          ordered.push(h);
          seen.add(id);
        }
      }
      next = [...ordered, ...next.filter((h) => !seen.has(h.id))];
      continue;
    }

    const i = next.findIndex((h) => h.id === op.id);
    // A habit deleted elsewhere stays deleted.
    if (i === -1) continue;
    const habit = next[i];

    if (op.type === "set") {
      const history = new Set(habit.history ?? []);
      if (op.done) history.add(op.date);
      else history.delete(op.date);
      next[i] = { ...habit, history: [...history].sort() };
      continue;
    }

    if (op.type === "update") {
      const patch = op.set;
      const h: Habit = { ...habit };
      if (isStr(patch.name) && patch.name.trim()) h.name = patch.name.trim().slice(0, 200);
      if (isStr(patch.color)) h.color = patch.color;
      if (Number.isFinite(patch.frequency)) h.frequency = Math.max(1, Math.round(patch.frequency as number));
      next[i] = h;
    }
  }

  return next;
}

// --- dates ------------------------------------------------------------------

/** Today as YYYY-MM-DD in the viewer's own timezone, not UTC. */
export const todayLocal = (now: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** Whole days from `from` to `to`, both YYYY-MM-DD. */
export const daysBetween = (to: string, from: string): number =>
  Math.round((Date.parse(`${to}T00:00:00`) - Date.parse(`${from}T00:00:00`)) / 86400000);

/**
 * How many completions in a row are still on schedule.
 *
 * A streak is only alive while the habit is up to date: for a habit done every
 * X days, the last completion has to be within X days of today. Miss that
 * window and the streak is 0, however long it once was. Counting backwards then
 * continues while each gap is within the same window.
 */
export const getStreak = (habit: Habit, today: string = todayLocal()): number => {
  const frequency = Math.max(1, habit.frequency || 1);
  const days = [...new Set(habit.history ?? [])].filter((d) => DATE_RE.test(d)).sort().reverse();
  if (days.length === 0) return 0;

  // Completions dated in the future should not prop a streak up.
  const past = days.filter((d) => daysBetween(today, d) >= 0);
  if (past.length === 0) return 0;

  if (daysBetween(today, past[0]) > frequency) return 0;

  let streak = 1;
  for (let i = 1; i < past.length; i++) {
    if (daysBetween(past[i - 1], past[i]) <= frequency) streak++;
    else break;
  }
  return streak;
};

/** The last seven days, oldest first, in local time. */
export const weekDays = (now: Date = new Date()) => {
  const out: { date: string; dayName: string; dayNum: number; isToday: boolean }[] = [];
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push({ date: todayLocal(d), dayName: names[d.getDay()], dayNum: d.getDate(), isToday: i === 0 });
  }
  return out;
};
