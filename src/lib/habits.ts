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
  /** Older habits: do it every X days. Read through targetPerWeek(); new habits set perWeek. */
  frequency: number;
  /** Times a week, Monday to Sunday. 7 means every day. */
  perWeek?: number;
}

export type HabitOp =
  | { type: "add"; habit: Habit }
  | { type: "remove"; id: string }
  /** Mark one date done or not done. Stated outright rather than flipped, so a resend cannot undo itself. */
  | { type: "set"; id: string; date: string; done: boolean }
  | { type: "update"; id: string; set: { name?: string; color?: string; frequency?: number; perWeek?: number } }
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

const cleanPerWeek = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(7, Math.max(1, Math.round(v))) : undefined;

/** A habit with only the fields the app understands, so stored data stays clean. */
function sanitize(habit: Habit): Habit {
  const out: Habit = {
    ...habit,
    name: String(habit.name ?? "").slice(0, 200),
    color: isStr(habit.color) ? habit.color : "orange",
    frequency: Number.isFinite(habit.frequency) ? Math.max(1, Math.round(habit.frequency)) : 1,
    history: Array.isArray(habit.history) ? habit.history.filter((d) => isStr(d) && DATE_RE.test(d)) : [],
  };
  const perWeek = cleanPerWeek(habit.perWeek);
  if (perWeek) out.perWeek = perWeek;
  else delete out.perWeek;
  return out;
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
      const perWeek = cleanPerWeek(patch.perWeek);
      if (perWeek) h.perWeek = perWeek;
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

/** A YYYY-MM-DD date as a local Date at midnight. */
export const parseLocal = (date: string): Date => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** The date `n` days after `date` (negative goes back). */
export const addDays = (date: string, n: number): string => {
  const d = parseLocal(date);
  d.setDate(d.getDate() + n);
  return todayLocal(d);
};

/** The Monday that starts the week holding `date`. */
export const mondayOf = (date: string): string => {
  const d = parseLocal(date);
  return addDays(date, -((d.getDay() + 6) % 7));
};

/**
 * How many times a week the habit asks for. Older habits stored "every X
 * days", which becomes the whole number of times that fits in a week: every
 * 2 days is 3 times, every 3 days is twice, weekly is once.
 */
export const targetPerWeek = (habit: Habit): number => {
  if (habit.perWeek && habit.perWeek >= 1) return Math.min(7, Math.round(habit.perWeek));
  const every = Math.max(1, habit.frequency || 1);
  return every === 1 ? 7 : Math.max(1, Math.floor(7 / every));
};

/** Daily habits count their streak in days, everything else in weeks. */
export const streakUnit = (habit: Habit): "day" | "week" => (targetPerWeek(habit) === 7 ? "day" : "week");

/** Completions in the Monday-to-Sunday week starting `monday`. */
export const doneInWeek = (habit: Habit, monday: string): number => {
  const sunday = addDays(monday, 6);
  return [...new Set(habit.history ?? [])].filter((d) => d >= monday && d <= sunday).length;
};

/**
 * The current streak.
 *
 * Daily habits: days in a row. Today still being open never breaks it, so a
 * run that reached yesterday is alive until today is over.
 *
 * Weekly targets: Monday-to-Sunday weeks in a row that hit the target. The
 * week in progress counts once it hits the target and never breaks the streak
 * while it is still going, so the gym on Wednesday, Thursday and Friday keeps
 * a "3 a week" streak alive through the following Monday and Tuesday.
 */
export const getStreak = (habit: Habit, today: string = todayLocal()): number => {
  const done = new Set((habit.history ?? []).filter((d) => DATE_RE.test(d) && d <= today));
  if (done.size === 0) return 0;

  if (streakUnit(habit) === "day") {
    let day = done.has(today) ? today : addDays(today, -1);
    let streak = 0;
    while (done.has(day)) {
      streak++;
      day = addDays(day, -1);
    }
    return streak;
  }

  const target = targetPerWeek(habit);
  let monday = mondayOf(today);
  let streak = 0;
  if (doneInWeek(habit, monday) >= target) streak++;
  monday = addDays(monday, -7);
  while (doneInWeek(habit, monday) >= target) {
    streak++;
    monday = addDays(monday, -7);
  }
  return streak;
};

/** The longest streak ever reached, in the same unit as getStreak. */
export const getBestStreak = (habit: Habit, today: string = todayLocal()): number => {
  const days = [...new Set((habit.history ?? []).filter((d) => DATE_RE.test(d) && d <= today))].sort();
  if (days.length === 0) return 0;

  if (streakUnit(habit) === "day") {
    let best = 1;
    let run = 1;
    for (let i = 1; i < days.length; i++) {
      run = daysBetween(days[i], days[i - 1]) === 1 ? run + 1 : 1;
      best = Math.max(best, run);
    }
    return best;
  }

  const target = targetPerWeek(habit);
  let best = 0;
  let run = 0;
  for (let monday = mondayOf(days[0]); monday <= today; monday = addDays(monday, 7)) {
    run = doneInWeek(habit, monday) >= target ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
};

/** The seven days of a Monday-to-Sunday week: `offset` 0 is this week, -1 last week. */
export const weekDays = (offset = 0, now: Date = new Date()) => {
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = todayLocal(now);
  const monday = addDays(mondayOf(today), offset * 7);
  return names.map((dayName, i) => {
    const date = addDays(monday, i);
    return { date, dayName, dayNum: parseLocal(date).getDate(), isToday: date === today, isFuture: date > today };
  });
};
